const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');

const DEFAULT_DATABASE_SECRET_ID = 'service/searp-api-sls/mysql/database/secret/production';
const LOCAL_NODE_ENVS = new Set(['dev', 'development', 'local', 'test']);

const secretsClient = new AWS.SecretsManager({
  region: process.env.AWS_REGION,
});

let connection;
let cachedDatabaseSecret;

function shouldUseEnvDatabaseConfig(env = process.env) {
  return LOCAL_NODE_ENVS.has((env.NODE_ENV || '').toLowerCase());
}

function buildConfigFromEnv(env = process.env) { 
  return {
    host: env.DATABASE_HOST,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    port: env.DATABASE_PORT ? Number(env.DATABASE_PORT) : undefined,
  };
}

function buildConfigFromSecret(secret) { 
  return {
    host: secret.host,
    user: secret.username || secret.user,
    password: secret.password,
    database: secret.database || secret.databaseName || secret.dbname || secret.dbName,
    port: secret.port ? Number(secret.port) : undefined,
  };
}

async function getSecretFromSecretsManager(secretId) {
  if (cachedDatabaseSecret) {
    return cachedDatabaseSecret;
  }

  const response = await secretsClient.getSecretValue({
    SecretId: secretId,
    VersionStage: 'AWSCURRENT',
  }).promise();

  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} does not contain SecretString`);
  }

  cachedDatabaseSecret = JSON.parse(response.SecretString);
  return cachedDatabaseSecret;
}

async function getDatabaseConfig(env = process.env) {
  const config = shouldUseEnvDatabaseConfig(env)
    ? buildConfigFromEnv(env)
    : buildConfigFromSecret(
      await getSecretFromSecretsManager(env.DATABASE_SECRET_ID || DEFAULT_DATABASE_SECRET_ID),
    );

  if (env.MYSQL_USE_SSL === 'true') {
    config.ssl = { rejectUnauthorized: env.NODE_ENV === 'production' };
  }

  return config;
}

async function createConnection() {
  if (!connection || connection.connection._closing) {
    const config = await getDatabaseConfig();
    connection = await mysql.createConnection(config)
  } 
  return connection;
}

async function closeConnection() {
  if (connection && !connection.connection._closing) {
    await connection.end();
  }
}

module.exports = {
  createConnection,
  closeConnection,
  getDatabaseConfig,
  shouldUseEnvDatabaseConfig,
  buildConfigFromEnv,
  buildConfigFromSecret,
};
