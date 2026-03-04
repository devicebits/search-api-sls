const { getOpenSearchClient } = require("../lib/opensearch-client");
const { wrapResponse } = require("../lib/wrap-response");

const client = getOpenSearchClient();
const { buildAutoSuggestQuery } = require("../utils/esHelpers");

module.exports.index = async (event) => {
  return wrapResponse(async () => {
    try {
      const body = event.queryStringParameters;
      const queryText = body.query || body.q || "";
      const index = body.index;
      const size = 10;
      const langId = body.langId ? parseInt(body.langId, 10) : 1;
      if (!queryText) {
        throw new Error("Missing query parameter");
      }

      // Use the new buildAutoSuggestQuery for powerful autosuggestion
      const suggestQuery = buildAutoSuggestQuery(queryText, langId, size);
      console.log("suggestQuery", suggestQuery);

      const results = await client.search(index, suggestQuery, 0, size);
      const suggestions = results.results.map((hit) => hit._source);

      return {
        suggestions,
        total: results.total,
      };
    } catch (error) {
      console.error("AutoSuggest error:", error);
      throw new Error("Error processing auto-suggest request");
    }
  });
};
