import { test } from "node:test";
import assert from "node:assert/strict";
import { findLiterals } from "./i18n-literals.ts";

const FINDS: [string, string, string[]][] = [
  ["texto em JSX", "const a = <p>Salvar</p>;", ["Salvar"]],
  ["toast com texto", 'toast("Link copiado");', ["Link copiado"]],
  ["plural com formas literais", 'plural(n, "livro", "livros");', ["livro", "livros"]],
  ["template com variável", "const s = `de ${x}`;", ["de ${x}"]],
];

for (const [name, src, expected] of FINDS) {
  test(`acha: ${name}`, () => {
    assert.deepEqual(findLiterals(src).sort(), expected);
  });
}

const IGNORES: [string, string][] = [
  ["chave de t()", 'const s = t("shelf.empty");'],
  ["className", 'const a = <div className="flex gap-2" />;'],
  ["nome de tecla", 'if (e.key === "Enter") go();'],
  ["marca", 'const s = "Google Books";'],
  ["comentário de linha", "// comentário com texto\nconst a = 1;"],
  ["comentário de bloco", "/* comentário com texto */\nconst a = 1;"],
  ["comentário em JSX", "const a = <div>{/* comentário com texto */}</div>;"],
];

for (const [name, src] of IGNORES) {
  test(`não acha: ${name}`, () => {
    assert.deepEqual(findLiterals(src), []);
  });
}
