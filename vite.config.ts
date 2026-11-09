import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

/** Troca %SITE_URL% no index.html (canonical, og:url, og:image) pela BASE_URL do .env (mesma do servidor). Não usa %BASE_URL% porque o Vite já reserva esse nome para `base`. */
function htmlBaseUrl(mode: string): Plugin {
  const baseUrl = (loadEnv(mode, process.cwd(), "BASE_URL").BASE_URL ?? "").replace(/\/$/, "");
  return { name: "html-base-url", transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", baseUrl) };
}

export default defineConfig(({ mode }) => ({
  root: "client",
  plugins: [react(), tailwindcss(), htmlBaseUrl(mode)],
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    // Duas páginas: a SPA (index.html) e a home estática para visitantes (landing.html, sem JS).
    rollupOptions: { input: { index: path.resolve("client/index.html"), landing: path.resolve("client/landing.html") } },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/auth": "http://localhost:3000",
    },
  },
}));
