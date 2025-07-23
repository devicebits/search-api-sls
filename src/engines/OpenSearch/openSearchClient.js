const { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

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
    if (!config.host) throw new Error('Missing required config: host');

    this.host = config.host;
    this.port = config.port || 443;
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.service = config.service || (this.host.includes('aoss') ? 'aoss' : 'es');
    this.protocol = config.protocol || 'https';
    this.timeout = config.timeout || 5000;
    this.client = this.createClient();
  }

  createClient() {
     const node = `${this.protocol}://${this.host}:${this.port}`;
    
    const clientConfig = {
      node: node,
      requestTimeout: this.timeout,
      ...AwsSigv4Signer({
        region: this.region,
        service: this.service,
        getCredentials: () => defaultProvider()()
      })
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
      console.log("indexname =>", indexName);
      if(!indexName) {
        throw new Error('Index name should be present');
      }
      const response = await this.client.indices.exists({
        index: indexName,
      });
      return response.body;
    } catch (error) {
      console.error('Error checking index existence:', error);
      throw error;
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
  async search(indexName, query = {}, from, size) {
    try {
      if (!indexName || typeof indexName !== 'string') {
        throw new Error('Index name must be a valid string');
      }
      const exists = await this.indexExists(indexName);
      if (!exists) {
        throw new Error(`Index "${indexName}" does not exist`);
      }
      const searchBody = {
        ...query
      };
      searchBody.from = from;
      searchBody.size = size;
      const response = await this.client.search({
        index: indexName,
        body: searchBody,
      });

      return {
        results: response.body.hits.hits,
        total: response.body.hits.total.value,
        size,
        from
      };
    } catch (error) {
      console.error('Error searching index:', error);
      throw error;
    }
  }

}

module.exports = OpenSearchClient;
