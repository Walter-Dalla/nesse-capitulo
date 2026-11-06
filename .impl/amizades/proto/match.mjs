// Protótipo descartável: índice único de par, casamento de livro, custo do badge em lote.
import { DatabaseSync } from "node:sqlite";
import { randomUUID as u } from "node:crypto";
const db = new DatabaseSync(":memory:");
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,picture TEXT,email TEXT);
CREATE TABLE books(id TEXT PRIMARY KEY,isbn13 TEXT,title TEXT,authors TEXT);
CREATE TABLE user_books(id TEXT PRIMARY KEY,user_id TEXT,book_id TEXT,status TEXT,UNIQUE(user_id,book_id));
CREATE INDEX idx_user_books_user_status ON user_books(user_id,status);
CREATE TABLE friendships(requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,status TEXT NOT NULL CHECK(status IN('pending','accepted')),created_at TEXT DEFAULT(datetime('now')),PRIMARY KEY(requester_id,addressee_id),CHECK(requester_id<>addressee_id));
CREATE UNIQUE INDEX idx_friendships_pair ON friendships(min(requester_id,addressee_id),max(requester_id,addressee_id));
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id,status);`);
db.prepare("INSERT INTO users(id) VALUES(?),(?)").run("a","b");
db.prepare("INSERT INTO friendships(requester_id,addressee_id,status) VALUES('a','b','pending')").run();
const rev = db.prepare("INSERT OR IGNORE INTO friendships(requester_id,addressee_id,status) VALUES('b','a','pending')").run();
console.log("par invertido: changes =", rev.changes);
try { db.prepare("INSERT INTO friendships(requester_id,addressee_id,status) VALUES('a','a','pending')").run(); console.log("self: aceitou"); } catch(e){ console.log("self recusado:", e.message); }
db.prepare("INSERT INTO users(id,email) VALUES('c','Ana@X.com'),('d',NULL)").run();
console.log("email lower:", db.prepare("SELECT id FROM users WHERE lower(email)=lower(?)").all("ana@x.COM").map(r=>r.id));

const norm=s=>s.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
const keys=b=>{const m=b.title.split(/:| - | — /)[0];const full=norm(b.title),main=norm(m);return{full,main:main&&main!==full?main:null,authors:[...new Set(b.authors.map(norm).filter(Boolean))],isbn:b.isbn13?b.isbn13.toUpperCase():null};};
export function match(mine,theirs){ // mine:{id,...}; theirs:{friendId,bookId,...}
  const byId=new Map(),byIsbn=new Map(),byFull=new Map(),byMain=new Map();
  const add=(m,k,f)=>{let s=m.get(k);if(!s)m.set(k,s=new Set());s.add(f);};
  for(const t of theirs){add(byId,t.bookId,t.friendId);const k=keys(t);if(k.isbn)add(byIsbn,k.isbn,t.friendId);
    if(k.full)for(const a of k.authors){add(byFull,a+"|"+k.full,t.friendId);if(k.main)add(byMain,a+"|"+k.main,t.friendId);}}
  const out=new Map();
  for(const b of mine){const s=new Set(byId.get(b.id)??[]);const k=keys(b);for(const f of byIsbn.get(k.isbn)??[])s.add(f);
    if(k.full)for(const a of k.authors){for(const f of byFull.get(a+"|"+k.full)??[])s.add(f);for(const f of byMain.get(a+"|"+k.full)??[])s.add(f);if(k.main)for(const f of byFull.get(a+"|"+k.main)??[])s.add(f);}
    out.set(b.id,s);}
  return out;
}
const T=(t,a,i)=>({id:u(),bookId:u(),friendId:"f",title:t,authors:a,isbn13:i??null});
const cases=[
 ["acento/caixa","Memórias Póstumas",["Machado de Assis"],"MEMORIAS POSTUMAS",["machado de assis"],true],
 ["iniciais","Harry Potter",["J.K. Rowling"],"Harry Potter",["J. K. Rowling"],true],
 ["subtítulo só de um lado","Sapiens: Uma breve história",["Yuval Harari"],"Sapiens",["Yuval Harari"],true],
 ["dois subtítulos diferentes","Harry Potter: A Pedra",["J.K. Rowling"],"Harry Potter: A Câmara",["J.K. Rowling"],false],
 ["mesmo título, autor outro","Cosmos",["Carl Sagan"],"Cosmos",["Outra Pessoa"],false],
 ["sem autor","Cosmos",[],"Cosmos",[],false],
 ["título só símbolos","???",["X"],"!!!",["X"],false],
 ["autor em comum (coautor)","Boas Maneiras",["A B","C D"],"Boas Maneiras",["C D"],true],
];
for(const [n,t1,a1,t2,a2,exp] of cases){const r=match([T(t1,a1)],[T(t2,a2)]);const got=[...r.values()][0].size>0;console.log(got===exp?"ok ":"FALHA",n,got);}
const i1=T("A",["x"],"978000000000x"),i2=T("B",["y"],"978000000000X");console.log("isbn caixa:",[...match([i1],[i2]).values()][0].size===1);

// custo: 500 livros meus x 50 amigos x 500 lidos cada (25 mil linhas)
const mine=Array.from({length:500},(_,i)=>T(`Título número ${i}: subtítulo`,[`Autora ${i%90}`]));
const theirs=[];for(let f=0;f<50;f++)for(let i=0;i<500;i++)theirs.push({...T(`Título número ${(i*7+f)%3000}: outra coisa ${f}`,[`Autora ${i%90}`]),friendId:"f"+f});
for(let n=0;n<3;n++){const t0=performance.now();match(mine,theirs);console.log("lote 500x25000:",(performance.now()-t0).toFixed(1),"ms");}
const t1=performance.now();match(mine.slice(0,1),theirs.slice(0,1000));console.log("1 livro x 20 amigos x 50 lidos:",(performance.now()-t1).toFixed(2),"ms");
