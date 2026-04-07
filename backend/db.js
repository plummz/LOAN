const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'loan_app.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDb() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      role TEXT NOT NULL DEFAULT 'borrower' CHECK(role IN ('admin', 'borrower')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      term_months INTEGER NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 3.0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'paid', 'rejected')),
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS loan_schedule (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      amount_due INTEGER NOT NULL,
      principal INTEGER NOT NULL,
      interest INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('gcash', 'maya', 'palawan_pay', 'cash')),
      reference_number TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      loan_id TEXT UNIQUE NOT NULL,
      disbursed_amount INTEGER NOT NULL,
      remaining_balance INTEGER NOT NULL,
      last_updated TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    CREATE TABLE IF NOT EXISTS interest_records (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      principal_balance INTEGER NOT NULL,
      interest_rate REAL NOT NULL,
      interest_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );
  `);

  console.log('Database initialized successfully');
  return database;
}

module.exports = { getDb, initializeDb };
