#!/bin/bash

# Usage: ./create-test-index.sh [host:port] [index_name]
# Example: ./create-test-index.sh localhost:9201 test-index

OS_HOST="${1:-localhost:9201}"
INDEX_NAME="${2:-test-index}"

echo "=== Creating Index: $INDEX_NAME ==="
echo "OpenSearch Host: $OS_HOST"
echo ""

# Delete index if it exists
echo "Cleaning up existing index (if any)..."
curl -s -X DELETE "http://${OS_HOST}/${INDEX_NAME}?pretty"
echo ""

# Create index with production-like mapping and analyzers
echo "Creating index with production mapping..."
curl -s -X PUT "http://${OS_HOST}/${INDEX_NAME}?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 2,
        "refresh_interval": "-1", // Explicitly setting to null as in the original
        "analysis": {
            "char_filter": {
                "remove_trailing_delimiters": {
                    "type": "pattern_replace",
                    "pattern": "\\p{Punct}$",
                    "replacement": ""
                },
                "replace_slashes": {
                    "type": "pattern_replace",
                    "pattern": "/",
                    "replacement": " "
                }
            },
            "filter": {
                "bigrams": {
                    "type": "shingle",
                    "output_unigrams": false // Note: boolean false, not string
                },
                "trigrams": {
                    "type": "shingle",
                    "min_shingle_size": 2,
                    "max_shingle_size": 3
                },
                "prefix_ngrams": {
                    "type": "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 15
                },
                "infix_ngrams": { // This was defined but not used in analyzers, included for completeness
                    "type": "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 15
                },
                "en_protected_keywords": {
                    "type": "keyword_marker",
                    "keywords": "en_protected_keywords.txt"
                },
                "en_possessive_stemmer": {
                    "type": "stemmer",
                    "language": "possessive_english"
                },
                "es_protected_keywords": {
                    "type": "keyword_marker",
                    "keywords": "es_protected_keywords.txt"
                },
                "en_classification_synonyms": {
                    "type": "synonym_graph",
                    "synonyms": "en_classification_synonyms.txt"
                },
                "es_classification_synonyms": {
                    "type": "synonym_graph",
                    "synonyms": "es_classification_synonyms.txt"
                },
                "en_classification_stopwords": {
                    "type": "stop", // Changed from "syn-stopwords"
                    "stopwords": "en_classification_stopwords.txt"
                },
                "es_classification_stopwords": {
                    "type": "stop", // Changed from "syn-stopwords"
                    "stopwords": "es_classification_stopwords.txt"
                },
                "device_stopwords": {
                    "type": "stop",
                    "stopwords": "device_stopwords.txt"
                },
                "en_stopwords": {
                    "type": "stop", // Changed from "syn-stopwords"
                    "stopwords": "en_stopwords.txt"
                },
                "es_stopwords": {
                    "type": "stop", // Changed from "syn-stopwords"
                    "stopwords": "_spanish_"
                },
                "en_synonyms": {
                    "type": "synonym_graph",
                    "synonyms": "en_synonyms.txt",
                    "expand": true
                },
                "es_synonyms": {
                    "type": "synonym_graph",
                    "synonyms": "es_synonyms.txt",
                    "expand": true
                },
                "en_stemmer": {
                    "type": "stemmer",
                    "language": "english"
                },
                "es_stemmer": {
                    "type": "stemmer",
                    "language": "light_spanish"
                },
                "word_parts": {
                    "type": "word_delimiter_graph",
                    "catenate_all": false,
                    "generate_word_parts": true,
                    "generate_number_parts": false
                },
                "collapse": {
                    "type": "word_delimiter_graph",
                    "catenate_all": true,
                    "generate_word_parts": false,
                    "generate_number_parts": false
                }
            },
            "analyzer": {
                "device_analyzer": {
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "device_stopwords"
                    ]
                },
                "trigrams": {
                    "tokenizer": "standard",
                    "filter": ["lowercase", "trigrams"]
                },
                "en_prefix_phrase_ngrams_index_analyzer": {
                    "tokenizer": "keyword",
                    "filter": [
                        "lowercase",
                        "prefix_ngrams",
                        "collapse"
                    ]
                },
                "en_prefix_phrase_ngrams_query_analyzer": {
                    "tokenizer": "keyword",
                    "filter": [
                        "lowercase",
                        "en_stopwords",
                        "collapse"
                    ]
                },
                "en_prefix_token_ngrams_index_analyzer": {
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "prefix_ngrams"
                    ]
                },
                "es_prefix_phrase_ngrams_index_analyzer": {
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "prefix_ngrams",
                        "collapse"
                    ]
                },
                "es_prefix_phrase_ngrams_query_analyzer": {
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "en_stopwords", // Consider if this should be es_stopwords
                        "collapse"
                    ]
                },
                "es_prefix_token_ngrams_index_analyzer": {
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "es_synonyms",
                        "prefix_ngrams"
                    ]
                },
                "autocomplete_query_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "en_synonyms",
                        "en_stopwords",
                        "collapse"
                    ]
                },
                "pairs_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": ["lowercase", "collapse", "bigrams"]
                },
                "en_classification_index_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "en_stemmer",
                        "collapse"
                    ]
                },
                "en_classification_query_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "en_classification_stopwords",
                        "en_stemmer",
                        "en_classification_synonyms",
                        "collapse"
                    ]
                },
                "es_classification_index_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "es_stemmer",
                        "collapse"
                    ]
                },
                "es_classification_query_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "es_stemmer",
                        "es_classification_synonyms",
                        "es_classification_stopwords",
                        "collapse"
                    ]
                },
                "en_text_index_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "en_possessive_stemmer",
                        "en_protected_keywords",
                        "en_stemmer",
                        "collapse"
                    ]
                },
                "en_text_query_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "en_possessive_stemmer",
                        "en_protected_keywords",
                        "en_stemmer",
                        "en_synonyms",
                        "en_stopwords",
                        "collapse"
                    ]
                },
                "es_text_index_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "es_protected_keywords",
                        "es_stemmer",
                        "collapse"
                    ]
                },
                "es_text_query_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "es_protected_keywords",
                        "es_stemmer",
                        "es_synonyms",
                        "es_stopwords",
                        "collapse"
                    ]
                }
            }
        }
    },
    "mappings": {
        // "_all": { "enabled": false }, // _all is removed in 7.x, use copy_to as already done
        "properties": {
            "norm_heading_language_1": { "type": "keyword" },
            "norm_heading_language_2": { "type": "keyword" },
            "norm_heading_language_3": { "type": "keyword" },
            "classification_language_1": {
                "type": "text",
                "analyzer": "en_classification_index_analyzer",
                "search_analyzer": "en_classification_query_analyzer"
            },
            "classification_language_2": {
                "type": "text",
                "analyzer": "es_classification_index_analyzer",
                "search_analyzer": "es_classification_query_analyzer"
            },
            "classification_language_3": {
                "type": "text",
                "analyzer": "es_classification_index_analyzer", // Assuming Spanish for lang 3 as well based on pattern
                "search_analyzer": "es_classification_query_analyzer"
            },
            "category": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_1"
            },
            "category_language_2": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_2"
            },
            "category_language_3": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_3"
            },
            "topics": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_1"
            },
            "topics_language_2": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_2"
            },
            "topics_language_3": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_3"
            },
            "concept": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_1"
            },
            "concept_language_2": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_2"
            },
            "concept_language_3": {
                "type": "keyword",
                "index": false,
                "copy_to": "classification_language_3"
            },
            "manufacturer": {
                "type": "keyword",
                "copy_to": ["device", "all_content_language_1", "all_content_language_2", "all_content_language_3"]
            },
            "model": {
                "type": "keyword",
                "copy_to": ["device", "all_content_language_1", "all_content_language_2", "all_content_language_3"]
            },
            "device": {
                "type": "text",
                "analyzer": "device_analyzer"
            },
            "name": {
                "type": "keyword",
                "copy_to": [
                    "suggestion_language_1", "heading_language_1", "all_content_language_1",
                    "phrase_starts_with_language_1", "term_starts_with_language_1", "heading_bigrams_1"
                ]
            },
            "name_language_2": {
                "type": "keyword",
                "copy_to": [
                    "suggestion_language_2", "heading_language_2", "all_content_language_2",
                    "phrase_starts_with_language_2", "term_starts_with_language_2", "heading_bigrams_2"
                ]
            },
            "name_language_3": {
                "type": "keyword",
                "copy_to": [
                    "suggestion_language_3", "heading_language_3", "all_content_language_3",
                    "phrase_starts_with_language_3", "term_starts_with_language_3", "heading_bigrams_3"
                ]
            },
            "title": {
                "type": "keyword",
                "index": false,
                "copy_to": [
                    "suggestion_language_1", "heading_language_1", "all_content_language_1",
                    "phrase_starts_with_language_1", "term_starts_with_language_1", "heading_bigrams_1"
                ]
            },
            "title_language_2": {
                "type": "keyword",
                "index": false,
                "copy_to": [
                    "suggestion_language_2", "heading_language_2", "all_content_language_2",
                    "phrase_starts_with_language_2", "term_starts_with_language_2", "heading_bigrams_2"
                ]
            },
            "title_language_3": {
                "type": "keyword",
                "index": false,
                "copy_to": [
                    "suggestion_language_3", "heading_language_3", "all_content_language_3",
                    "phrase_starts_with_language_3", "term_starts_with_language_3", "heading_bigrams_3"
                ]
            },
            "suggestion_language_1": { "type": "keyword" },
            "suggestion_language_2": { "type": "keyword" },
            "suggestion_language_3": { "type": "keyword" },
            "heading_language_1": {
                "type": "text", "store": true, "index_options": "offsets",
                "analyzer": "en_text_index_analyzer", "search_analyzer": "en_text_query_analyzer",
                "fields": { "trigram": { "type": "text", "analyzer": "trigrams" } }
            },
            "heading_language_2": {
                "type": "text", "store": true, "index_options": "offsets",
                "analyzer": "es_text_index_analyzer", "search_analyzer": "es_text_query_analyzer"
            },
            "heading_language_3": {
                "type": "text", "store": true, "index_options": "offsets",
                "analyzer": "es_text_index_analyzer", "search_analyzer": "es_text_query_analyzer"
            },
            "steps_language_1": { "type": "text", "index": false, "copy_to": ["description_language_1", "all_content_language_1"] },
            "steps_language_2": { "type": "text", "index": false, "copy_to": ["description_language_2", "all_content_language_2"] },
            "steps_language_3": { "type": "text", "index": false, "copy_to": ["description_language_3", "all_content_language_3"] },
            "val": { "type": "text", "index": false, "copy_to": ["description_language_1", "all_content_language_1"] },
            "val_language_2": { "type": "text", "index": false, "copy_to": ["description_language_2", "all_content_language_2"] },
            "val_language_3": { "type": "text", "index": false, "copy_to": ["description_language_3", "all_content_language_3"] },
            "description_language_1": {
                "type": "text", "store": true, "index_options": "offsets",
                "analyzer": "en_text_index_analyzer", "search_analyzer": "en_text_query_analyzer"
            },
            "description_language_2": {
                "type": "text", "store": true, "index_options": "offsets",
                "analyzer": "es_text_index_analyzer", "search_analyzer": "es_text_query_analyzer"
            },
            "description_language_3": {
                "type": "text", "store": true, "index_options": "offsets",
                "analyzer": "es_text_index_analyzer", "search_analyzer": "es_text_query_analyzer"
            },
            "all_content_language_1": {
                "type": "text",
                "analyzer": "en_text_index_analyzer",
                "search_analyzer": "en_text_query_analyzer"
            },
            "all_content_language_2": {
                "type": "text",
                "analyzer": "es_text_index_analyzer",
                "search_analyzer": "es_text_query_analyzer"
            },
            "all_content_language_3": {
                "type": "text", "analyzer": "es_text_index_analyzer", "search_analyzer": "es_text_query_analyzer"
            },
            "attachment": { "type": "text", "fields": { "data": { "type": "text" } } }, // Consider 'binary' type if storing base64 encoded files
            "outdated": { "type": "boolean" },
            "outputorder": { "type": "long" },
            "phonefk": { "type": "long" },
            "pk": { "type": "long" },
            "presales": { "type": "long" },
            "disabled": { "type": "boolean" },
            "featured_video": { "type": "boolean" },
            "id": { "type": "keyword" },
            "type": { "type": "keyword" },
            "academy_category_fk": { "type": "long" },
            "inheritable": { "type": "long" },
            "language": { "type": "long" },
            "link": { "type": "keyword" },
            "view_count": { "type": "long" },
            "video_url": { "type": "keyword" },
            "thumbnail_url": { "type": "keyword" },
            "phrase_starts_with_language_1": {
                "type": "text", "analyzer": "en_prefix_phrase_ngrams_index_analyzer",
                "search_analyzer": "en_prefix_phrase_ngrams_query_analyzer"
            },
            "term_starts_with_language_1": {
                "type": "text", "analyzer": "en_prefix_token_ngrams_index_analyzer",
                "search_analyzer": "autocomplete_query_analyzer"
            },
            "heading_bigrams_1": { "type": "text", "analyzer": "pairs_analyzer" },
            "heading_bigrams_2": { "type": "text", "analyzer": "pairs_analyzer" },
            "heading_bigrams_3": { "type": "text", "analyzer": "pairs_analyzer" },
            "phrase_starts_with_language_2": {
                "type": "text", "analyzer": "es_prefix_phrase_ngrams_index_analyzer",
                "search_analyzer": "es_prefix_phrase_ngrams_query_analyzer"
            },
            "term_starts_with_language_2": {
                "type": "text", "analyzer": "es_prefix_token_ngrams_index_analyzer",
                "search_analyzer": "autocomplete_query_analyzer"
            },
            "phrase_starts_with_language_3": {
                "type": "text", "analyzer": "es_prefix_phrase_ngrams_index_analyzer",
                "search_analyzer": "es_prefix_phrase_ngrams_query_analyzer"
            },
            "term_starts_with_language_3": {
                "type": "text", "analyzer": "es_prefix_token_ngrams_index_analyzer",
                "search_analyzer": "autocomplete_query_analyzer"
            },
            "phone_type": { "type": "keyword" }
        }
  }'
echo ""
echo "=== Verifying Index Creation ==="
curl -s "http://${OS_HOST}/_cat/indices/${INDEX_NAME}?v"
echo ""
echo "=== Index Settings ==="
curl -s "http://${OS_HOST}/${INDEX_NAME}/_settings?pretty"
echo ""
echo "Done creating index!"

echo ""
echo "=== Inserting Sample (Production-like) Documents ==="
curl -s -X POST "http://${OS_HOST}/${INDEX_NAME}/_doc/1" -H 'Content-Type: application/json' -d '{
  "phrase_starts_with_language_1": "game health",
  "heading_bigrams_1": "game health",
  "term_starts_with_language_1": "game",
  "suggestion_language_1": "Game",
  "language": 1,
  "deleted": 0,
  "classification_language_1": "This is a test document for Game Health",
  "manufacturer": "Apple",
  "phone_type": "Smartphone",
  "model": "iPhone 13"
}'
curl -s -X POST "http://${OS_HOST}/${INDEX_NAME}/_doc/2" -H 'Content-Type: application/json' -d '{
  "phrase_starts_with_language_1": "health",
  "heading_bigrams_1": "health",
  "term_starts_with_language_1": "health",
  "suggestion_language_1": "Health",
  "language": 1,
  "deleted": 0,
  "classification_language_1": "Another test document for Health",
  "manufacturer": "Samsung",
  "phone_type": "Smartphone",
  "model": "Galaxy S21"
}'
curl -s -X POST "http://${OS_HOST}/${INDEX_NAME}/_doc/3" -H 'Content-Type: application/json' -d '{
  "phrase_starts_with_language_1": "game",
  "heading_bigrams_1": "game",
  "term_starts_with_language_1": "game",
  "suggestion_language_1": "Game",
  "language": 1,
  "deleted": 0,
  "classification_language_1": "Game is used for testing search",
  "manufacturer": "Apple",
  "phone_type": "Tablet",
  "model": "iPad Pro"
}'

echo ""
echo "=== Refreshing Index ==="
curl -s -X POST "http://${OS_HOST}/${INDEX_NAME}/_refresh"

echo ""
echo "=== Running a Production-like Search (multi_match + aggs) ==="
# Add aggs for manufacturer, phone_type, and model
curl -s -X GET "http://${OS_HOST}/${INDEX_NAME}/_search?pretty" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "game",
            "fields": [
              "phrase_starts_with_language_1^1.75",
              "heading_bigrams_1",
              "term_starts_with_language_1"
            ],
            "minimum_should_match": "4<-85% 6<-95%"
          }
        }
      ],
      "filter": {
        "bool": {
          "must": [
            { "term": { "language": 1 } },
            { "term": { "deleted": 0 } }
          ]
        }
      }
    }
  },
  "aggs": {
    "manufacturer": {
      "terms": {
        "field": "manufacturer",
        "size": 100,
        "order": { "_count": "desc" }
      }
    },
    "phone_type": {
      "terms": {
        "field": "phone_type",
        "size": 100,
        "order": { "_count": "desc" }
      }
    },
    "model": {
      "terms": {
        "field": "model",
        "size": 100,
        "order": { "_count": "desc" }
      }
    }
  }
}'
# "aggs": {
#   "headings": {
#     "terms": {
#       "field": "suggestion_language_1",
#       "order": { "max_score": "desc" }
#     },
#     "aggs": {
#       "max_score": {
#         "max": {
#           "script": {
#             "lang": "painless",
#             "inline": "_score"
#           }
#         }
#       }
#     }
#   }
# }
echo ""

