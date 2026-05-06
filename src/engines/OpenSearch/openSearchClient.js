const { Client } = require("@opensearch-project/opensearch");

class OpenSearchClient {
  /**
   * @param {Object} config - Configuration object
   * @param {string} config.host - OpenSearch endpoint
   * @param {number|string} config.port - OpenSearch port
   * @param {string} config.region - AWS region
   * @param {string} [config.protocol='https'] - Protocol (defaults to https)
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
      node,
      requestTimeout: this.timeout,
      auth: {
        username: this.username,
        password: this.password,
      },
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    };

    return new Client(clientConfig);
  }

  async createIndex(indexName, body = {}) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      return await this.client.indices.create({
        index: indexName,
        body,
      });
    } catch (error) {
      throw new Error(
        `OpenSearch operation failed: ${error.message ? error.message : error}`,
      );
    }
  }

  async isIndexExists(indexName) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      const response = await this.client.indices.exists({ index: indexName });
      return response.body;
    } catch (error) {
      throw new Error(
        `OpenSearch operation failed: ${error.message ? error.message : error}`,
      );
    }
  }

  async dropIndex(indexName) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      const exists = await this.isIndexExists(indexName);
      if (exists) {
        return await this.client.indices.delete({ index: indexName });
      }
    } catch (error) {
      throw new Error(
        `OpenSearch operation failed: ${error.message ? error.message : error}`,
      );
    }
  }

  async updateIndex(indexName, settings = {}) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      return await this.client.indices.putSettings({
        index: indexName,
        body: settings,
      });
    } catch (error) {
      throw new Error(
        `OpenSearch operation failed: ${error.message ? error.message : error}`,
      );
    }
  }

  async refreshIndex(indexName) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      return await this.client.indices.refresh({ index: indexName });
    } catch (error) {
      throw new Error(
        `OpenSearch operation failed: ${error.message ? error.message : error}`,
      );
    }
  }

  async getAllDocuments(indexName) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      const result = await this.search(indexName, { query: { match_all: {} } }, 0, 10000);
      return result.results;
    } catch (error) {
      throw new Error(
        `OpenSearch operation failed: ${error.message ? error.message : error}`,
      );
    }
  }

  async createDocument(indexName, id, document) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      if (!id) throw new Error("Document id should be present");

      console.log("createDocument", {
        indexName,
        id,
        fields: Object.keys(document),
      });
      return this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: true,
      });
    } catch (error) {
      console.error("Error creating document:", error);
      throw error;
    }
  }

  async updateDocument(indexName, id, document) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      if (!id) throw new Error("Document id should be present");

      console.log("updateDocument", {
        indexName,
        id,
        fields: Object.keys(document),
      });
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
      console.error("Error updating document:", error);
      throw error;
    }
  }

  async deleteDocument(indexName, id) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      if (!id) throw new Error("Document id should be present");

      console.log("deleteDocument", { indexName, id });
      return await this.client.delete({
        index: indexName,
        id,
        refresh: true,
      });
    } catch (error) {
      const statusCode = error.statusCode || error.meta?.statusCode;
      if (statusCode === 404) {
        console.log(`Document ${id} was already absent from ${indexName}`);
        return { body: { result: "not_found" } };
      }
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  async ingest(indexName, { doc, docId }) {
    try {
      if (!indexName) throw new Error("Index name should be present");
      if (!docId) throw new Error("Document id should be present");

      return this.client.index({
        index: indexName,
        id: docId,
        body: doc,
        refresh: true,
      });
    } catch (error) {
      console.error("Error ingesting document:", error);
      throw error;
    }
  }

  async search(indexName, body = {}, from = 0, size = 10) {
    try {
      const exists = await this.isIndexExists(indexName);
      if (!exists) {
        throw new Error(`Index "${indexName}" does not exist`);
      }

      const searchBody = { ...body, from, size };
      console.log("searchBody", JSON.stringify(searchBody, null, 2));

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
            .filter(([, aggValue]) => Array.isArray(aggValue?.buckets))
            .map(([aggName, aggValue]) => [aggName, aggValue.buckets]),
        );
      }

      console.log("results", results.results.length);
      return results;
    } catch (error) {
      console.error("Error searching index:", error);
      throw error;
    }
  }
}

module.exports = OpenSearchClient;
