const OpenSearchClient = require('../engines/OpenSearch/openSearchClient');
const { buildQuery } = require('../utils/osHelpers');
const { getOpenSearchClient } = require('../lib/opensearch-client');
const { logApiEvent } = require('../utils/apiLogger');

const osClient = getOpenSearchClient();

module.exports.index = async (event) => {
  const start = Date.now();
  let body;
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      logApiEvent({ type: 'error', handler: 'osSearchHandler', error: 'Invalid JSON in request body', event });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
  } else {
    body = event;
  }
  const { index, query, project, filters, aggs, from, size, langId } = body;
  logApiEvent({ type: 'request', handler: 'osSearchHandler', event: body });
  logApiEvent({
    type: 'search_query',
    handler: 'osSearchHandler',
    query,
    filters,
    aggs,
    user: event.requestContext?.authorizer?.principalId || 'anonymous',
    timestamp: new Date().toISOString()
  });
  try {
    if (!index) {
      throw new Error('Index should be present');
    }
    const {query: builtQuery, ...rest} = buildQuery(query, project, langId);

    const mustClause = [
      builtQuery
    ]

    if (filters && Object.keys(filters).length) {
      const terms = Object.entries(filters).map(([field, value]) => ({
        term: { [field]: value }
      }));
      mustClause.push(...terms);
    }
    
    const finalQuery = {
      query: {
        bool: {
          must: [
            {
              bool: {
                must: mustClause
              }
            }
          ]
        }
      },
      ...rest
    }

    if (aggs && Object.keys(aggs).length) {
     finalQuery.aggs = aggs; 
    }

    // Add from/size for pagination
    if (typeof from !== 'undefined') finalQuery.from = parseInt(from, 10) || 0;
    if (typeof size !== 'undefined') finalQuery.size = parseInt(size, 10) || 10;
    
    // Query the OpenSearch client
    const results = await osClient.search(
      index,
      finalQuery,
      finalQuery.from,
      finalQuery.size
    );

    logApiEvent({
      type: 'response',
      handler: 'osSearchHandler',
      status: 200,
      duration: Date.now() - start,
      response: results
    });
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    logApiEvent({
      type: 'error',
      handler: 'osSearchHandler',
      status: 500,
      duration: Date.now() - start,
      error: error.message
    });
    console.log('OpenSearch index error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
