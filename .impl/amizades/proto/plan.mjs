// Confere o plano da consulta de lote contra o schema real + tabelas novas, com banco vazio (como no teste).
import { openDatabase } from "/home/walter/nesse-capitulo/server/db.ts";
const db = openDatabase(":memory:");
db.exec(`CREATE TABLE friendships(user_low TEXT NOT NULL,user_high TEXT NOT NULL,PRIMARY KEY(user_low,user_high));
CREATE INDEX idx_friendships_high ON friendships(user_high);
CREATE INDEX idx_user_books_book ON user_books(book_id,status);
CREATE INDEX idx_books_isbn_upper ON books(upper(isbn13)) WHERE isbn13 IS NOT NULL;`);
const q=`WITH my_friends(id) AS (SELECT user_high FROM friendships WHERE user_low = ?1 UNION ALL SELECT user_low FROM friendships WHERE user_high = ?1),
mine AS (SELECT me.id AS item_id, mb.id AS book_id, upper(mb.isbn13) AS isbn FROM user_books me JOIN books mb ON mb.id = me.book_id WHERE me.user_id = ?1),
hits AS (
  SELECT m.item_id, fub.user_id FROM mine m JOIN user_books fub ON fub.book_id = m.book_id AND fub.status = 'read' JOIN my_friends f ON f.id = fub.user_id
  UNION
  SELECT m.item_id, fub.user_id FROM mine m JOIN books fb ON upper(fb.isbn13) = m.isbn AND fb.isbn13 IS NOT NULL JOIN user_books fub ON fub.book_id = fb.id AND fub.status = 'read' JOIN my_friends f ON f.id = fub.user_id WHERE m.isbn IS NOT NULL
)
SELECT item_id AS itemId, COUNT(*) AS count FROM hits GROUP BY item_id`;
for (const r of db.prepare("EXPLAIN QUERY PLAN "+q).all("x")) console.log(r.detail);
