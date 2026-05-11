const mysql = require('mysql2/promise');

let connection;

async function createConnection() {
  if (!connection || connection.connection._closing) {
    const config = {
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    }
    if (process.env.MYSQL_USE_SSL === 'true') {
      config.ssl = { rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false };
    }
    connection = await mysql.createConnection(config)
  }
  return connection;
}

async function closeConnection() {
  if (connection && !connection.connection._closing) {
    await connection.end();
  }
}

module.exports = {
  createConnection,
  closeConnection,
};
