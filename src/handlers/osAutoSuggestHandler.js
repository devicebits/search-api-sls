const { getOpenSearchClient } = require("../lib/opensearch-client");

const client = getOpenSearchClient();
const { buildAutoSuggestQuery } = require("../utils/esHelpers");

module.exports.index = async (event) => {
  try {
    const body = event.queryStringParameters;
    const queryText = body.query || body.q || "";
    const index = body.index;
    const size = 10;
    const langId = body.langId ? parseInt(body.langId, 10) : 1;
    if (!queryText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing query parameter" }),
      };
    }

    // Use the new buildAutoSuggestQuery for powerful autosuggestion
    const suggestQuery = buildAutoSuggestQuery(queryText, langId, size);
    console.log("suggestQuery", suggestQuery);

    const results = await client.search(index, suggestQuery, 0, size);
    const suggestions = results.results.map((hit) => hit._source);

    return {
      statusCode: 200,
      body: JSON.stringify({
        suggestions,
        total: results.total,
      }),
    };
  } catch (error) {
    console.error("AutoSuggest error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
