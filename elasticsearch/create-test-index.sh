#!/bin/bash

# Script to create a test index using production-compatible mappings
# This demonstrates that your production index definitions work without modification

ES_HOST="${1:-localhost:9200}"
INDEX_NAME="${2:-homeserveibobca}"

echo "=== Creating Index: $INDEX_NAME ==="
echo "Elasticsearch Host: $ES_HOST"
echo ""

# Delete index if it exists
echo "Cleaning up existing index (if any)..."
curl -X DELETE "http://${ES_HOST}/${INDEX_NAME}?pretty" 2>/dev/null
echo ""

# Create index with production mapping
echo "Creating index with production mapping..."
curl -X PUT "http://${ES_HOST}/${INDEX_NAME}?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 2,
    "refresh_interval": null,
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
          "output_unigrams": "false"
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
        "infix_ngrams": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 15
        },
        "en_protected_keywords" : {
          "type": "keyword_marker",
          "keywords_path": "en_protected_keywords.txt"
        },
        "en_possessive_stemmer": {
          "type": "stemmer",
          "language": "possessive_english"
        },
        "es_protected_keywords" : {
          "type": "keyword_marker",
          "keywords_path": "es_protected_keywords.txt"
        },
        "en_classification_synonyms": {
          "type": "synonym_graph",
          "synonyms_path": "en_classification_synonyms.txt"
        },
        "es_classification_synonyms": {
          "type": "synonym_graph",
          "synonyms_path": "es_classification_synonyms.txt"
        },
        "en_classification_stopwords": {
          "type": "stop",
          "stopwords_path": "en_classification_stopwords.txt"
        },
        "es_classification_stopwords": {
          "type": "stop",
          "stopwords_path": "es_classification_stopwords.txt"
        },
        "device_stopwords": {
          "type": "stop",
          "stopwords_path": "device_stopwords.txt"
        },
        "en_stopwords": {
          "type": "stop",
          "stopwords_path": "en_stopwords.txt"
        },
        "es_stopwords": {
          "type": "stop",
          "stopwords": "_spanish_"
        },
        "en_synonyms": {
          "type": "synonym_graph",
          "synonyms_path": "en_synonyms.txt",
          "expand": true
        },
        "es_synonyms": {
          "type": "synonym_graph",
          "synonyms_path": "es_synonyms.txt",
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
          "filter":  [
            "lowercase",
            "asciifolding",
            "device_stopwords"
          ]
        },
        "trigrams": {
          "tokenizer": "standard",
          "filter": ["standard", "lowercase","trigrams"]
        },
        "en_prefix_phrase_ngrams_index_analyzer": {
          "tokenizer": "keyword",
          "filter": [
            "lowercase",
            "collapse",
            "prefix_ngrams"
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
            "collapse",
            "prefix_ngrams"
          ]
        },
        "es_prefix_phrase_ngrams_query_analyzer": {
          "tokenizer": "whitespace",
          "filter": [
            "lowercase",
            "asciifolding",
            "en_stopwords",
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
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter": [
            "lowercase",
            "asciifolding",
            "collapse",
            "en_synonyms",
            "en_stopwords"
          ]
        },
        "pairs_analyzer": {
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter": [ "lowercase", "collapse", "bigrams"]
        },
        "en_classification_index_analyzer": {
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter": [
            "lowercase",
            "en_stemmer",
            "collapse"
          ]
        },
        "en_classification_query_analyzer": {
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
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
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter": [
            "lowercase",
            "asciifolding",
            "es_stemmer",
            "collapse"
          ]
        },
        "es_classification_query_analyzer": {
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
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
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter":  [
            "lowercase",
            "asciifolding",
            "en_possessive_stemmer",
            "collapse",
            "en_protected_keywords",
            "en_stemmer"
          ]
        },
        "en_text_query_analyzer": {
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter":  [
            "lowercase",
            "asciifolding",
            "en_possessive_stemmer",
            "collapse",
            "en_protected_keywords",
            "en_stemmer",
            "en_synonyms",
            "en_stopwords"
          ]
        },
        "es_text_index_analyzer": {
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter":  [
            "lowercase",
            "asciifolding",
            "es_protected_keywords",
            "es_stemmer",
            "collapse"
          ]
        },
        "es_text_query_analyzer": {
          "char_filter": ["replace_slashes","remove_trailing_delimiters"],
          "tokenizer": "whitespace",
          "filter":  [
            "lowercase",
            "asciifolding",
            "collapse",
            "es_protected_keywords",
            "es_stemmer",
            "es_synonyms",
            "es_stopwords"
          ]
        }
      }
    }
  },
  "mappings": {
    "doc": {
      "_all": {
        "enabled": false
      },
      "properties": {
        "id": {
          "type": "keyword"
        },
        "type": {
          "type": "keyword"
        },
        "name": {
          "type": "keyword",
          "copy_to": [
            "suggestion_language_1",
            "heading_language_1",
            "all_content_language_1"
          ]
        },
        "suggestion_language_1": {
          "type": "keyword"
        },
        "heading_language_1": {
          "type": "text",
          "store": true,
          "index_options": "offsets",
          "analyzer": "en_text_index_analyzer",
          "search_analyzer": "en_text_query_analyzer"
        },
        "all_content_language_1": {
          "type": "text",
          "analyzer": "en_text_index_analyzer",
          "search_analyzer": "en_text_query_analyzer"
        }
      }
    }
  }
}'

echo ""
echo "=== Verifying Index Creation ==="
curl "http://${ES_HOST}/_cat/indices/${INDEX_NAME}?v"
echo ""
echo "=== Index Settings ==="
curl "http://${ES_HOST}/${INDEX_NAME}/_settings?pretty"
echo ""
echo "Done!"
