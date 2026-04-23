/**
 * Queue → OpenSearch synchronization service.
 *
 * Responsibilities:
 *   1. Parse a queue message body into a validated payload.
 *   2. For create/update: fetch the canonical row from MySQL by (type, itemId,
 *      customer), normalize it via parseRow(), and index it.
 *   3. For delete: remove the document by id (no MySQL lookup needed).
 *   4. Ack/nack the queue message via the provider-agnostic queue-client.
 *
 * All external dependencies (search engines, queue client, DB fetcher) are
 * injectable so the unit tests can run without a live broker or database.
 */
const {
  resolveEngines: resolveConfiguredEngines,
  resolveEngineSpecs: resolveConfiguredEngineSpecs,
} = require("../lib/engines");
const queueClient = require("../lib/queue-client");
const { validateQueueItemPayload } = require("../lib/queue-item-schema");
const { getItemByTypeAndId, parseRow } = require("../utils/dbQueries");

/**
 * For queue sync, `customer` is the target index name.
 */
const getTargetIndexName = ({ customer }) => {
  console.log("getTargetIndexName start", { customer });
  const index = customer;
  console.log("getTargetIndexName end", { index });
  return index;
};

/** Parse an SQS/RabbitMQ message body. Throws on invalid JSON. */
const parseMessageBody = (message) => {
  console.log("parseMessageBody start", {
    messageId: message?.id,
    bodyType: typeof message?.body,
  });
  try {
    const parsed =
      typeof message.body === "string" ? JSON.parse(message.body) : message.body;
    console.log("parseMessageBody end", {
      messageId: message?.id,
      parsedType: typeof parsed,
    });
    return parsed;
  } catch (error) {
    console.error("parseMessageBody failed", {
      messageId: message?.id,
      error: error.message,
    });
    const parseError = new Error("Queue message body must be valid JSON");
    parseError.cause = error;
    throw parseError;
  }
};

/**
 * Build the searchable document from a MySQL row.
 * Adds `syncedAt` for ops visibility.
 */
const buildDocument = (row) => {
  console.log("buildDocument start", {
    keys: row && typeof row === "object" ? Object.keys(row) : [],
  });
  const document = {
    ...parseRow(row),
    syncedAt: new Date().toISOString(),
  };
  console.log("buildDocument end", { keys: Object.keys(document) });
  return document;
};

const isEngineAdapter = (engine) =>
  engine &&
  typeof engine === "object" &&
  typeof engine.name === "string" &&
  typeof engine.create === "function" &&
  typeof engine.update === "function" &&
  typeof engine.delete === "function";

const resolveEngines = (engines) => {
  console.log("resolveEngines start", {
    kind: Array.isArray(engines) ? "array" : typeof engines,
  });
  const engineList = Array.isArray(engines) ? engines : engines ? [engines] : [];
  if (engineList.length && engineList.every(isEngineAdapter)) {
    console.log("resolveEngines end", {
      source: "provided-adapters",
      engines: engineList.map((engine) => engine.name),
    });
    return engineList;
  }
  const resolved = resolveConfiguredEngines(engines);
  console.log("resolveEngines end", {
    source: "configured-engines",
    engines: resolved.map((engine) => engine.name),
  });
  return resolved;
};

const resolveEngineSpecs = (engines) => {
  console.log("resolveEngineSpecs start", {
    kind: Array.isArray(engines) ? "array" : typeof engines,
  });
  const engineList = Array.isArray(engines) ? engines : engines ? [engines] : [];
  if (engineList.length && engineList.every(isEngineAdapter)) {
    const specs = engineList.map((engine) => ({ ok: true, name: engine.name, engine }));
    console.log("resolveEngineSpecs end", {
      source: "provided-adapters",
      engines: specs.map((spec) => spec.name),
    });
    return specs;
  }
  const specs = resolveConfiguredEngineSpecs(engines);
  console.log("resolveEngineSpecs end", {
    source: "configured-engines",
    engines: specs.map((spec) => ({
      name: spec.name,
      ok: spec.ok,
      error: spec.error?.message,
    })),
  });
  return specs;
};

const summarizeEngineResults = (settledResults) =>
  (() => {
    console.log("summarizeEngineResults start", { count: settledResults.length });
    const outcomes = settledResults.map((result) => {
      if (result.status === "fulfilled") return result.value;
      return {
        ok: false,
        engine: result.reason?.engine || "unknown",
        error: result.reason?.message || String(result.reason),
      };
    });
    console.log("summarizeEngineResults end", {
      outcomes: outcomes.map((outcome) => ({
        engine: outcome.engine,
        ok: outcome.ok,
      })),
    });
    return outcomes;
  })();

const throwIfAnyEngineFailed = (outcomes) => {
  console.log("throwIfAnyEngineFailed start", { count: outcomes.length });
  const failures = outcomes.filter((outcome) => !outcome.ok);
  if (failures.length === 0) {
    console.log("throwIfAnyEngineFailed end", { failed: 0 });
    return;
  }
  if (failures.length < outcomes.length) {
    console.log("throwIfAnyEngineFailed end", {
      failed: failures.length,
      tolerated: true,
    });
    return;
  }

  const error = new Error(
    `Failed to sync ${failures.length} search engine(s): ${failures
      .map((failure) => `${failure.engine}: ${failure.error}`)
      .join("; ")}`,
  );
  error.code = "SEARCH_ENGINE_SYNC_FAILED";
  error.outcomes = outcomes;
  console.error("throwIfAnyEngineFailed failed", {
    failures: failures.map((failure) => ({
      engine: failure.engine,
      error: failure.error,
    })),
  });
  throw error;
};

/**
 * Dispatch one payload to each configured search engine based on its `action`.
 * For create/update, the MySQL row must exist; for delete we skip the fetch.
 * Engine writes are launched in parallel and collected with allSettled so one
 * failed backend cannot stop the other backend from syncing.
 */
const syncDocument = async (
  payload,
  {
    engines,
    fetchItem = getItemByTypeAndId,
  } = {},
) => {
  const index = getTargetIndexName(payload);
  const docId = String(payload.itemId);
  console.log("Sync start", {
    action: payload.action,
    itemId: payload.itemId,
    type: payload.type,
    customer: payload.customer,
    index,
  });

  let document;
  if (payload.action !== "delete") {
    const row = await fetchItem({
      type: payload.type,
      customer: payload.customer,
      itemId: payload.itemId,
    });

    if (!row) {
      const notFound = new Error(
        `MySQL row not found for ${payload.type}:${payload.itemId} (customer=${payload.customer})`,
      );
      notFound.code = "ROW_NOT_FOUND";
      throw notFound;
    }

    document = buildDocument(row);
    console.log("Sync document built", {
      itemId: payload.itemId,
      index,
      action: payload.action,
      fields: Object.keys(document),
    });
  }

  const engineSpecs = resolveEngineSpecs(engines);

  const runEngine = async (engine) => {
    try {
      console.log("Sync engine start", {
        engine: engine.name,
        action: payload.action,
        index,
        docId,
      });
      let result;
      switch (payload.action) {
        case "delete":
          result = await engine.delete(index, docId);
          break;
        case "create":
          result = await engine.create(index, docId, document);
          break;
        case "update":
          result = await engine.update(index, docId, document);
          break;
        default:
          throw new Error(`Unsupported queue action: ${payload.action}`);
      }
      console.log("Sync engine success", {
        engine: engine.name,
        action: payload.action,
        index,
        docId,
      });
      return { ok: true, engine: engine.name, action: payload.action, index, docId, result };
    } catch (error) {
      console.error("Sync engine failed", {
        engine: engine.name,
        action: payload.action,
        index,
        docId,
        error: error.message,
      });
      error.engine = engine.name;
      throw error;
    }
  };

  const engineResults = await Promise.allSettled(
    engineSpecs.map(async (spec) => {
      if (!spec.ok) {
        const error = spec.error;
        error.engine = spec.name;
        throw error;
      }
      return runEngine(spec.engine);
    }),
  );
  const outcomes = summarizeEngineResults(engineResults);
  console.log("Sync outcomes", {
    action: payload.action,
    index,
    docId,
    outcomes: outcomes.map((outcome) => ({
      engine: outcome.engine,
      ok: outcome.ok,
      error: outcome.error,
    })),
  });
  throwIfAnyEngineFailed(outcomes);

  const result = { action: payload.action, index, docId, outcomes };
  console.log("Sync end", {
    action: payload.action,
    index,
    docId,
  });
  return result;
};

/**
 * Process a single normalized message. Acks on success, nacks on failure.
 * Tests may pass a `skipAck: true` flag when the transport manages ack
 * externally (e.g. Lambda SQS trigger via batchItemFailures).
 */
const processQueueMessage = async (
  message,
  {
    engines,
    fetchItem,
    ackMessage = queueClient.ackQueueMessage,
    nackMessage = queueClient.nackQueueMessage,
    skipAck = false,
  } = {},
) => {
  console.log("processQueueMessage start", {
    messageId: message?.id,
    handle: message?.handle,
    skipAck,
  });
  let payload;
  try {
    payload = validateQueueItemPayload(parseMessageBody(message));
    console.log("Process queue message parsed", {
      messageId: message.id,
      handle: message.handle,
      attempts: message.attempts,
      action: payload.action,
      itemId: payload.itemId,
      customer: payload.customer,
    });
  } catch (error) {
    // Malformed payload cannot become valid through retry — drop to DLQ.
    if (!skipAck && message.handle) {
      await nackMessage(message.handle, { requeue: false });
    }
    console.error("processQueueMessage failed during parse", {
      messageId: message?.id,
      error: error.message,
    });
    throw error;
  }

  try {
    const outcome = await syncDocument(payload, { engines, fetchItem });

    if (!skipAck && message.handle) {
      await ackMessage(message.handle);
    }

    console.log("Processed queue item", {
      messageId: message.id,
      itemId: payload.itemId,
      action: payload.action,
      customer: payload.customer,
      index: outcome.index,
      engines: outcome.outcomes?.map((engineOutcome) => ({
        engine: engineOutcome.engine,
        ok: engineOutcome.ok,
      })),
    });

    const result = { payload, outcome };
    console.log("processQueueMessage end", {
      messageId: message.id,
      ok: true,
    });
    return result;
  } catch (error) {
    console.error("Failed to sync queue item", {
      messageId: message.id,
      itemId: payload?.itemId,
      action: payload?.action,
      error: error.message,
      outcomes: error.outcomes?.map((engineOutcome) => ({
        engine: engineOutcome.engine,
        ok: engineOutcome.ok,
        error: engineOutcome.error,
      })),
    });
    if (!skipAck && message.handle) {
      await nackMessage(message.handle, { requeue: true });
    }
    console.error("processQueueMessage end", {
      messageId: message?.id,
      ok: false,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Process a batch of messages (one-by-one for predictable error isolation).
 * Returns per-message outcome for the caller to report on.
 */
const processQueueBatch = async (messages, dependencies = {}) => {
  console.log("processQueueBatch start", { count: messages.length });
  const results = [];

  for (const message of messages) {
    try {
      const { payload, outcome } = await processQueueMessage(message, dependencies);
      results.push({ ok: true, messageId: message.id, payload, outcome });
    } catch (error) {
      results.push({ ok: false, messageId: message.id, error: error.message });
    }
  }

  console.log("processQueueBatch end", {
    count: results.length,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  });
  return results;
};

/** Long-poll/pull one batch from the active queue provider and process it. */
const pollQueueOnce = async (dependencies = {}) => {
  console.log("pollQueueOnce start");
  const messages = await queueClient.receiveQueueMessages({
    maxMessages: parseInt(process.env.QUEUE_BATCH_SIZE || "10", 10),
  });
  if (messages.length === 0) {
    console.log("pollQueueOnce end", { count: 0 });
    return [];
  }
  const results = await processQueueBatch(messages, dependencies);
  console.log("pollQueueOnce end", { count: results.length });
  return results;
};

module.exports = {
  buildDocument,
  getTargetIndexName,
  parseMessageBody,
  pollQueueOnce,
  processQueueBatch,
  processQueueMessage,
  syncDocument,
};
