/**
 * Search-engine adapter layer.
 *
 * Exposes one normalized contract the queue worker talks to:
 *
 *   { name, create(index, id, doc), update(index, id, doc), delete(index, id) }
 *
 * Both OpenSearch and Elasticsearch are built lazily from env. SYNC_ENGINES
 * defaults to both services.
 */
require("dotenv").config();

const { Client: EsClient } = require("@elastic/elasticsearch");
const OpenSearchClient = require("../engines/OpenSearch/openSearchClient");

const SUPPORTED_ENGINES = ["opensearch", "elasticsearch"];

const parseEngineList = (raw = process.env.SYNC_ENGINES) => {
  const names = (Array.isArray(raw) ? raw : (raw || SUPPORTED_ENGINES.join(",")).split(","))
    .map((name) => String(name).trim().toLowerCase())
    .filter(Boolean);

  const unknown = names.filter((name) => !SUPPORTED_ENGINES.includes(name));
  if (unknown.length) {
    throw new Error(
      `Unknown sync engine "${unknown[0]}" - supported: ${SUPPORTED_ENGINES.join(", ")}`,
    );
  }

  if (names.length === 0) {
    throw new Error("SYNC_ENGINES resolved to an empty list - set at least one engine");
  }

  return names;
};

let osSingleton = null;

const buildOpenSearchEngine = () => {
  if (osSingleton) return osSingleton;

  const host = process.env.OPENSEARCH_HOST;
  const username = process.env.OPENSEARCH_MASTER_USERNAME;
  const password = process.env.OPENSEARCH_MASTER_PASSWORD;
  if (!host || !username || !password) {
    throw new Error(
      "OpenSearch is not configured - missing OPENSEARCH_HOST / OPENSEARCH_MASTER_USERNAME / OPENSEARCH_MASTER_PASSWORD",
    );
  }

  const osClient = new OpenSearchClient({
    host,
    port: parseInt(process.env.OPENSEARCH_PORT, 10) || 443,
    region: process.env.AWS_REGION || "us-east-1",
    protocol: process.env.OPENSEARCH_PROTOCOL || "https",
    username,
    password,
  });

  osSingleton = {
    name: "opensearch",
    create: (index, id, doc) => osClient.indexDocument(index, id, doc),
    update: (index, id, doc) => osClient.updateDocument(index, id, doc),
    delete: (index, id) => osClient.deleteDocument(index, id),
    _raw: osClient,
  };
  return osSingleton;
};

let esSingleton = null;

const buildElasticSearchEngine = () => {
  if (esSingleton) return esSingleton;

  const node = process.env.ELASTICSEARCH_ENDPOINT;
  if (!node) {
    throw new Error(
      "Elasticsearch is not configured - set ELASTICSEARCH_ENDPOINT or remove 'elasticsearch' from SYNC_ENGINES",
    );
  }

  const auth =
    process.env.ELASTIC_USERNAME && process.env.ELASTIC_PASSWORD
      ? {
          username: process.env.ELASTIC_USERNAME,
          password: process.env.ELASTIC_PASSWORD,
        }
      : undefined;

  const client = new EsClient({ node, auth });

  esSingleton = {
    name: "elasticsearch",
    create: (index, id, body) => client.index({ index, id, body }),
    update: (index, id, doc) =>
      client.update({
        index,
        id,
        body: { doc, doc_as_upsert: true },
      }),
    delete: async (index, id) => {
      try {
        return await client.delete({ index, id });
      } catch (err) {
        const statusCode = err.statusCode || err.meta?.statusCode;
        if (statusCode === 404) {
          console.log(`[elasticsearch] Document ${id} was already absent from ${index}`);
          return { body: { result: "not_found" } };
        }
        throw err;
      }
    },
    _raw: client,
  };
  return esSingleton;
};

const BUILDERS = {
  opensearch: buildOpenSearchEngine,
  elasticsearch: buildElasticSearchEngine,
};

const resolveEngines = (engines) =>
  parseEngineList(engines).map((name) => BUILDERS[name]());

const resolveEngineSpecs = (engines) =>
  parseEngineList(engines).map((name) => {
    try {
      return { ok: true, name, engine: BUILDERS[name]() };
    } catch (error) {
      return { ok: false, name, error };
    }
  });

const getActiveEngines = () => resolveEngines(process.env.SYNC_ENGINES);

const _resetEnginesForTests = () => {
  osSingleton = null;
  esSingleton = null;
};

module.exports = {
  parseEngineList,
  resolveEngines,
  resolveEngineSpecs,
  getActiveEngines,
  buildOpenSearchEngine,
  buildElasticSearchEngine,
  _resetEnginesForTests,
};
