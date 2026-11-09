import { useEffect, useRef, useState } from "react";
import { useAdReward, useProviders } from "../lib/hooks";
import { t } from "../lib/i18n";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (opts: Record<string, unknown>) => void;
    adConfig?: (opts: Record<string, unknown>) => void;
  }
}

const SIMULATED_SECONDS = 5;

interface Props { onUnlocked: () => void; onClose: () => void }

/**
 * Anúncio recompensado exibido uma vez por sessão logada para liberar a criação de livros.
 *  - provider "simulated": contagem regressiva (dev / sem rede de anúncios).
 *  - provider "adsense": Ad Placement API do Google (adBreak type "reward"), que funciona na web, PWA e TWA.
 * Ao concluir, confirma no backend (POST /api/ads/reward) e libera a sessão.
 */
export function AdGate({ onUnlocked, onClose }: Props) {
  const providers = useProviders();
  const reward = useAdReward();
  const provider = providers.data?.ads.provider ?? "simulated";
  const [seconds, setSeconds] = useState(SIMULATED_SECONDS);
  const [phase, setPhase] = useState<"intro" | "playing" | "done" | "error" | "blocked">("intro");
  const started = useRef(false);

  async function grant() {
    try {
      await reward.mutateAsync(provider);
      setPhase("done");
      toast(t("social.ad.thanks"));
      onUnlocked();
    } catch (e) {
      setPhase("error");
      toast((e as Error).message, "error");
    }
  }

  function start() {
    if (started.current || !providers.data) return;
    started.current = true;
    if (provider === "adsense") {
      const adBreak = window.adBreak;
      if (typeof adBreak !== "function") {
        // script do AdSense não carregou (bloqueador ou index.html sem o snippet): não libera
        setPhase("blocked");
        return;
      }
      setPhase("playing");
      let viewed = false;
      adBreak({
        type: "reward",
        name: "novo-livro",
        beforeReward: (showAdFn: () => void) => showAdFn(),
        adViewed: () => { viewed = true; },
        adDismissed: () => { if (!viewed) setPhase("error"); },
        adBreakDone: () => { if (viewed) grant(); else setPhase("error"); },
      });
      return;
    }
    // simulado
    setSeconds(SIMULATED_SECONDS);
    setPhase("playing");
  }

  useEffect(() => {
    if (phase !== "playing" || provider === "adsense") return;
    if (seconds <= 0) { grant(); return; }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, seconds, provider]);

  // a frase inteira numa chave só, com o trecho em negrito no lugar de {once}
  const [introBefore, introAfter] = t("social.ad.intro").split("{once}");

  return (
    <Sheet title={t("social.ad.title")} onClose={onClose}>
      {phase === "intro" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            {introBefore}<strong>{t("social.ad.introOnce")}</strong>{introAfter}
          </p>
          <button type="button" onClick={start} disabled={!providers.data} className="btn-primary w-full">
            {providers.data ? t("social.ad.watch") : t("social.ad.loading")}
          </button>
        </div>
      )}
      {phase === "playing" && (
        <div className="flex flex-col items-center gap-3 py-4" aria-live="polite">
          <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-stone-900 text-stone-100 dark:bg-stone-800">
            {provider === "adsense" ? (
              <span className="text-sm">{t("social.ad.loadingAd")}</span>
            ) : (
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-stone-400">{t("social.ad.simulated")}</p>
                <p className="mt-1 text-5xl font-black tabular-nums">{seconds}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500">{t("social.ad.wait")}</p>
        </div>
      )}
      {phase === "done" && <p className="py-4 text-center font-semibold">{t("social.ad.unlocked")}</p>}
      {phase === "blocked" && (
        <div className="space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">{t("social.ad.blocked")}</p>
          <button type="button" onClick={() => { started.current = false; setPhase("intro"); }} className="btn-secondary w-full">{t("base.retry")}</button>
        </div>
      )}
      {phase === "error" && (
        <div className="space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">{t("social.ad.notCompleted")}</p>
          <button type="button" onClick={() => { started.current = false; setPhase("intro"); }} className="btn-secondary w-full">{t("base.retry")}</button>
        </div>
      )}
    </Sheet>
  );
}
