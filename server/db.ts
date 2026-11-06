import { DatabaseSync } from "node:sqlite";
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
  ad_unlocked INTEGER NOT NULL DEFAULT 0, -- 1 depois que o usuário viu o anúncio nesta sessão
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Guardamos só o mínimo por livro: título, autores, referências curtas e a sinopse.
-- A capa NÃO fica no banco: é derivada/baixada do Google Books ou da Open Library.
-- A sinopse é gravada na primeira consulta bem-sucedida à fonte externa.
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,              -- 'google' | 'openlibrary' | 'manual'
  source_id TEXT,                    -- id do volume (Google) ou da obra (Open Library); null se manual
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '[]',-- JSON array de strings
  page_count INTEGER,
  published_year INTEGER,
  isbn13 TEXT,
  cover_ref TEXT,                    -- referência curta da capa ('g' = Google pelo source_id; 'ol:<id>' = Open Library); null = derivar do ISBN
  description TEXT,                  -- sinopse vinda da fonte externa; null = ainda não obtida
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
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/** Migrações leves para bancos criados por versões anteriores. */
function migrate(db: DatabaseSync) {
  const cols = (table: string) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  const books = cols("books");
  if (!books.includes("cover_ref")) db.exec("ALTER TABLE books ADD COLUMN cover_ref TEXT");
  if (books.includes("cover_url")) {
    // versões antigas guardavam a URL inteira; converte para a referência curta e descarta
    db.exec("UPDATE books SET cover_ref = 'g' WHERE source = 'google' AND cover_url IS NOT NULL AND cover_ref IS NULL");
    db.exec("ALTER TABLE books DROP COLUMN cover_url");
  }
  if (!books.includes("description")) db.exec("ALTER TABLE books ADD COLUMN description TEXT");
  if (!cols("sessions").includes("ad_unlocked")) db.exec("ALTER TABLE sessions ADD COLUMN ad_unlocked INTEGER NOT NULL DEFAULT 0");
}

export type DB = DatabaseSync;

/** Roda `fn` numa transação: COMMIT se terminar, ROLLBACK se lançar erro. */
export function transaction<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
