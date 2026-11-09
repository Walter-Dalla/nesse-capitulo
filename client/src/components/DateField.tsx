import { useEffect, useRef, useState } from "react";
import { today } from "../lib/format";
import { t } from "../lib/i18n";
import { toast } from "./Toast";

interface Props {
  id: string;
  value: string | null;
  /** Recebe a data validada. */
  onCommit: (value: string | null) => void;
}

const MIN_YEAR = 1000;

function dateProblem(value: string): string | null {
  if (Number(value.slice(0, 4)) < MIN_YEAR) return t("library.date.yearInvalid");
  if (value > today()) return t("library.date.future");
  return null;
}

/**
 * Campo de data que só confirma ao sair dele (ou com Enter). Enquanto se digita, o navegador
 * entrega valores parciais: vazio com segmento faltando e anos como 0002, que não podem ser salvos.
 */
export function DateField({ id, value, onCommit }: Props) {
  const saved = value ?? "";
  const [draft, setDraft] = useState(saved);
  const ref = useRef<HTMLInputElement>(null);

  // não troca o valor na mão de quem está digitando
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(saved);
  }, [saved]);

  function restore(input: HTMLInputElement) {
    input.value = saved; // limpa também os segmentos parciais, que o estado do React não enxerga
    setDraft(saved);
  }

  function commit(input: HTMLInputElement) {
    if (input.validity.badInput) {
      restore(input);
      toast(t("library.date.incomplete"), "error");
      return;
    }
    if (draft === saved) return;
    const problem = draft ? dateProblem(draft) : null;
    if (problem) {
      restore(input);
      toast(problem, "error");
      return;
    }
    onCommit(draft || null);
  }

  // sair da tela com o foco no campo não dispara blur: confirma a data se estiver completa e válida
  const latest = useRef({ draft, saved, onCommit });
  latest.current = { draft, saved, onCommit };
  useEffect(() => () => {
    const { draft, saved, onCommit } = latest.current;
    if (draft && draft !== saved && !dateProblem(draft)) onCommit(draft);
  }, []);

  return (
    <input
      ref={ref}
      id={id}
      type="date"
      className="input"
      value={draft}
      max={today()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
    />
  );
}
