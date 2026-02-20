const ElasticSearchClient = require('../engines/ElasticSearch/elasticSearchClient');
const { getOpenSearchClient } = require('../lib/opensearch-client');

const osClient = getOpenSearchClient();

module.exports.index = async (event) => {
  try {
    const { index } = event.queryStringParameters;
    const { searchType } = event.pathParameters;

    if (!index) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Index parameter is required' }),
      };
    }

    switch (searchType?.toLowerCase()) {
      case 'elasticsearch': {
        const client = new ElasticSearchClient({
          node: process.env.ELASTICSEARCH_ENDPOINT,
          index,
        });
    
        const documents = await client.getAllDocuments();
    
        return {
          statusCode: 200,
          body: JSON.stringify({ data: documents }),
        };
      }

      case 'opensearch': {
        const response = await osClient.client.search({
          index,
          body: {
            query: {
              match_all: {}
            },
            size: 10000 // Adjust size as needed
          }
        });
    
        const documents = response.body.hits.hits.map(hit => hit._source);
    
        return {
          statusCode: 200,
          body: JSON.stringify({ data: documents }),
        };
      }

      default: {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unsupported search type: ${searchType}` }),
        };
      }
    }

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
