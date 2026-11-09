/* Service worker simples: assets com hash em cache-first, navegação em network-first com fallback offline, capas externas do cache; capa por id da Open Library é imutável e nunca revalida, as outras revalidam em segundo plano a cada 30 dias. */
const VERSION = "estante-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon.svg"];
const COVERS = "estante-covers"; // mesmo nome usado em client/src/lib/bookCache.ts
/** Data de gravação de cada capa, por URL: a resposta do Google é opaca, então a data não cabe num cabeçalho da própria resposta. */
const COVERS_META = "estante-covers-meta"; // mesmo nome usado em client/src/lib/bookCache.ts
const DETAILS = "estante-details"; // preenchido pela página, em client/src/lib/bookCache.ts
const MAX_COVERS = 300;
const COVER_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COVER_HOSTS = ["books.google.com", "covers.openlibrary.org"];
/** Páginas públicas renderizadas no servidor: não são o app, então nunca viram o fallback offline de "/". */
const NOT_APP_SHELL = ["/privacidade", "/termos", "/excluir-conta"];

/** Capa por id da Open Library (`/b/id/`) nunca muda; as outras revalidam sem data gravada (cache anterior a esta regra) ou passados 30 dias. */
function shouldRevalidate(url, cachedAt, now) {
  const { hostname, pathname } = new URL(url);
  if (hostname === "covers.openlibrary.org" && pathname.startsWith("/b/id/")) return false;
  return cachedAt === null || now - cachedAt > COVER_TTL_MS;
}

async function storeCover(url, res) {
  const [cache, meta] = await Promise.all([caches.open(COVERS), caches.open(COVERS_META)]);
  await cache.put(url, res);
  await meta.put(url, new Response(String(Date.now())));
  const keys = await cache.keys();
  const evicted = keys.slice(0, Math.max(0, keys.length - MAX_COVERS));
  await Promise.all(evicted.flatMap((k) => [cache.delete(k), meta.delete(k)]));
}

async function cachedAtOf(url) {
  const res = await caches.open(COVERS_META).then((c) => c.match(url));
  if (!res) return null;
  const at = Number(await res.text());
  return Number.isFinite(at) ? at : null;
}

/** Google não manda CORS, então a resposta é opaca e pode ser um erro: a revalidação dos 30 dias corrige. */
async function fetchCover(url) {
  const mode = new URL(url).hostname === "books.google.com" ? "no-cors" : "cors";
  const res = await fetch(url, { mode, credentials: "omit", referrerPolicy: "no-referrer" });
  if (res.ok || res.type === "opaque") storeCover(url, res.clone()).catch(() => {});
  return res;
}

async function coverFromCache(event) {
  const url = event.request.url;
  const hit = await caches.open(COVERS).then((c) => c.match(url));
  if (!hit) return fetchCover(url);
  if (shouldRevalidate(url, await cachedAtOf(url), Date.now())) event.waitUntil(fetchCover(url).catch(() => {}));
  return hit;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![VERSION, COVERS, COVERS_META, DETAILS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.destination === "image" && COVER_HOSTS.includes(url.hostname)) {
    event.respondWith(coverFromCache(event));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (NOT_APP_SHELL.includes(url.pathname)) return res;
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/")),
    );
  }
});
