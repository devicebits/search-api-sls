const ElasticSearchClient = require("../engines/ElasticSearch/elasticSearchClient");
const { buildQuery } = require("../utils/esHelpers");
const { logApiEvent } = require("../utils/apiLogger");

module.exports.index = async (event) => {
  const start = Date.now();
  let body;
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      logApiEvent({ type: 'error', handler: 'esSearchHandler', error: 'Invalid JSON in request body', event });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
  } else {
    body = event;
  }
  const { index, query, project, filters, aggs, from, size, langId } = body;
  logApiEvent({ type: 'request', handler: 'esSearchHandler', event: body });
  logApiEvent({
    type: 'search_query',
    handler: 'esSearchHandler',
    query,
    filters,
    aggs,
    user: event.requestContext?.authorizer?.principalId || 'anonymous',
    timestamp: new Date().toISOString()
  });
  try {
    // Build the base query using buildQuery helper
    const { query: builtQuery, ...rest } = buildQuery(query, project, langId);
    // Compose must/filter clauses
    const mustClause = [
      builtQuery
    ];
    if (filters && Object.keys(filters).length) {
      const terms = Object.entries(filters).map(([field, value]) => ({
        term: { [field]: value }
      }));
      mustClause.push(...terms);
    }
    // Compose the final query object
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
    };
    // Add aggs if present
    if (aggs && Object.keys(aggs).length) {
      finalQuery.aggs = aggs;
    }
    // Add from/size for pagination
    if (typeof from !== 'undefined') finalQuery.from = parseInt(from, 10) || 0;
    if (typeof size !== 'undefined') finalQuery.size = parseInt(size, 10) || 10;
    const esClient = new ElasticSearchClient({
      node: process.env.ELASTICSEARCH_ENDPOINT,
      index,
    });
    // Query the ElasticSearch client
    const results = await esClient.search(finalQuery);
    logApiEvent({
      type: 'response',
      handler: 'esSearchHandler',
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
      handler: 'esSearchHandler',
      status: 500,
      duration: Date.now() - start,
      error: error.message
    });
    if (error.meta && error.meta.body && error.meta.body.error) {
      console.error('ElasticSearch index error:', JSON.stringify(error.meta.body.error, null, 2));
    } else {
      console.error('ElasticSearch index error:', error);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.meta && error.meta.body && error.meta.body.error ? error.meta.body.error : undefined
      }),
    };
  }
};
