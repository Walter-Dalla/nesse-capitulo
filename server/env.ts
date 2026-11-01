import fs from "node:fs";
import path from "node:path";

// Carrega um .env simples (KEY=VALUE) sem dependências externas.
function loadDotEnv(file = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  baseUrl: (process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, ""),
  databasePath: process.env.DATABASE_PATH ?? "./data/estante.db",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    extraClientIds: (process.env.GOOGLE_EXTRA_CLIENT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    booksApiKey: process.env.GOOGLE_BOOKS_API_KEY ?? "",
  },
  allowDevLogin: process.env.ALLOW_DEV_LOGIN === "true" && !isProd,
  ads: {
    /** Exige ver um anúncio (uma vez por sessão) antes de criar livros na estante. */
    enabled: process.env.ADS_ENABLED === "true",
    /** 'simulated' (dev: contagem regressiva) | 'adsense' (Ad Placement API do Google, rewarded) */
    provider: (process.env.AD_PROVIDER === "adsense" ? "adsense" : "simulated") as "simulated" | "adsense",
    adsenseClient: process.env.ADSENSE_CLIENT_ID ?? "",
  },
};

export const googleLoginEnabled = Boolean(env.google.clientId && env.google.clientSecret);
