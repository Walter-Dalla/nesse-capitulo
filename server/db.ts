import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email TEXT,
  name TEXT,
  picture TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,              -- 'google' | 'manual'
  source_id TEXT,                    -- id do volume no Google Books (null se manual)
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '[]',-- JSON array de strings
  cover_url TEXT,
  page_count INTEGER,
  published_year INTEGER,
  isbn13 TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_source
  ON books(source, source_id) WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id),
  status TEXT NOT NULL CHECK (status IN ('want','reading','read','abandoned')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  started_at TEXT,                   -- YYYY-MM-DD
  finished_at TEXT,                  -- YYYY-MM-DD
  read_year INTEGER,                 -- ano da leitura (permite registro retroativo sem data exata)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_user_books_user_status ON user_books(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_books_user_year ON user_books(user_id, read_year);
`;

export function openDatabase(file = env.databasePath) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  return db;
}

export type DB = ReturnType<typeof openDatabase>;
