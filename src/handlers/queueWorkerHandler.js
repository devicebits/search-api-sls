/**
 * Lambda handler for the SQS event source.
 *
 * SQS Lambda integration handles ack/nack via the response's batchItemFailures
 * array — so this handler runs the processor with skipAck=true and then maps
 * any failed messages into the expected response shape.
 *
 * This path only ever runs against SQS in AWS; local RabbitMQ development uses
 * src/workers/queueWorker.js instead.
 */
const { processQueueBatch } = require("../services/queueProcessor");

module.exports.index = async (event) => {
  const messages = (event.Records || []).map((record) => ({
    id: record.messageId,
    body: record.body,
    handle: record.receiptHandle,
    attempts: parseInt(record.attributes?.ApproximateReceiveCount ?? "1", 10),
  }));

  console.log("queueWorkerHandler invoked", {
    source: "sqs-lambda",
    recordCount: messages.length,
    messageIds: messages.map((message) => message.id),
  });

  const results = await processQueueBatch(messages, { skipAck: true });

  const batchItemFailures = results
    .filter((result) => !result.ok)
    .map((result) => ({ itemIdentifier: result.messageId }));

  console.log("queueWorkerHandler completed", {
    source: "sqs-lambda",
    processed: results.length,
    succeeded: results.length - batchItemFailures.length,
    failed: batchItemFailures.length,
    failedMessageIds: batchItemFailures.map((item) => item.itemIdentifier),
  });

  return {
    processed: results.length,
    succeeded: results.length - batchItemFailures.length,
    batchItemFailures,
  };
};
