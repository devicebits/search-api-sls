/**
 * Long-running local queue worker.
 *
 * Polls the active queue provider (SQS or RabbitMQ, chosen via QUEUE_PROVIDER)
 * and funnels messages through the shared queueProcessor. Used for local dev
 * against RabbitMQ; in AWS the equivalent work happens inside the Lambda
 * triggered by the SQS event source (see src/handlers/queueWorkerHandler.js).
 */
require("dotenv").config();

const { pollQueueOnce } = require("../services/queueProcessor");
const queueClient = require("../lib/queue-client");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let stopping = false;

const startWorker = async () => {
  const idleMs = parseInt(process.env.QUEUE_WORKER_IDLE_MS || "1000", 10);
  console.log("queueWorker started", {
    source: "local-poller",
    provider: queueClient.providerName,
    idleMs,
  });

  while (!stopping) {
    try {
      console.log("queueWorker polling", {
        source: "local-poller",
        provider: queueClient.providerName,
      });

      const results = await pollQueueOnce();
      if (results.length) {
        const succeeded = results.filter((result) => result.ok).length;
        const failed = results.length - succeeded;
        console.log("queueWorker batch completed", {
          source: "local-poller",
          provider: queueClient.providerName,
          processed: results.length,
          succeeded,
          failed,
          messageIds: results.map((result) => result.messageId),
        });
      }
    } catch (error) {
      console.error("Queue worker polling failed:", error.message);
    }

    if (!stopping) await sleep(idleMs);
  }

  console.log("queueWorker stopping", {
    source: "local-poller",
    provider: queueClient.providerName,
  });
  await queueClient.close();
};

const stop = () => {
  stopping = true;
};

// Graceful shutdown on SIGINT/SIGTERM (ctrl-c, docker stop, etc.).
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

if (require.main === module) {
  startWorker().catch((error) => {
    console.error("Queue worker crashed:", error);
    process.exit(1);
  });
}

module.exports = { startWorker, stop };
