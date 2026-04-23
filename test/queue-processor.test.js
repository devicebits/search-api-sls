// Pin the queue provider before loading anything from src/lib — the queue
// client reads QUEUE_PROVIDER at require-time.
process.env.QUEUE_PROVIDER = "sqs";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getTargetIndexName,
  processQueueMessage,
  syncDocument,
} = require("../src/services/queueProcessor");
const { parseEngineList } = require("../src/lib/engines");

const sampleRow = {
  PK: 12345,
  name: "How do I reset?",
  val: "Hold the button for 10 seconds.",
  type: "faq",
  customer: "docomopacific",
  disabled: 0,
  outdated: 1,
};

const createTestEngine = (overrides = {}) => ({
  name: "opensearch",
  create: async () => ({ body: { result: "created" } }),
  update: async () => ({ body: { result: "updated" } }),
  delete: async () => ({ body: { result: "deleted" } }),
  ...overrides,
});

test("builds target index names that match bulk ingestion's docomopacific convention", () => {
  assert.equal(
    getTargetIndexName({ customer: "docomopacific" }),
    "docomopacific",
  );
  assert.equal(
    getTargetIndexName({ customer: "docomopacificca" }),
    "docomopacificca",
  );
});

test("parseEngineList accepts only opensearch and elasticsearch", () => {
  assert.deepEqual(parseEngineList("opensearch, elasticsearch"), [
    "opensearch",
    "elasticsearch",
  ]);
  assert.deepEqual(parseEngineList(["ElasticSearch", "OpenSearch"]), [
    "elasticsearch",
    "opensearch",
  ]);
  assert.throws(() => parseEngineList("solr"), /Unknown sync engine/);
});

test("syncDocument routes create to engine.create with the parsed row", async () => {
  const calls = [];
  const engine = createTestEngine({
    create: async (...args) => {
      calls.push(["create", ...args]);
      return { body: { result: "created" } };
    },
  });

  await syncDocument(
    {
      itemId: "12345",
      type: "faq",
      customer: "docomopacific",
      action: "create",
    },
    { engines: [engine], fetchItem: async () => sampleRow },
  );

  assert.equal(calls[0][0], "create");
  assert.equal(calls[0][1], "docomopacific");
  assert.equal(calls[0][2], "12345");
  // parseRow moves PK → pk and coerces 0/1 into booleans
  assert.equal(calls[0][3].pk, 12345);
  assert.equal(calls[0][3].disabled, false);
  assert.equal(calls[0][3].outdated, true);
  assert.ok(calls[0][3].syncedAt);
});

test("syncDocument routes update to engine.update", async () => {
  const calls = [];
  const engine = createTestEngine({
    update: async (...args) => {
      calls.push(["update", ...args]);
      return { body: { result: "updated" } };
    },
  });

  await syncDocument(
    {
      itemId: "12345",
      type: "faq",
      customer: "docomopacific",
      action: "update",
    },
    { engines: [engine], fetchItem: async () => sampleRow },
  );

  assert.equal(calls[0][0], "update");
  assert.equal(calls[0][1], "docomopacific");
});

test("syncDocument routes delete to engine.delete and skips the MySQL fetch", async () => {
  const calls = [];
  let fetchCalls = 0;
  const engine = createTestEngine({
    delete: async (...args) => {
      calls.push(["delete", ...args]);
      return { body: { result: "deleted" } };
    },
  });

  await syncDocument(
    {
      itemId: "12345",
      type: "faq",
      customer: "docomopacific",
      action: "delete",
    },
    {
      engines: [engine],
      fetchItem: async () => {
        fetchCalls += 1;
        return null;
      },
    },
  );

  assert.deepEqual(calls[0], ["delete", "docomopacific", "12345"]);
  assert.equal(fetchCalls, 0, "delete should not hit MySQL");
});

test("syncDocument attempts all configured engines even when one fails", async () => {
  const calls = [];
  const engines = [
    {
      name: "opensearch",
      update: async () => {},
      delete: async () => {},
      create: async (...args) => {
        calls.push(["opensearch", ...args]);
        throw new Error("OpenSearch is on fire");
      },
    },
    {
      name: "elasticsearch",
      update: async () => {},
      delete: async () => {},
      create: async (...args) => {
        calls.push(["elasticsearch", ...args]);
        return { result: "created" };
      },
    },
  ];

  const result = await syncDocument(
    {
      itemId: "12345",
      type: "faq",
      customer: "docomopacific",
      action: "create",
    },
    { engines, fetchItem: async () => sampleRow },
  );

  assert.deepEqual(
    result.outcomes.map((outcome) => [outcome.engine, outcome.ok]),
    [
      ["opensearch", false],
      ["elasticsearch", true],
    ],
  );

  assert.deepEqual(
    calls.map((call) => call[0]),
    ["opensearch", "elasticsearch"],
  );
  assert.equal(calls[1][1], "docomopacific");
  assert.equal(calls[1][2], "12345");
});

test("syncDocument throws only when all configured engines fail", async () => {
  const engines = [
    {
      name: "opensearch",
      create: async () => {
        throw new Error("OpenSearch is on fire");
      },
      update: async () => {},
      delete: async () => {},
    },
    {
      name: "elasticsearch",
      create: async () => {
        throw new Error("Elasticsearch is on fire");
      },
      update: async () => {},
      delete: async () => {},
    },
  ];

  await assert.rejects(
    () =>
      syncDocument(
        {
          itemId: "12345",
          type: "faq",
          customer: "docomopacific",
          action: "create",
        },
        { engines, fetchItem: async () => sampleRow },
      ),
    (error) => {
      assert.equal(error.code, "SEARCH_ENGINE_SYNC_FAILED");
      assert.deepEqual(
        error.outcomes.map((outcome) => [outcome.engine, outcome.ok]),
        [
          ["opensearch", false],
          ["elasticsearch", false],
        ],
      );
      return true;
    },
  );
});

test("syncDocument throws ROW_NOT_FOUND when the MySQL row is missing", async () => {
  await assert.rejects(
    () =>
      syncDocument(
        {
          itemId: "999",
          type: "faq",
          customer: "docomopacific",
          action: "create",
        },
        { fetchItem: async () => null },
      ),
    (error) => {
      assert.equal(error.code, "ROW_NOT_FOUND");
      return true;
    },
  );
});

test("processQueueMessage acks on success", async () => {
  const acked = [];
  const engine = createTestEngine();

  const result = await processQueueMessage(
    {
      id: "msg-1",
      body: JSON.stringify({
        itemId: "12345",
        type: "faq",
        customer: "docomopacific",
        action: "update",
      }),
      handle: "handle-1",
    },
    {
      engines: [engine],
      fetchItem: async () => sampleRow,
      ackMessage: async (h) => acked.push(h),
      nackMessage: async () => {
        throw new Error("nack should not be called on success");
      },
    },
  );

  assert.equal(result.payload.itemId, "12345");
  assert.deepEqual(acked, ["handle-1"]);
});

test("processQueueMessage nacks with requeue=false on malformed JSON", async () => {
  const nacks = [];

  await assert.rejects(() =>
    processQueueMessage(
      { id: "bad", body: "{not-json", handle: "bad-handle" },
      {
        ackMessage: async () => {
          throw new Error("ack should not be called on error");
        },
        nackMessage: async (h, opts) => nacks.push([h, opts]),
      },
    ),
  );

  assert.equal(nacks.length, 1);
  assert.equal(nacks[0][0], "bad-handle");
  assert.equal(nacks[0][1].requeue, false);
});

test("processQueueMessage nacks with requeue=true when sync fails", async () => {
  const nacks = [];
  const engine = createTestEngine({
    create: async () => {
      throw new Error("OpenSearch is on fire");
    },
  });

  await assert.rejects(() =>
    processQueueMessage(
      {
        id: "msg-2",
        body: JSON.stringify({
          itemId: "12345",
          type: "faq",
          customer: "docomopacific",
          action: "create",
        }),
        handle: "handle-2",
      },
      {
        engines: [engine],
        fetchItem: async () => sampleRow,
        ackMessage: async () => {
          throw new Error("ack should not be called on failure");
        },
        nackMessage: async (h, opts) => nacks.push([h, opts]),
      },
    ),
  );

  assert.equal(nacks.length, 1);
  assert.equal(nacks[0][0], "handle-2");
  assert.equal(nacks[0][1].requeue, true);
});

test("processQueueMessage acks when at least one configured engine succeeds", async () => {
  const acked = [];
  const nacks = [];
  const engines = [
    {
      name: "opensearch",
      create: async () => {
        throw new Error("OpenSearch is on fire");
      },
      update: async () => {},
      delete: async () => {},
    },
    {
      name: "elasticsearch",
      create: async () => ({ body: { result: "created" } }),
      update: async () => {},
      delete: async () => {},
    },
  ];

  const result = await processQueueMessage(
    {
      id: "msg-4",
      body: JSON.stringify({
        itemId: "12345",
        type: "faq",
        customer: "docomopacific",
        action: "create",
      }),
      handle: "handle-4",
    },
    {
      engines,
      fetchItem: async () => sampleRow,
      ackMessage: async (handle) => acked.push(handle),
      nackMessage: async (handle, opts) => nacks.push([handle, opts]),
    },
  );

  assert.equal(result.payload.itemId, "12345");
  assert.deepEqual(acked, ["handle-4"]);
  assert.deepEqual(nacks, []);
  assert.deepEqual(
    result.outcome.outcomes.map((outcome) => [outcome.engine, outcome.ok]),
    [
      ["opensearch", false],
      ["elasticsearch", true],
    ],
  );
});

test("processQueueMessage honors skipAck for Lambda SQS trigger path", async () => {
  const engine = createTestEngine();

  const result = await processQueueMessage(
    {
      id: "msg-3",
      body: JSON.stringify({
        itemId: "12345",
        type: "faq",
        customer: "docomopacific",
        action: "update",
      }),
      handle: "handle-3",
    },
    {
      engines: [engine],
      fetchItem: async () => sampleRow,
      skipAck: true,
      ackMessage: async () => {
        throw new Error("ackMessage should not be called with skipAck=true");
      },
      nackMessage: async () => {
        throw new Error("nackMessage should not be called with skipAck=true");
      },
    },
  );

  assert.equal(result.payload.itemId, "12345");
});
