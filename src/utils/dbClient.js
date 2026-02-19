const knex = require('knex');

let db;

function createConnection() {
  if (!db) {
    const config = {
      client: 'mysql2',
      connection: {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
      },
    }
    if (process.env.MYSQL_USE_SSL === 'true') {
      config.connection.ssl = { rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false };
    }
    db = knex(config);
  }
  return db;
}

async function closeConnection() {
  if (db) {
    await db.destroy();
    db = null;
  }
}

module.exports = {
  createConnection,
  closeConnection,
};
