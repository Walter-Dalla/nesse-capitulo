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
  const status = params.get("s") as Status;
  // sem filtro válido na URL (tela inicial), mostra todos
  const showAll = !STATUS_ORDER.includes(status);
  const shelf = useShelf(showAll ? {} : { status });
  const stats = useStats();
  const me = useMe();
  const total = stats.data ? STATUS_ORDER.reduce((sum, s) => sum + stats.data.counts[s], 0) : 0;

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
      <div className="flex flex-wrap gap-2 pb-3" role="tablist" aria-label="Status">
        <button type="button" role="tab" aria-selected={showAll} onClick={() => setParams({}, { replace: true })} className={showAll ? "chip-on" : "chip-off"}>
          Ver todos
          {total ? <span className={`ml-0.5 rounded-full px-1.5 text-xs ${showAll ? "bg-white/20" : "bg-stone-100 dark:bg-stone-800"}`}>{total}</span> : null}
        </button>
        {STATUS_ORDER.map((s) => {
          const count = stats.data?.counts[s];
          const selected = !showAll && status === s;
          return (
            <button key={s} type="button" role="tab" aria-selected={selected} onClick={() => setParams({ s }, { replace: true })} className={selected ? "chip-on" : "chip-off"}>
              {STATUS_LABEL[s]}
              {count ? <span className={`ml-0.5 rounded-full px-1.5 text-xs ${selected ? "bg-white/20" : "bg-stone-100 dark:bg-stone-800"}`}>{count}</span> : null}
            </button>
          );
        })}
      </div>

      {shelf.isPending ? (
        <Spinner />
      ) : shelf.isError ? (
        <ErrorBox error={shelf.error} retry={() => shelf.refetch()} />
      ) : shelf.data.items.length === 0 ? (
        <Empty title={showAll ? "Sua estante está vazia" : `Nada em “${STATUS_LABEL[status]}”`} hint={showAll ? "Busque um livro para começar." : HINTS[status]} action={<Link to="/buscar" className="btn-primary mt-2">Buscar livro</Link>} />
      ) : (
        <ul className="fade-in space-y-2.5">
          {shelf.data.items.map((item) => <li key={item.id}><BookCard item={item} showStatus={showAll} /></li>)}
        </ul>
      )}

      <Link to="/buscar" className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500 text-stone-950 shadow-lg shadow-accent-500/30 transition active:scale-95 sm:right-[calc(50%-14rem)]" aria-label="Adicionar livro">
        <IconPlus width={28} height={28} />
      </Link>
    </Page>
  );
}
