import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { resetErroredQueries } from "./lib/api";
import { subscribe } from "./lib/i18n";
import { applyLocale, initialLocale } from "./lib/localeBrowser";
import "./index.css";

applyLocale(initialLocale());
subscribe(resetErroredQueries);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
