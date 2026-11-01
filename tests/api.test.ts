import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ALLOW_DEV_LOGIN = "true";
process.env.NODE_ENV = "test";
const { openDatabase } = await import("../server/db.ts");
const { createApp } = await import("../server/app.ts");

function client() {
  const app = createApp(openDatabase(":memory:"));
  let cookie = "";
  async function call(method: string, path: string, body?: unknown) {
    const res = await app.request(path, {
      method,
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: "http://localhost:3000", Host: "localhost:3000" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const json: any = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    return { status: res.status, json };
  }
  return call;
}

const manualBook = { source: "manual", title: "Dom Casmurro", authors: ["Machado de Assis"], pageCount: 256, publishedYear: 1899 };

test("rotas protegidas exigem login", async () => {
  const call = client();
  const r = await call("GET", "/api/shelf");
  assert.equal(r.status, 401);
  const me = await call("GET", "/api/me");
  assert.equal(me.json.user, null);
});

test("fluxo completo: login dev, adicionar, avaliar, listar por ano, mudar status e remover", async () => {
  const call = client();
  const login = await call("POST", "/auth/dev", { name: "Walter", email: "w@example.com" });
  assert.equal(login.status, 200);
  assert.equal(login.json.user.name, "Walter");

  // adiciona um livro lido retroativamente em 2023
  const add = await call("POST", "/api/shelf", { book: manualBook, status: "read", finishedAt: "2023-05-10", rating: 5, review: "Clássico." });
  assert.equal(add.status, 201);
  assert.equal(add.json.item.readYear, 2023);
  assert.equal(add.json.item.book.title, "Dom Casmurro");
  const id = add.json.item.id;

  // adicionar de novo o mesmo livro não duplica
  const again = await call("POST", "/api/shelf", { book: manualBook, status: "read", finishedAt: "2023-05-10" });
  assert.equal(again.status, 201); // manual sem sourceId cria outro registro de livro...
  // ...mas um livro do Google com o mesmo sourceId é deduplicado
  const g = { source: "google", sourceId: "abc123", title: "Sapiens", authors: ["Yuval Harari"] };
  const g1 = await call("POST", "/api/shelf", { book: g, status: "want" });
  const g2 = await call("POST", "/api/shelf", { book: g, status: "reading", startedAt: "2024-01-02" });
  assert.equal(g1.status, 201);
  assert.equal(g2.status, 200);
  assert.equal(g1.json.item.id, g2.json.item.id);
  assert.equal(g2.json.item.status, "reading");

  // listagem por ano
  const y2023 = await call("GET", "/api/shelf?year=2023");
  assert.equal(y2023.json.items.length, 2);
  const reading = await call("GET", "/api/shelf?status=reading");
  assert.equal(reading.json.items.length, 1);

  // edita nota/resenha e muda o ano manualmente (data de término incompatível é descartada)
  const patch = await call("PATCH", `/api/shelf/${id}`, { rating: 4, review: "Relido.", readYear: 2021 });
  assert.equal(patch.status, 200);
  assert.equal(patch.json.item.rating, 4);
  assert.equal(patch.json.item.readYear, 2021);
  assert.equal(patch.json.item.finishedAt, null);

  // validações
  const bad = await call("PATCH", `/api/shelf/${id}`, { rating: 9 });
  assert.equal(bad.status, 400);
  const badDate = await call("PATCH", `/api/shelf/${id}`, { startedAt: "2024-05-01", finishedAt: "2024-01-01" });
  assert.equal(badDate.status, 400);

  // sinopse sob demanda: livro manual não tem fonte externa
  const details = await call("GET", `/api/shelf/${id}/details`);
  assert.equal(details.status, 200);
  assert.equal(details.json.description, null);

  // concluir um livro que estava "lendo" sem informar data assume hoje
  const finish = await call("PATCH", `/api/shelf/${g1.json.item.id}`, { status: "read" });
  assert.equal(finish.json.item.readYear, new Date().getFullYear());
  assert.ok(finish.json.item.finishedAt);

  // abandonar limpa ano de leitura
  const abandon = await call("PATCH", `/api/shelf/${g1.json.item.id}`, { status: "abandoned" });
  assert.equal(abandon.json.item.status, "abandoned");
  assert.equal(abandon.json.item.readYear, null);

  // estatísticas
  const stats = await call("GET", "/api/stats");
  assert.deepEqual(stats.json.counts, { want: 0, reading: 0, read: 2, abandoned: 1 });
  assert.deepEqual(stats.json.years.map((y: any) => y.year), [2023, 2021]);
  assert.equal(stats.json.years[1].pages, 256);

  // remover
  const del = await call("DELETE", `/api/shelf/${id}`);
  assert.equal(del.status, 200);
  const gone = await call("GET", `/api/shelf/${id}`);
  assert.equal(gone.status, 404);

  // logout
  await call("POST", "/auth/logout");
  const after = await call("GET", "/api/shelf");
  assert.equal(after.status, 401);
});

test("dados de um usuário não vazam para outro", async () => {
  const app = createApp(openDatabase(":memory:"));
  const headers = { "Content-Type": "application/json", Origin: "http://localhost", Host: "localhost" };
  async function login(email: string) {
    const res = await app.request("/auth/dev", { method: "POST", headers, body: JSON.stringify({ email }) });
    return res.headers.get("set-cookie")!.split(";")[0];
  }
  const alice = await login("a@x.com");
  const bob = await login("b@x.com");
  await app.request("/api/shelf", { method: "POST", headers: { ...headers, Cookie: alice }, body: JSON.stringify({ book: manualBook, status: "want" }) });
  const mine = (await (await app.request("/api/shelf", { headers: { Cookie: alice } })).json()) as any;
  const theirs = (await (await app.request("/api/shelf", { headers: { Cookie: bob } })).json()) as any;
  assert.equal(mine.items.length, 1);
  assert.equal(theirs.items.length, 0);
  // Bob não consegue alterar nem apagar o item de Alice
  const patch = await app.request(`/api/shelf/${mine.items[0].id}`, { method: "PATCH", headers: { ...headers, Cookie: bob }, body: JSON.stringify({ rating: 1 }) });
  assert.equal(patch.status, 404);
  const del = await app.request(`/api/shelf/${mine.items[0].id}`, { method: "DELETE", headers: { ...headers, Cookie: bob } });
  assert.equal(del.status, 404);
});

test("gate de anúncio: criar livro exige recompensa uma vez por sessão; editar é livre", async () => {
  process.env.ADS_ENABLED = "true";
  const { env } = await import("../server/env.ts");
  const prev = env.ads.enabled;
  env.ads.enabled = true;
  try {
    const call = client();
    await call("POST", "/auth/dev", { email: "ads@x.com" });
    const me = await call("GET", "/api/me");
    assert.equal(me.json.adUnlocked, false);

    const blocked = await call("POST", "/api/shelf", { book: manualBook, status: "want" });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.code, "AD_REQUIRED");

    const badReward = await call("POST", "/api/ads/reward", { provider: "simulated", outcome: "dismissed" });
    assert.equal(badReward.status, 400);
    const reward = await call("POST", "/api/ads/reward", { provider: "simulated", outcome: "viewed" });
    assert.equal(reward.status, 200);

    const ok = await call("POST", "/api/shelf", { book: manualBook, status: "want" });
    assert.equal(ok.status, 201);
    const edit = await call("PATCH", `/api/shelf/${ok.json.item.id}`, { rating: 3 });
    assert.equal(edit.status, 200);

    // nova sessão (novo login) volta a exigir o anúncio, mas editar o que já existe continua livre
    const call2 = client();
    void call2;
    await call("POST", "/auth/logout");
    await call("POST", "/auth/dev", { email: "ads@x.com" });
    const again = await call("POST", "/api/shelf", { book: { source: "google", sourceId: "zzz", title: "Novo" }, status: "want" });
    assert.equal(again.status, 403);
    const editAgain = await call("PATCH", `/api/shelf/${ok.json.item.id}`, { rating: 2 });
    assert.equal(editAgain.status, 200);
  } finally {
    env.ads.enabled = prev;
  }
});

test("o banco guarda só metadados mínimos do livro (sem capa/sinopse)", async () => {
  const call = client();
  await call("POST", "/auth/dev", { email: "slim@x.com" });
  const add = await call("POST", "/api/shelf", {
    book: { source: "google", sourceId: "g1", title: "Livro", authors: ["A"], coverRef: "g", coverUrl: "https://x/y.jpg", description: "x".repeat(5000) },
    status: "want",
  });
  assert.equal(add.status, 201);
  assert.deepEqual(Object.keys(add.json.item.book).sort(), ["authors", "coverRef", "id", "isbn13", "pageCount", "publishedYear", "source", "sourceId", "title"]);
  assert.equal(add.json.item.book.coverRef, "g");
  const bad = await call("POST", "/api/shelf", { book: { source: "google", sourceId: "g2", title: "Livro", coverRef: "https://evil" }, status: "want" });
  assert.equal(bad.status, 400);
  const isbn = await call("POST", "/api/shelf", { book: { source: "manual", title: "Com ISBN", isbn13: "978-85-254-3218-6" }, status: "want" });
  assert.equal(isbn.json.item.book.isbn13, "9788525432186");
});
