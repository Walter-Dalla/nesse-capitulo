import { Hono } from "hono";
import type { DB } from "../db.js";
import { env } from "../env.js";
import type { AppEnv } from "../types.js";

/**
 * Gate de anúncio: criar um livro novo exige ter assistido um anúncio recompensado
 * uma vez por sessão logada. Editar/remover livros nunca é bloqueado.
 *
 * Em produção com AdMob (app nativo) use a verificação server-side (SSV) e valide a
 * assinatura aqui antes de liberar. Com o Ad Placement API (web) o callback
 * `adViewed` do cliente é a confirmação disponível.
 */
export function adsRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  app.get("/api/ads/status", (c) =>
    c.json({ enabled: env.ads.enabled, provider: env.ads.provider, unlocked: c.var.adUnlocked }),
  );

  app.post("/api/ads/reward", async (c) => {
    if (!env.ads.enabled) return c.json({ unlocked: true });
    const body = (await c.req.json().catch(() => ({}))) as { provider?: string; outcome?: string };
    // Só aceita recompensas do provedor configurado e com resultado de "visto até o fim"
    if (body.provider !== env.ads.provider) return c.json({ error: "Provedor de anúncio inválido", code: "AD_PROVIDER_INVALID" }, 400);
    if (body.outcome !== "viewed") return c.json({ error: "Anúncio não concluído", code: "AD_NOT_COMPLETED" }, 400);
    db.prepare("UPDATE sessions SET ad_unlocked = 1 WHERE id = ?").run(c.var.sessionId);
    return c.json({ unlocked: true });
  });

  return app;
}

export const AD_REQUIRED = { error: "Assista um anúncio para adicionar livros nesta sessão", code: "AD_REQUIRED" } as const;
