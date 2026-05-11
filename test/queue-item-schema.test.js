const test = require("node:test");
const assert = require("node:assert/strict");

const { parseJsonBody, validateQueueItemPayload } = require("../src/lib/queue-item-schema");

test("validates and normalizes queue item payloads", () => {
  const payload = validateQueueItemPayload({
    itemId: " 12345 ",
    type: "faq",
    customer: "docomopacific",
    action: "update",
  });

  assert.deepEqual(payload, {
    itemId: "12345",
    type: "faq",
    customer: "docomopacific",
    action: "update",
  });
});

test("rejects unsupported queue actions", () => {
  assert.throws(
    () =>
      validateQueueItemPayload({
        itemId: "12345",
        type: "faq",
        customer: "docomopacific",
        action: "archive",
      }),
    /Invalid queue item payload/,
  );
});

test("parseJsonBody reports invalid JSON as a client error", () => {
  assert.throws(
    () => parseJsonBody({ body: "{" }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /valid JSON/);
      return true;
    },
  );
});
