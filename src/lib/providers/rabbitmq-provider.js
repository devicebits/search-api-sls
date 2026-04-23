/**
 * RabbitMQ implementation of the queue-client contract.
 * Uses amqplib with a single long-lived connection + channel.
 *
 * Expected environment:
 *   RABBITMQ_URL                 e.g. amqp://guest:guest@localhost:5672
 *   RABBITMQ_QUEUE               main queue name (default: search-api-sync)
 *   RABBITMQ_DLQ                 dead-letter queue name (default: ${queue}-dlq)
 *   RABBITMQ_MAX_RECEIVE_COUNT   retry cap before routing to DLQ (default: 3)
 */
const amqp = require("amqplib");

const getUrl = () => {
  console.log("RabbitMQ getUrl start");
  const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
  console.log("RabbitMQ getUrl end", { url });
  return url;
};
const getQueueName = () => {
  console.log("RabbitMQ getQueueName start");
  const queue = process.env.RABBITMQ_QUEUE || "search-api-sync";
  console.log("RabbitMQ getQueueName end", { queue });
  return queue;
};
const getDlqName = () => {
  console.log("RabbitMQ getDlqName start");
  const dlq = process.env.RABBITMQ_DLQ || `${getQueueName()}-dlq`;
  console.log("RabbitMQ getDlqName end", { dlq });
  return dlq;
};
const getMaxReceiveCount = () => {
  console.log("RabbitMQ getMaxReceiveCount start");
  const maxReceiveCount = parseInt(process.env.RABBITMQ_MAX_RECEIVE_COUNT || "3", 10);
  console.log("RabbitMQ getMaxReceiveCount end", { maxReceiveCount });
  return maxReceiveCount;
};

let connectionPromise = null;
let channelPromise = null;
// Keep the raw amqp messages around so we can ack/nack by handle later.
const pendingMessages = new Map();

const connect = async () => {
  console.log("RabbitMQ connect start");
  if (connectionPromise) {
    console.log("RabbitMQ connect end", { cached: true });
    return connectionPromise;
  }
  connectionPromise = amqp.connect(getUrl()).then((conn) => {
    conn.on("close", () => {
      connectionPromise = null;
      channelPromise = null;
      pendingMessages.clear();
    });
    conn.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
    });
    return conn;
  });
  connectionPromise.then(() => console.log("RabbitMQ connect end", { cached: false }));
  return connectionPromise;
};

const getChannel = async () => {
  console.log("RabbitMQ getChannel start");
  if (channelPromise) {
    console.log("RabbitMQ getChannel end", { cached: true });
    return channelPromise;
  }
  channelPromise = (async () => {
    const conn = await connect();
    const ch = await conn.createChannel();

    const queue = getQueueName();
    const dlq = getDlqName();

    // Declare DLQ first so the main queue can reference it.
    await ch.assertQueue(dlq, { durable: true });
    await ch.assertQueue(queue, {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: dlq,
    });

    return ch;
  })();
  channelPromise.then(() => console.log("RabbitMQ getChannel end", { cached: false }));
  return channelPromise;
};

/** Enqueue a JSON payload. */
const sendQueueMessage = async (payload) => {
  const ch = await getChannel();
  const queue = getQueueName();
  const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const body = Buffer.from(JSON.stringify(payload));
  console.log("RabbitMQ send start", {
    queue,
    messageId,
    action: payload.action,
    itemId: payload.itemId,
    customer: payload.customer,
  });

  const ok = ch.sendToQueue(queue, body, {
    persistent: true,
    contentType: "application/json",
    messageId,
    headers: {
      action: payload.action,
      customer: payload.customer,
      type: payload.type,
    },
  });

  if (!ok) {
    // Channel's write buffer is full — wait for drain then surface a soft success.
    await new Promise((resolve) => ch.once("drain", resolve));
  }

  console.log("RabbitMQ send done", { queue, messageId });
  return { messageId, raw: null };
};

const countDeath = (message) => {
  console.log("RabbitMQ countDeath start");
  const xDeath = message.properties?.headers?.["x-death"];
  if (!Array.isArray(xDeath) || xDeath.length === 0) {
    console.log("RabbitMQ countDeath end", { count: 1 });
    return 1;
  }
  const rejections = xDeath.find((entry) => entry.reason === "rejected" || entry.reason === "expired");
  const count = (rejections?.count ?? 0) + 1;
  console.log("RabbitMQ countDeath end", { count });
  return count;
};

/**
 * Pull up to `maxMessages` messages via ch.get and normalize them.
 * Returns [] when the queue is empty. Does NOT long-poll — the worker handles
 * cadence with its own sleep loop.
 */
const receiveQueueMessages = async ({ maxMessages = 10 } = {}) => {
  console.log("RabbitMQ receiveQueueMessages start", { maxMessages });
  const ch = await getChannel();
  const queue = getQueueName();
  const messages = [];

  for (let i = 0; i < maxMessages; i += 1) {
    const message = await ch.get(queue, { noAck: false });
    if (!message) break;

    const handle = String(message.fields.deliveryTag);
    pendingMessages.set(handle, message);
    messages.push({
      id: message.properties.messageId || handle,
      body: message.content.toString("utf8"),
      handle,
      attempts: countDeath(message),
    });
  }

  if (messages.length > 0) {
    console.log("RabbitMQ receive batch", {
      queue,
      count: messages.length,
      messages: messages.map((message) => ({
        messageId: message.id,
        handle: message.handle,
        attempts: message.attempts,
      })),
    });
  }

  console.log("RabbitMQ receiveQueueMessages end", { count: messages.length });
  return messages;
};

/** Ack a successfully processed message. */
const ackQueueMessage = async (handle) => {
  console.log("RabbitMQ ackQueueMessage start", { handle });
  if (!handle) throw new Error("deliveryTag is required to ack a RabbitMQ message");
  const ch = await getChannel();
  const message = pendingMessages.get(handle);
  if (!message) {
    console.warn(`RabbitMQ ack: no pending message for handle ${handle}`);
    console.log("RabbitMQ ackQueueMessage end", { handle, found: false });
    return;
  }
  ch.ack(message);
  pendingMessages.delete(handle);
  console.log("RabbitMQ ack", {
    handle,
    messageId: message.properties.messageId || handle,
  });
  console.log("RabbitMQ ackQueueMessage end", { handle, found: true });
};

/**
 * Nack a message. requeue=true puts it back on the main queue; requeue=false
 * routes it through the dead-letter-exchange to the DLQ.
 *
 * To emulate SQS's maxReceiveCount we inspect the x-death header: once the
 * retry count exceeds RABBITMQ_MAX_RECEIVE_COUNT we force requeue=false even
 * if the caller asked for requeue=true, so messages can't loop forever.
 */
const nackQueueMessage = async (handle, { requeue = true } = {}) => {
  console.log("RabbitMQ nackQueueMessage start", { handle, requeue });
  if (!handle) throw new Error("deliveryTag is required to nack a RabbitMQ message");
  const ch = await getChannel();
  const message = pendingMessages.get(handle);
  if (!message) {
    console.warn(`RabbitMQ nack: no pending message for handle ${handle}`);
    console.log("RabbitMQ nackQueueMessage end", { handle, found: false });
    return;
  }

  const attempt = countDeath(message);
  const shouldRequeue = requeue && attempt < getMaxReceiveCount();

  ch.nack(message, false, shouldRequeue);
  pendingMessages.delete(handle);
  console.log("RabbitMQ nack", {
    handle,
    messageId: message.properties.messageId || handle,
    requeue: shouldRequeue,
    attempt,
  });
  console.log("RabbitMQ nackQueueMessage end", { handle, found: true, requeue: shouldRequeue });
};

const close = async () => {
  console.log("RabbitMQ close start");
  try {
    if (channelPromise) {
      const ch = await channelPromise;
      await ch.close();
    }
    if (connectionPromise) {
      const conn = await connectionPromise;
      await conn.close();
    }
  } catch (error) {
    console.warn("Error closing RabbitMQ client:", error.message);
  } finally {
    channelPromise = null;
    connectionPromise = null;
    pendingMessages.clear();
    console.log("RabbitMQ close end");
  }
};

module.exports = {
  name: "rabbitmq",
  sendQueueMessage,
  receiveQueueMessages,
  ackQueueMessage,
  nackQueueMessage,
  close,
  // Exposed for diagnostics / tests
  getChannel,
  getQueueName,
  getDlqName,
};
