# Estante 📚

Tracker de leituras **mobile-first** (PWA + API) inspirado em apps como o Cabeceira:

- **Login com Google** (OAuth 2.0 / OpenID Connect) — o mesmo login funciona no app Android publicado na Play Store (via TWA ou via `POST /auth/google/token` com o Google Sign-In nativo).
- **Buscar livros** no Google Books (título, autor, ISBN) ou **cadastrar manualmente**.
- **Quatro listas**: Lendo, Quero ler, Lidos e Abandonados.
- **Nota de 1 a 5 estrelas** e **resenha** por livro (privadas).
- **Histórico por ano**, com registro **retroativo**: basta informar o ano (a data exata é opcional). Estatísticas por ano: livros, páginas e nota média.
- Dados em **SQLite** (um arquivo, WAL, sem servidor de banco). Rápido e simples.
- Funciona na web também (layout centralizado no desktop), instalável como app (manifest + service worker).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front | React 19 + Vite + Tailwind CSS v4 + React Router + TanStack Query |
| API | Node 20+ + [Hono](https://hono.dev) |
| Banco | SQLite via `better-sqlite3` (arquivo em `data/estante.db`) |
| Auth | Google OAuth 2.0 implementado direto (sem lib), sessão em cookie `HttpOnly` |
| Testes | `node:test` contra a app Hono com banco em memória |

Um único processo Node serve a API e o front buildado.

## Rodando localmente

```bash
npm install
cp .env.example .env     # ajuste se quiser; já vem com ALLOW_DEV_LOGIN=true
npm run dev              # API em :3000 + Vite em :5173 (com proxy)
```

Abra http://localhost:5173. Sem credenciais do Google você entra pelo botão **"Entrar sem Google"** (modo dev, desligado automaticamente em produção).

Outros comandos:

```bash
npm test          # testes da API
npm run typecheck # TypeScript do front e do servidor
npm run build     # gera dist/client e dist/server
npm start         # produção: node dist/server/index.js (serve API + front na mesma porta)
```

## Configurando o login com Google

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um **ID do cliente OAuth 2.0** do tipo **Aplicativo da Web**.
2. Em *URIs de redirecionamento autorizados*, adicione `${BASE_URL}/auth/google/callback`
   (ex.: `http://localhost:5173/auth/google/callback` em dev e `https://seu-dominio.com/auth/google/callback` em produção).
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env` e defina `BASE_URL`.
4. (Opcional) Para o login nativo Android/iOS, crie também IDs do cliente do tipo Android/iOS e liste-os em `GOOGLE_EXTRA_CLIENT_IDS`. O app nativo envia o `idToken` para `POST /auth/google/token` e recebe o cookie de sessão.

## Publicando na Play Store

O caminho mais curto para um PWA é o **Trusted Web Activity (TWA)**:

1. Faça o deploy em HTTPS (qualquer host Node: Fly.io, Railway, Render, VPS…). Monte um volume persistente para `data/`.
2. Gere o projeto Android com o [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) ou o [PWABuilder](https://www.pwabuilder.com/):
   ```bash
   npx @bubblewrap/cli init --manifest https://seu-dominio.com/manifest.webmanifest
   npx @bubblewrap/cli build
   ```
3. Edite `client/public/.well-known/assetlinks.json` com o `package_name` e o SHA-256 da chave de assinatura (o Bubblewrap imprime; ou pegue em *Play Console → Integridade do app*). Faça o deploy de novo — sem isso o app abre com a barra do navegador.
4. Envie o `.aab` no Play Console. O login com Google acontece dentro da TWA com a sessão normal do Chrome.

Se preferir um app nativo (Capacitor/React Native), use a mesma API: faça o Google Sign-In pelo SDK e troque o `idToken` em `POST /auth/google/token`.

## API (resumo)

Todas as rotas `/api/*` exigem sessão (cookie `sid`).

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/auth/google` → `/auth/google/callback` | Fluxo OAuth web |
| POST | `/auth/google/token` `{ idToken }` | Login com id_token nativo |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/api/me` | Usuário logado (ou `null`) |
| GET | `/api/search?q=` | Busca no Google Books (cache 10 min) |
| GET | `/api/shelf?status=&year=` | Estante, filtrável por status (`want`, `reading`, `read`, `abandoned`) e ano de leitura |
| POST | `/api/shelf` `{ book, status, rating?, review?, startedAt?, finishedAt?, readYear? }` | Adiciona (ou atualiza) um livro |
| PATCH | `/api/shelf/:id` | Atualização parcial (status, nota, resenha, datas, ano; `book` para livros manuais) |
| DELETE | `/api/shelf/:id` | Remove da estante |
| GET | `/api/stats` | Totais por status e por ano (livros, páginas, nota média) |

Regras: ao marcar como **Lido**, o ano vem da data de término, ou do `readYear` informado, ou do ano atual. Mudar para **Quero ler** limpa datas; **Lendo**/**Abandonado** limpam a data de término e o ano.

## Estrutura

```
client/          front (Vite + React)
  public/        manifest, service worker, ícones, .well-known/assetlinks.json
  src/pages/     Login, Estante, Buscar, Adicionar manual, Livro, Por ano, Perfil
server/          API Hono
  auth.ts        sessões + Google OAuth
  db.ts          schema SQLite
  routes/        search, shelf, stats
tests/           testes da API (node:test)
data/            banco SQLite (ignorado pelo git)
```
