import { Router, type IRouter, type Request, type Response } from "express";
import { or, ilike, eq, and, desc, sql } from "drizzle-orm";
import { db, entriesTable, sessionsTable, nexusMessagesTable, thoughtsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /api/search?q=<text>&projectId=<n>
// Full-text ILIKE search across ledger entries, sessions, nexus (user msgs), and parking lot.
// projectId scopes entries/sessions/nexus; thoughts are scoped by userId (parking lot is user-level).
router.get("/search", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).authUser?.id as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const q = (req.query.q as string | undefined)?.trim() ?? "";
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;

  if (!q || q.length < 2) { res.json([]); return; }

  const pattern = `%${q}%`;
  const LIMIT = 8;

  try {
    const [entries, sessions, nexus, thoughts] = await Promise.all([
      // ── Ledger entries ─────────────────────────────────────────────────────
      projectId
        ? db
            .select({
              id: entriesTable.id,
              title: entriesTable.title,
              snippet: sql<string>`coalesce(${entriesTable.summary}, '')`.as("snippet"),
              projectId: entriesTable.projectId,
              sessionId: entriesTable.sessionId,
              createdAt: entriesTable.createdAt,
            })
            .from(entriesTable)
            .where(
              and(
                eq(entriesTable.projectId, projectId),
                or(
                  ilike(entriesTable.title, pattern),
                  ilike(sql`coalesce(${entriesTable.summary}, '')`, pattern),
                  ilike(sql`coalesce(${entriesTable.details}, '')`, pattern),
                )
              )
            )
            .orderBy(desc(entriesTable.createdAt))
            .limit(LIMIT)
        : Promise.resolve([]),

      // ── Sessions ────────────────────────────────────────────────────────────
      projectId
        ? db
            .select({
              id: sessionsTable.id,
              title: sessionsTable.title,
              snippet: sql<string>`coalesce(${sessionsTable.buildIntent}, ${sessionsTable.title}, '')`.as("snippet"),
              projectId: sessionsTable.projectId,
              sessionId: sql<null>`null`.as("sessionId"),
              createdAt: sessionsTable.createdAt,
            })
            .from(sessionsTable)
            .where(
              and(
                eq(sessionsTable.projectId, projectId),
                or(
                  ilike(sessionsTable.title, pattern),
                  ilike(sql`coalesce(${sessionsTable.buildIntent}, '')`, pattern),
                )
              )
            )
            .orderBy(desc(sessionsTable.createdAt))
            .limit(LIMIT)
        : Promise.resolve([]),

      // ── Nexus conversation (user messages only) ─────────────────────────────
      projectId
        ? db
            .select({
              id: nexusMessagesTable.id,
              title: sql<string>`substr(${nexusMessagesTable.content}, 1, 80)`.as("title"),
              snippet: sql<string>`substr(${nexusMessagesTable.content}, 1, 180)`.as("snippet"),
              projectId: nexusMessagesTable.projectId,
              sessionId: nexusMessagesTable.sessionId,
              createdAt: nexusMessagesTable.createdAt,
            })
            .from(nexusMessagesTable)
            .where(
              and(
                eq(nexusMessagesTable.projectId, projectId),
                eq(nexusMessagesTable.role, "user"),
                ilike(nexusMessagesTable.content, pattern)
              )
            )
            .orderBy(desc(nexusMessagesTable.createdAt))
            .limit(LIMIT)
        : Promise.resolve([]),

      // ── Parking lot (thoughts — user-level, not per-project) ───────────────
      db
        .select({
          id: thoughtsTable.id,
          title: sql<string>`substr(${thoughtsTable.content}, 1, 80)`.as("title"),
          snippet: sql<string>`substr(${thoughtsTable.content}, 1, 180)`.as("snippet"),
          projectId: sql<null>`null`.as("projectId"),
          sessionId: sql<null>`null`.as("sessionId"),
          createdAt: thoughtsTable.createdAt,
        })
        .from(thoughtsTable)
        .where(
          and(
            eq(thoughtsTable.userId, userId),
            ilike(thoughtsTable.content, pattern)
          )
        )
        .orderBy(desc(thoughtsTable.createdAt))
        .limit(LIMIT),
    ]);

    const results = [
      ...entries.map((r) => ({ source: "entry" as const, ...r, createdAt: r.createdAt.toISOString() })),
      ...sessions.map((r) => ({ source: "session" as const, ...r, createdAt: r.createdAt.toISOString() })),
      ...nexus.map((r) => ({ source: "nexus" as const, ...r, createdAt: r.createdAt.toISOString() })),
      ...thoughts.map((r) => ({ source: "thought" as const, ...r, createdAt: r.createdAt.toISOString() })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(results);
  } catch (err) {
    req.log?.error({ err }, "search error");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
