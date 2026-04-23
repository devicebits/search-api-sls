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

async function getDbData(customerId) {
  const conn = await createConnection();
  const [rows] = await conn.execute('SELECT * FROM products WHERE customer = ?', [customerId]);
  await closeConnection();
  return rows;
}

async function executeQuery(query, params = []) {
  const conn = await createConnection();
  const [rows] = await conn.execute(query, params);
  await closeConnection();
  return rows;
}

async function getFaqData(customerName) {
  return await executeQuery(SQL_FAQ_QUERY, [customerName]);
}

async function getGuideData(customerName) {
  return await executeQuery(SQL_GUIDE_QUERY, [customerName]);
}

async function getTutorialData(customerName) {
  return await executeQuery(SQL_TUTORIAL_QUERY, [customerName]);
}

async function getVideoData(customerName) {
  return await executeQuery(SQL_VIDEO_QUERY, [customerName]);
}

module.exports = {
  getDbData,
  executeQuery,
  getFaqData,
  getGuideData,
  getTutorialData,
  getVideoData,
  SQL_FAQ_QUERY,
  SQL_GUIDE_QUERY,
  SQL_TUTORIAL_QUERY,
  SQL_VIDEO_QUERY
};
