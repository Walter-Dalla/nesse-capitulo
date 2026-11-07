import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Avatar } from "../components/FriendBadge";
import { ErrorBox, Page, Spinner } from "../components/Layout";
import { toast } from "../components/Toast";
import { ApiError } from "../lib/api";
import { displayName } from "../lib/format";
import { useAcceptInvite, useInvite } from "../lib/hooks";
import { browserInviteStore, clearPendingInvite } from "../lib/pendingInvite";
import type { FriendUser } from "../lib/types";

const isInvalid = (e: unknown) => e instanceof ApiError && e.status === 404;
const isSelf = (e: unknown) => e instanceof ApiError && e.code === "INVITE_SELF";

/** Tela do link de convite: mostra quem convidou e só cria a amizade no toque em "Confirmar amizade". */
export function FriendInvitePage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const invite = useInvite(code);
  const accept = useAcceptInvite();
  const [accepted, setAccepted] = useState<FriendUser | null>(null);
  const [acceptError, setAcceptError] = useState<unknown>(null);

  // O convite guardado só serve para voltar do login; daqui em diante o código está na URL.
  // Limpar só ao confirmar faria "Agora não" voltar para cá em laço.
  useEffect(() => clearPendingInvite(browserInviteStore()), []);

  async function confirm() {
    try {
      const r = await accept.mutateAsync(code);
      setAccepted(r.friend);
    } catch (e) {
      if (isInvalid(e) || isSelf(e)) setAcceptError(e);
      else toast((e as Error).message, "error");
    }
  }

  let body: ReactNode;
  if (accepted) {
    // tem prioridade sobre a refetch de useInvite, que agora diria "já são amigos"
    body = <Done user={accepted} title={`Agora você e ${displayName(accepted)} são amigos`} />;
  } else if (isSelf(acceptError) || isSelf(invite.error)) {
    body = <Message title="Este convite é seu" hint="Envie o link para um amigo." />;
  } else if (isInvalid(acceptError) || isInvalid(invite.error)) {
    body = <Message title="Convite inválido ou já usado" hint="Cada link vale para uma pessoa. Peça um novo a quem convidou." />;
  } else if (invite.isPending) {
    body = <Spinner />;
  } else if (invite.isError) {
    body = <ErrorBox error={invite.error} retry={() => invite.refetch()} />;
  } else if (invite.data.alreadyFriends) {
    body = <Done user={invite.data.inviter} title={`Você e ${displayName(invite.data.inviter)} já são amigos`} />;
  } else {
    const { inviter } = invite.data;
    body = (
      <div className="fade-in flex flex-col items-center pt-6 text-center">
        <Avatar user={inviter} size="lg" />
        <h2 className="mt-4 text-xl font-bold leading-snug">{displayName(inviter)} convidou você para ser amigo</h2>
        <p className="mt-2 max-w-xs text-sm text-stone-600 dark:text-stone-300">
          Ao confirmar, vocês veem o que o outro está lendo, já leu e os comentários públicos. Nota, resenha e comentários privados continuam só seus.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button type="button" onClick={confirm} disabled={accept.isPending} className="btn-primary w-full">
            {accept.isPending ? "Confirmando…" : "Confirmar amizade"}
          </button>
          <button type="button" onClick={() => navigate("/", { replace: true })} disabled={accept.isPending} className="btn-secondary w-full">
            Agora não
          </button>
        </div>
      </div>
    );
  }

  return <Page title="Convite de amizade">{body}</Page>;
}

function Done({ user, title }: { user: FriendUser; title: string }) {
  return (
    <div className="fade-in flex flex-col items-center pt-6 text-center">
      <Avatar user={user} size="lg" />
      <h2 className="mt-4 text-xl font-bold leading-snug">{title}</h2>
      <Link to={`/amigos/${user.id}`} replace className="btn-primary mt-6 w-full">Ver o que {displayName(user)} lê</Link>
    </div>
  );
}

function Message({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="fade-in flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-stone-500 dark:text-stone-400">{hint}</p>
      <Link to="/" replace className="btn-secondary mt-4">Ir para a estante</Link>
    </div>
  );
}
