/**
 * Acha texto de interface escrito direto no código de uma tela. Filtro grosso, por regex: pega o que
 * costuma escapar, não prova que tudo foi traduzido.
 * Uso: node --import tsx tests/i18n-literals.ts <arquivos>; sai 1 se achar algo.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Marcas e siglas iguais em todos os idiomas, e nomes de tecla ou erro do navegador. */
const ALLOWED = new Set(["ISBN", "ISBN x", "Content-Type", "Google Books", "Open Library", "Enter", "Escape", "ArrowDown", "ArrowUp", "AbortError"]);

function stripNonText(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^import .*$/gm, "")
    .replace(/className=(\{`[^`]*`\}|"[^"]*")/g, "")
    .replace(/<(path|circle|rect|svg)\b[^>]*>/g, "");
}

const isText = (raw: string): boolean => {
  const s = raw.trim();
  if (s.length < 2 || ALLOWED.has(s)) return false;
  if (!/\p{L}{2}/u.test(s)) return false;
  if (/^[/.#]|^https?:|^[a-z]+:|\$\{[^}]*\}$/.test(s) && !/\s/.test(s)) return false;
  if (/[À-ÿ“”…]/.test(s)) return true;
  if (/^[A-Z][a-zà-ÿ]+\b/.test(s)) return true;
  // minúsculas só contam com espaço e sem cara de classe CSS ou chave
  return /\s/.test(s) && !/[-:_/[\]=]/.test(s);
};

export function findLiterals(src: string, jsx = true): string[] {
  const code = stripNonText(src);
  const out = new Set<string>();
  // literais de string e de template
  for (const m of code.matchAll(/"([^"\n]*)"|`([^`\n]*)`/g)) {
    const s = m[1] ?? m[2];
    if (isText(s.replace(/\$\{[^}]*\}/g, "").trim() ? s.replace(/\$\{[^}]*\}/g, "x") : "")) out.add(s.trim());
  }
  // texto entre tags JSX, na mesma linha ou sozinho numa linha
  if (jsx) for (const m of code.matchAll(/>\s*([^<>{}"`=;()]*\p{L}{2}[^<>{}"`=;()]*?)\s*(?=<|\{)/gu)) {
    if (isText(m[1]) || /^\p{L}[\p{L} ]*$/u.test(m[1].trim())) { if (!ALLOWED.has(m[1].trim())) out.add(m[1].trim()); }
  }
  // formas de plural(n, "singular", "plural") passadas como literal
  for (const m of code.matchAll(/plural\([^,]+,\s*"([^"]+)",\s*"([^"]+)"/g)) { out.add(m[1]); out.add(m[2]); }
  return [...out];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let found = 0;
  for (const file of process.argv.slice(2)) {
    for (const lit of findLiterals(readFileSync(file, "utf8"), file.endsWith(".tsx"))) {
      console.log(`${file}: ${lit}`);
      found++;
    }
  }
  console.log(`${found} literais`);
  process.exit(found ? 1 : 0);
}
