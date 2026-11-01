import { useState } from "react";

const PALETTE = ["from-amber-400 to-orange-600", "from-sky-400 to-indigo-600", "from-emerald-400 to-teal-600", "from-rose-400 to-pink-600", "from-violet-400 to-purple-600", "from-lime-400 to-green-600"];

interface Props { title: string; url?: string | null; className?: string }

/** Capa do livro com placeholder colorido (determinístico pelo título) quando não há imagem. */
export function BookCover({ title, url, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const show = url && !failed;
  const hue = PALETTE[[...title].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
  return (
    <div className={`relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg bg-stone-200 shadow-sm ring-1 ring-black/5 dark:bg-stone-800 ${className}`}>
      {show ? (
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div aria-hidden className={`flex h-full w-full items-end bg-gradient-to-br p-1.5 ${hue}`}>
          <span className="line-clamp-3 text-[10px] font-bold leading-tight text-white/95 drop-shadow">{title}</span>
        </div>
      )}
    </div>
  );
}
