// Usage: node ./src/utils/osIndex.js [indexName]

require("dotenv").config();
const { getOpenSearchClient } = require("../lib/opensearch-client");

const {
  getFaqData,
  getGuideData,
  getTutorialData,
  getVideoData,
} = require("./dbQueries");

const indexName = process.argv[2] || "test-index";

const indexBody = require("../assets/osindex.json");

async function createIndex(index, upsert = true) {
  const client = getOpenSearchClient();
  try {
    const isIndexExists = await client.isIndexExists(index);
    if (isIndexExists) {
      if (!upsert) {
        console.log(`Index '${index}' already exists. Skipping creation.`);
        return;
      }
      console.log(`Index '${index}' already exists. Deleting...`);
      await client.dropIndex(index);
      console.log(`Deleted index '${index}'.`);
    }
    await client.createIndex(index, indexBody);
    console.log(`Created index '${index}' with mapping.`);
  } catch (err) {
    console.error("Error creating index:", err);
    throw err;
  }
}

// Helper to clean and convert row data
function parseRow(row) {
  const BOOLEAN_FIELDS = ["disabled", "outdated", "featured_video"];
  const doc = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined) {
      if (BOOLEAN_FIELDS.includes(k)) {
        try {
          doc[k] = Boolean(Number(v));
        } catch {
          doc[k] = v;
        }
      } else {
        doc[k] = v;
      }
    }
  }
  return doc;
}

// Utility to generate OS bulk index metadata
const _getIndex = (customer, id, type) => {
  const articleId = `${type}-${id}-1`;
  return { _index: customer, _id: articleId };
};

// Bulk ingest logic for OpenSearch
async function ingestData({ index, customer }) {
  const client = getOpenSearchClient();
  // Fetch data from MySQL
  const [faqRows, guideRows, tutorialRows, videoRows] = await Promise.all([
    getFaqData(customer),
    getGuideData(customer),
    getTutorialData(customer),
    getVideoData(customer),
  ]);

  console.log("faqRows", faqRows.length);
  console.log("guideRows", guideRows.length);
  console.log("tutorialRows", tutorialRows.length);
  console.log("videoRows", videoRows.length);

  function getDocId(row, idFields) {
    for (const f of idFields) {
      if (row[f] != null) return String(row[f]);
      if (row[f.toLowerCase()] != null) return String(row[f.toLowerCase()]);
      if (row[f.toUpperCase()] != null) return String(row[f.toUpperCase()]);
    }
    return null;
  }

  // Add required keys and collect all docs
  const contentTypes = [
    { name: "faq", rows: faqRows, idFields: ["pk"] },
    { name: "guide", rows: guideRows, idFields: ["pk"] },
    { name: "tutorial", rows: tutorialRows, idFields: ["pk"] },
    { name: "video", rows: videoRows, idFields: ["pk"] },
  ];

  let success = 0,
    failed = 0,
    errors = [];
  for (const { name, rows, idFields } of contentTypes) {
    console.log("Processing content type:", name, rows.length);
    // Process in batches of 100 using promiseQueue
    await promiseQueue(rows, 200, async (row, i) => {
      const docId = getDocId(row, idFields);
      console.log("docId", docId);
      if (!docId) {
        failed++;
        errors.push({ type: name, row: i, error: "Missing doc id", data: row });
        return;
      }
      const doc = parseRow(row);
      if (doc["PK"]) {
        doc["pk"] = doc["PK"];
        delete doc["PK"];
      }
      delete doc["PK"];
      try {
        await client.ingest(index, { doc, docId });
        console.log(`Indexed ${name} doc with id ${docId}`);
        success++;
      } catch (e) {
        failed++;
        errors.push({ type: name, row: i, error: e.message, data: row });
      }
    });
  }
  await client.refreshIndex(index);
  return { success, failed, errors };
}

module.exports = {
  createIndex,
  ingestData,
};

// If run directly, create the index
if (require.main === module) {
  createIndex(indexName)
    .then(() => {
      console.log("Index setup complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error setting up index:", err);
      process.exit(1);
    });
}

// Promise queue function to process items in batches
async function promiseQueue(items, batchSize, fn) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item, idx) => fn(item, i + idx)));
  }
}
