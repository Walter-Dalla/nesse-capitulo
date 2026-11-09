import { useState } from "react";
import { Link } from "react-router";
import { Avatar } from "../components/FriendBadge";
import { IconPlus } from "../components/Icons";
import { Empty, ErrorBox, Page, Spinner } from "../components/Layout";
import { toast } from "../components/Toast";
import { displayName, readingPercent } from "../lib/format";
import { useCreateInvite, useFriends } from "../lib/hooks";
import { t } from "../lib/i18n";

/** Compartilha pelo menu do aparelho; senão copia. Devolve false quando nada funcionou. */
async function shareOrCopy(url: string): Promise<boolean> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: t("social.friends.shareTitle"), text: t("social.friends.shareText"), url });
      return true;
    } catch (e) {
      // cancelar o menu de compartilhar não é erro
      if ((e as Error).name === "AbortError") return true;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(t("social.friends.linkCopied"));
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
    <Page
      title={t("social.friends.title")}
      action={
        <button type="button" onClick={inviteFriend} disabled={create.isPending} className="btn-primary shrink-0 px-3">
          <IconPlus width={18} height={18} /> {create.isPending ? t("social.friends.inviting") : t("social.friends.invite")}
        </button>
      }
    >
      {manualUrl && (
        <section className="card fade-in mb-4 p-4">
          <label className="label" htmlFor="invite-url">{t("social.friends.copyLink")}</label>
          <input id="invite-url" className="input text-sm" readOnly value={manualUrl} onFocus={(e) => e.currentTarget.select()} />
        </section>
      )}

      {friends.isPending ? (
        <Spinner />
      ) : friends.isError ? (
        <ErrorBox error={friends.error} retry={() => friends.refetch()} />
      ) : friends.data.friends.length === 0 ? (
        <Empty
          title={t("social.friends.empty")}
          hint={t("social.friends.emptyHint")}
          action={<button type="button" onClick={inviteFriend} disabled={create.isPending} className="btn-primary mt-2">{create.isPending ? t("social.friends.generatingLink") : t("social.friends.inviteFriend")}</button>}
        />
      ) : (
        <ul className="space-y-3">
          {friends.data.friends.map((f) => (
            <li key={f.id}>
              <Link to={`/amigos/${f.id}`} className="card flex items-center gap-3 p-3 transition active:scale-[0.99] hover:ring-accent-200 dark:hover:ring-stone-700">
                <Avatar user={f} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{displayName(f)}</p>
                  <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                    {f.reading.length
                      ? t("social.friends.reading", {
                          titles: f.reading.map((r) => {
                            const pct = readingPercent(r.currentPage, r.book.pageCount);
                            return pct === null ? r.book.title : t("social.friends.bookProgress", { title: r.book.title, percent: pct });
                          }).join(", "),
                        })
                      : t("social.friends.notReading")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 px-2 pb-4 text-center text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        {t("social.friends.footer")}
      </p>
    </Page>
  );
}
