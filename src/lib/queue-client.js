/**
 * Queue-client facade.
 *
 * Picks a backend at module load based on QUEUE_PROVIDER:
 *   - "sqs"      -> AWS SQS (default; production / Lambda)
 *   - "rabbitmq" -> RabbitMQ via amqplib (local dev with docker-compose)
 *
 * All consumers of this module speak a single normalized contract:
 *   sendQueueMessage(payload)             -> { messageId, raw }
 *   receiveQueueMessages(opts)            -> [{ id, body, handle, attempts }]
 *   ackQueueMessage(handle)               -> void
 *   nackQueueMessage(handle, { requeue }) -> void
 */

const withLifecycleLogs = (name, fn) => (...args) => {
  console.log(`${name} start`);
  try {
    const result = fn(...args);
    if (result && typeof result.then === "function") {
      return result
        .then((value) => {
          console.log(`${name} end`);
          return value;
        })
        .catch((error) => {
          console.error(`${name} failed`, { error: error.message });
          throw error;
        });
    }
    console.log(`${name} end`);
    return result;
  } catch (error) {
    console.error(`${name} failed`, { error: error.message });
    throw error;
  }
};

const isServerlessOffline = withLifecycleLogs("isServerlessOffline", () => {
  const raw = process.env.IS_OFFLINE;
  return raw === "true" || raw === "1";
});

const isRunningInLambda = withLifecycleLogs("isRunningInLambda", () => {
  return (
    !isServerlessOffline() &&
    typeof process.env.AWS_LAMBDA_FUNCTION_NAME === "string" &&
    process.env.AWS_LAMBDA_FUNCTION_NAME.length > 0
  );
});

const resolveProviderName = withLifecycleLogs("resolveProviderName", () => {
  if (isRunningInLambda()) {
    if (
      process.env.QUEUE_PROVIDER &&
      process.env.QUEUE_PROVIDER.toLowerCase() !== "sqs"
    ) {
      console.warn(
        `Ignoring QUEUE_PROVIDER="${process.env.QUEUE_PROVIDER}" - running in Lambda, forcing "sqs".`,
      );
    }
    return "sqs";
  }

  const raw = (process.env.QUEUE_PROVIDER || "sqs").trim().toLowerCase();
  if (raw === "sqs" || raw === "rabbitmq") return raw;
  console.warn(`Unknown QUEUE_PROVIDER="${raw}" - falling back to "sqs".`);
  return "sqs";
});

const loadProvider = withLifecycleLogs("loadProvider", (name) => {
  switch (name) {
    case "rabbitmq":
      return require("./providers/rabbitmq-provider");
    case "sqs":
    default:
      return require("./providers/sqs-provider");
  }
});

const providerName = resolveProviderName();
const provider = loadProvider(providerName);

console.log(`Queue provider: ${provider.name}`);

module.exports = {
  providerName: provider.name,
  sendQueueMessage: withLifecycleLogs("queueClient.sendQueueMessage", (...args) =>
    provider.sendQueueMessage(...args),
  ),
  receiveQueueMessages: withLifecycleLogs("queueClient.receiveQueueMessages", (...args) =>
    provider.receiveQueueMessages(...args),
  ),
  ackQueueMessage: withLifecycleLogs("queueClient.ackQueueMessage", (...args) =>
    provider.ackQueueMessage(...args),
  ),
  nackQueueMessage: withLifecycleLogs("queueClient.nackQueueMessage", (...args) =>
    provider.nackQueueMessage(...args),
  ),
  close: withLifecycleLogs("queueClient.close", (...args) => provider.close(...args)),
  _provider: provider,
};
