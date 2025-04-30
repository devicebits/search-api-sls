const ElasticSearchClient = require('../engines/ElasticSearch/elasticSearchClient');

module.exports.getAllDocuments = async (event) => {
  try {
    const { index } = event.queryStringParameters;

    if (!index) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Index parameter is required' }),
      };
    }

    const client = new ElasticSearchClient({
      node: process.env.ELASTICSEARCH_ENDPOINT,
      index,  
    });

    const documents = await client.getAllDocuments();

    return {
      statusCode: 200,
      body: JSON.stringify({ data: documents }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
