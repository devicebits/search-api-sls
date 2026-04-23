const VALID_ACTIONS = new Set(["create", "update", "delete"]);

const parseJsonBody = (event) => {
  console.log("parseJsonBody start", {
    hasEvent: !!event,
    bodyType: typeof event?.body,
  });
  if (!event || event.body === undefined) {
    const result = event || {};
    console.log("parseJsonBody end", { parsedType: typeof result });
    return result;
  }

  if (typeof event.body === "object" && event.body !== null) {
    console.log("parseJsonBody end", { parsedType: "object" });
    return event.body;
  }

  try {
    const parsed = JSON.parse(event.body || "{}");
    console.log("parseJsonBody end", { parsedType: typeof parsed });
    return parsed;
  } catch (error) {
    console.error("parseJsonBody failed", { error: error.message });
    const invalidJsonError = new Error("Request body must be valid JSON");
    invalidJsonError.statusCode = 400;
    throw invalidJsonError;
  }
};

const validateQueueItemPayload = (payload) => {
  console.log("validateQueueItemPayload start", {
    payloadType: typeof payload,
    keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
  });
  const errors = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    errors.push("Payload must be a JSON object");
  } else {
    for (const field of ["itemId", "type", "customer", "action"]) {
      if (typeof payload[field] !== "string" || payload[field].trim() === "") {
        errors.push(`${field} must be a non-empty string`);
      }
    }

    if (payload.action && !VALID_ACTIONS.has(payload.action)) {
      errors.push('action must be one of "create", "update", or "delete"');
    }
  }

  if (errors.length) {
    console.error("validateQueueItemPayload failed", { errors });
    const error = new Error("Invalid queue item payload");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  const normalized = {
    itemId: payload.itemId.trim(),
    type: payload.type.trim(),
    customer: payload.customer.trim(),
    action: payload.action,
  };
  console.log("validateQueueItemPayload end", normalized);
  return normalized;
};

module.exports = {
  VALID_ACTIONS,
  parseJsonBody,
  validateQueueItemPayload,
};
