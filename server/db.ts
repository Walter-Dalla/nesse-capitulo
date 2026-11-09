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
  current_page INTEGER,              -- página em que o leitor está (Lendo) ou parou (Abandonado)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_user_books_user_status ON user_books(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_books_user_year ON user_books(user_id, read_year);

-- Amizade: uma linha por par, sempre com user_low < user_high (sem pedido pendente).
CREATE TABLE IF NOT EXISTS friendships (
  user_low TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_low, user_high),
  CHECK (user_low < user_high)
);
CREATE INDEX IF NOT EXISTS idx_friendships_high ON friendships(user_high);

-- Convite de amizade por link: uso único, sem validade.
CREATE TABLE IF NOT EXISTS friend_invites (
  code TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_by TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON friend_invites(inviter_id);

-- Badge de amigos: casar o mesmo livro por book_id ou por ISBN sem varrer a tabela.
CREATE INDEX IF NOT EXISTS idx_user_books_book ON user_books(book_id, status);
CREATE INDEX IF NOT EXISTS idx_books_isbn_upper ON books(upper(isbn13)) WHERE isbn13 IS NOT NULL;

-- Comentários de um leitor sobre um livro da própria estante: privado (só ele) ou público (amigos veem).
CREATE TABLE IF NOT EXISTS book_comments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_book_comments_item ON book_comments(item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_book_comments_user ON book_comments(user_id);

-- Livro manual nunca é reaproveitado: sem item na estante, o título digitado pela pessoa sai do banco.
-- user_books.book_id não cascateia; o gatilho cobre a remoção do item e a cascata de users.
CREATE TRIGGER IF NOT EXISTS trg_user_books_manual_orphan AFTER DELETE ON user_books
WHEN (SELECT source FROM books WHERE id = OLD.book_id) = 'manual'
BEGIN
  DELETE FROM books WHERE id = OLD.book_id AND NOT EXISTS (SELECT 1 FROM user_books WHERE book_id = OLD.book_id);
END;
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
  if (!cols("user_books").includes("current_page")) db.exec("ALTER TABLE user_books ADD COLUMN current_page INTEGER");
  // convites deixaram de expirar: a coluna de validade sai, e os convites antigos voltam a valer
  if (cols("friend_invites").includes("expires_at")) db.exec("ALTER TABLE friend_invites DROP COLUMN expires_at");
  // livros manuais que ficaram sem item antes do gatilho trg_user_books_manual_orphan
  db.exec("DELETE FROM books WHERE source = 'manual' AND id NOT IN (SELECT book_id FROM user_books)");
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
