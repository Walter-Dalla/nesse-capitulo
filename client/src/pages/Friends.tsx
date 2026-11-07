import { useState } from "react";
import { Link } from "react-router";
import { Avatar } from "../components/FriendBadge";
import { Empty, ErrorBox, Page, Spinner } from "../components/Layout";
import { toast } from "../components/Toast";
import { displayName, readingPercent } from "../lib/format";
import { useCreateInvite, useFriends } from "../lib/hooks";

const SHARE_TEXT = "Vamos acompanhar o que o outro está lendo na Estante?";

/** Compartilha pelo menu do aparelho; senão copia. Devolve false quando nada funcionou. */
async function shareOrCopy(url: string): Promise<boolean> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Convite da Estante", text: SHARE_TEXT, url });
      return true;
    } catch (e) {
      // cancelar o menu de compartilhar não é erro
      if ((e as Error).name === "AbortError") return true;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copiado");
    return true;
  } catch {
    return false;
  }
}

export function FriendsPage() {
  const friends = useFriends();
  const create = useCreateInvite();
  // link gerado que não deu para compartilhar nem copiar: fica visível para copiar à mão
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  async function inviteFriend() {
    try {
      const { code } = await create.mutateAsync();
      const url = `${location.origin}/amigos/convite/${code}`;
      setManualUrl((await shareOrCopy(url)) ? null : url);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <Page title="Amigos">
      <section className="card p-4">
        <button type="button" onClick={inviteFriend} disabled={create.isPending} className="btn-primary w-full">
          {create.isPending ? "Gerando link…" : "Convidar amigo"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          O link não expira e vale para uma pessoa. Quem confirmar vira seu amigo e vocês veem o que o outro está lendo, já leu e os comentários públicos.
        </p>
        {manualUrl && (
          <div className="fade-in mt-3">
            <label className="label" htmlFor="invite-url">Copie e envie este link</label>
            <input id="invite-url" className="input text-sm" readOnly value={manualUrl} onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
      </section>

      {friends.isPending ? (
        <Spinner />
      ) : friends.isError ? (
        <ErrorBox error={friends.error} retry={() => friends.refetch()} />
      ) : friends.data.friends.length === 0 ? (
        <Empty title="Nenhum amigo ainda" hint="Convide alguém pelo link e acompanhe o que cada um está lendo." />
      ) : (
        <ul className="mt-4 space-y-3 pb-4">
          {friends.data.friends.map((f) => (
            <li key={f.id}>
              <Link to={`/amigos/${f.id}`} className="card flex items-center gap-3 p-3 transition active:scale-[0.99] hover:ring-accent-200 dark:hover:ring-stone-700">
                <Avatar user={f} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{displayName(f)}</p>
                  <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                    {f.reading.length
                      ? `Lendo ${f.reading.map((r) => {
                          const pct = readingPercent(r.currentPage, r.book.pageCount);
                          return pct === null ? r.book.title : `${r.book.title} (${pct}%)`;
                        }).join(", ")}`
                      : "Sem leitura no momento"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
