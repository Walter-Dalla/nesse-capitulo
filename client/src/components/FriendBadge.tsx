import { Fragment, useState } from "react";
import { Link } from "react-router";
import { displayName, friendsReadText } from "../lib/format";
import { useBookFriends } from "../lib/hooks";
import { t, tp } from "../lib/i18n";
import type { FriendUser } from "../lib/types";

const SIZES = { sm: "h-7 w-7 text-xs", md: "h-11 w-11 text-base", lg: "h-20 w-20 text-3xl" } as const;

/** Foto do usuário (sem enviar Referer ao Google); sem foto ou se falhar, a inicial do nome. */
export function Avatar({ user, size = "md", className = "" }: { user: Pick<FriendUser, "name" | "picture">; size?: keyof typeof SIZES; className?: string }) {
  const [failed, setFailed] = useState(false);
  const cls = `${SIZES[size]} shrink-0 rounded-full ${className}`;
  if (user.picture && !failed) {
    return <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`${cls} object-cover`} />;
  }
  return (
    <span aria-hidden className={`${cls} flex items-center justify-center bg-accent-500 font-bold text-stone-950`}>
      {displayName(user).slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Quais amigos já leram este livro da minha estante. Sem amigos, carregando ou com erro: nada. */
export function FriendBadge({ itemId }: { itemId: string }) {
  const query = useBookFriends(itemId, true);
  const friends = query.data?.friends ?? [];
  if (friends.length === 0) return null;

  const shown = friends.slice(0, 3);
  // os dois primeiros nomes viram links; o resto entra como "mais N"
  const named = friends.slice(0, friends.length <= 2 ? friends.length : 2);
  const text = friendsReadText(friends.map(displayName));
  const tail = friends.length > 2 ? t("social.badge.more", { count: friends.length - 2 }) : "";
  const suffix = tp("social.badge.suffix", friends.length);

  return (
    <section className="card fade-in mt-4 flex items-center gap-3 p-3" aria-label={text}>
      <div className="flex shrink-0 -space-x-2">
        {shown.map((f) => (
          <Link key={f.id} to={`/amigos/${f.id}`} aria-hidden tabIndex={-1}>
            <Avatar user={f} size="sm" className="ring-2 ring-white dark:ring-stone-900" />
          </Link>
        ))}
      </div>
      <p className="min-w-0 text-sm text-stone-700 dark:text-stone-200">
        {named.map((f, i) => (
          <Fragment key={f.id}>
            {i > 0 && (friends.length === 2 ? t("social.badge.and") : ", ")}
            <Link to={`/amigos/${f.id}`} className="font-semibold hover:underline">{displayName(f)}</Link>
          </Fragment>
        ))}
        {tail}
        {suffix}
      </p>
    </section>
  );
}
