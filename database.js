const fs = require('fs');
const path = require('path');

let db;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  // Production: PostgreSQL
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render/Heroku
  });
  isPostgres = true;
  console.log('Connected to PostgreSQL');
} else {
  // Local: SQLite
  const Database = require('better-sqlite3');
  const dbPath = path.resolve(__dirname, 'global_horizons.db');
  db = new Database(dbPath);
  console.log('Connected to SQLite');
}

/**
 * Unified query function.
 * Accepts PostgreSQL style queries with $1, $2 placeholders.
 * Automatically converts to SQLite ? style if running locally.
 */
const query = async (text, params = []) => {
  if (isPostgres) {
    const res = await db.query(text, params);
    // Normalize return to look like SQLite info for inserts if needed, 
    // or just return rows.
    // For SELECT: rows are in res.rows
    // For INSERT: we usually want the ID. Postgres needs "RETURNING id" in SQL.
    return { rows: res.rows, rowCount: res.rowCount };
  } else {
    // Convert $1, $2 to ?
    const sqliteSql = text.replace(/\$\d+/g, '?');

    // Determine if it's a SELECT or INSERT/UPDATE
    const stmt = db.prepare(sqliteSql);

    if (sqliteSql.trim().toUpperCase().startsWith('SELECT')) {
      const rows = stmt.all(...params);
      return { rows: rows, rowCount: rows.length };
    } else {
      const info = stmt.run(...params);
      // Construct a fake "rows" for RETURNING clauses if possible, 
      // but SQLite doesn't do RETURNING easily without extra steps.
      // We will rely on info.lastInsertRowid for inserts.
      return {
        rows: [],
        rowCount: info.changes,
        lastID: info.lastInsertRowid
      };
    }
  }
};

// Initialize Tables
const init = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY,
      username VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      is_admin INTEGER DEFAULT 0
    );
  `;

  const appsTable = `
    CREATE TABLE IF NOT EXISTS applications (
      id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(255),
      destination VARCHAR(255),
      position VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      created_at ${isPostgres ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    );
  `;

  try {
    await query(usersTable);
    await query(appsTable);
    console.log('Database tables initialized');
  } catch (err) {
    console.error('Failed to initialize database tables:', err);
  }
};

init();

module.exports = { query, isPostgres };
