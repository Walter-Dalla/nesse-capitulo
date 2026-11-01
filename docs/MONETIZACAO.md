# Plano de monetização — Estante

## Modelo

**Anúncio recompensado, uma vez por sessão logada, para criar livros.**

- O app é gratuito e sem limite de livros.
- A **primeira vez** que o usuário tenta adicionar um livro novo à estante em uma sessão, aparece um anúncio recompensado (rewarded). Ao assistir até o fim, a sessão fica liberada: ele adiciona quantos livros quiser até sair da conta.
- **Nunca** há anúncio para editar nota, resenha, status, datas ou remover livros, nem para navegar. A fricção fica só no momento de "criar", que é raro e de alta intenção.
- Sessão = cookie de login (30 dias). Sair da conta ou expirar a sessão volta a exigir o anúncio.

Por que esse formato:

- Rewarded é o formato com maior eCPM e melhor aceitação em apps de utilidade; o usuário escolhe assistir em troca de valor claro.
- Uma vez por sessão mantém o app leve e rápido no uso diário (sem banners ocupando tela em celular).
- O gate é no backend, não só no front: não dá para burlar escondendo o modal.

## Como está implementado

| Peça | Onde |
| --- | --- |
| Flag e provedor | `.env`: `ADS_ENABLED=true`, `AD_PROVIDER=simulated|adsense`, `ADSENSE_CLIENT_ID` |
| Estado por sessão | coluna `sessions.ad_unlocked` (SQLite) |
| Gate | `POST /api/shelf` responde `403 { code: "AD_REQUIRED" }` quando a sessão ainda não viu o anúncio e o livro é novo na estante |
| Recompensa | `POST /api/ads/reward { provider, outcome: "viewed" }` marca a sessão como liberada |
| Status | `GET /api/me` → `adUnlocked`; `GET /auth/providers` → `ads` |
| UI | `client/src/components/AdGate.tsx`, chamado pelo `AddSheet` antes de salvar |

Provedores:

- **`simulated`** (padrão em dev): contagem regressiva de 5 s. Serve para testar o fluxo sem rede de anúncios.
- **`adsense`**: Google **Ad Placement API** (`adBreak({ type: "reward" })`), que funciona em site, PWA e dentro da TWA da Play Store. Para ativar:
  1. Conta AdSense aprovada para o domínio; crie o bloco de anúncios "Rewarded" e anote o `ca-pub-…`.
  2. Inclua no `client/index.html`:
     ```html
     <script async data-ad-frequency-hint="30s" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossorigin="anonymous"></script>
     <script>window.adsbygoogle = window.adsbygoogle || []; const adBreak = adConfig = function (o) { adsbygoogle.push(o); };</script>
     ```
  3. `AD_PROVIDER=adsense` e `ADSENSE_CLIENT_ID=ca-pub-XXXX` no `.env`.

  O `AdGate` já chama `adBreak` com `beforeReward`, `adViewed`, `adDismissed` e `adBreakDone`; só libera se `adViewed` disparar.

## Evoluções sugeridas

1. **App nativo (Capacitor/React Native) com AdMob rewarded + SSV**: o AdMob chama uma URL do servidor com assinatura quando o usuário conclui o anúncio. Implementar a verificação da assinatura em `POST /api/ads/reward` (hoje confia no callback do cliente, que é o que o Ad Placement API oferece na web).
2. **Estante Plus (assinatura)**: remove anúncios, backup/export, estatísticas avançadas (páginas por mês, metas anuais, gêneros). Via Google Play Billing na TWA (Digital Goods API) ou Stripe na web. Ideia de preço: R$ 4,90/mês ou R$ 29,90/ano.
3. **Links de afiliado** na página do livro (Amazon Associates) com ISBN: receita sem fricção e relevante para quem está na fila "Quero ler".
4. **Métricas para acompanhar**: taxa de conclusão do anúncio (adViewed / adBreak), % de sessões que chegam ao gate, livros criados por sessão, churn após o gate. Se a conclusão cair abaixo de ~70 %, trocar para "uma vez por dia" em vez de por sessão.

## O que NÃO fazer

- Banner fixo no mobile: come espaço útil, derruba o Core Web Vitals e o valor é baixo.
- Anúncio para ver os próprios dados (estante, histórico): quebra a confiança.
- Vender ou cruzar dados de leitura do usuário.
