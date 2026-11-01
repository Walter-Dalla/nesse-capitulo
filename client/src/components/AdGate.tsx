import { useEffect, useRef, useState } from "react";
import { useAdReward, useProviders } from "../lib/hooks";
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
      toast("Obrigado! Livros liberados nesta sessão.");
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
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, seconds, provider]);

  return (
    <Sheet title="Um anúncio rápido" onClose={onClose}>
      {phase === "intro" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            O Estante é gratuito. Para adicionar livros novos à estante, assista a um anúncio curto <strong>uma vez por sessão</strong>. Editar, avaliar e resenhar nunca pede anúncio.
          </p>
          <button type="button" onClick={start} disabled={!providers.data} className="btn-primary w-full">
            {providers.data ? "Assistir anúncio" : "Carregando…"}
          </button>
        </div>
      )}
      {phase === "playing" && (
        <div className="flex flex-col items-center gap-3 py-4" aria-live="polite">
          <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-stone-900 text-stone-100 dark:bg-stone-800">
            {provider === "adsense" ? (
              <span className="text-sm">Carregando anúncio…</span>
            ) : (
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-stone-400">Anúncio simulado</p>
                <p className="mt-1 text-5xl font-black tabular-nums">{seconds}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500">Aguarde o fim do anúncio para liberar.</p>
        </div>
      )}
      {phase === "done" && <p className="py-4 text-center font-semibold">Liberado! ✅</p>}
      {phase === "blocked" && (
        <div className="space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">Não foi possível carregar o anúncio. Se você usa um bloqueador de anúncios, desative-o para este site e tente de novo.</p>
          <button type="button" onClick={() => { started.current = false; setPhase("intro"); }} className="btn-secondary w-full">Tentar de novo</button>
        </div>
      )}
      {phase === "error" && (
        <div className="space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">O anúncio não foi concluído. Tente de novo para liberar a criação de livros.</p>
          <button type="button" onClick={() => { started.current = false; setPhase("intro"); }} className="btn-secondary w-full">Tentar de novo</button>
        </div>
      )}
    </Sheet>
  );
}
