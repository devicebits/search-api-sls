const { parseJsonBody, validateQueueItemPayload } = require("../lib/queue-item-schema");
const { sendQueueMessage, providerName } = require("../lib/queue-client");

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
  },
  body: JSON.stringify(body),
});

module.exports.index = async (event) => {
  console.log("queueItemHandler.index start", {
    provider: providerName,
    hasBody: event?.body !== undefined,
  });
  try {
    const payload = validateQueueItemPayload(parseJsonBody(event));
    console.log("Queue item request accepted", {
      provider: providerName,
      action: payload.action,
      itemId: payload.itemId,
      type: payload.type,
      customer: payload.customer,
    });
    const result = await sendQueueMessage(payload);
    console.log("Queue item sent", {
      provider: providerName,
      messageId: result.messageId,
      action: payload.action,
      itemId: payload.itemId,
      customer: payload.customer,
    });

    const response = jsonResponse(202, {
      message: "Queue item accepted",
      messageId: result.messageId,
      provider: providerName,
      item: payload,
    });
    console.log("queueItemHandler.index end", {
      provider: providerName,
      statusCode: response.statusCode,
      messageId: result.messageId,
    });
    return response;
  } catch (error) {
    console.error("Queue item request failed:", error);

    const response = jsonResponse(error.statusCode || 500, {
      message: error.statusCode ? error.message : "Failed to queue item",
      details: error.details,
    });
    console.log("queueItemHandler.index end", {
      provider: providerName,
      statusCode: response.statusCode,
      failed: true,
    });
    return response;
  }
};
