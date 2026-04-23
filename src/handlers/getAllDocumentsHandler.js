const ElasticSearchClient = require('../engines/ElasticSearch/elasticSearchClient');
const { getOpenSearchClient } = require('../lib/opensearch-client');

const DEFAULT_SEARCH_TYPE = 'elasticsearch';

const resolveSearchType = (event) => {
  const raw = event?.pathParameters?.searchType ?? event?.queryStringParameters?.searchType;

  if (typeof raw !== 'string' || raw.trim() === '') {
    return DEFAULT_SEARCH_TYPE;
  }

  return raw.trim().toLowerCase();
};

module.exports.index = async (event) => {
  try {
    const { index } = event.queryStringParameters || {};
    const searchType = resolveSearchType(event);

    if (!index) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Index parameter is required' }),
      };
    }

    switch (searchType) {
      case 'elasticsearch': {
        const client = new ElasticSearchClient({
          node: process.env.ELASTICSEARCH_ENDPOINT,
          index,
        });

        const documents = await client.getAllDocuments();

        return {
          statusCode: 200,
          body: JSON.stringify({ data: documents, searchType }),
        };
      }

      case 'opensearch': {
        const osClient = getOpenSearchClient();
        const response = await osClient.search(index, { query: { match_all: {} } }, 0, 10000);

        return {
          statusCode: 200,
          body: JSON.stringify({ data: response, searchType }),
        };
      }

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: `Unsupported searchType: ${searchType}. Expected "elasticsearch" or "opensearch".`,
          }),
        };
    }
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
