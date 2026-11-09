import { test } from "node:test";
import assert from "node:assert/strict";
import {
  displayName, formatAuthors, formatDate, formatTimestamp, friendsReadChip, friendsReadText, pageProgressText, plural, updatedAgoText,
} from "../client/src/lib/format.ts";
import { setLocale, type Locale } from "../client/src/lib/i18n.ts";
import {
  SOURCE_LABEL, STATUS_ACTION, STATUS_BADGE, STATUS_GROUP, STATUS_LABEL, VISIBILITY_LABEL,
} from "../client/src/lib/types.ts";

/** Roda `read` em cada idioma e compara por igualdade. */
function each(read: () => unknown, expected: Record<Locale, unknown>) {
  for (const locale of ["pt", "en", "es"] as const) {
    setLocale(locale);
    assert.deepEqual(read(), expected[locale], locale);
  }
}

const NOW = new Date("2026-11-10T12:00:00Z");

test("datas seguem o idioma", () => {
  each(() => formatTimestamp("2026-11-07 12:00:00"), { pt: "07/11/2026", en: "11/7/2026", es: "7/11/2026" });
  each(() => formatDate("2026-03-05"), { pt: "05/03/2026", en: "3/5/2026", es: "5/3/2026" });
  each(() => formatTimestamp("lixo"), { pt: "", en: "", es: "" });
  each(() => formatDate(null), { pt: "", en: "", es: "" });
});

test("rótulos de status seguem o idioma a cada leitura", () => {
  each(() => STATUS_LABEL.reading, { pt: "Lendo", en: "Reading", es: "Leyendo" });
  each(() => STATUS_LABEL.want, { pt: "Quero ler", en: "Want to read", es: "Quiero leer" });
  each(() => STATUS_LABEL.read, { pt: "Lidos", en: "Read", es: "Leídos" });
  each(() => STATUS_LABEL.abandoned, { pt: "Abandonados", en: "Abandoned", es: "Abandonados" });
  each(() => STATUS_BADGE.read, { pt: "Lido", en: "Read", es: "Leído" });
  each(() => STATUS_BADGE.abandoned, { pt: "Abandonado", en: "Abandoned", es: "Abandonado" });
  each(() => STATUS_ACTION.read, { pt: "Já li", en: "I've read it", es: "Ya lo leí" });
  each(() => STATUS_GROUP.reading, { pt: "Lendo agora", en: "Reading now", es: "Leyendo ahora" });
});

test("rótulos enumeram as mesmas chaves de antes", () => {
  for (const labels of [STATUS_LABEL, STATUS_ACTION, STATUS_BADGE, STATUS_GROUP]) {
    assert.deepEqual(Object.keys(labels).sort(), ["abandoned", "read", "reading", "want"]);
  }
});

test("marcas de fonte não traduzem; cadastro manual traduz", () => {
  each(() => SOURCE_LABEL.google, { pt: "Google Books", en: "Google Books", es: "Google Books" });
  each(() => SOURCE_LABEL.openlibrary, { pt: "Open Library", en: "Open Library", es: "Open Library" });
  each(() => SOURCE_LABEL.manual, { pt: "cadastrado manualmente", en: "added manually", es: "agregado manualmente" });
  each(() => VISIBILITY_LABEL.public, { pt: "Público", en: "Public", es: "Público" });
  each(() => VISIBILITY_LABEL.private, { pt: "Privado", en: "Private", es: "Privado" });
});

test("autores", () => {
  each(() => formatAuthors([]), { pt: "Autor desconhecido", en: "Unknown author", es: "Autor desconocido" });
  each(() => formatAuthors(undefined), { pt: "Autor desconhecido", en: "Unknown author", es: "Autor desconocido" });
  each(() => formatAuthors(["Ana"]), { pt: "Ana", en: "Ana", es: "Ana" });
  each(() => formatAuthors(["Ana", "João"]), { pt: "Ana e João", en: "Ana and João", es: "Ana y João" });
  each(() => formatAuthors(["Ana", "João", "Caio"]), { pt: "Ana e outros", en: "Ana and others", es: "Ana y otros" });
});

test("selo de amigos", () => {
  each(() => friendsReadText([]), { pt: "", en: "", es: "" });
  each(() => friendsReadText(["Ana"]), { pt: "Ana já leu", en: "Ana has read it", es: "Ana ya lo leyó" });
  each(() => friendsReadText(["Ana", "João"]), {
    pt: "Ana e João já leram",
    en: "Ana and João have read it",
    es: "Ana y João ya lo leyeron",
  });
  each(() => friendsReadText(["Ana", "João", "Caio", "Davi"]), {
    pt: "Ana, João e mais 2 já leram",
    en: "Ana, João and 2 more have read it",
    es: "Ana, João y 2 más ya lo leyeron",
  });
  each(() => friendsReadChip(1), { pt: "1 amigo leu", en: "1 friend read it", es: "1 amigo lo leyó" });
  each(() => friendsReadChip(2), { pt: "2 amigos leram", en: "2 friends read it", es: "2 amigos lo leyeron" });
});

test("progresso de página", () => {
  each(() => pageProgressText(120, 300), {
    pt: "Pág. 120 de 300 · 40%",
    en: "Page 120 of 300 · 40%",
    es: "Pág. 120 de 300 · 40%",
  });
  each(() => pageProgressText(120, null), { pt: "Pág. 120", en: "Page 120", es: "Pág. 120" });
  each(() => pageProgressText(1234, 2468), {
    pt: "Pág. 1234 de 2468 · 50%",
    en: "Page 1234 of 2468 · 50%",
    es: "Pág. 1234 de 2468 · 50%",
  });
  each(() => pageProgressText(null, 300), { pt: "", en: "", es: "" });
});

test("tempo desde a atualização", () => {
  each(() => updatedAgoText("2026-11-10 09:00:00", NOW), { pt: "Atualizado hoje", en: "Updated today", es: "Actualizado hoy" });
  each(() => updatedAgoText("2026-11-09 23:00:00", NOW), { pt: "Atualizado ontem", en: "Updated yesterday", es: "Actualizado ayer" });
  each(() => updatedAgoText("2026-11-07 12:00:00", NOW), { pt: "Atualizado há 3 dias", en: "Updated 3 days ago", es: "Actualizado hace 3 días" });
});

test("nome de quem não tem nome", () => {
  each(() => displayName({ name: null }), { pt: "Leitor(a)", en: "Reader", es: "Lector(a)" });
  each(() => displayName({ name: "Ana" }), { pt: "Ana", en: "Ana", es: "Ana" });
});

test("plural mantém a assinatura e usa _other em 0", () => {
  assert.equal(plural(0, "livro", "livros"), "0 livros");
  assert.equal(plural(1, "livro", "livros"), "1 livro");
  assert.equal(plural(2, "livro", "livros"), "2 livros");
});
