const { Client } = require('@elastic/elasticsearch');

class ElasticSearchClient {
  constructor(config) {
    this.client = new Client({ node: config.node });
    this.index = config.index;
  }

  async ensureIndexExists() {
    try {
      console.log("index", this.index);
      console.log("client =>", this.client);
      const { body: exists } = await this.client.indices.exists({ index: this.index })
      console.log("exists =>", exists);
      if (!exists) {
        const result = await this.client.indices.create({
          index: this.index,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                description: { type: 'text' },
                price: { type: 'float' },
                createdAt: { type: 'date' }
              }
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error creating index '${this.index}':`, error);
      throw error;
    }
  }


  async updateIndex(settings = {}) {
    try {
      return await this.client.indices.putSettings({
        index: this.index,
        body: settings,
      });
    } catch (err) {
      console.error(`Error updating index ${this.index}:`, err);
      throw err;
    }
  }

  async dropIndex() {
    try {
      const exists = await this.client.indices.exists({ index: this.index });
      if (exists) {
        return await this.client.indices.delete({ index: this.index });
      }
    } catch (err) {
      console.error(`Error deleting index ${this.index}:`, err);
      throw err;
    }
  }

  async getAllDocuments() {
    try {
      const result = await this.client.search({
        index: this.index,
        body: {
          query: {
            match_all: {}
          },
          size: 10000
        }
      });
      return result.hits.hits;
    } catch (error) {
      console.error(`Error retrieving documents from index ${this.index}:`, error);
      throw error;
    }
  }


  async createDocument(id, document) {
    try {
      return await this.client.index({
        index: this.index,
        id,
        body: document,
      });
    } catch (err) {
      console.error(`Error creating document ${id} in index ${this.index}:`, err);
      throw err;
    }
  }

  async updateDocument(id, partialDoc) {
    try {
      return await this.client.update({
        index: this.index,
        id,
        body: {
          doc: partialDoc,
        },
      });
    } catch (err) {
      console.error(`Error updating document ${id} in index ${this.index}:`, err);
      throw err;
    }
  }

  async deleteDocument(id) {
    try {
      return await this.client.delete({
        index: this.index,
        id,
      });
    } catch (err) {
      console.error(`Error deleting document ${id} in index ${this.index}:`, err);
      throw err;
    }
  }

  async ingest(data) {
    await this.ensureIndexExists();
    const bulkBody = data.flatMap(doc => [{ index: { _index: this.index } }, doc]);
    await this.client.bulk({ refresh: true, body: bulkBody });
  }
}

module.exports = ElasticSearchClient;
