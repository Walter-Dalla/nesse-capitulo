import { currentYear } from "../lib/format";

interface Props { id?: string; value: number; onChange: (y: number) => void; className?: string }

/** Seletor de ano (dos últimos 80 anos até o atual) para registro retroativo. */
export function YearSelect({ id, value, onChange, className = "" }: Props) {
  const now = currentYear();
  const years: number[] = [];
  for (let y = now; y >= now - 80; y--) years.push(y);
  if (!years.includes(value)) years.push(value);
  return (
    <select id={id} className={`input ${className}`} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {years.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  );
}
