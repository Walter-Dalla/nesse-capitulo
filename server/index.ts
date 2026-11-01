import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, isApiPath } from "./app.js";
import { openDatabase } from "./db.js";
import { env, googleLoginEnabled } from "./env.js";

const db = openDatabase();
const app = createApp(db);

// Em produção, o mesmo processo serve o front (SPA) buildado pelo Vite.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = [path.resolve(here, "../client"), path.resolve(process.cwd(), "dist/client")].find((d) =>
  fs.existsSync(path.join(d, "index.html")),
);
if (clientDir) {
  const root = path.relative(process.cwd(), clientDir) || ".";
  app.use(
    "/assets/*",
    serveStatic({ root, onFound: (_p, c) => c.header("Cache-Control", "public, max-age=31536000, immutable") }),
  );
  app.use("*", serveStatic({ root }));
  // fallback da SPA: qualquer rota que não seja API/auth devolve o index.html
  const spa = serveStatic({ root, path: "index.html" });
  app.get("*", (c, next) => (isApiPath(c.req.path) ? next() : spa(c, next)));
} else {
  console.warn("dist/client não encontrado — rode `npm run build` para servir o front por aqui (em dev use o Vite na 5173).");
}

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Estante rodando em http://localhost:${info.port}`);
  console.log(`  BASE_URL=${env.baseUrl} | SQLite=${env.databasePath}`);
  console.log(`  Login Google: ${googleLoginEnabled ? "ativo" : "NÃO configurado"} | Login dev: ${env.allowDevLogin ? "ativo" : "desligado"}`);
});
