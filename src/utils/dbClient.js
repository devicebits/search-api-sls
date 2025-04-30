const mysql = require('mysql2/promise');

async function getDbData(params) {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: {
      rejectUnauthorized: true,
    },
  });
  // console.log("connection =>", connection);
  const [rows] = await connection.execute('SELECT * FROM products WHERE customer = ?', [params.id]);
  await connection.end();

  return rows;
}

module.exports = { getDbData };


