const { Client } = require("@elastic/elasticsearch");

class ElasticSearchClient {
  constructor(config) {
    this.client = new Client({ node: config.node });
    this.client.ping().catch((err) => {
      console.error("Error connecting to Elasticsearch:", err);
      throw err;
    });
  }

  async createIndex(indexName, body = {}) {
    try {
      return await this.client.indices.create({
        index: indexName,
        body,
      });
    } catch (err) {
      console.error(`Error creating index ${indexName}:`, err, err?.meta?.body?.error);
      throw err;
    }
  }

  async isIndexExists(indexName) {
    try {
      return await this.client.indices.exists({
        index: indexName,
      });
    } catch (err) {
      console.error(`Error checking existence of index ${indexName}:`, err);
      throw err;
    }
  }

  async dropIndex(indexName) {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists) {
        return await this.client.indices.delete({ index: indexName });
      }
    } catch (err) {
      console.error(`Error deleting index ${indexName}:`, err);
      throw err;
    }
  }

  async updateIndex(indexName, settings = {}) {
    try {
      return await this.client.indices.putSettings({
        index: indexName,
        body: settings,
      });
    } catch (err) {
      console.error(`Error updating index ${indexName}:`, err);
      throw err;
    }
  }

  async refreshIndex(indexName) {
    try {
      return await this.client.indices.refresh({ index: indexName });
    } catch (err) {
      console.error(`Error refreshing index ${indexName}:`, err);
      throw err;
    }
  }

  async getAllDocuments(indexName) {
    try {
      const result = await this.client.search({
        index: indexName,
        body: {
          query: { match_all: {} },
          size: 10000,
        },
      });
      return result.hits.hits;
    } catch (error) {
      console.error(`Error retrieving documents from index ${indexName}:`, error);
      throw error;
    }
  }

  async createDocument(indexName, id, document) {
    try {
      return await this.client.index({
        index: indexName,
        id,
        body: document,
      });
    } catch (err) {
      console.error(`Error creating document ${id} in index ${indexName}:`, err);
      throw err;
    }
  }

  async updateDocument(indexName, id, document) {
    try {
      return await this.client.update({
        index: indexName,
        id,
        body: { doc: document },
      });
    } catch (err) {
      console.error(`Error updating document ${id} in index ${indexName}:`, err);
      throw err;
    }
  }

  async deleteDocument(indexName, id) {
    try {
      return await this.client.delete({
        index: indexName,
        id,
      });
    } catch (err) {
      console.error(`Error deleting document ${id} in index ${indexName}:`, err);
      throw err;
    }
  }

  async ingest(indexName, { doc, docId }) {
    try {
      return await this.client.index({
        index: indexName,
        id: docId,
        body: doc,
      });
    } catch (err) {
      throw err;
    }
  }

  async search(indexName, body, from = 0, size = 10) {
    try {
      const searchBody = { ...body, from, size };
      return await this.client.search({
        index: indexName,
        body: searchBody,
      });
    } catch (err) {
      console.error(`Error searching in index ${indexName}:`, err);
      throw err;
    }
  }
}

module.exports = ElasticSearchClient;
