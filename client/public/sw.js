/* Service worker simples: assets com hash em cache-first, navegação em network-first com fallback offline, capas externas do cache com atualização em segundo plano. */
const VERSION = "estante-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon.svg"];
const COVERS = "estante-covers"; // mesmo nome usado em client/src/lib/bookCache.ts
const DETAILS = "estante-details"; // preenchido pela página, em client/src/lib/bookCache.ts
const MAX_COVERS = 300;
const COVER_HOSTS = ["books.google.com", "covers.openlibrary.org"];

async function storeCover(url, res) {
  const cache = await caches.open(COVERS);
  await cache.put(url, res);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_COVERS)).map((k) => cache.delete(k)));
}

/** Google não manda CORS, então a resposta é opaca e pode ser um erro: a revalidação corrige na visita seguinte. */
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
  event.waitUntil(fetchCover(url).catch(() => {}));
  return hit;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![VERSION, COVERS, DETAILS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
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
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/")),
    );
  }
});
