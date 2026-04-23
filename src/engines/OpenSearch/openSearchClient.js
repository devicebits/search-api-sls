const { Client } = require("@opensearch-project/opensearch");

class OpenSearchClient {
  /**
   * @param {Object} config - Configuration object
   * @param {string} config.host - OpenSearch endpoint
   * @param {number|string} config.port - OpenSearch port
   * @param {string} config.region - AWS region
   * @param {string} [config.protocol='https'] - Protocol (defaults to https)
   * @param {boolean} [config.useAwsCredentials=true] - Whether to use AWS credentials
   */
  constructor(config) {
    if (!config.host) throw new Error("Missing required config: host");

    this.host = config.host;
    this.port = config.port || 443;
    this.region = config.region || process.env.AWS_REGION || "us-east-1";
    this.service =
      config.service || (this.host.includes("aoss") ? "aoss" : "es");
    this.protocol = config.protocol || "https";
    this.timeout = config.timeout || 5000;
    this.username = config.username;
    this.password = config.password;
    console.log("OpenSearch Client Config:", {
      ...config,
      password: config.password ? "[redacted]" : undefined,
    });
    this.client = this.createClient();
  }

  createClient() {
    const node = `${this.protocol}://${this.host}:${this.port}`;
    const clientConfig = {
      node: node,
      requestTimeout: this.timeout,
      auth: {
        username: this.username,
        password: this.password,
      },
      ssl: {
        rejectUnauthorized:
          process.env.NODE_ENV === "production" ? true : false,
      },
    };

    return new Client(clientConfig);
  }

  /**
   * Checks if an index exists
   * @param {string} indexName - Name of the index to check
   * @returns {Promise<boolean>} Whether the index exists
   */
  async indexExists(indexName) {
    try {
      if (!indexName) {
        throw new Error("Index name should be present");
      }
      const response = await this.client.indices.exists({
        index: indexName,
      });
      return response.body;
    } catch (error) {
      throw new Error(
        `OpenSearch operation failed: ${error.message ? error.message : error}`,
      );
    }
  }

  /**
   * Searches an index with a specific query
   * @param {string} indexName - Name of the index to search
   * @param {Object} query - The actual query
   * @param {number} size - Number of results per page
   * @param {number} from - Starting offset
   * @returns {Promise<Object>} Search results
   */
  async search(indexName, query = {}, from = 0, size = 10) {
    try {
      const exists = await this.indexExists(indexName);
      if (!exists) {
        throw new Error(`Index "${indexName}" does not exist`);
      }
      const searchBody = {
        ...query,
      };
      console.log("searchBody",JSON.stringify(searchBody, null, 2));

      searchBody.from = from;
      searchBody.size = size;
      const response = await this.client.search({
        index: indexName,
        body: searchBody,
      });

      const results = {
        results: response?.body?.hits?.hits || [],
        total: response?.body?.hits?.total?.value || 0,
        size,
        from,
      };

      if (response?.body?.aggregations) {
        results.aggs = Object.fromEntries(
          Object.entries(response.body.aggregations)
            .filter(([aggName, aggValue]) => Array.isArray(aggValue?.buckets))
            .map(([aggName, aggValue]) => [aggName, aggValue.buckets]),
        );
      }

      console.log("results",results.results.length);
      return results;
    } catch (error) {
      console.error("Error searching index:", error);
      throw error;
    }
  }

  async indexDocument(indexName, id, document) {
    try {
      if (!indexName) {
        throw new Error('Index name should be present');
      }
      if (!id) {
        throw new Error('Document id should be present');
      }

      return this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: true,
      });
    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }

  async updateDocument(indexName, id, document) {
    try {
      if (!indexName) {
        throw new Error('Index name should be present');
      }
      if (!id) {
        throw new Error('Document id should be present');
      }

      return this.client.update({
        index: indexName,
        id,
        body: {
          doc: document,
          doc_as_upsert: true,
        },
        refresh: true,
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(indexName, id) {
    try {
      if (!indexName) {
        throw new Error('Index name should be present');
      }
      if (!id) {
        throw new Error('Document id should be present');
      }

      return this.client.delete({
        index: indexName,
        id,
        refresh: true,
      });
    } catch (error) {
      const statusCode = error.statusCode || error.meta?.statusCode;
      if (statusCode === 404) {
        console.log(`Document ${id} was already absent from ${indexName}`);
        return { body: { result: 'not_found' } };
      }
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}

module.exports = OpenSearchClient;
