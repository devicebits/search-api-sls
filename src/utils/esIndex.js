// Usage: node ./src/utils/esIndex.js [indexName]

require('dotenv').config();

const ElasticSearchClient = require('../engines/ElasticSearch/elasticSearchClient');
const { getFaqData, getGuideData, getTutorialData, getVideoData } = require('./dbQueries');

const indexName = process.argv[2] || 'test-index';

const indexBody = {
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
                "en_protected_keywords": {
                    "type": "keyword_marker",
                    "keywords_path": "en_protected_keywords.txt"
                },
                "en_possessive_stemmer": {
                    "type": "stemmer",
                    "language": "possessive_english"
                },
                "es_protected_keywords": {
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
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "device_stopwords"
                    ]
                },
                "trigrams": {
                    "tokenizer": "standard",
                    "filter": ["standard", "lowercase", "trigrams"]
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
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
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
                        "collapse",
                        "en_protected_keywords",
                        "en_stemmer"
                    ]
                },
                "en_text_query_analyzer": {
                    "char_filter": ["replace_slashes", "remove_trailing_delimiters"],
                    "tokenizer": "whitespace",
                    "filter": [
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
                "pk": {
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
}

async function createIndex() {
    try {
        const client = new ElasticSearchClient({
            node: process.env.ELASTICSEARCH_ENDPOINT,
            index: indexName
        });

        const exists = await client.indexExists();
        if (exists) {
            console.log(`Index '${indexName}' already exists. Deleting...`);
            await client.dropIndex();
            console.log(`Deleted index '${indexName}'.`);
        }
        await client.createIndex(indexBody);
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
    let pkValue = null;
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
            if ((k === 'PK' || k === 'pk') && !pkValue) {
                pkValue = v;
            }
        }
    }
    if (pkValue !== null) {
        doc['pk'] = pkValue;
    }
    return doc;
}

// Fetches MySQL data and ingests into ElasticSearch
async function ingestData({ index = 'test-index', customer = 'default' }) {
    try {
        const client = new ElasticSearchClient({
            node: process.env.ELASTICSEARCH_ENDPOINT,
            index
        });
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

        // Ingest all data types in batches
        const contentTypes = [
            { name: 'faq', rows: faqRows, idFields: ['PK', 'pk'] },
            { name: 'guide', rows: guideRows, idFields: ['PK'] },
            { name: 'tutorial', rows: tutorialRows, idFields: ['PK'] },
            { name: 'video', rows: videoRows, idFields: ['PK', 'pk'] }
        ];

        let success = 0, failed = 0, errors = [];
        for (const { name, rows, idFields } of contentTypes) {
            const docsWithIds = rows.map((row, i) => {
                const docId = getDocId(row, idFields);
                return {
                    doc: parseRow(row),
                    docId,
                    rowIdx: i,
                    raw: row
                };
            });
            const validDocs = docsWithIds.filter(d => d.docId);
            const invalidDocs = docsWithIds.filter(d => !d.docId);
            failed += invalidDocs.length;
            errors.push(...invalidDocs.map(d => ({ type: name, row: d.rowIdx, error: 'Missing doc id', data: d.raw })));
            for (const d of validDocs) {
                try {
                    await client.ingest({ doc: d.doc, docId: d.docId });
                    success++;
                } catch (e) {
                    failed++;
                    errors.push({ type: name, row: d.rowIdx, error: e.message, data: d.raw });
                }
            }
        }
        await client.refreshIndex();
        return { success, failed, errors };
    } catch (err) {
        console.error('Error ingesting data:', err);
        throw err;
    }
}

module.exports = {
    createIndex,
    ingestData
};

// If run directly, create the index
if (require.main === module) {
    createIndex();
}
