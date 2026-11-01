import { Hono } from "hono";
import type { DB } from "../db.js";
import type { AppEnv } from "../types.js";

export function statsRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  // resumo por ano de leitura + totais por status
  app.get("/api/stats", (c) => {
    const userId = c.var.user.id;
    const years = db
      .prepare(
        `SELECT ub.read_year AS year, COUNT(*) AS books, COALESCE(SUM(b.page_count), 0) AS pages,
                ROUND(AVG(ub.rating), 2) AS avgRating
         FROM user_books ub JOIN books b ON b.id = ub.book_id
         WHERE ub.user_id = ? AND ub.status = 'read' AND ub.read_year IS NOT NULL
         GROUP BY ub.read_year ORDER BY ub.read_year DESC`,
      )
      .all(userId) as { year: number; books: number; pages: number; avgRating: number | null }[];
    const byStatus = db
      .prepare(`SELECT status, COUNT(*) AS count FROM user_books WHERE user_id = ? GROUP BY status`)
      .all(userId) as { status: string; count: number }[];
    const counts = { want: 0, reading: 0, read: 0, abandoned: 0 } as Record<string, number>;
    for (const r of byStatus) counts[r.status] = r.count;
    return c.json({ years, counts });
  });

  return app;
}
