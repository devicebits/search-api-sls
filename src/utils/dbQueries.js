const { createConnection, closeConnection } = require('./dbClient');

async function getFaqData(customerName) {
  const db = createConnection();
  try {
    return await db
      .select(
        'faq.PK as pk',
        db.raw('ANY_VALUE(faq.name) as name'),
        db.raw('ANY_VALUE(faq.outputOrder) as outputorder'),
        db.raw('ANY_VALUE(faq.phonefk) as phonefk'),
        db.raw('ANY_VALUE(faq.concept) as concept'),
        db.raw('ANY_VALUE(faq.name_stemmed) as name_stemmed'),
        db.raw('ANY_VALUE(faq.val) as val'),
        db.raw('ANY_VALUE(faq.val_language_2) as val_language_2'),
        db.raw('ANY_VALUE(faq.val_language_3) as val_language_3'),
        db.raw('ANY_VALUE(faq.name_language_2) as name_language_2'),
        db.raw('ANY_VALUE(faq.name_language_3) as name_language_3'),
        db.raw('ANY_VALUE(faq.academy_category_fk) as academy_category_fk'),
        db.raw('ANY_VALUE(phone.name) as model'),
        db.raw('ANY_VALUE(phone.manufacturer) as manufacturer'),
        db.raw('ANY_VALUE(phonetype.PhoneType) as phone_type'),
        db.raw('ANY_VALUE(phoneClone.language) as language')
      )
      .from('faq')
      .join('phoneClone', 'faq.phonefk', 'phoneClone.phoneFK')
      .join('phone', 'faq.phonefk', 'phone.pk')
      .join('phonetype', 'phone.PhoneTypeFK', 'phonetype.PK')
      .join('customer_faq', 'faq.PK', 'customer_faq.faq_FK')
      .join('customer', 'customer_faq.Customer_FK', 'customer.PK')
      .where({ 'customer.name': customerName })
      .groupBy('faq.PK');
  } finally {
    await closeConnection();
  }
}

async function getGuideData(customerName) {
  const db = createConnection();
  try {
    return await db
      .select(
        'troubleshooting_guide.PK as pk',
        db.raw('ANY_VALUE(troubleshooting_guide.phonefk) as phonefk'),
        db.raw('ANY_VALUE(troubleshooting_guide.name) as name'),
        db.raw('ANY_VALUE(troubleshooting_guide.outputOrder) as outputorder'),
        db.raw('ANY_VALUE(troubleshooting_guide.name_language_2) as name_language_2'),
        db.raw('ANY_VALUE(troubleshooting_guide.name_language_3) as name_language_3'),
        db.raw('ANY_VALUE(troubleshooting_guide.academy_category_fk) as academy_category_fk'),
        db.raw('ANY_VALUE(troubleshooting_guide.concept) as concept'),
        db.raw('ANY_VALUE(troubleshooting_guide.name_stemmed) as name_stemmed'),
        db.raw('ANY_VALUE(phone.name) as model'),
        db.raw('ANY_VALUE(phone.manufacturer) as manufacturer'),
        db.raw('ANY_VALUE(phonetype.PhoneType) as phone_type'),
        db.raw('ANY_VALUE(phoneClone.language) as language'),
        db.raw('ANY_VALUE(guide_steps.step) as steps_language_1'),
        db.raw('ANY_VALUE(guide_steps.step_language_2) as steps_language_2'),
        db.raw('ANY_VALUE(guide_steps.step_language_3) as steps_language_3')
      )
      .from('troubleshooting_guide')
      .join('phoneClone', 'troubleshooting_guide.phonefk', 'phoneClone.phoneFK')
      .join('phone', 'troubleshooting_guide.phonefk', 'phone.pk')
      .join('phonetype', 'phone.PhoneTypeFK', 'phonetype.PK')
      .join('guide_steps', 'troubleshooting_guide.PK', 'guide_steps.guide_fk')
      .join('customer_guide', 'troubleshooting_guide.PK', 'customer_guide.guide_FK')
      .join('customer', 'customer_guide.Customer_FK', 'customer.PK')
      .where({ 'customer.name': customerName })
      .groupBy('troubleshooting_guide.PK');
  } finally {
    await closeConnection();
  }
}

async function getTutorialData(customerName) {
  const db = createConnection();
  try {
    return await db
      .select(
        'tutorial.PK as pk',
        db.raw('ANY_VALUE(tutorial.phonefk) as phonefk'),
        db.raw('ANY_VALUE(tutorial.name) as name'),
        db.raw('ANY_VALUE(tutorial.Features) as features'),
        db.raw('ANY_VALUE(tutorial.tutorial_categoryFK) as tutorial_categoryFK'),
        db.raw('ANY_VALUE(tutorial.tutorialMCD) as tutorialMCD'),
        db.raw('ANY_VALUE(tutorial.tutorialType) as tutorialType'),
        db.raw('ANY_VALUE(tutorial.outputOrder) as outputorder'),
        db.raw('ANY_VALUE(tutorial.tutorialStatus) as tutorialStatus'),
        db.raw('ANY_VALUE(tutorial.name_language_2) as name_language_2'),
        db.raw('ANY_VALUE(tutorial.name_language_3) as name_language_3'),
        db.raw('ANY_VALUE(tutorial.tutorial_categoryFK_language_2) as category_language_2'),
        db.raw('ANY_VALUE(tutorial.tutorial_categoryFK_language_3) as category_language_3'),
        db.raw('ANY_VALUE(tutorial.tutorialGUID) as tutorialGUID'),
        db.raw('ANY_VALUE(phone.name) as model'),
        db.raw('ANY_VALUE(phone.manufacturer) as manufacturer'),
        db.raw('ANY_VALUE(customer_tutorial.inheritable) as inheritable'),
        db.raw('ANY_VALUE(phonetype.PhoneType) as phone_type'),
        db.raw('ANY_VALUE(phoneClone.language) as language'),
        db.raw('ANY_VALUE(tutorialsteps.step) as steps_language_1'),
        db.raw('ANY_VALUE(tutorialsteps.step_language_2) as steps_language_2'),
        db.raw('ANY_VALUE(tutorialsteps.step_language_3) as steps_language_3'),
        db.raw('ANY_VALUE(tc.name) as category')
      )
      .from('tutorial')
      .join('tutorial_category as tc', 'tutorial.tutorial_categoryFK', 'tc.PK')
      .join('phoneClone', 'tutorial.phonefk', 'phoneClone.phoneFK')
      .join('phone', 'tutorial.phonefk', 'phone.pk')
      .join('phonetype', 'phone.PhoneTypeFK', 'phonetype.PK')
      .join('tutorialsteps', 'tutorial.PK', 'tutorialsteps.tutorialfk')
      .join('customer_tutorial', 'tutorial.PK', 'customer_tutorial.tutorial_FK')
      .join('customer', 'customer_tutorial.Customer_FK', 'customer.PK')
      .where({ 'customer.name': customerName })
      .groupBy('tutorial.PK');
  } finally {
    await closeConnection();
  }
}

async function getVideoData(customerName) {
  const db = createConnection();
  try {
    return await db
      .select(
        'video.PK as pk',
        db.raw('ANY_VALUE(video.phonefk) as phonefk'),
        db.raw('ANY_VALUE(video.outputOrder) as outputorder'),
        db.raw('ANY_VALUE(video.name) as name'),
        db.raw('ANY_VALUE(video.name_language_2) as name_language_2'),
        db.raw('ANY_VALUE(video.name_language_3) as name_language_3'),
        db.raw('ANY_VALUE(video.video_url) as video_url'),
        db.raw('ANY_VALUE(video.academy_category_fk) as academy_category_fk'),
        db.raw('ANY_VALUE(video.concept) as concept'),
        db.raw('ANY_VALUE(video.name_stemmed) as name_stemmed'),
        db.raw('ANY_VALUE(video.thumbnail_url) as thumbnail_url'),
        db.raw('ANY_VALUE(video.video_url_language_2) as video_url_language_2'),
        db.raw('ANY_VALUE(video.video_url_language_3) as video_url_language_3'),
        db.raw('ANY_VALUE(video.thumbnail_url_language_2) as thumbnail_url_language_2'),
        db.raw('ANY_VALUE(video.thumbnail_url_language_3) as thumbnail_url_language_3'),
        db.raw('ANY_VALUE(phone.name) as model'),
        db.raw('ANY_VALUE(phone.manufacturer) as manufacturer'),
        db.raw('ANY_VALUE(phonetype.PhoneType) as phone_type'),
        db.raw('ANY_VALUE(phoneClone.language) as language')
      )
      .from('video')
      .join('phoneClone', 'video.phonefk', 'phoneClone.phoneFK')
      .join('phone', 'video.phonefk', 'phone.pk')
      .join('phonetype', 'phone.PhoneTypeFK', 'phonetype.PK')
      .join('customer_video', 'video.PK', 'customer_video.video_FK')
      .join('customer', 'customer_video.Customer_FK', 'customer.PK')
      .where({ 'customer.name': customerName })
      .groupBy('video.PK');
  } finally {
    await closeConnection();
  }
}

async function getDbData(customerId) {
  const db = createConnection();
  try {
    return await db('products').where('customer', customerId);
  } finally {
    await closeConnection();
  }
}

async function executeQuery(query, params = []) {
  const db = createConnection();
  try {
    const [rows] = await db.raw(query, params);
    return rows;
  } finally {
    await closeConnection();
  }
}

module.exports = {
  getDbData,
  executeQuery,
  getFaqData,
  getGuideData,
  getTutorialData,
  getVideoData,
};
