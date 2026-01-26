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

2. Build the Docker image:
  ```bash
  make compose-build
  ```

3. Run the Docker container:
  ```bash
  make compose-up
  ```

### Endpoints

**1. Create an index and ingest data**

This endpoint retrieves data from a database and ingests it into a specified search engine (currently supports Elasticsearch). It dynamically creates a customer-specific index (e.g., customer-222) if it doesn't exist and performs bulk indexing of the retrieved data.

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

URL - http://localhost:3000/?index=customer-222

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
