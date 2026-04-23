const { createConnection, closeConnection } = require('./dbClient');

const SQL_FAQ_QUERY = `
SELECT
  'faq' AS type,
  faq.*,
  faq.val AS val,
  GROUP_CONCAT(DISTINCT topics.name SEPARATOR ',') AS topics,
  CONCAT_WS(' ', p.Name, pc.customer_name) AS model,
  p.manufacturer,
  pc.language AS language,
  MIN(ct.deleted) AS deleted,
  pt.PhoneType AS phone_type
FROM faq
JOIN customer_faq ct ON ct.faq_FK = faq.PK
JOIN customer c ON c.PK = ct.Customer_FK
JOIN customer_phone cp ON cp.Customer_FK = c.PK
JOIN phone p ON cp.Phone_FK = p.pk AND faq.phonefk = p.pk
JOIN phoneClone pc ON pc.phoneFK = faq.phonefk
LEFT JOIN faq_topics ON faq.PK = faq_topics.faq_id
LEFT JOIN topics ON faq_topics.topic_id = topics.PK
LEFT JOIN phonetype pt ON p.PhoneTypeFK = pt.PK
WHERE c.Name = ?
  AND p.Name NOT LIKE '%NoIndex%'
  AND (faq.concept != 'freenav' OR faq.concept IS NULL)
GROUP BY faq.PK, faq.phonefk, faq.outputOrder, faq.name, faq.name_language_2, faq.name_language_3, faq.val, faq.val_language_2, faq.val_language_3, faq.academy_category_fk, faq.concept, faq.name_stemmed, faq.presales, faq.disabled, faq.outdated, faq.salesforce_id, p.Name, pc.customer_name, p.manufacturer, pc.language, pt.PhoneType
`;

const SQL_GUIDE_QUERY = `
SELECT
  'guide' AS type,
  guide.PK,
  guide.phonefk,
  guide.name,
  guide.name_language_2,
  guide.name_language_3,
  steps.steps_language_1,
  steps.steps_language_2,
  steps.steps_language_3,
  pc.language AS language,
  MIN(ct.deleted) AS deleted,
  CONCAT_WS(' ', p.Name, pc.customer_name) AS model,
  p.manufacturer,
  pt.PhoneType AS phone_type
FROM troubleshooting_guide guide
JOIN (
    SELECT
      g.PK,
      GROUP_CONCAT(step SEPARATOR ',') AS steps_language_1,
      GROUP_CONCAT(step_language_2 SEPARATOR ',') AS steps_language_2,
      GROUP_CONCAT(step_language_3 SEPARATOR ',') AS steps_language_3
    FROM troubleshooting_guide g
    JOIN guide_steps step ON step.guide_fk = g.PK
    GROUP BY g.PK
) steps ON steps.PK = guide.PK
JOIN customer_guide ct ON ct.guide_FK = guide.PK
JOIN customer c ON c.PK = ct.Customer_FK
JOIN customer_phone cp ON cp.Customer_FK = c.PK
JOIN phoneClone pc ON guide.phonefk = pc.phoneFK
JOIN phone p ON guide.phonefk = p.pk AND cp.Phone_FK = p.pk
LEFT JOIN phonetype pt ON p.PhoneTypeFK = pt.PK
WHERE c.Name = ?
  AND p.Name NOT LIKE '%NoIndex%'
GROUP BY guide.PK, guide.phonefk, guide.name, guide.name_language_2, guide.name_language_3, steps.steps_language_1, steps.steps_language_2, steps.steps_language_3, pc.language, p.Name, pc.customer_name, p.manufacturer, pt.PhoneType
`;

const SQL_TUTORIAL_QUERY = `
SELECT
  'tutorial' AS type,
  tutorial.*,
  CAST(pc.language AS CHAR) AS language,
  CAST(ct.inheritable AS UNSIGNED) AS inheritable,
  cat.name AS category,
  cat2.name AS category_language_2,
  cat3.name AS category_language_3,
  steps.steps_language_1,
  steps.steps_language_2,
  steps.steps_language_3,
  CONCAT_WS(' ', p.Name, pc.customer_name) AS model,
  p.manufacturer,
  MIN(ct.deleted) AS deleted,
  pt.PhoneType AS phone_type
FROM tutorial
JOIN (
    SELECT
      t.PK,
      GROUP_CONCAT(DISTINCT step SEPARATOR ',') AS steps_language_1,
      GROUP_CONCAT(DISTINCT step_language_2 SEPARATOR ',') AS steps_language_2,
      GROUP_CONCAT(DISTINCT step_language_3 SEPARATOR ',') AS steps_language_3
    FROM tutorial t
    JOIN tutorialsteps step ON step.tutorialfk = t.PK
    GROUP BY t.PK
) steps ON steps.PK = tutorial.PK
LEFT JOIN tutorial_category cat ON cat.PK = tutorial.tutorial_categoryFK
LEFT JOIN tutorial_category cat2 ON cat2.PK = tutorial.tutorial_categoryFK_language_2
LEFT JOIN tutorial_category cat3 ON cat3.PK = tutorial.tutorial_categoryFK_language_3
JOIN customer_tutorial ct ON ct.tutorial_FK = tutorial.PK AND tutorial.tutorialStatus != 'HIDDEN'
JOIN customer c ON c.PK = ct.Customer_FK
JOIN customer_phone cp ON cp.Customer_FK = c.PK
JOIN phoneClone pc ON pc.phoneFK = tutorial.phonefk
JOIN phone p ON tutorial.phonefk = p.pk AND cp.Phone_FK = p.pk
LEFT JOIN phonetype pt ON p.PhoneTypeFK = pt.PK
WHERE c.Name = ?
  AND p.Name NOT LIKE '%NoIndex%'
  AND p.pk NOT IN (SELECT parent_phone_fk FROM customer_parent_phone)
GROUP BY tutorial.PK, tutorial.phonefk, tutorial.name, tutorial.Features, tutorial.tutorial_categoryFK, tutorial.tutorialMCD, tutorial.tutorialType, tutorial.outputOrder, tutorial.tutorialStatus, tutorial.name_language_2, tutorial.name_language_3, tutorial.tutorial_categoryFK_language_2, tutorial.tutorial_categoryFK_language_3, tutorial.tutorialGUID, tutorial.presales, tutorial.outdated, tutorial.disabled, tutorial.single_imaged, pc.language, ct.inheritable, cat.name, cat2.name, cat3.name, p.Name, pc.customer_name, p.manufacturer, pt.PhoneType
`;

const SQL_VIDEO_QUERY = `
SELECT
  'video' AS type,
  video.*,
  CONCAT_WS(' ', p.Name, pc.customer_name) AS model,
  p.manufacturer,
  pc.language AS language,
  MIN(ct.deleted) AS deleted,
  pt.PhoneType AS phone_type
FROM video
JOIN customer_video ct ON ct.video_FK = video.PK
JOIN customer c ON c.PK = ct.Customer_FK
JOIN customer_phone cp ON cp.Customer_FK = c.PK
JOIN phone p ON video.phonefk = p.pk AND cp.Phone_FK = p.pk
JOIN phoneClone pc ON pc.phoneFK = video.phonefk
LEFT JOIN phonetype pt ON p.PhoneTypeFK = pt.PK
WHERE c.Name = ?
  AND p.Name NOT LIKE '%NoIndex%'
GROUP BY video.PK, video.phonefk, video.outputOrder, video.name, video.name_language_2, video.name_language_3, video.video_url, video.academy_category_fk, video.concept, video.name_stemmed, video.presales, video.thumbnail_url, video.video_url_language_2, video.video_url_language_3, video.featured_video, video.disabled, video.thumbnail_url_language_2, video.thumbnail_url_language_3, video.outdated, p.Name, pc.customer_name, p.manufacturer, pc.language, pt.PhoneType
`;

// Derive single-item variants by injecting an extra primary-key filter before
// the GROUP BY of each bulk query. Keeps the SQL single-sourced.
const buildByIdQuery = (bulkSql, tableAlias) =>
  bulkSql.replace(/GROUP BY/i, `AND ${tableAlias}.PK = ?\nGROUP BY`);

const SQL_FAQ_BY_ID      = buildByIdQuery(SQL_FAQ_QUERY,      'faq');
const SQL_GUIDE_BY_ID    = buildByIdQuery(SQL_GUIDE_QUERY,    'guide');
const SQL_TUTORIAL_BY_ID = buildByIdQuery(SQL_TUTORIAL_QUERY, 'tutorial');
const SQL_VIDEO_BY_ID    = buildByIdQuery(SQL_VIDEO_QUERY,    'video');

const VALID_TYPES = new Set(['faq', 'guide', 'tutorial', 'video']);

async function executeQuery(query, params = []) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } finally {
    await closeConnection();
  }
}

async function getDbData(customerId) {
  return executeQuery('SELECT * FROM products WHERE customer = ?', [customerId]);
}

// ---- Bulk fetchers (per customer) --------------------------------------------

async function getFaqData(customerName)      { return executeQuery(SQL_FAQ_QUERY,      [customerName]); }
async function getGuideData(customerName)    { return executeQuery(SQL_GUIDE_QUERY,    [customerName]); }
async function getTutorialData(customerName) { return executeQuery(SQL_TUTORIAL_QUERY, [customerName]); }
async function getVideoData(customerName)    { return executeQuery(SQL_VIDEO_QUERY,    [customerName]); }

// ---- Single-item fetchers (per customer + itemId) ----------------------------

async function getFaqById(customerName, itemId) {
  const rows = await executeQuery(SQL_FAQ_BY_ID, [customerName, itemId]);
  return rows[0] ?? null;
}

async function getGuideById(customerName, itemId) {
  const rows = await executeQuery(SQL_GUIDE_BY_ID, [customerName, itemId]);
  return rows[0] ?? null;
}

async function getTutorialById(customerName, itemId) {
  const rows = await executeQuery(SQL_TUTORIAL_BY_ID, [customerName, itemId]);
  return rows[0] ?? null;
}

async function getVideoById(customerName, itemId) {
  const rows = await executeQuery(SQL_VIDEO_BY_ID, [customerName, itemId]);
  return rows[0] ?? null;
}

/**
 * Dispatch to the correct single-item fetcher based on content type.
 * @param {{ type: string, customer: string, itemId: string }} params
 * @returns {Promise<object|null>} A single MySQL row or null if not found.
 */
async function getItemByTypeAndId({ type, customer, itemId }) {
  if (!VALID_TYPES.has(type)) {
    throw new Error(`Unsupported content type: ${type}. Expected one of ${[...VALID_TYPES].join(', ')}.`);
  }
  switch (type) {
    case 'faq':      return getFaqById(customer, itemId);
    case 'guide':    return getGuideById(customer, itemId);
    case 'tutorial': return getTutorialById(customer, itemId);
    case 'video':    return getVideoById(customer, itemId);
    default:         return null;
  }
}

// ---- Row → document parser ---------------------------------------------------

const BOOLEAN_FIELDS = ['disabled', 'outdated', 'featured_video', 'presales', 'single_imaged'];
const PK_FALLBACKS = ['PK', 'pk', 'Pk', 'pK'];

/**
 * Convert a MySQL row into the shape stored in OpenSearch/ElasticSearch.
 * - Drops null/undefined values.
 * - Normalizes the primary key into a lowercase `pk` field.
 * - Coerces boolean-flag columns from MySQL's 0/1 into true/false.
 */
function parseRow(row) {
  const doc = {};
  let pkValue = null;

  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue;

    if (PK_FALLBACKS.includes(key)) {
      pkValue = value;
      continue;
    }

    if (BOOLEAN_FIELDS.includes(key)) {
      const numeric = Number(value);
      doc[key] = Number.isFinite(numeric) ? Boolean(numeric) : Boolean(value);
      continue;
    }

    doc[key] = value;
  }

  if (pkValue !== null) {
    doc.pk = pkValue;
  }

  return doc;
}

module.exports = {
  // Bulk fetchers
  getDbData,
  executeQuery,
  getFaqData,
  getGuideData,
  getTutorialData,
  getVideoData,
  // Single-item fetchers
  getFaqById,
  getGuideById,
  getTutorialById,
  getVideoById,
  getItemByTypeAndId,
  // Row parsing
  parseRow,
  VALID_TYPES,
  // Raw SQL (exposed for callers that need the strings, e.g. logging)
  SQL_FAQ_QUERY,
  SQL_GUIDE_QUERY,
  SQL_TUTORIAL_QUERY,
  SQL_VIDEO_QUERY,
  SQL_FAQ_BY_ID,
  SQL_GUIDE_BY_ID,
  SQL_TUTORIAL_BY_ID,
  SQL_VIDEO_BY_ID,
};
