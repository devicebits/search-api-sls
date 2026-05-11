/**
 * queue-client.js resolves QUEUE_PROVIDER at require-time, so each test here
 * sets the env *before* requiring the module, then flushes the require cache
 * between tests so the next require re-runs resolveProviderName().
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const QUEUE_CLIENT_PATH = path.resolve(__dirname, "../src/lib/queue-client.js");
const PROVIDERS_DIR = path.resolve(__dirname, "../src/lib/providers");

/**
 * Drop queue-client and both providers from the require cache so the next
 * `require("../src/lib/queue-client")` re-evaluates the module with fresh env.
 */
const flushQueueModules = () => {
  for (const key of Object.keys(require.cache)) {
    if (key === QUEUE_CLIENT_PATH || key.startsWith(PROVIDERS_DIR)) {
      delete require.cache[key];
    }
  }
};

const withEnv = (overrides, fn) => {
  const saved = {};
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  flushQueueModules();

  try {
    return fn();
  } finally {
    for (const [key, original] of Object.entries(saved)) {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
    flushQueueModules();
  }
};

test("selects the SQS provider when QUEUE_PROVIDER=sqs", () => {
  withEnv(
    {
      QUEUE_PROVIDER: "sqs",
      AWS_LAMBDA_FUNCTION_NAME: undefined,
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "sqs");
    },
  );
});

test("selects the RabbitMQ provider when QUEUE_PROVIDER=rabbitmq locally", () => {
  withEnv(
    {
      QUEUE_PROVIDER: "rabbitmq",
      AWS_LAMBDA_FUNCTION_NAME: undefined,
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "rabbitmq");
    },
  );
});

test("falls back to SQS when QUEUE_PROVIDER is missing", () => {
  withEnv(
    {
      QUEUE_PROVIDER: undefined,
      AWS_LAMBDA_FUNCTION_NAME: undefined,
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "sqs");
    },
  );
});

test("falls back to SQS when QUEUE_PROVIDER is an unknown value", () => {
  withEnv(
    {
      QUEUE_PROVIDER: "kafka",
      AWS_LAMBDA_FUNCTION_NAME: undefined,
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "sqs");
    },
  );
});

test("forces SQS when running inside Lambda even if QUEUE_PROVIDER=rabbitmq", () => {
  // The Lambda guard must override any operator mistake — loading amqplib in
  // Lambda would crash cold start because there's no broker to reach.
  withEnv(
    {
      QUEUE_PROVIDER: "rabbitmq",
      AWS_LAMBDA_FUNCTION_NAME: "search-api-sls-prod-queueWorker",
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "sqs");
    },
  );
});

test("forces SQS when running inside Lambda even with an empty QUEUE_PROVIDER", () => {
  withEnv(
    {
      QUEUE_PROVIDER: "",
      AWS_LAMBDA_FUNCTION_NAME: "search-api-sls-prod-queueWorker",
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "sqs");
    },
  );
});

test("ignores an empty AWS_LAMBDA_FUNCTION_NAME so local dev still honors QUEUE_PROVIDER", () => {
  withEnv(
    {
      QUEUE_PROVIDER: "rabbitmq",
      AWS_LAMBDA_FUNCTION_NAME: "",
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "rabbitmq");
    },
  );
});

test("treats serverless-offline as local even when AWS_LAMBDA_FUNCTION_NAME is set", () => {
  withEnv(
    {
      QUEUE_PROVIDER: "rabbitmq",
      AWS_LAMBDA_FUNCTION_NAME: "search-api-sls-dev-queueItem",
      IS_OFFLINE: "true",
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      assert.equal(queueClient.providerName, "rabbitmq");
    },
  );
});

test("exposes the normalized queue-client contract", () => {
  withEnv(
    {
      QUEUE_PROVIDER: "sqs",
      AWS_LAMBDA_FUNCTION_NAME: undefined,
    },
    () => {
      const queueClient = require("../src/lib/queue-client");
      for (const fn of [
        "sendQueueMessage",
        "receiveQueueMessages",
        "ackQueueMessage",
        "nackQueueMessage",
        "close",
      ]) {
        assert.equal(
          typeof queueClient[fn],
          "function",
          `queueClient.${fn} should be a function`,
        );
      }
      assert.equal(typeof queueClient.providerName, "string");
    },
  );
});
