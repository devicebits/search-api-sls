const OpenSearchClient = require('../engines/OpenSearch/openSearchClient');
const { buildQuery } = require('../utils/esHelpers');

const config = {
  host: process.env.OPENSEARCH_HOST,
  port: parseInt(process.env.OPENSEARCH_PORT) || 443,
  region: process.env.AWS_REGION || 'us-east-1',
};
const osClient = new OpenSearchClient(config);
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
