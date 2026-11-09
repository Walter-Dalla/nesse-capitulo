import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { DB } from "../db.js";
import { REPORT_REASONS, type AppEnv, type ReportReason } from "../types.js";
import { ValidationError, optStr } from "../validate.js";
import { areFriends } from "./friends.js";

export const REPORT_DETAILS_MAX = 500;
const NOT_FOUND = { error: "Não encontrado", code: "NOT_FOUND" };

/** Id opcional do corpo: ausente/vazio = null; outro tipo = VALIDATION. */
function optId(v: unknown, field: string): string | null {
  return optStr(v, field, 200);
}

function parseReason(v: unknown): ReportReason {
  if (typeof v !== "string" || !REPORT_REASONS.includes(v as ReportReason)) {
    throw new ValidationError(`reason deve ser um de: ${REPORT_REASONS.join(", ")}`, "REPORT_INVALID");
  }
  return v as ReportReason;
}

export function reportsRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: err.message, code: err.code }, 400);
    console.error(err);
    return c.json({ error: "Erro interno", code: "INTERNAL" }, 500);
  });

  // denuncia um comentário público de um amigo ou um amigo; só quem denunciou deixa de ver o comentário
  app.post("/api/reports", async (c) => {
    const me = c.var.user.id;
    const input = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const commentId = optId(input.commentId, "commentId");
    const userId = optId(input.userId, "userId");
    if ((commentId === null) === (userId === null)) throw new ValidationError("Informe commentId ou userId (um dos dois)");
    const reason = parseReason(input.reason);
    const details = optStr(input.details, "details", REPORT_DETAILS_MAX);

    let reported: string;
    let body: string | null = null;
    if (commentId !== null) {
      const row = db.prepare("SELECT user_id, body, visibility FROM book_comments WHERE id = ?").get(commentId) as
        | { user_id: string; body: string; visibility: string }
        | undefined;
      // privado, de quem não é amigo ou meu: 404, igual a inexistente
      if (!row || row.visibility !== "public" || !areFriends(db, me, row.user_id)) return c.json(NOT_FOUND, 404);
      reported = row.user_id;
      body = row.body;
    } else {
      if (!areFriends(db, me, userId!)) return c.json(NOT_FOUND, 404);
      reported = userId!;
    }

    // mesma pessoa, mesmo alvo ainda aberto: não duplica
    const open = commentId !== null
      ? db.prepare("SELECT 1 FROM content_reports WHERE reporter_id = ? AND comment_id = ? AND status = 'open'").get(me, commentId)
      : // comment_body nulo separa a denúncia de usuário da de um comentário que o autor já apagou
        db.prepare(
          "SELECT 1 FROM content_reports WHERE reporter_id = ? AND reported_user_id = ? AND comment_id IS NULL AND comment_body IS NULL AND status = 'open'",
        ).get(me, reported);
    if (open) return c.json({ ok: true });

    db.prepare(
      `INSERT INTO content_reports (id, reporter_id, reported_user_id, comment_id, comment_body, reason, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), me, reported, commentId, body, reason, details);
    return c.json({ ok: true }, 201);
  });

  return app;
}
