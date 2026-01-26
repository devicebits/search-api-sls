const luceneEscape = (str) =>
  str.replace(/([!\/\*\+&\|\(\)\[\]\{\}\^~\?:"])/g, '\\$1');

const ACAD = 'acad';
const CA = 'ca';

const projectQueryFilters = {
  [ACAD]: { // ==> for SelfService
    bool: {
      should: [],
      must: [{ term: { language: 1 } }, { term: { deleted: 0 } }]
    }
  },
  [CA]: { // ==> for AgentAI
    bool: {
      must: [
        { term: { deleted: 0 } },
        {
          bool: {
            should: [
              { term: { type: 'faq' } },
              { term: { type: 'tutorial' } }
            ]
          }
        }
      ]
    }
  }
}

function buildQuery(query, project = null, langId = null) {
  query = query.replace(/\//g, ' ')

  const functionScoreQueries = {
    function_score: {
      query: {
        bool: {
          should: [
            {
              constant_score: {
                filter: {
                  match: {
                    [langId ? getLanguageCol(
                      'classification',
                      langId,
                      true
                    ) : 'classification_language_1']: query
                  }
                },
                boost: 3
              }
            },
            {
              function_score: {
                query: {
                  match_phrase: {
                    [langId ? getLanguageCol('heading', langId, true) : 'heading_language_1']: query
                  }
                },
                boost: 2
              }
            },
            { match: { device: query } },
          ]
        }
      },
      boost: 12
    }
  }

  if (project === CA) { // used for agentai-web only
    functionScoreQueries.function_score.query.bool.should.push(
      { match: { name: query } }
    )
  }

  const queryObject = {
    query: {
      bool: {
        should: [
          {
            ...functionScoreQueries
          },
          { term: { device: 'general' } },
          {
            query_string: {
              query,
              default_field: langId ? getLanguageCol('heading', langId, true) : 'heading_language_1',
              minimum_should_match: '95%',
              boost: 6
            }
          },
          {
            query_string: {
              query,
              default_field: langId ? getLanguageCol('heading', langId, true) : 'heading_language_1',
              minimum_should_match: '2',
              boost: 4
            }
          },
          {
            query_string: {
              query,
              default_field: langId ? getLanguageCol('heading', langId, true) : 'heading_language_1',
              boost: 2
            }
          }
        ],
        must: [
          {
            match: {
              [langId ? getLanguageCol('all_content', langId, true) : 'all_content_language_1']: {
                query,
                minimum_should_match: '3<-75% 9<-85%'
              }
            }
          }
        ],
        filter: {
          bool: (projectQueryFilters[project]?.bool) || projectQueryFilters['acad'].bool
        }
      }
    },
    stored_fields: [
      langId ? getLanguageCol('heading', langId, true) : 'heading_language_1',
      langId ? getLanguageCol('description', langId, true) : 'description_language_1'
    ],
    highlight: buildHighlightQuery(query, project, langId),
    _source: { includes: ['*'], excludes: [] }
  }

  return queryObject
}

function buildHighlightQuery(query, project = null, langId = null) {
  return {
    fields: {
      [langId ? getLanguageCol('heading', langId, true) : 'heading_language_1']: {
        number_of_fragments: 0
      },
      [langId ? getLanguageCol('description', langId, true) : 'description_language_1']: {
        highlight_query: project === CA ? {
          query_string: {
            fields: ['description_language_1'],
            query: luceneEscape(query)
          }
        } : {
          bool: {
            must: [
              { match: { [langId ? getLanguageCol('description', langId, true) : 'description_language_1']: luceneEscape(query) } }
            ]
          }
        }
      }
    }
  }
}

function getLanguageCol(colName, langIndex = 1, longFormat = false) {
  if (langIndex === 1 && longFormat === false) {
    return colName
  }
  return `${colName}_language_${langIndex}`
}


module.exports = { buildQuery }
