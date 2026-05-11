process.env.QUEUE_PROVIDER = "sqs";

const test = require("node:test");
const assert = require("node:assert/strict");

const { index } = require("../src/handlers/queueWorkerHandler");

test("queueWorkerHandler reports only failed SQS records for retry", async () => {
  const response = await index({
    Records: [
      {
        messageId: "bad-message",
        body: "{",
        receiptHandle: "receipt-1",
        attributes: { ApproximateReceiveCount: "1" },
      },
    ],
  });

  assert.equal(response.processed, 1);
  assert.equal(response.succeeded, 0);
  assert.deepEqual(response.batchItemFailures, [
    { itemIdentifier: "bad-message" },
  ]);
});

test("queueWorkerHandler returns empty batchItemFailures for an empty event", async () => {
  const response = await index({});
  assert.equal(response.processed, 0);
  assert.deepEqual(response.batchItemFailures, []);
});
