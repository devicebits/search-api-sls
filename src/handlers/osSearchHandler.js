const OpenSearchClient = require('../engines/OpenSearch/openSearchClient');
const { buildQuery } = require('../utils/esHelpers');
const { getOpenSearchClient } = require('../lib/opensearch-client');

const osClient = getOpenSearchClient();

module.exports.index = async (event) => {
  let body;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.log('Invalid JSON in event.body:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
  } else {
    body = event;
  }
  const { index, query, project, filters, aggs, from, size, langId } = body;
  console.log('Request body:', body);
  
  try {
    if (!index) {
      throw new Error('Index should be present');
    }
    const {query: builtQuery, ...rest} = buildQuery(query, project, langId);

    const mustClause = [
      { ...builtQuery },
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

    const parsedFrom = parseInt(from, 10) || 0;
    const parsedSize = parseInt(size, 10) || 10;
    const results = await osClient.search(index, finalQuery, parsedFrom, parsedSize);

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    console.log('OpenSearch index error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
