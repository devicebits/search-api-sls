const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildConfigFromEnv,
  buildConfigFromSecret,
  shouldUseEnvDatabaseConfig,
} = require('../src/utils/dbClient');

test('uses environment database config for local-like NODE_ENV values', () => {
  assert.equal(shouldUseEnvDatabaseConfig({ NODE_ENV: 'development' }), true);
  assert.equal(shouldUseEnvDatabaseConfig({ NODE_ENV: 'dev' }), true);
  assert.equal(shouldUseEnvDatabaseConfig({ NODE_ENV: 'local' }), true);
  assert.equal(shouldUseEnvDatabaseConfig({ NODE_ENV: 'test' }), true);
  assert.equal(shouldUseEnvDatabaseConfig({ NODE_ENV: 'production' }), false);
});

test('builds MySQL config from DATABASE_* environment variables', () => {
  assert.deepEqual(
    buildConfigFromEnv({
      DATABASE_HOST: 'mysql',
      DATABASE_USER: 'admin',
      DATABASE_PASSWORD: 'password',
      DATABASE_NAME: 'search-api-prod',
      DATABASE_PORT: '3306',
    }),
    {
      host: 'mysql',
      user: 'admin',
      password: 'password',
      database: 'search-api-prod',
      port: 3306,
    },
  );
});

test('builds MySQL config from Secrets Manager JSON shape', () => {
  assert.deepEqual(
    buildConfigFromSecret({
      host: 'db.example.com',
      username: 'search_user',
      password: 'password',
      dbname: 'search-api-prod',
      port: 3306,
    }),
    {
      host: 'db.example.com',
      user: 'search_user',
      password: 'password',
      database: 'search-api-prod',
      port: 3306,
    },
  );
});
