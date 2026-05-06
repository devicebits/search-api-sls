# AGENTS.md

This file gives coding agents the project context needed to work safely in this repository.

## Commands

```bash
# Local dev (port 3000)
npm start
npm run start:offline

# Queue worker (local RabbitMQ polling)
npm run queue:worker

# Tests
npm run test
npm run test:unit
npm run test:integration:es:ingest
npm run test:integration:es:search
npm run test:integration:os:ingest
npm run test:integration:os:search

# Run a single test file
node --test test/queue-processor.test.js

# Deploy
npm run deploy:staging
npm run deploy:production

# Docker (MySQL, Elasticsearch, OpenSearch, RabbitMQ)
make compose-up
make compose-down
```

There is no lint or build step.

## Architecture

This is a Serverless AWS Lambda API that keeps Elasticsearch and OpenSearch indices in sync with a MySQL source of truth.

### HTTP Search And Retrieval

Handlers in `src/handlers/` receive Lambda events, build query DSL via helpers in `src/utils/esHelpers.js`, and call the appropriate search client. Elasticsearch and OpenSearch handlers are separate Lambda functions (`/esearch`, `/osearch`, `/osautosuggest`).

### Queue-Driven Sync

Documents are enqueued through `POST /queue-item`, validated by `src/lib/queue-item-schema.js`, and sent through the queue facade in `src/lib/queue-client.js`.

The worker consumes messages and calls `src/services/queueProcessor.js`, which:

1. Looks up the canonical row from MySQL via `src/utils/dbQueries.js`.
2. Normalizes it with `parseRow()`.
3. Syncs to all active engines with `Promise.allSettled()`, so one engine failure does not block the other.

## Key Abstractions

### Search Engine Adapter

`src/lib/engines.js` exposes a normalized `{ name, create, update, delete }` interface for each engine. Both engines are lazy singletons. `SYNC_ENGINES` controls which engines are active.

### Unified Client Interface

Both `src/engines/ElasticSearch/elasticSearchClient.js` and `src/engines/OpenSearch/openSearchClient.js` expose:

```text
createIndex(indexName, body)
isIndexExists(indexName)
dropIndex(indexName)
updateIndex(indexName, settings)
refreshIndex(indexName)
getAllDocuments(indexName)
createDocument(indexName, id, doc)
updateDocument(indexName, id, doc)
deleteDocument(indexName, id)
ingest(indexName, { doc, docId })
search(indexName, body, from, size)
```

`search()` on OpenSearch returns `{ results, total, size, from, aggs? }`. On Elasticsearch it returns the raw SDK response.

### Queue Provider Facade

`src/lib/queue-client.js` resolves to RabbitMQ (`src/lib/providers/rabbitmq-provider.js`) or SQS (`src/lib/providers/sqs-provider.js`) based on `QUEUE_PROVIDER`. Lambda execution auto-forces SQS.

Uniform API:

```text
sendQueueMessage
receiveQueueMessages
ackQueueMessage
nackQueueMessage
```

### OpenSearch Singleton

`src/lib/opensearch-client.js` is a module-level singleton used directly by handlers. This is separate from the `engines.js` singleton used by the queue worker.

## Index Management

`src/utils/esIndex.js` and `src/utils/osIndex.js` are runnable scripts:

```bash
node ./src/utils/esIndex.js [indexName]
node ./src/utils/osIndex.js [indexName]
```

They create or recreate indices and bulk-ingest from MySQL. They are not part of the Lambda surface.

## Environment

Copy `.env.example` to `.env` for local development.

| Group | Key variables |
| --- | --- |
| MySQL | `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_PORT` |
| OpenSearch | `OPENSEARCH_HOST`, `OPENSEARCH_PORT`, `OPENSEARCH_PROTOCOL`, `OPENSEARCH_MASTER_USERNAME`, `OPENSEARCH_MASTER_PASSWORD` |
| Elasticsearch | `ELASTICSEARCH_ENDPOINT`, `ELASTIC_USERNAME`, `ELASTIC_PASSWORD` |
| Queue (RabbitMQ) | `QUEUE_PROVIDER=rabbitmq`, `RABBITMQ_URL`, `RABBITMQ_QUEUE`, `RABBITMQ_DLQ` |
| Queue (SQS/AWS) | `QUEUE_PROVIDER=sqs`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| Engine selection | `SYNC_ENGINES`, a comma-separated list of `opensearch`, `elasticsearch` (default: both) |

## Serverless Infrastructure

`serverless.yml` defines all Lambda functions.

Notable details:

- `queueWorker` is triggered by SQS events with `batchSize: 10` and returns `batchItemFailures` for partial batch retries.
- `ingest` has a 900 second timeout for bulk operations.
- VPC config is pulled from AWS Parameter Store at deploy time (`/vpc/securityGroupIds`, `/vpc/subnetIds`).
- Custom domain support is provided by `serverless-domain-manager`.

## Testing Notes

Tests use Node's built-in `node:test` module. Integration tests hit real local services, so Docker Compose must be running. Unit tests inject mock engines, queue clients, and DB fetchers directly; there is no mocking framework.

When changing queue processing, engine adapters, or handler response contracts, run the focused unit tests at minimum:

```bash
npm run test:unit
```

For search or ingest behavior, also run the relevant integration test after starting local services.
