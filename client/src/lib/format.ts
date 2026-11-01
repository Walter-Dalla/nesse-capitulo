export function formatAuthors(authors: string[] | undefined) {
  if (!authors || authors.length === 0) return "Autor desconhecido";
  if (authors.length <= 2) return authors.join(" e ");
  return `${authors[0]} e outros`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

export function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const currentYear = () => new Date().getFullYear();

export function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
