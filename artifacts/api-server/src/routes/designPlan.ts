import { Router } from "express";
import { db, applicationModelsTable, designPlansTable, projectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseProjectId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

async function assertProjectOwner(projectId: number, userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

function serializePlan(row: typeof designPlansTable.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    version: row.version,
    status: row.status,
    body: row.body ?? {},
    createdAt: row.createdAt.toISOString(),
    committedAt: row.committedAt ? row.committedAt.toISOString() : null,
  };
}

const DESIGN_PLAN_PROMPT = `You are generating a Design Plan for a software product. Read the Application Model below and produce a structured JSON design brief.

APPLICATION MODEL:
{APPLICATION_MODEL}

Generate a JSON object that defines HOW this product should be visually and interactively designed. Base everything on the project's identity, intent, experience intent, and creative principles.

Return ONLY this JSON structure, no explanation:

{
  "navigationPattern": "e.g. bottom-tab-bar | sidebar | top-nav | single-page-scroll | hamburger-menu",
  "responsiveIntent": {
    "mobile": "one specific sentence describing mobile layout approach",
    "tablet": "one specific sentence describing tablet layout approach",
    "desktop": "one specific sentence describing desktop layout approach"
  },
  "informationHierarchy": [
    "Most prominent information first",
    "Secondary information second",
    "etc."
  ],
  "componentPatterns": "e.g. card-grid | list-view | dashboard | feed | kanban | table",
  "motionPhilosophy": "e.g. minimal | purposeful | expressive | none",
  "cardDensity": "e.g. spacious | compact | dense",
  "typographyScale": "e.g. large | standard | compact",
  "emptyStates": "e.g. illustrated | instructional | minimal | none",
  "interactionPatterns": {
    "primaryAction": "name the main action a user takes",
    "secondaryAction": "name the secondary action",
    "editingStyle": "e.g. inline | modal | separate-page | sheet",
    "confirmationBehavior": "e.g. minimal | explicit | undo-based",
    "gestures": "e.g. swipe-to-delete | pull-to-refresh | none | swipe to complete",
    "scrollingBehavior": "e.g. paginated | infinite | fixed-viewport"
  }
}

Rules:
- All values must be specific to this product — no generic placeholders
- Derive from the experience intent (emotional register, visual language, interaction posture) when available
- If the model has insufficient information for a field, omit it
- informationHierarchy: 2-4 items maximum, each a specific statement about THIS product's content priority
- Respond with ONLY the JSON object`;

async function generateDesignPlanBody(projectId: number): Promise<Record<string, unknown>> {
  const rows = await db
    .select()
    .from(applicationModelsTable)
    .where(eq(applicationModelsTable.projectId, projectId))
    .limit(1);

  if (rows.length === 0) return {};
  const model = rows[0];

  const modelSummary = {
    identity: model.identity ?? {},
    intent: model.intent ?? {},
    creativePrinciples: model.creativePrinciples ?? [],
    experienceIntent: model.experienceIntent ?? {},
    pages: (model.pages as Array<{ name: string; route?: string }> ?? []).slice(0, 10).map((p) => ({ name: p.name, route: p.route })),
  };

  const prompt = DESIGN_PLAN_PROMPT.replace("{APPLICATION_MODEL}", JSON.stringify(modelSummary, null, 2));

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  if (!raw) return {};

  const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    logger.warn({ raw, projectId }, "designPlan generate: JSON parse failed");
    return {};
  }
}

// GET /api/projects/:id/design-plan
// Returns the latest design plan for this project (any status), or null if none exists.
router.get("/projects/:id/design-plan", async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const projectId = parseProjectId(req.params.id);
    if (!projectId) { res.status(400).json({ error: "Invalid project id" }); return; }
    const owns = await assertProjectOwner(projectId, userId);
    if (!owns) { res.status(403).json({ error: "Forbidden" }); return; }

    const rows = await db
      .select()
      .from(designPlansTable)
      .where(eq(designPlansTable.projectId, projectId))
      .orderBy(desc(designPlansTable.version))
      .limit(1);

    if (rows.length === 0) {
      res.json(null);
      return;
    }

    res.json(serializePlan(rows[0]));
  } catch (err) {
    req.log.error({ err }, "GET /projects/:id/design-plan failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects/:id/design-plan/generate
// Generates a new draft Design Plan from the current Application Model via AI.
router.post("/projects/:id/design-plan/generate", async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const projectId = parseProjectId(req.params.id);
    if (!projectId) { res.status(400).json({ error: "Invalid project id" }); return; }
    const owns = await assertProjectOwner(projectId, userId);
    if (!owns) { res.status(403).json({ error: "Forbidden" }); return; }

    // Determine next version number
    const existing = await db
      .select({ version: designPlansTable.version })
      .from(designPlansTable)
      .where(eq(designPlansTable.projectId, projectId))
      .orderBy(desc(designPlansTable.version))
      .limit(1);

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const body = await generateDesignPlanBody(projectId);

    const [plan] = await db
      .insert(designPlansTable)
      .values({
        projectId,
        version: nextVersion,
        status: "proposed",
        body,
      })
      .returning();

    req.log.info({ projectId, planId: plan.id, version: nextVersion }, "design plan generated");
    res.json(serializePlan(plan));
  } catch (err) {
    req.log.error({ err }, "POST /projects/:id/design-plan/generate failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/projects/:id/design-plan/:planId
// Updates the body of a draft or proposed Design Plan.
router.patch("/projects/:id/design-plan/:planId", async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const projectId = parseProjectId(req.params.id);
    const planId = parseInt(req.params.planId, 10);
    if (!projectId || isNaN(planId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const owns = await assertProjectOwner(projectId, userId);
    if (!owns) { res.status(403).json({ error: "Forbidden" }); return; }

    const existing = await db
      .select()
      .from(designPlansTable)
      .where(and(eq(designPlansTable.id, planId), eq(designPlansTable.projectId, projectId)))
      .limit(1);

    if (existing.length === 0) { res.status(404).json({ error: "Plan not found" }); return; }
    if (existing[0].status === "committed") {
      res.status(409).json({ error: "Cannot edit a committed plan — generate a new one" });
      return;
    }

    const { body } = req.body as { body?: Record<string, unknown> };
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "body is required" });
      return;
    }

    const merged = { ...(existing[0].body as Record<string, unknown>), ...body };

    const [updated] = await db
      .update(designPlansTable)
      .set({ body: merged })
      .where(eq(designPlansTable.id, planId))
      .returning();

    res.json(serializePlan(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /projects/:id/design-plan/:planId failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects/:id/design-plan/:planId/commit
// Commits a Design Plan — status becomes 'committed', committedAt is set.
router.post("/projects/:id/design-plan/:planId/commit", async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const projectId = parseProjectId(req.params.id);
    const planId = parseInt(req.params.planId, 10);
    if (!projectId || isNaN(planId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const owns = await assertProjectOwner(projectId, userId);
    if (!owns) { res.status(403).json({ error: "Forbidden" }); return; }

    const existing = await db
      .select()
      .from(designPlansTable)
      .where(and(eq(designPlansTable.id, planId), eq(designPlansTable.projectId, projectId)))
      .limit(1);

    if (existing.length === 0) { res.status(404).json({ error: "Plan not found" }); return; }
    if (existing[0].status === "committed") {
      res.json(serializePlan(existing[0]));
      return;
    }

    const [committed] = await db
      .update(designPlansTable)
      .set({ status: "committed", committedAt: new Date() })
      .where(eq(designPlansTable.id, planId))
      .returning();

    req.log.info({ projectId, planId, version: committed.version }, "design plan committed");
    res.json(serializePlan(committed));
  } catch (err) {
    req.log.error({ err }, "POST /projects/:id/design-plan/:planId/commit failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
