# sp-search-engine

This is the repository that manages all the calls to various search engines like Elasticsearch, Algolia etc

### Run the project

1. Clone the repository
2. Do `npm install`
3. Replace the environment variables with correct value in `serverless.yml`

```
    DATABASE_HOST: YOUR_DATABASE_HOST
    DATABASE_USER: YOUR_DATABASE_USER
    DATABASE_PASSWORD: YOUR_DATABASE_PASSWORD
    DATABASE_NAME: YOUR_DATABASE_NAME
    ELASTICSEARCH_ENDPOINT: YOUR_ES_ENDPOINT
```
4. Run `sls offline`

### Running with Docker

1. Login to [Serverless](https://app.serverless.com/) for `SERVERLESS_ACCESS_KEY`
2. If running in Linux/WSL:
  ```bash
  sudo swapoff -a
  sudo sysctl -w vm.max_map_count=262144
  ```

3. Copy `.env.example` to `.env` and update the environment variables as needed
  ```bash
  cp .env.example .env
  ```

4. Build the Docker image:
  ```bash
  make compose-build
  ```

5. Run the Docker container:
  ```bash
  make compose-up
  ```

6. Import MySQL dump (if needed):
  ```bash
  # Assuming you have SQL dump files named `temporary_*.sql` in a local `Dump` directory and dumped db script is using db name matching `DATABASE_NAME`
  docker cp ./Dump mysql:/Dump
  docker exec -it mysql bash
  cd /Dump
  DATABASE_NAME=your_database_name
  DATABASE_PASSWORD=your_database_password
  for f in temporary_*.sql; do mysql -u admin -p"$DATABASE_PASSWORD" $DATABASE_NAME < "$f"; done
  ```

### Testing locally
- Use `package.json` scripts to ingest the index in OpenSearch/ElasticSeach using MySQL data
  ```bash
  npm run test:ingest:os
  ```

- Use `package.json` scripts to test OpenSearch/ElasticSeach search
  ```bash
  npm run test:search:os
  ```

### Endpoints

**1. Create an index and ingest data**

This endpoint retrieves data from a database and ingests it into a specified search engine (currently supports Elasticsearch). It dynamically creates a docomopacific index (for example `222`) if it doesn't exist and performs bulk indexing of the retrieved data.

URL - http://localhost:3000/create

Method - POST

Payload

```
  {
    "searchEngine": "elasticsearch",
    "customerId": 222
  }
```

**2. Retrieve all documents in an index**

This endpoint retrieves all documents from a specified Elasticsearch index. It supports querying via the index query parameter.

URL - http://localhost:3000/?index=222

Method - GET

**3. Search documents using OpenSearch**

This endpoint allows you to perform advanced search queries on an OpenSearch index. You can specify the index, query, filters, aggregations, pagination, and language options in the request body. The handler builds a query using the provided parameters and returns the search results from OpenSearch.

URL - http://localhost:3000/osearch

Method - POST

Payload example:

```
{
  "index": "osindex-docomopacificca",
  "project": "ca",
  "query": "Setting up Static IP (Router Side)",
  "filters": {
    "manufacturer": "Samsung" // phone_type, model, etc. (optional)
  },
  "aggs": {
    "manufacturer": { // can be any name
      "terms": {
        "field": "manufacturer",
        "size": 100,
        "order": {
          "_count": "desc"
        }
      }
    },
    "phone_type": { // can be any name
      "terms": {
        "field": "phone_type",
        "size": 100,
        "order": {
          "_count": "desc"
        }
      }
    },
    "model": { // can be any name
      "terms": {
        "field": "model",
        "size": 100,
        "order": {
          "_count": "desc"
        }
      }
    }
  },
  "from": 0,
  "size": 10
}
```

**Note:**
- The `filters` and `aggs` fields are optional. You can use any field names as keys in these objects, as long as the structure is followed.
- The `query` field is a string.
- If `from` and `size` are not passed, 0 and 10 will be used.
- The rest of the fields are required.

Response:

```
{
  "results": [
    {
      "_index": "osindex-docomopacificca",
      "_id": "abc123",
      "_score": 1.23,
      "_source": {
        // document fields
      }
    },
    // ...more results
  ],
  "total": 42,
  "size": 10,
  "from": 0,
  "aggs": {
    "manufacturer": [
      { "key": "Samsung", "doc_count": 20 },
      { "key": "Apple", "doc_count": 10 }
    ],
    "phone_type": [
      { "key": "Smartphone", "doc_count": 25 }
    ],
    "model": [
      { "key": "Galaxy S21", "doc_count": 8 }
    ]
  }
}
```

**4. Queue an item for OpenSearch synchronization**

This endpoint validates a queue payload and publishes it to the active queue backend (RabbitMQ locally, AWS SQS in deployed stages). The worker later consumes the message, looks up the canonical row in MySQL by `(type, itemId, customer)`, and synchronizes the resulting document to OpenSearch. In the queue payload, `customer` is also used as the target index name.

Valid `type` values are `faq`, `guide`, `tutorial`, `video` — the worker uses `type` to pick the correct MySQL query.

URL - http://localhost:3000/queue-item

Method - POST

Payload:

```json
{
  "itemId": "12345",
  "type": "faq",
  "customer": "docomopacific",
  "action": "update"
}
```

Allowed `action` values are `create`, `update`, and `delete`.

Success response:

```json
{
  "message": "Queue item accepted",
  "messageId": "message-id-from-queue",
  "provider": "rabbitmq",
  "item": {
    "itemId": "12345",
    "type": "faq",
    "customer": "docomopacific",
    "action": "update"
  }
}
```

Validation error response:

```json
{
  "message": "Invalid queue item payload",
  "details": [
    "action must be one of \"create\", \"update\", or \"delete\""
  ]
}
```

### Queue setup

The queue layer is **provider-agnostic** — the codebase picks a backend at startup based on the `QUEUE_PROVIDER` environment variable:

| Environment | `QUEUE_PROVIDER` | Backend                                      |
| ----------- | ---------------- | -------------------------------------------- |
| Local       | `rabbitmq`       | RabbitMQ via `docker compose up rabbitmq`    |
| AWS (all stages) | `sqs`       | AWS SQS (main queue + DLQ, defined in `serverless.yml`) |

All code imports from `src/lib/queue-client.js`, which exposes a single normalized API (`sendQueueMessage`, `receiveQueueMessages`, `ackQueueMessage`, `nackQueueMessage`). The SQS and RabbitMQ providers live under `src/lib/providers/` and translate the API to their native protocol.

#### Local development (RabbitMQ)

1. Start the broker: `docker compose up rabbitmq`
2. Management UI: http://localhost:15672 (default credentials `guest` / `guest`)
3. Run the API offline: `npm start`
4. Run the worker in another terminal: `npm run queue:worker`

Relevant `.env` values:

```
QUEUE_PROVIDER=rabbitmq
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=search-api-sync
RABBITMQ_DLQ=search-api-sync-dlq
RABBITMQ_MAX_RECEIVE_COUNT=3
```

RabbitMQ failures are redelivered up to `RABBITMQ_MAX_RECEIVE_COUNT` times; after that the message is routed through the dead-letter exchange to `RABBITMQ_DLQ`.

#### AWS (SQS)

In deployed stages, `serverless.env.yml` sets `QUEUE_PROVIDER=sqs`. The `MessageQueue` and `DeadLetterQueue` resources are declared in `serverless.yml` with a 3-attempt redrive policy. The Lambda function `queueWorker` is invoked directly by the SQS event source — the handler reports failed messages via `batchItemFailures` so SQS retries only them.

#### Worker behavior

For every message:

1. Parse and validate the payload (`itemId`, `type`, `customer`, `action`).
2. For `create` / `update`: fetch the canonical row from MySQL via the appropriate single-item query (`getFaqById` / `getGuideById` / `getTutorialById` / `getVideoById`) and normalize it with `parseRow()`.
3. For `delete`: skip the MySQL fetch and delete by `itemId` (404s are treated as already-deleted).
4. Write to the target index named by `customer`.
5. Ack on success; nack with requeue on transient failure; nack without requeue (→ DLQ) on malformed payloads.

Switching providers requires no code changes — flip `QUEUE_PROVIDER` in the environment 
