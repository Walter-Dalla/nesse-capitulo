import { Link, useSearchParams } from "react-router";
import { BookCard } from "../components/BookCard";
import { IconPlus } from "../components/Icons";
import { Empty, ErrorBox, Page, Spinner } from "../components/Layout";
import { useMe, useShelf, useStats } from "../lib/hooks";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "../lib/types";

const HINTS: Record<Status, string> = {
  reading: "Comece um livro pela busca e marque como “Estou lendo”.",
  want: "Monte sua fila: busque um livro e marque “Quero ler”.",
  read: "Registre o que você já leu, inclusive de anos anteriores.",
  abandoned: "Nenhum livro abandonado. Às vezes é melhor largar mesmo.",
};

export function ShelfPage() {
  const [params, setParams] = useSearchParams();
  const status = (STATUS_ORDER.includes(params.get("s") as Status) ? params.get("s") : "reading") as Status;
  const shelf = useShelf({ status });
  const stats = useStats();
  const me = useMe();

  return (
    <Page
      title="Estante"
      action={
        <Link to="/perfil" className="shrink-0" aria-label="Perfil">
          {me.data?.user?.picture ? (
            <img src={me.data.user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full ring-2 ring-white dark:ring-stone-800" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 font-bold text-stone-950">{(me.data?.user?.name ?? "?").slice(0, 1).toUpperCase()}</span>
          )}
        </Link>
      }
    >
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3" role="tablist" aria-label="Status">
        {STATUS_ORDER.map((s) => {
          const count = stats.data?.counts[s];
          return (
            <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => setParams({ s }, { replace: true })} className={status === s ? "chip-on" : "chip-off"}>
              {STATUS_LABEL[s]}
              {count ? <span className={`ml-0.5 rounded-full px-1.5 text-xs ${status === s ? "bg-white/20" : "bg-stone-100 dark:bg-stone-800"}`}>{count}</span> : null}
            </button>
          );
        })}
      </div>

      {shelf.isPending ? (
        <Spinner />
      ) : shelf.isError ? (
        <ErrorBox error={shelf.error} retry={() => shelf.refetch()} />
      ) : shelf.data.items.length === 0 ? (
        <Empty title={`Nada em “${STATUS_LABEL[status]}”`} hint={HINTS[status]} action={<Link to="/buscar" className="btn-primary mt-2">Buscar livro</Link>} />
      ) : (
        <ul className="fade-in space-y-2.5">
          {shelf.data.items.map((item) => <li key={item.id}><BookCard item={item} /></li>)}
        </ul>
      )}

      <Link to="/buscar" className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500 text-stone-950 shadow-lg shadow-accent-500/30 transition active:scale-95 sm:right-[calc(50%-14rem)]" aria-label="Adicionar livro">
        <IconPlus width={28} height={28} />
      </Link>
    </Page>
  );
}
