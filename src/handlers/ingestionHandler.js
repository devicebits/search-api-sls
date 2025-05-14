const { getDbData } = require('../utils/dbQueries');
const ElasticSearchClient = require('../engines/ElasticSearch/elasticSearchClient');

module.exports.index = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const { searchEngine, customerId } = body;

    const data = await getDbData(customerId);

    let client;
    switch (searchEngine?.toLowerCase()) {
      case 'elasticsearch':
        client = new ElasticSearchClient({
          node: process.env.ELASTICSEARCH_ENDPOINT,
          index: `customer-${customerId}`
        });
        break;
      default:
        throw new Error(`Unsupported search engine: ${searchEngine}`);
    }

    await client.ingest(data);

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
