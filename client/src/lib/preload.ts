/** Ambiente do preload, passado pelo chamador (nada de `window`/`navigator` aqui: o módulo roda nos testes em Node). */
export type PreloadEnv = {
  /** `requestIdleCallback`; ausente no Safari. */
  idle?: (cb: () => void) => unknown;
  /** Economia de dados do aparelho (`navigator.connection.saveData`): não pré-carrega. */
  saveData?: boolean;
  /** Espera sem `idle`; padrão 2 s. */
  delayMs?: number;
};

/** Agenda `load` para quando o navegador estiver ocioso (ou após `delayMs`, sem `requestIdleCallback`). */
export function schedulePreload(load: () => void, env: PreloadEnv) {
  if (env.saveData) return;
  if (env.idle) env.idle(load);
  else setTimeout(load, env.delayMs ?? 2000);
}

let scheduled = false;

/** Como `schedulePreload`, uma vez por sessão: as chamadas seguintes são ignoradas. */
export function preloadOnce(load: () => void, env: PreloadEnv) {
  if (scheduled) return;
  scheduled = true;
  schedulePreload(load, env);
}
