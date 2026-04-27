const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { query } = require("./neon");

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      event_date DATE NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await seedAdmin();
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(env.adminPassword, 10);

  await query(
    `
      INSERT INTO admins (username, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO NOTHING;
    `,
    [env.adminUsername, passwordHash]
  );
}

module.exports = {
  ensureSchema
};
