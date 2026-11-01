import { useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../lib/api";
import { useAddToShelf, useMe, useProviders } from "../lib/hooks";
import { AdGate } from "./AdGate";
import { currentYear, formatAuthors } from "../lib/format";
import { STATUS_ACTION, STATUS_ORDER, type BookInput, type Status } from "../lib/types";
import { BookCover } from "./BookCover";
import { Sheet } from "./Sheet";
import { Stars } from "./Stars";
import { toast } from "./Toast";
import { YearSelect } from "./YearSelect";

interface Props {
  book: BookInput;
  defaultStatus?: Status;
  defaultYear?: number;
  onClose: () => void;
}

/** Sheet para adicionar um livro à estante escolhendo o status (e, se lido, ano/data/nota). */
export function AddSheet({ book, defaultStatus = "want", defaultYear, onClose }: Props) {
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [year, setYear] = useState<number>(defaultYear ?? currentYear());
  const [finishedAt, setFinishedAt] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [showAd, setShowAd] = useState(false);
  const add = useAddToShelf();
  const navigate = useNavigate();
  const me = useMe();
  const providers = useProviders();
  const needsAd = Boolean(providers.data?.ads.enabled) && me.data?.adUnlocked === false;

  async function submit() {
    if (needsAd) { setShowAd(true); return; }
    try {
      const res = await add.mutateAsync({
        book,
        status,
        rating,
        ...(status === "read" ? { readYear: year, finishedAt: finishedAt || null } : {}),
      });
      toast(status === "read" ? `Registrado como lido em ${res.item.readYear}` : "Adicionado à estante");
      onClose();
      navigate(`/livro/${res.item.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "AD_REQUIRED") { setShowAd(true); return; }
      toast((e as Error).message, "error");
    }
  }

  if (showAd) {
    return <AdGate onClose={() => setShowAd(false)} onUnlocked={() => { setShowAd(false); }} />;
  }

  return (
    <Sheet title="Adicionar à estante" onClose={onClose}>
      <div className="mb-4 flex gap-3">
        <BookCover book={book} className="w-12" />
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-snug">{book.title}</p>
          <p className="truncate text-sm text-stone-500 dark:text-stone-400">{formatAuthors(book.authors)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status">
        {STATUS_ORDER.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={status === s ? "btn-primary" : "btn-secondary"}>
            {STATUS_ACTION[s]}
          </button>
        ))}
      </div>

      {status === "read" && (
        <div className="fade-in mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="add-year">Ano da leitura</label>
              <YearSelect id="add-year" value={year} onChange={(y) => { setYear(y); if (finishedAt && Number(finishedAt.slice(0, 4)) !== y) setFinishedAt(""); }} />
            </div>
            <div>
              <label className="label" htmlFor="add-date">Terminei em (opcional)</label>
              <input id="add-date" type="date" className="input" value={finishedAt} max={new Date().toISOString().slice(0, 10)} onChange={(e) => { setFinishedAt(e.target.value); if (e.target.value) setYear(Number(e.target.value.slice(0, 4))); }} />
            </div>
          </div>
          <div>
            <span className="label">Sua nota</span>
            <Stars value={rating} onChange={setRating} size="lg" />
          </div>
        </div>
      )}

      <button type="button" onClick={submit} disabled={add.isPending} className="btn-primary mt-5 w-full">
        {add.isPending ? "Salvando…" : needsAd ? "Assistir anúncio e salvar" : "Salvar"}
      </button>
    </Sheet>
  );
}
