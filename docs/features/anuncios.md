---
aliases: [anúncio, anuncio, ads, rewarded, recompensa, monetização, adsense]
---
# Gate de anúncio

Anúncio recompensado uma vez por sessão logada para criar livros; editar, mover e remover são livres. Detalhes e justificativa em `docs/MONETIZACAO.md`.

## Símbolos de entrada
`adsRoutes`, `AD_REQUIRED` (`server/routes/ads.ts`, `GET /api/ads/status`, `POST /api/ads/reward`), `adUnlocked` em `AppEnv`/`findSession`, `env.ads` (`ADS_ENABLED`, `AD_PROVIDER`, `ADSENSE_CLIENT_ID`), `AdGate` (`client/src/components/AdGate.tsx`), `useAdReward`.

## Interações
- [estante](estante.md) e [livro-manual](livro-manual.md): `POST /api/shelf` responde `AD_REQUIRED` até a recompensa.
- [conta](conta.md): o desbloqueio é por sessão; logout volta a exigir.
