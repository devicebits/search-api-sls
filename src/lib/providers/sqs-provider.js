/**
 * SQS implementation of the queue-client contract.
 * Normalizes AWS SDK responses into the shape consumed by queueProcessor.
 */
const AWS = require("aws-sdk");

const getQueueUrl = () => {
  console.log("SQS getQueueUrl start");
  if (!process.env.SQS_QUEUE_URL) {
    console.error("SQS getQueueUrl failed", {
      error: "Missing required SQS_QUEUE_URL environment variable",
    });
    throw new Error("Missing required SQS_QUEUE_URL environment variable");
  }
  const queueUrl = process.env.SQS_QUEUE_URL;
  console.log("SQS getQueueUrl end", { queueUrl });
  return queueUrl;
};

const createSqsClient = () => {
  console.log("SQS createSqsClient start");
  const config = {
    apiVersion: "2012-11-05",
    region: process.env.AWS_REGION || "us-east-1",
  };

  if (process.env.SQS_ENDPOINT) {
    config.endpoint = process.env.SQS_ENDPOINT;
    config.accessKeyId = process.env.AWS_ACCESS_KEY_ID || "x";
    config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "x";
  }

  const client = new AWS.SQS(config);
  console.log("SQS createSqsClient end", {
    region: config.region,
    hasEndpoint: !!config.endpoint,
  });
  return client;
};

let clientInstance = null;

const getClient = () => {
  console.log("SQS getClient start");
  if (!clientInstance) {
    clientInstance = createSqsClient();
  }
  console.log("SQS getClient end", { cached: !!clientInstance });
  return clientInstance;
};

/** Enqueue a JSON payload. Returns the underlying AWS SendMessage response. */
const sendQueueMessage = async (payload, client = getClient()) => {
  console.log("SQS send start", {
    queueUrl: getQueueUrl(),
    action: payload.action,
    itemId: payload.itemId,
    customer: payload.customer,
  });
  const response = await client
    .sendMessage({
      QueueUrl: getQueueUrl(),
      MessageBody: JSON.stringify(payload),
      MessageAttributes: {
        action:   { DataType: "String", StringValue: String(payload.action) },
        customer: { DataType: "String", StringValue: String(payload.customer) },
        type:     { DataType: "String", StringValue: String(payload.type) },
      },
    })
    .promise();

  console.log("SQS send done", {
    queueUrl: getQueueUrl(),
    messageId: response.MessageId,
  });
  return { messageId: response.MessageId, raw: response };
};

/** Long-poll the queue and normalize messages into { id, body, handle, attempts }. */
const receiveQueueMessages = async ({ maxMessages, waitSeconds } = {}, client = getClient()) => {
  console.log("SQS receiveQueueMessages start", { maxMessages, waitSeconds });
  const response = await client
    .receiveMessage({
      QueueUrl: getQueueUrl(),
      MaxNumberOfMessages: maxMessages ?? parseInt(process.env.SQS_MAX_MESSAGES || "10", 10),
      WaitTimeSeconds:    waitSeconds ?? parseInt(process.env.SQS_WAIT_TIME_SECONDS || "20", 10),
      VisibilityTimeout:  parseInt(process.env.SQS_VISIBILITY_TIMEOUT || "60", 10),
      MessageAttributeNames: ["All"],
      AttributeNames: ["ApproximateReceiveCount"],
    })
    .promise();

  const messages = (response.Messages || []).map((m) => ({
    id: m.MessageId,
    body: m.Body,
    handle: m.ReceiptHandle,
    attempts: parseInt(m.Attributes?.ApproximateReceiveCount ?? "1", 10),
  }));

  if (messages.length > 0) {
    console.log("SQS receive batch", {
      queueUrl: getQueueUrl(),
      count: messages.length,
      messages: messages.map((message) => ({
        messageId: message.id,
        attempts: message.attempts,
      })),
    });
  }

  console.log("SQS receiveQueueMessages end", { count: messages.length });
  return messages;
};

/** Ack a successfully processed message (SQS = delete). */
const ackQueueMessage = async (handle, client = getClient()) => {
  console.log("SQS ackQueueMessage start", { handle });
  if (!handle) throw new Error("ReceiptHandle is required to ack an SQS message");
  const response = await client.deleteMessage({ QueueUrl: getQueueUrl(), ReceiptHandle: handle }).promise();
  console.log("SQS ack", { queueUrl: getQueueUrl(), handle });
  console.log("SQS ackQueueMessage end", { handle });
  return response;
};

/**
 * Nack a message so it can be redelivered (or dropped to DLQ when redrive limit hits).
 * For SQS we simply reset visibility to 0; the redrive policy configured on the queue
 * moves the message to DLQ once ApproximateReceiveCount exceeds maxReceiveCount.
 */
const nackQueueMessage = async (handle, { requeue = true } = {}, client = getClient()) => {
  console.log("SQS nackQueueMessage start", { handle, requeue });
  if (!handle) throw new Error("ReceiptHandle is required to nack an SQS message");
  if (!requeue) {
    // Best-effort: rely on the redrive policy to drop to DLQ. Nothing to do here
    // beyond letting the message become visible again and counting as a receive.
    console.log("SQS nack", { queueUrl: getQueueUrl(), handle, requeue: false });
    console.log("SQS nackQueueMessage end", { handle, requeue: false });
    return;
  }
  const response = await client
    .changeMessageVisibility({ QueueUrl: getQueueUrl(), ReceiptHandle: handle, VisibilityTimeout: 0 })
    .promise();
  console.log("SQS nack", { queueUrl: getQueueUrl(), handle, requeue: true });
  console.log("SQS nackQueueMessage end", { handle, requeue: true });
  return response;
};

const close = async () => {
  console.log("SQS close start");
  clientInstance = null;
  console.log("SQS close end");
};

module.exports = {
  name: "sqs",
  sendQueueMessage,
  receiveQueueMessages,
  ackQueueMessage,
  nackQueueMessage,
  close,
  // Exposed for tests / advanced callers
  getClient,
  getQueueUrl,
  createSqsClient,
};
