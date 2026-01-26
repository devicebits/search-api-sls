// Usage: node ./src/utils/osIndex.js [indexName]

require('dotenv').config();
const { getOpenSearchClient } = require('../lib/opensearch-client');

const { getFaqData, getGuideData, getTutorialData, getVideoData } = require('./dbQueries');

const indexName = process.argv[2] || 'test-index';

const indexBody = {
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
    }
}

async function createIndex() {
    const client = getOpenSearchClient();
    try {
        const exists = await client.indexExists(indexName);
        if (exists) {
            console.log(`Index '${indexName}' already exists. Deleting...`);
            await client.client.indices.delete({ index: indexName });
            console.log(`Deleted index '${indexName}'.`);
        }
        await client.client.indices.create({
            index: indexName,
            body: indexBody
        });
        console.log(`Created index '${indexName}' with mapping.`);
    } catch (err) {
        console.error('Error creating index:', err);
        process.exit(1);
    }
}

// Helper to clean and convert row data
function parseRow(row) {
    const BOOLEAN_FIELDS = ['disabled', 'outdated', 'featured_video'];
    const doc = {};
    for (const [k, v] of Object.entries(row)) {
        if (v !== null && v !== undefined) {
            if (BOOLEAN_FIELDS.includes(k)) {
                try {
                    doc[k] = Boolean(Number(v));
                } catch {
                    doc[k] = v;
                }
            } else {
                doc[k] = v;
            }
        }
    }
    return doc;
}

// Fetches MySQL data and ingests into OpenSearch
async function ingestData({ index = 'test-index', customer = 'default' }) {
    const client = getOpenSearchClient();
    // Fetch data from MySQL
    const [faqRows, guideRows, tutorialRows, videoRows] = await Promise.all([
        getFaqData(customer),
        getGuideData(customer),
        getTutorialData(customer),
        getVideoData(customer)
    ]);

    // Helper to get doc id
    function getDocId(row, idFields) {
        for (const f of idFields) {
            if (row[f] != null) return String(row[f]);
            if (row[f.toLowerCase()] != null) return String(row[f.toLowerCase()]);
            if (row[f.toUpperCase()] != null) return String(row[f.toUpperCase()]);
        }
        return null;
    }

    // Ingest all data types
    const contentTypes = [
        { name: 'faq', rows: faqRows, idFields: ['PK', 'pk'] },
        { name: 'guide', rows: guideRows, idFields: ['PK'] },
        { name: 'tutorial', rows: tutorialRows, idFields: ['PK'] },
        { name: 'video', rows: videoRows, idFields: ['PK', 'pk'] }
    ];

    let success = 0, failed = 0, errors = [];
    for (const { name, rows, idFields } of contentTypes) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const docId = getDocId(row, idFields);
            if (!docId) {
                failed++;
                errors.push({ type: name, row: i, error: 'Missing doc id', data: row });
                continue;
            }
            const doc = parseRow(row);
            try {
                await client.client.index({
                    index,
                    id: docId,
                    body: doc
                });
                success++;
            } catch (e) {
                failed++;
                errors.push({ type: name, row: i, error: e.message, data: row });
            }
        }
    }
    // Refresh index
    await client.client.indices.refresh({ index });
    return { success, failed, errors };
}

module.exports = {
    createIndex,
    ingestData
};

// If run directly, create the index
if (require.main === module) {
    createIndex();
}
