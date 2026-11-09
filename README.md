# Estante 📚

Tracker de leituras **mobile-first** (PWA + API) inspirado em apps como o Cabeceira:

- **Login com Google** (OAuth 2.0 / OpenID Connect) — o mesmo login funciona no app Android publicado na Play Store (via TWA ou via `POST /auth/google/token` com o Google Sign-In nativo).
- **Buscar livros** com autocompletar (Google Books, com Open Library como reserva) ou **cadastrar manualmente** sem upload de capa: com o ISBN a capa vem sozinha.
- **Banco enxuto**: por livro ficam só título, autores, páginas, ano, ISBN, ids curtos e sinopse. Capas não vão para o servidor: vêm da fonte externa e ficam no cache do navegador.
- **Monetização opcional**: anúncio recompensado uma vez por sessão para criar livros (ver [docs/MONETIZACAO.md](docs/MONETIZACAO.md)).
- **Quatro listas**: Lendo, Quero ler, Lidos e Abandonados, mais "Ver todos" sem filtro. Ao adicionar, um toque no status já salva o livro; os detalhes (data, página, ano, nota) são opcionais e podem ser preenchidos ali mesmo ou depois.
- **Nota de 1 a 5 estrelas** e **resenha** por livro (privadas: nem amigos veem).
- **Página atual** de quem está lendo, com o progresso nos cartões da Estante.
- **Comentários** por livro, cada um **privado** (só você) ou **público** (amigos veem).
- **Amigos** por link de convite (não expira): cada um vê o que o outro está lendo e já leu, o progresso e os comentários públicos. Na tela do livro e nos cartões da Estante e de Por ano, um selo mostra quais amigos já leram aquele livro.
- **Histórico por ano**, com registro **retroativo**: basta informar o ano (a data exata é opcional). Estatísticas por ano: livros, páginas e nota média.
- Dados em **SQLite** (um arquivo, WAL, sem servidor de banco). Rápido e simples.
- Funciona na web também (layout centralizado no desktop), instalável como app (manifest + service worker).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front | React 19 + Vite 8 + Tailwind CSS v4 + React Router 8 + TanStack Query 5 |
| API | Node 22.13+ (recomendado 24 LTS) + [Hono](https://hono.dev) 4 |
| Banco | SQLite embutido do Node (`node:sqlite`), sem dependência nativa (arquivo em `data/estante.db`) |
| Auth | Google OAuth 2.0 implementado direto (sem lib), sessão em cookie `HttpOnly` |
| Testes | `node:test` contra a app Hono com banco em memória |
| Linguagem | TypeScript 7 |

Um único processo Node serve a API e o front buildado.

> Sem dependência nativa: `npm install` não precisa de compilador (`make`/`node-gyp`). Em versões do Node em que o `node:sqlite` ainda é experimental, ele imprime um `ExperimentalWarning` ao subir; é só aviso.

## Rodando localmente

```bash
npm install
cp .env.example .env     # (Windows: copy .env.example .env) já vem com ALLOW_DEV_LOGIN=true
npm run dev              # API em :3000 + Vite em :5173 (com proxy)
```

Abra http://localhost:5173. Sem credenciais do Google você entra pelo botão **"Entrar sem Google"** (modo dev, desligado automaticamente em produção).

Outros comandos:

```bash
npm test          # testes da API
npm run typecheck # TypeScript do front e do servidor
npm run build     # gera dist/client e dist/server
npm start         # produção: node dist/server/index.js (serve API + front na mesma porta)
                  # rodar o build compilado já conta como produção (login dev desligado), a menos que NODE_ENV=development
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

## SEO e descoberta

Só `/` e `/login` são públicos; o resto exige sessão e fica fora dos buscadores. Para visitantes sem sessão, `/` entrega uma home estática (`client/landing.html`, sem JS, indexável); logado, `/` é a estante (SPA). Em dev pelo Vite a landing fica em `/landing.html`. O servidor gera `GET /robots.txt` (bloqueia `/api/`, `/auth/` e as rotas logadas, aponta o sitemap), `GET /sitemap.xml` e `GET /llms.txt` (resumo em Markdown para assistentes de IA, convenção [llmstxt.org](https://llmstxt.org)), todos com a `BASE_URL` do `.env`. O `client/index.html` traz `description`, canonical, Open Graph, Twitter Card e JSON-LD; o placeholder `%SITE_URL%` vira a `BASE_URL` no `npm run build`, então defina-a antes de buildar em produção.

## API (resumo)

Todas as rotas `/api/*` exigem sessão (cookie `sid`).

Erros de estante, comentários, amigos, anúncios e busca trazem `{ error, code }`: `error` é o texto em português, `code` é estável (`ERROR_CODES` em `server/types.ts`) e é o que o cliente traduz. Respostas de `server/auth.ts` e o 404 de `server/app.ts` não têm `code`.

Todo HTML sai no idioma negociado: `?lang=`, cookie `lang`, `Accept-Language`, `CF-IPCountry`, `en` (`docs/features/idioma.md`).

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/auth/google` → `/auth/google/callback` | Fluxo OAuth web |
| POST | `/auth/google/token` `{ idToken }` | Login com id_token nativo |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/api/me` | Usuário logado (ou `null`) |
| GET | `/api/search?q=` | Busca no Google Books (cache 10 min) |
| GET | `/api/shelf?status=&year=` | Estante, filtrável por status (`want`, `reading`, `read`, `abandoned`) e ano de leitura |
| POST | `/api/shelf` `{ book, status, rating?, review?, startedAt?, finishedAt?, readYear?, currentPage? }` | Adiciona (ou atualiza) um livro |
| PATCH | `/api/shelf/:id` | Atualização parcial (status, nota, resenha, datas, ano, página atual; `book` para livros manuais) |
| DELETE | `/api/shelf/:id` | Remove da estante |
| GET | `/api/stats` | Totais por status e por ano (livros, páginas, nota média) |
| GET | `/api/shelf/:id/details` | Sinopse do banco; na falta, busca na fonte e grava |
| GET | `/api/ads/status` · POST `/api/ads/reward` | Gate de anúncio por sessão (se `ADS_ENABLED=true`) |
| POST | `/api/friends/invites` | Gera um link de convite: `201 { code }` (uso único, não expira) |
| GET | `/api/friends/invites/:code` | Prévia do convite: `{ inviter, alreadyFriends }`, sem consumir |
| POST | `/api/friends/invites/:code/accept` | Confirma: `201 { friend }` criou, `200` se já eram amigos; `404` inválido ou já usado; `400 INVITE_SELF` |
| GET | `/api/friends` | Amigos, cada um com o que está lendo: `{ friends: FriendSummary[] }` |
| GET | `/api/friends/:userId/shelf` | Lendo e Lidos de um amigo, com página atual e comentários públicos; sem nota, resenha, datas nem sinopse; `404` se não for amigo |
| DELETE | `/api/friends/:userId` | Desfaz a amizade (para os dois) |
| GET | `/api/shelf/:id/friends` | Amigos que já leram este livro da minha estante; `404` se o item não for meu |
| GET | `/api/friends/badges` | `{ badges: { [itemId]: quantidade } }` para os cartões, só contagens > 0 |
| GET | `/api/shelf/:id/comments` | `{ comments, friends }`: meus comentários do item e os públicos de amigos sobre o mesmo livro |
| POST | `/api/shelf/:id/comments` `{ body, visibility? }` | Novo comentário (`private` por padrão, ou `public`); até 2000 caracteres |
| PATCH | `/api/comments/:id` `{ body?, visibility? }` | Edita texto ou visibilidade de um comentário meu |
| DELETE | `/api/comments/:id` | Apaga um comentário meu |

Regras: ao marcar como **Lido**, o ano vem da data de término, ou do `readYear` informado, ou do ano atual. Mudar para **Quero ler** limpa datas; **Lendo**/**Abandonado** limpam a data de término e o ano. A **página atual** só vale em **Lendo** (onde estou) e **Abandonado** (onde parei); **Quero ler** e **Lido** a limpam. Página acima do total do livro é aceita, porque a edição pode ter mais páginas que a fonte informa.

Comentários: cada um é privado (só o autor vê) ou público (amigos veem). Um comentário público aparece na tela do amigo, nos livros em Lendo e Lidos, e na tela do livro de quem é amigo e tem o mesmo livro (mesmo registro ou ISBN), em qualquer status. Remover o livro da estante apaga os comentários dele.

Amigos: o convite é um link `/amigos/convite/<código>`, de uso único e sem validade; quem abre vê quem convidou e só vira amigo ao tocar em **Confirmar amizade**. Se a pessoa não estiver logada, o código fica guardado no aparelho por 1 h e o app volta ao convite depois do login (passado esse prazo, basta abrir o link de novo). Amigo vê só livros em **Lendo** e **Lidos** (com o ano e a página atual) e os comentários públicos, nunca nota, resenha, datas, comentários privados, sinopse ou e-mail. O selo "já leu" conta amigos com o livro em **Lido** e casa pelo mesmo registro de livro (mesma fonte e id) ou pelo mesmo ISBN; título e autor iguais não bastam.

### Busca e capas: o que é guardado

Nenhuma imagem vai para o banco. A sinopse é gravada em `books.description` na primeira consulta bem-sucedida à fonte. Ao adicionar um livro ou salvar alterações na tela dele, o navegador guarda capa (service worker, cache `estante-covers`) e sinopse (cache `estante-details`); os dois caches são limpos ao sair da conta. Cada livro guarda uma referência curta de capa (`cover_ref`):

| Fonte | `source_id` | `cover_ref` | Capa derivada no cliente |
| --- | --- | --- | --- |
| Google Books | id do volume | `g` | `books.google.com/books/content?id=…&printsec=frontcover&img=1` |
| Open Library | id da obra (`OL…W`) | `ol:<cover_id>` | `covers.openlibrary.org/b/id/<cover_id>-M.jpg` |
| Manual | — | — | `covers.openlibrary.org/b/isbn/<isbn>-M.jpg` se houver ISBN; senão placeholder colorido |

A busca só é disparada **1 s depois que o usuário para de digitar** (mínimo de 3 letras) e o servidor limita cada usuário a uma rajada de 5 buscas e depois 1 por segundo, com cache de 10 min por termo.

## Estrutura

```
client/          front (Vite + React)
  public/        manifest, service worker, ícones, .well-known/assetlinks.json
  src/pages/     Login, Estante, Buscar, Adicionar manual, Livro, Por ano, Amigos, Perfil
server/          API Hono
  auth.ts        sessões + Google OAuth
  html.ts        entrega do HTML no idioma negociado
  locale.ts      negociação de idioma
  landingText.ts texto da home nos 3 idiomas
  db.ts          schema SQLite
  routes/        search, shelf, stats, ads, friends, comments
tests/           testes da API (node:test)
data/            banco SQLite (ignorado pelo git)
```
