import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { transaction, type DB } from "../db.js";
import { isModerator } from "../moderators.js";
import {
  MODERATION_ACTIONS, REPORT_STATUSES,
  type AppEnv, type ModerationAction, type ModReport, type ReportStatus,
} from "../types.js";
import { ValidationError } from "../validate.js";

const NOT_FOUND = { error: "Não encontrado", code: "NOT_FOUND" };

function rowToModReport(r: any): ModReport {
  return {
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at,
    commentId: r.comment_id,
    commentBody: r.comment_body,
    reporter: r.reporter_id ? { id: r.reporter_id, name: r.reporter_name } : null,
    reported: { id: r.reported_user_id, name: r.reported_name, email: r.reported_email },
  };
}

function parseStatus(v: string | undefined): ReportStatus {
  const status = v ?? "open";
  if (!REPORT_STATUSES.includes(status as ReportStatus)) {
    throw new ValidationError(`status deve ser um de: ${REPORT_STATUSES.join(", ")}`, "REPORT_INVALID");
  }
  return status as ReportStatus;
}

function parseAction(v: unknown): ModerationAction {
  if (typeof v !== "string" || !MODERATION_ACTIONS.includes(v as ModerationAction)) {
    throw new ValidationError(`action deve ser um de: ${MODERATION_ACTIONS.join(", ")}`, "REPORT_INVALID");
  }
  return v as ModerationAction;
}

export function moderationRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: err.message, code: err.code }, 400);
    console.error(err);
    return c.json({ error: "Erro interno", code: "INTERNAL" }, 500);
  });

  // quem não modera não descobre que a rota existe
  app.use(
    "/api/mod/*",
    createMiddleware<AppEnv>(async (c, next) => {
      if (!isModerator(c.var.user)) return c.json(NOT_FOUND, 404);
      await next();
    }),
  );

  // denúncias de um status (padrão: abertas), mais antigas primeiro
  app.get("/api/mod/reports", (c) => {
    const status = parseStatus(c.req.query("status"));
    const rows = db
      .prepare(
        `SELECT r.id, r.reason, r.details, r.status, r.created_at, r.comment_id, r.comment_body,
                r.reporter_id, rp.name AS reporter_name,
                r.reported_user_id, ru.name AS reported_name, ru.email AS reported_email
         FROM content_reports r
         JOIN users ru ON ru.id = r.reported_user_id
         LEFT JOIN users rp ON rp.id = r.reporter_id
         WHERE r.status = ?
         ORDER BY r.created_at, r.rowid`,
      )
      .all(status) as any[];
    return c.json({ reports: rows.map(rowToModReport) });
  });

  // decide uma denúncia aberta; já resolvida devolve 200 sem mudar nada
  app.post("/api/mod/reports/:id/resolve", async (c) => {
    const input = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = parseAction(input.action);
    const report = db
      .prepare(
        `SELECT r.status, r.comment_id, r.reported_user_id, u.email AS reported_email
         FROM content_reports r JOIN users u ON u.id = r.reported_user_id WHERE r.id = ?`,
      )
      .get(c.req.param("id")) as { status: string; comment_id: string | null; reported_user_id: string; reported_email: string | null } | undefined;
    if (!report) return c.json(NOT_FOUND, 404);
    if (report.status !== "open") return c.json({ ok: true });
    if (action === "ban_user" && isModerator({ email: report.reported_email })) {
      throw new ValidationError("Moderador não pode ser banido", "REPORT_INVALID");
    }
    const id = c.req.param("id");
    transaction(db, () => {
      if (action === "dismiss") {
        db.prepare("UPDATE content_reports SET status = 'dismissed' WHERE id = ?").run(id);
        return;
      }
      if (action === "remove_comment") {
        // comment_body fica na denúncia; a chave estrangeira zera comment_id
        if (report.comment_id) db.prepare("DELETE FROM book_comments WHERE id = ?").run(report.comment_id);
      } else {
        const who = report.reported_user_id;
        db.prepare("UPDATE users SET banned_at = datetime('now') WHERE id = ? AND banned_at IS NULL").run(who);
        db.prepare("DELETE FROM friendships WHERE user_low = ?1 OR user_high = ?1").run(who);
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(who);
      }
      db.prepare("UPDATE content_reports SET status = 'actioned' WHERE id = ?").run(id);
    });
    return c.json({ ok: true });
  });

  return app;
}
