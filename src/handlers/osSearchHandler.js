const OpenSearchClient = require('../engines/OpenSearch/openSearchClient');
const { buildQuery } = require('../utils/esHelpers');
const { getOpenSearchClient } = require('../lib/opensearch-client');

const osClient = getOpenSearchClient();
module.exports.index = async (event) => {
  try {
    const { index, query, from, size, langId } = event.queryStringParameters;
    if (!index) {
        throw new Error('Index should be present');
    }
    const updatedQuery = buildQuery(query, langId);
    const parsedFrom = parseInt(from, 10) || 0;
    const parsedSize = parseInt(size, 10) || 10;
    const results = await osClient.search(index, updatedQuery, parsedFrom, parsedSize);

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
