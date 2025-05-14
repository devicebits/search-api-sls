const { createConnection, closeConnection } = require('./dbClient');

async function getDbData(customerId) {
  const conn = await createConnection();
  const [rows] = await conn.execute('SELECT * FROM products WHERE customer = ?', [customerId]);
  await closeConnection();
  return rows;
}

module.exports = {
  getDbData,
};
