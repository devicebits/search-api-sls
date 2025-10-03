const OpenSearchClient = require('../engines/OpenSearch/openSearchClient');

let osClientInstance = null;

const getOpenSearchClient = () => {
  if (!osClientInstance) {
    const config = {
      host: process.env.OPENSEARCH_HOST,
      port: parseInt(process.env.OPENSEARCH_PORT) || 443,
      region: process.env.AWS_REGION || 'us-east-1',
      username: process.env.OPENSEARCH_MASTER_USERNAME,
      password: process.env.OPENSEARCH_MASTER_PASSWORD
    };
    if (!config.host || !config.username || !config.password) {
      throw new Error('Missing required OpenSearch configuration in environment variables');
    }
     if (process.env.NODE_ENV !== 'production') {
      console.log('Initializing OpenSearch Client:', config.host);
    }
    osClientInstance = new OpenSearchClient(config);
  }

  return osClientInstance;
};

module.exports = { getOpenSearchClient };