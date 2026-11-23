#!/usr/bin/env node
// Validates the architecture contract (architecture.json + diagrams/*.mmd) and regenerates
// the derived files ARCHITECTURE.md and preview.html. No dependencies.
//   node docs/architecture/build.mjs          validate and regenerate
//   node docs/architecture/build.mjs --check  validate and fail if the derived files are stale (CI)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "../..");
const CHECK = process.argv.includes("--check");
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";

const SYSTEM_TYPES = ["web-app", "api", "cli", "plugin", "game", "data-pipeline", "library", "other"];
const LEVELS = ["c4-context", "c4-container", "deployment", "supplementary"];
const MERMAID_TYPES = ["flowchart", "sequenceDiagram", "erDiagram", "stateDiagram-v2"];
const KINDS = ["person", "system", "container", "database", "queue", "external", "infrastructure"];
const NODE_CLASSES = [...KINDS, "step"];
const ATTRIBUTES = ["security", "reliability", "observability", "performance", "recoverability"];
const RISK_STATUS = ["accepted", "mitigated", "open"];
const NODE_LIMITS = { context: 8, containers: 15, deployment: 10 };
const MAX_PARTICIPANTS = 7;
const MAX_MESSAGES = 25;
const MAX_ER_ATTRIBUTES = 8;
const OWNER_CONFIRMED = "owner-confirmed";

const errors = [];
const err = (msg) => errors.push(msg);
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const bi = (v, where) => {
  if (!v || !isStr(v.en) || !isStr(v.pt)) err(`${where}: needs non-empty "en" and "pt"`);
};
const biList = (list, where, { min = 0 } = {}) => {
  if (!Array.isArray(list)) return err(`${where}: must be an array`);
  if (list.length < min) err(`${where}: needs at least ${min} item(s)`);
  list.forEach((v, i) => bi(v, `${where}[${i}]`));
};

// ---------- load ----------
let arch;
try {
  arch = JSON.parse(fs.readFileSync(path.join(DIR, "architecture.json"), "utf8"));
} catch (e) {
  console.error(`architecture.json: ${e.message}`);
  process.exit(1);
}

// ---------- evidence ----------
const fileLines = new Map();
function linesOf(rel) {
  if (!fileLines.has(rel)) {
    const abs = path.resolve(ROOT, rel);
    const inside = abs.startsWith(ROOT + path.sep);
    fileLines.set(rel, inside && fs.existsSync(abs) && fs.statSync(abs).isFile() ? fs.readFileSync(abs, "utf8").split("\n") : null);
  }
  return fileLines.get(rel);
}
function checkEvidence(list, where) {
  if (!Array.isArray(list) || list.length === 0) return err(`${where}: evidence is required`);
  for (const ev of list) {
    if (ev === OWNER_CONFIRMED) continue;
    const m = typeof ev === "string" ? ev.match(/^([^:\s]+):(\d+)$/) : null;
    if (!m) { err(`${where}: evidence "${ev}" is not "path:line" nor "${OWNER_CONFIRMED}"`); continue; }
    const lines = linesOf(m[1]);
    const n = Number(m[2]);
    if (!lines) err(`${where}: evidence file not found: ${m[1]}`);
    else if (n < 1 || n > lines.length) err(`${where}: ${ev} is outside the file (${lines.length} lines)`);
    else if (lines[n - 1].trim() === "") err(`${where}: ${ev} points to a blank line`);
  }
}

// ---------- Mermaid parsing ----------
const FORBIDDEN = [
  [/\bclassDef\b/, "classDef"],
  [/\blinkStyle\b/, "linkStyle"],
  [/^\s*style\s/m, "style"],
  [/%%\{/, "init directive"],
  [/^---\s*$/m, "frontmatter"],
  [/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/, "colour"],
  [/\b(fill|stroke|color)\s*:/, "colour property"],
];
const ID = "[a-z][a-z0-9_]*";

function parseFlowchart(src, where) {
  const nodes = new Map(); // id -> { cls, label }
  const subgraphs = [];
  const edges = [];
  for (const raw of src.split("\n").slice(1)) {
    const line = raw.trim();
    if (!line || line === "end") continue;
    let m;
    if ((m = line.match(new RegExp(`^subgraph\\s+(${ID})(\\[".*"\\])?$`)))) { subgraphs.push(m[1]); continue; }
    if ((m = line.match(new RegExp(`^(${ID})\\s*-->\\|"([^"]+)"\\|\\s*(${ID})$`)))) { edges.push({ from: m[1], to: m[3], label: m[2] }); continue; }
    if ((m = line.match(new RegExp(`^(${ID})(\\["(.+)"\\]|\\[\\("(.+)"\\)\\]):::(\\w+)$`)))) {
      const label = m[3] ?? m[4];
      const cylinder = m[4] !== undefined;
      if (!NODE_CLASSES.includes(m[5])) err(`${where}: node ${m[1]} has unknown class "${m[5]}"`);
      if ((m[5] === "database") !== cylinder) err(`${where}: node ${m[1]}: database nodes (and only them) use the cylinder shape`);
      if (!/^.+<br\/>\[.+\]$/.test(label)) err(`${where}: node ${m[1]} label must be "Name<br/>[Technology]"`);
      nodes.set(m[1], { cls: m[5], label });
      continue;
    }
    err(`${where}: line not understood (node needs a class, arrow needs a quoted label): ${line}`);
  }
  return { nodes, subgraphs, edges };
}

function parseSequence(src, where) {
  const participants = [];
  const messages = [];
  let hasAlt = false, hasElse = false;
  for (const raw of src.split("\n").slice(1)) {
    const line = raw.trim();
    if (!line || line === "end") continue;
    let m;
    if ((m = line.match(new RegExp(`^(actor|participant)\\s+(${ID})\\s+as\\s+(.+)$`)))) { participants.push(m[2]); continue; }
    if (/^(alt|opt|loop|par|critical)\b/.test(line)) { if (line.startsWith("alt")) hasAlt = true; continue; }
    if (/^(else|and|option)\b/.test(line)) { if (line.startsWith("else")) hasElse = true; continue; }
    if ((m = line.match(new RegExp(`^(${ID})(-->>|->>)(${ID}):\\s*(.+)$`)))) {
      if (/[;{}]/.test(m[4])) err(`${where}: message contains ";", "{" or "}": ${m[4]}`);
      messages.push({ from: m[1], to: m[3], arrow: m[2] });
      continue;
    }
    err(`${where}: line not understood: ${line}`);
  }
  for (const msg of messages) for (const p of [msg.from, msg.to]) if (!participants.includes(p)) err(`${where}: message uses undeclared participant ${p}`);
  return { participants, messages, hasAltElse: hasAlt && hasElse };
}

function parseEr(src, where) {
  const entities = new Map(); // name -> attribute count
  const relations = [];
  let current = null;
  for (const raw of src.split("\n").slice(1)) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if (current) {
      if (line === "}") current = null;
      else entities.set(current, entities.get(current) + 1);
      continue;
    }
    if ((m = line.match(/^(\w+)\s*\{$/))) { current = m[1]; entities.set(current, 0); continue; }
    if ((m = line.match(/^(\w+)\s+[|o}{]{2}--[|o}{]{2}\s+(\w+)\s*:\s*".+"$/))) { relations.push(`${m[1]}>${m[2]}`); continue; }
    err(`${where}: line not understood: ${line}`);
  }
  for (const [name, n] of entities) if (n > MAX_ER_ATTRIBUTES) err(`${where}: entity ${name} lists ${n} attributes (max ${MAX_ER_ATTRIBUTES})`);
  return { entities, relations };
}

function parseState(src) {
  const states = [...src.matchAll(new RegExp(`^\\s*state\\s+".+"\\s+as\\s+(${ID})\\s*$`, "gm"))].map((m) => m[1]);
  return { states };
}

/** Structure that must be identical in the en and pt files. */
function shapeOf(type, parsed) {
  if (type === "flowchart") return JSON.stringify([[...parsed.nodes].map(([id, n]) => [id, n.cls]), parsed.subgraphs, parsed.edges.map((e) => [e.from, e.to])]);
  if (type === "sequenceDiagram") return JSON.stringify([parsed.participants, parsed.messages]);
  if (type === "erDiagram") return JSON.stringify([[...parsed.entities], parsed.relations]);
  return JSON.stringify(parsed.states);
}

// ---------- validate ----------
if (arch.schemaVersion !== 2) err(`schemaVersion must be 2`);
const project = arch.project ?? {};
if (!isStr(project.name)) err("project.name is required");
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(project.slug ?? "")) err("project.slug must be kebab-case");
if (typeof project.repository !== "string") err("project.repository must be a string (may be empty)");
if (!/^[0-9a-f]{40}$/.test(project.commit ?? "")) err("project.commit must be a full commit hash");
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(project.generatedAt ?? "")) err("project.generatedAt must be ISO 8601 UTC, e.g. 2026-01-31T12:00:00Z");
if (!SYSTEM_TYPES.includes(arch.systemType)) err(`systemType must be one of ${SYSTEM_TYPES.join(", ")}`);
bi(arch.summary, "summary");
if (!Array.isArray(arch.stack) || arch.stack.length === 0) err("stack is required");
(arch.stack ?? []).forEach((s, i) => { if (!isStr(s.name)) err(`stack[${i}].name is required`); bi(s.role, `stack[${i}].role`); });

const elements = Array.isArray(arch.elements) ? arch.elements : [];
const elementById = new Map();
elements.forEach((e, i) => {
  const where = `elements[${e.id ?? i}]`;
  if (!new RegExp(`^${ID}$`).test(e.id ?? "")) err(`${where}: id must be snake_case`);
  if (elementById.has(e.id)) err(`${where}: duplicate id`);
  elementById.set(e.id, e);
  if (!KINDS.includes(e.kind)) err(`${where}: kind must be one of ${KINDS.join(", ")}`);
  bi(e.name, `${where}.name`);
  if (typeof e.technology !== "string") err(`${where}: technology must be a string`);
  bi(e.responsibility, `${where}.responsibility`);
  checkEvidence(e.evidence, where);
});

const relationships = Array.isArray(arch.relationships) ? arch.relationships : [];
const relKey = (r) => `${r.from}>${r.to}`;
const relByKey = new Map();
const evidenceUse = new Map();
relationships.forEach((r) => {
  const where = `relationships[${relKey(r)}]`;
  for (const end of [r.from, r.to]) if (!elementById.has(end)) err(`${where}: "${end}" is not an element`);
  if (relByKey.has(relKey(r))) err(`${where}: duplicate relationship`);
  relByKey.set(relKey(r), r);
  bi(r.label, `${where}.label`);
  if (!isStr(r.protocol)) err(`${where}: protocol is required`);
  checkEvidence(r.evidence, where);
  for (const ev of r.evidence ?? []) if (ev !== OWNER_CONFIRMED) evidenceUse.set(ev, [...(evidenceUse.get(ev) ?? []), relKey(r)]);
});
for (const [ev, users] of evidenceUse) if (users.length > 1) err(`evidence ${ev} is reused by several relationships: ${users.join(", ")}`);

const diagrams = Array.isArray(arch.diagrams) ? arch.diagrams : [];
const sources = new Map(); // `${id}.${lang}` -> source text
const usedElements = new Set();
const usedRelationships = new Set();
let sequenceCount = 0, sequenceWithAltElse = 0;
const seenDiagramIds = new Set();
for (const d of diagrams) {
  const where = `diagrams[${d.id}]`;
  if (!isStr(d.id) || seenDiagramIds.has(d.id)) err(`${where}: id missing or duplicated`);
  seenDiagramIds.add(d.id);
  if (!LEVELS.includes(d.level)) err(`${where}: level must be one of ${LEVELS.join(", ")}`);
  if (!MERMAID_TYPES.includes(d.mermaidType)) err(`${where}: mermaidType must be one of ${MERMAID_TYPES.join(", ")}`);
  for (const f of ["title", "caption", "description", "insight"]) bi(d[f], `${where}.${f}`);
  const parsed = {};
  for (const lang of ["en", "pt"]) {
    const expected = `diagrams/${d.id}.${lang}.mmd`;
    if (d.files?.[lang] !== expected) { err(`${where}: files.${lang} must be "${expected}"`); continue; }
    const abs = path.join(DIR, expected);
    if (!fs.existsSync(abs)) { err(`${where}: missing file ${expected}`); continue; }
    const src = fs.readFileSync(abs, "utf8").replace(/\s+$/, "");
    sources.set(`${d.id}.${lang}`, src);
    const tag = `${expected}`;
    for (const [re, name] of FORBIDDEN) if (re.test(src)) err(`${tag}: contains ${name}; the portfolio applies its own theme`);
    const first = src.split("\n")[0].trim();
    if (first.split(/\s+/)[0] !== d.mermaidType) err(`${tag}: first line must start with ${d.mermaidType}`);
    if (d.mermaidType === "flowchart") parsed[lang] = parseFlowchart(src, tag);
    else if (d.mermaidType === "sequenceDiagram") parsed[lang] = parseSequence(src, tag);
    else if (d.mermaidType === "erDiagram") parsed[lang] = parseEr(src, tag);
    else parsed[lang] = parseState(src);
  }
  if (!parsed.en || !parsed.pt) continue;
  if (shapeOf(d.mermaidType, parsed.en) !== shapeOf(d.mermaidType, parsed.pt)) err(`${where}: en and pt differ in ids, classes or arrows`);

  const isC4 = ["c4-context", "c4-container", "deployment"].includes(d.level);
  if (d.mermaidType === "flowchart" && isC4) {
    const p = parsed.en;
    const ids = [...p.nodes.keys(), ...p.subgraphs];
    const limit = NODE_LIMITS[d.id];
    if (limit && ids.length > limit) err(`${where}: ${ids.length} nodes (max ${limit})`);
    for (const id of ids) {
      const el = elementById.get(id);
      if (!el) { err(`${where}: node ${id} is not in "elements"`); continue; }
      usedElements.add(id);
      const cls = p.nodes.get(id)?.cls;
      if (cls && cls !== el.kind) err(`${where}: node ${id} has class ${cls} but element kind ${el.kind}`);
    }
    for (const lang of ["en", "pt"]) {
      for (const e of parsed[lang].edges) {
        const r = relByKey.get(`${e.from}>${e.to}`);
        if (!r) { if (lang === "en") err(`${where}: arrow ${e.from} -> ${e.to} is not in "relationships"`); continue; }
        usedRelationships.add(relKey(r));
        if (r.label?.[lang] !== e.label) err(`${where}: arrow ${e.from} -> ${e.to} (${lang}) is labelled "${e.label}" but the relationship says "${r.label?.[lang]}"`);
      }
    }
    if (d.level === "c4-context") {
      const systems = [...p.nodes].filter(([, n]) => n.cls === "system").map(([id]) => id);
      if (systems.length !== 1) err(`${where}: context needs exactly one system node`);
      arch.__systemId = systems[0];
    }
    if (d.level === "c4-container" && !p.subgraphs.includes(arch.__systemId)) err(`${where}: the system boundary must be a subgraph with the id of the context system node`);
  }
  if (d.mermaidType === "sequenceDiagram") {
    sequenceCount++;
    const p = parsed.en;
    if (p.hasAltElse) sequenceWithAltElse++;
    if (p.participants.length > MAX_PARTICIPANTS) err(`${where}: ${p.participants.length} participants (max ${MAX_PARTICIPANTS})`);
    if (p.messages.length > MAX_MESSAGES) err(`${where}: ${p.messages.length} messages (max ${MAX_MESSAGES})`);
    for (const id of p.participants) if (!elementById.has(id)) err(`${where}: participant ${id} is not in "elements"`);
  }
}
for (const required of ["context", "containers"]) if (!seenDiagramIds.has(required)) err(`diagram "${required}" is required`);
if (["web-app", "api"].includes(arch.systemType) && !seenDiagramIds.has("deployment")) err(`diagram "deployment" is required for ${arch.systemType}`);
if (sequenceCount > 0 && sequenceWithAltElse === 0) err("at least one sequenceDiagram needs a failure path with alt/else");
for (const e of elements) if (!usedElements.has(e.id)) err(`elements[${e.id}]: not drawn in context, containers or deployment`);
for (const r of relationships) if (!usedRelationships.has(relKey(r))) err(`relationships[${relKey(r)}]: not drawn in context, containers or deployment`);

const decisions = Array.isArray(arch.decisions) ? arch.decisions : [];
if (decisions.length < 4 || decisions.length > 7) err(`decisions: ${decisions.length} found, the contract asks for 4 to 7`);
decisions.forEach((d, i) => {
  const where = `decisions[${d.id ?? i}]`;
  if (d.id !== `D${i + 1}`) err(`${where}: id must be D${i + 1}`);
  for (const f of ["title", "context", "choice", "tradeoffs", "revisitWhen"]) bi(d[f], `${where}.${f}`);
  biList(d.alternatives, `${where}.alternatives`, { min: 1 });
  checkEvidence(d.evidence, where);
});
(arch.qualityAttributes ?? []).forEach((q, i) => {
  const where = `qualityAttributes[${q.attribute ?? i}]`;
  if (!ATTRIBUTES.includes(q.attribute)) err(`${where}: attribute must be one of ${ATTRIBUTES.join(", ")}`);
  biList(q.controls, `${where}.controls`);
  biList(q.gaps, `${where}.gaps`);
  checkEvidence(q.evidence, where);
});
if (!Array.isArray(arch.qualityAttributes)) err("qualityAttributes must be an array");
if (!Array.isArray(arch.risks)) err("risks must be an array");
(arch.risks ?? []).forEach((r, i) => {
  bi(r.risk, `risks[${i}].risk`);
  bi(r.note, `risks[${i}].note`);
  if (!RISK_STATUS.includes(r.status)) err(`risks[${i}]: status must be one of ${RISK_STATUS.join(", ")}`);
});
biList(arch.knownLimits, "knownLimits");
biList(arch.hypotheses, "hypotheses");
const allMermaid = [...sources.values()].join("\n").toLowerCase();
if (!Array.isArray(arch.glossary)) err("glossary must be an array");
(arch.glossary ?? []).forEach((g, i) => {
  if (!isStr(g.term)) return err(`glossary[${i}].term is required`);
  bi(g.definition, `glossary[${g.term}].definition`);
  if (!allMermaid.includes(g.term.toLowerCase())) err(`glossary[${g.term}]: the term does not appear in any .mmd`);
});

// Public content: no addresses, e-mails or links other than the repository itself.
const publicText = JSON.stringify({ ...arch, project: { ...project, repository: "" } }) + "\n" + [...sources.values()].join("\n");
for (const [re, name] of [
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, "an IP address"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/, "an e-mail address"],
  [/https?:\/\//, "a URL"],
]) {
  const m = publicText.match(re);
  if (m) err(`sensitive content: found ${name} ("${m[0]}")`);
}

if (errors.length) {
  console.error(`architecture: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

// ---------- generate ----------
const NOTICE = "Generated by build.mjs from architecture.json and diagrams/*.mmd. Do not edit by hand.";
const generatedAt = project.generatedAt.replace("T", " ").replace(/:\d{2}Z$/, " UTC");
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const evCell = (list) => list.map((e) => (e === OWNER_CONFIRMED ? e : `\`${e}\``)).join("<br>");
const table = (head, rows) => [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
const bullets = (list, empty) => (list.length ? list.map((v) => `- ${v.en}`).join("\n") : `_${empty}_`);

function markdown() {
  const out = [];
  out.push(`<!-- ${NOTICE} -->`, "", `# ${project.name} — Architecture`, "");
  out.push(`> Generated from commit \`${project.commit.slice(0, 7)}\` on ${generatedAt}. Sources: [\`architecture.json\`](architecture.json) and [\`diagrams/\`](diagrams/), which also hold the Portuguese version.`, "");
  out.push(arch.summary.en, "", `**System type:** \`${arch.systemType}\``, "");
  out.push("## Stack", "", table(["Technology", "Role"], arch.stack.map((s) => [s.name, s.role.en])), "");
  for (const d of diagrams) {
    out.push(`## ${d.title.en}`, "", d.caption.en, "", "```mermaid", sources.get(`${d.id}.en`), "```", "", d.description.en, "", `**Insight:** ${d.insight.en}`, "");
  }
  out.push("## Elements", "", table(["Id", "Kind", "Name", "Technology", "Responsibility", "Evidence"],
    elements.map((e) => [`\`${e.id}\``, e.kind, e.name.en, e.technology || "—", e.responsibility.en, evCell(e.evidence)])), "");
  out.push("## Relationships", "", table(["From", "To", "Label", "Protocol", "Evidence"],
    relationships.map((r) => [`\`${r.from}\``, `\`${r.to}\``, r.label.en, r.protocol, evCell(r.evidence)])), "");
  out.push("## Design decisions", "");
  for (const d of decisions) {
    out.push(`### ${d.id} — ${d.title.en}`, "", `- **Context:** ${d.context.en}`, `- **Choice:** ${d.choice.en}`,
      `- **Alternatives:** ${d.alternatives.map((a) => a.en).join(" / ")}`, `- **Trade-offs:** ${d.tradeoffs.en}`,
      `- **Revisit when:** ${d.revisitWhen.en}`, `- **Evidence:** ${d.evidence.map((e) => (e === OWNER_CONFIRMED ? e : `\`${e}\``)).join(", ")}`, "");
  }
  out.push("## Quality attributes", "");
  for (const q of arch.qualityAttributes) {
    out.push(`### ${q.attribute[0].toUpperCase()}${q.attribute.slice(1)}`, "", "**In place**", "", bullets(q.controls, "Nothing in place."), "",
      "**Gaps**", "", bullets(q.gaps, "No known gap."), "", `Evidence: ${q.evidence.map((e) => (e === OWNER_CONFIRMED ? e : `\`${e}\``)).join(", ")}`, "");
  }
  out.push("## Risks", "", arch.risks.length ? table(["Risk", "Status", "Note"], arch.risks.map((r) => [r.risk.en, r.status, r.note.en])) : "_None recorded._", "");
  out.push("## Known limits", "", "Confirmed in the code, but partial or switched off:", "", bullets(arch.knownLimits, "None."), "");
  out.push("## Open hypotheses", "", "Searched for and not confirmed, so kept out of the diagrams:", "", bullets(arch.hypotheses, "None."), "");
  out.push("## Glossary", "", arch.glossary.length ? table(["Term", "Definition"], arch.glossary.map((g) => [g.term, g.definition.en])) : "_Empty._", "");
  return out.join("\n");
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function html() {
  const sections = diagrams.map((d) => `
<section>
  <h2>${esc(d.title.en)} / ${esc(d.title.pt)} <small>${esc(d.id)} · ${esc(d.level)} · ${esc(d.mermaidType)}</small></h2>
  <div class="pair">
${["en", "pt"].map((lang) => `    <figure>
      <figcaption><b>${lang}</b> — ${esc(d.caption[lang])}</figcaption>
      <pre class="mermaid">
${esc(sources.get(`${d.id}.${lang}`))}
      </pre>
    </figure>`).join("\n")}
  </div>
</section>`).join("\n");
  return `<!doctype html>
<!-- ${NOTICE} -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.name)} — architecture preview</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #fafaf9; color: #1c1917; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; }
  h2 small { font-weight: normal; color: #78716c; margin-left: .5rem; }
  .pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
  figure { margin: 0; padding: 12px; background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; overflow-x: auto; }
  figcaption { font-size: .85rem; margin-bottom: 8px; }
</style>
</head>
<body>
<h1>${esc(project.name)} — architecture preview</h1>
<p>Syntax check only. Commit <code>${project.commit.slice(0, 7)}</code>, generated ${generatedAt}. The portfolio applies its own theme; this page uses Mermaid defaults.</p>
${sections}
<script type="module">
  import mermaid from "${MERMAID_CDN}";
  mermaid.initialize({ startOnLoad: true, securityLevel: "strict" });
</script>
</body>
</html>
`;
}

const outputs = { "ARCHITECTURE.md": markdown(), "preview.html": html() };
let stale = 0;
for (const [name, content] of Object.entries(outputs)) {
  const file = path.join(DIR, name);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  if (CHECK) { stale++; console.error(`${name} is stale: run "node docs/architecture/build.mjs"`); }
  else { fs.writeFileSync(file, content); console.log(`wrote ${name}`); }
}
if (stale) process.exit(1);
console.log(`architecture ok: ${diagrams.length} diagrams, ${elements.length} elements, ${relationships.length} relationships, ${decisions.length} decisions`);
