FROM docker.elastic.co/elasticsearch/elasticsearch:6.4.2

# Copy and install custom plugin (provides syn-stopwords filter)
# Modified plugin descriptor to work with ES 6.4.2
COPY plugins/db-knowledgepower-plugin-6.4.2.zip /tmp/db-knowledgepower-plugin.zip
RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install --batch file:///tmp/db-knowledgepower-plugin.zip && \
    rm /tmp/db-knowledgepower-plugin.zip

# Install required plugins for production use
RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install --batch repository-s3

# Copy custom analyzer config files individually (preserves default ES config files)
# These files are copied to the config root so production mappings work without path changes
COPY config/en_stopwords.txt /usr/share/elasticsearch/config/
COPY config/es_stopwords.txt /usr/share/elasticsearch/config/
COPY config/device_stopwords.txt /usr/share/elasticsearch/config/
COPY config/en_synonyms.txt /usr/share/elasticsearch/config/
COPY config/es_synonyms.txt /usr/share/elasticsearch/config/
COPY config/en_protected_keywords.txt /usr/share/elasticsearch/config/
COPY config/es_protected_keywords.txt /usr/share/elasticsearch/config/
COPY config/en_classification_stopwords.txt /usr/share/elasticsearch/config/
COPY config/es_classification_stopwords.txt /usr/share/elasticsearch/config/
COPY config/en_classification_synonyms.txt /usr/share/elasticsearch/config/
COPY config/es_classification_synonyms.txt /usr/share/elasticsearch/config/

# Set proper permissions
RUN chown -R elasticsearch:elasticsearch /usr/share/elasticsearch/config

EXPOSE 9201 9300
