const { ingestData: esIngestData, createIndex: createEsIndex } = require('../utils/esIndex');
const { ingestData: osIngestData, createIndex: createOsIndex } = require('../utils/osIndex');

module.exports.index = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const { searchEngine, customerId, index } = body;

    switch (searchEngine?.toLowerCase()) {
      case 'elasticsearch': {
        await createEsIndex(index || `customer-${customerId}`, false);
        const { success, failed, errors } = await esIngestData({ index: index || `customer-${customerId}`, customer: customerId });
        return {
          statusCode: 200,
          body: JSON.stringify({ success, failed, errors: errors.slice(0, 10) })
        };
      }

      case 'opensearch': {
        await createOsIndex(index || `customer-${customerId}`, false);
        const { success, failed, errors } = await osIngestData({ index: index || `customer-${customerId}`, customer: customerId });
        return {
          statusCode: 200,
          body: JSON.stringify({ success, failed, errors: errors.slice(0, 10) })
        };
      }

      default:
        throw new Error(`Unsupported search engine: ${searchEngine}`);
    }
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
