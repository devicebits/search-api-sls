const { getDbData } = require('../utils/dbClient');
const  ElasticSearchClient  = require('../engines/ElasticSearch/elasticSearchClient');

module.exports.ingest = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const { searchEngine, params } = body;

    const data = await getDbData(params);

    let client;
    switch (searchEngine?.toLowerCase()) {
      case 'elasticsearch':
        client = new ElasticSearchClient({
          node: process.env.ELASTICSEARCH_ENDPOINT,
          index: `customer-${params.id}`
        });
        break;
      default:
        throw new Error(`Unsupported search engine: ${searchEngine}`);
    }

    await client.ingest(data);

    return {
      statusCode: 200,
      body: JSON.stringify({data }),
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
