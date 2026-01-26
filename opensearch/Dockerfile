FROM opensearchproject/opensearch:3

# Copy custom analyzer dictionary files (TXT-DICTIONARY packages), using elasticsearch config dictory as reference as there is no s3 urls associated packages with production OpenSearch domain
# These files are copied to the config root so production mappings work without path changes
COPY config/device_stopwords.txt /usr/share/opensearch/config/
COPY config/en_protected_keywords.txt /usr/share/opensearch/config/
COPY config/en_classification_synonyms.txt /usr/share/opensearch/config/
COPY config/es_synonyms.txt /usr/share/opensearch/config/
COPY config/es_classification_stopwords.txt /usr/share/opensearch/config/
COPY config/es_stopwords.txt /usr/share/opensearch/config/
COPY config/es_protected_keywords.txt /usr/share/opensearch/config/
COPY config/es_classification_synonyms.txt /usr/share/opensearch/config/
COPY config/en_classification_stopwords.txt /usr/share/opensearch/config/
COPY config/en_stopwords.txt /usr/share/opensearch/config/
COPY config/en_synonyms.txt /usr/share/opensearch/config/

EXPOSE 9200 9600