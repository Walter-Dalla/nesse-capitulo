import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
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
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/auth": "http://localhost:3000",
    },
  },
}));
