const mysql = require('mysql2/promise');

let connection;

async function createConnection() {
  if (!connection || connection.connection._closing) {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: true,
      },
    });
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
