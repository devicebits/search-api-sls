
const luceneEscape = (str) =>
  str.replace(/([!\/\*\+&\|\(\)\[\]\{\}\^~\?:"])/g, '\\$1')

function buildQuery(query, langId = null) {
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
          bool: {
            should: [],
            must: [{ term: { language: 1 } }, { term: { deleted: 0 } }]
          }
        }
      }
    },
    stored_fields: [
      langId ? getLanguageCol('heading', langId, true) : 'heading_language_1',
      langId ? getLanguageCol('description', langId, true) : 'description_language_1'
    ],
    collapse: { field: 'pk' },
    highlight: buildHighlightQuery(query, langId)
  }

  return queryObject
}

function buildHighlightQuery(query, langId = null) {
  return {
    fields: {
      [langId ? getLanguageCol('heading', langId, true) : 'heading_language_1']: {
        number_of_fragments: 0
      },
      [langId ? getLanguageCol('description', langId, true) : 'description_language_1']: {
        highlight_query: {
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
