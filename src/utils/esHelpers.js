
const luceneEscape = (str) =>
  str.replace(/([!\/\*\+&\|\(\)\[\]\{\}\^~\?:"])/g, '\\$1')

function buildQuery(query) {
  console.log("buildQuery triggered =>")
  query = query.replace(/\//g, ' ')
  const queryObject = {
    query: {
      bool: {
        should: [
          {
            function_score: {
              query: {
                bool: {
                  should: [
                    {
                      constant_score: {
                        filter: {
                          match: {
                            classification_language_1: query
                          }
                        },
                        boost: 3
                      }
                    },
                    {
                      function_score: {
                        query: {
                          match_phrase: {
                            heading_language_1: query
                          }
                        },
                        boost: 2
                      }
                    },
                    { match: { device: query } }
                  ]
                }
              },
              boost: 12
            }
          },
          { term: { device: 'general' } },
          {
            query_string: {
              query,
              default_field: 'heading_language_1',
              minimum_should_match: '95%',
              boost: 6
            }
          },
          {
            query_string: {
              query,
              default_field: 'heading_language_1',
              minimum_should_match: '2',
              boost: 4
            }
          },
          {
            query_string: {
              query,
              default_field: 'heading_language_1',
              boost: 2
            }
          }
        ],
        must: [
          {
            match: {
              all_content_language_1: {
                query,
                minimum_should_match: '3<-75% 9<-85%'
              }
            }
          }
        ],
        filter: {
          bool: {
            should: [],
            must: [{ term: { language: 1 } }, { term: { deleted: 0 } }]
          }
        }
      }
    },
    stored_fields: [
      'heading_language_1',
      'description_language_1'
    ],
    collapse: { field: 'pk' },
    highlight: buildHighlightQuery(query)
  }

  return queryObject
}

function buildHighlightQuery(query) {
  return {
    fields: {
      heading_language_1: {
        number_of_fragments: 0
      },
      description_language_1: {
        highlight_query: {
          bool: {
            must: [
              { match: { description_language_1: query } }
            ]
          }
        }
      }
    }
  }
}

module.exports = { buildQuery }
