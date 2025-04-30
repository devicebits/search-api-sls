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
