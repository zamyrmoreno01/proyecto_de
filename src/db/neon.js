const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
const env = require("../config/env");

neonConfig.webSocketConstructor = ws;

let pool = null;

function getPool() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 10
    });
  }

  return pool;
}

async function query(text, params) {
  const db = getPool();
  return db.query(text, params);
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  closePool
};
