// Protótipo: schema final (par canônico, convite) e custo do badge em SQL por book_id ou ISBN.
import { DatabaseSync } from "node:sqlite";
import { randomUUID as u } from "node:crypto";
const db = new DatabaseSync(":memory:");
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,picture TEXT);
CREATE TABLE books(id TEXT PRIMARY KEY,isbn13 TEXT,title TEXT);
CREATE TABLE user_books(id TEXT PRIMARY KEY,user_id TEXT,book_id TEXT,status TEXT,UNIQUE(user_id,book_id));
CREATE INDEX idx_user_books_user_status ON user_books(user_id,status);
CREATE TABLE friendships(user_low TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,user_high TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at TEXT NOT NULL DEFAULT(datetime('now')),PRIMARY KEY(user_low,user_high),CHECK(user_low<user_high));
CREATE INDEX idx_friendships_high ON friendships(user_high);
CREATE TABLE friend_invites(code TEXT PRIMARY KEY,inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,used_by TEXT REFERENCES users(id) ON DELETE CASCADE,created_at TEXT NOT NULL DEFAULT(datetime('now')));
CREATE INDEX idx_friend_invites_inviter ON friend_invites(inviter_id);`);
const ins=(s,...a)=>db.prepare(s).run(...a);
ins("INSERT INTO users(id) VALUES('a'),('b')");
ins("INSERT INTO friendships(user_low,user_high) VALUES('a','b')");
console.log("repetido changes:",ins("INSERT OR IGNORE INTO friendships(user_low,user_high) VALUES('a','b')").changes);
for (const [l,h] of [["b","a"],["a","a"]]) { try { ins("INSERT INTO friendships(user_low,user_high) VALUES(?,?)",l,h); console.log("aceitou",l,h);} catch(e){console.log("recusado",l,h,e.message);} }
// carga
db.exec("BEGIN");
ins("INSERT INTO users(id) VALUES('me')");
const isbn=i=>String(9780000000000+i);
const mk=(user,i)=>{const b=u();ins("INSERT INTO books(id,isbn13,title) VALUES(?,?,?)",b,i%3===0?null:isbn(i),"t"+i);ins("INSERT INTO user_books(id,user_id,book_id,status) VALUES(?,?,?,'read')",u(),user,b);};
for(let i=0;i<500;i++)mk("me",i);
for(let f=0;f<50;f++){const id="f"+f;ins("INSERT INTO users(id) VALUES(?)",id);const [l,h]=["me",id].sort();ins("INSERT INTO friendships(user_low,user_high) VALUES(?,?)",l,h);for(let i=0;i<500;i++)mk(id,(i*7+f)%3000);}
db.exec("COMMIT");
const F=`WITH my_friends(id) AS (SELECT user_high FROM friendships WHERE user_low=?1 UNION ALL SELECT user_low FROM friendships WHERE user_high=?1)`;
const orQ=db.prepare(`${F} SELECT me.id AS itemId,COUNT(DISTINCT fub.user_id) AS count FROM user_books me JOIN books mb ON mb.id=me.book_id JOIN my_friends f JOIN user_books fub ON fub.user_id=f.id AND fub.status='read' JOIN books fb ON fb.id=fub.book_id WHERE me.user_id=?1 AND (fb.id=mb.id OR (mb.isbn13 IS NOT NULL AND upper(fb.isbn13)=upper(mb.isbn13))) GROUP BY me.id`);
const T=(n,fn)=>{for(let k=0;k<2;k++){const t=performance.now();const r=fn();console.log(n,(performance.now()-t).toFixed(1),"ms",r);}};
T("OR sem indice",()=>orQ.all("me").length);
db.exec("CREATE INDEX idx_books_isbn_upper ON books(upper(isbn13)) WHERE isbn13 IS NOT NULL");
const unionQ=db.prepare(`${F}, mine AS (SELECT me.id AS item_id,mb.id AS book_id,upper(mb.isbn13) AS isbn FROM user_books me JOIN books mb ON mb.id=me.book_id WHERE me.user_id=?1),
 hits AS (SELECT m.item_id,fub.user_id FROM mine m JOIN user_books fub ON fub.book_id=m.book_id AND fub.status='read' JOIN my_friends f ON f.id=fub.user_id
  UNION SELECT m.item_id,fub.user_id FROM mine m JOIN books fb ON upper(fb.isbn13)=m.isbn AND fb.isbn13 IS NOT NULL JOIN user_books fub ON fub.book_id=fb.id AND fub.status='read' JOIN my_friends f ON f.id=fub.user_id WHERE m.isbn IS NOT NULL)
 SELECT item_id AS itemId,COUNT(*) AS count FROM hits GROUP BY item_id`);
T("UNION sem indice book_id",()=>unionQ.all("me").length);
db.exec("CREATE INDEX idx_user_books_book ON user_books(book_id,status)");
T("UNION com indices",()=>unionQ.all("me").length);
const a=orQ.all("me").map(r=>r.itemId+r.count).sort().join();const b=unionQ.all("me").map(r=>r.itemId+r.count).sort().join();console.log("OR == UNION:",a===b);
