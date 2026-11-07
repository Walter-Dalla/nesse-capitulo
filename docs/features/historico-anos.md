---
aliases: [ano, anos, histórico, retroativo, estatísticas, stats]
---
# Histórico por ano e estatísticas

Livros lidos por ano, com registro retroativo (só o ano; data opcional). Totais por status e por ano: livros, páginas, nota média.

## Símbolos de entrada
`statsRoutes` (`server/routes/stats.ts`, `GET /api/stats`), `GET /api/shelf?year=`, `readYear`/`reconcile` (`server/routes/shelf.ts`), `YearsPage`, `YearSelect`, `useStats`, `currentYear` (`client/src/lib/format.ts`).

## Interações
- [estante](estante.md): `readYear` é derivado de `finishedAt` ou informado ao marcar como Lido.
- [amigos](amigos.md): os cartões de Por ano mostram o chip "N amigos leram"; amigos veem o `readYear` dos meus Lidos.
