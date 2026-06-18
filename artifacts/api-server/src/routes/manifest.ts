import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db, projectsTable, entriesTable, sessionsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseMemorySummary(memory: unknown): string {
  if (!memory) return "";
  try {
    const m = typeof memory === "string" ? JSON.parse(memory) : memory;
    const parts: string[] = [];
    if (m?.identity) parts.push(`Identity: ${JSON.stringify(m.identity).slice(0, 300)}`);
    if (m?.tiers) {
      const allTiers: { content?: string; text?: string }[] = Object.values(m.tiers).flat() as { content?: string; text?: string }[];
      const texts = allTiers.map((t) => t?.content ?? t?.text ?? "").filter(Boolean).slice(0, 6);
      parts.push(...texts);
    }
    if (m?.summary) parts.push(m.summary);
    return parts.join("\n").slice(0, 1200);
  } catch {
    return typeof memory === "string" ? memory.slice(0, 800) : "";
  }
}

// POST /api/manifest/decide — check readiness and generate the first artifact component
router.post("/manifest/decide", async (req, res): Promise<void> => {
  const userId = (req as any).authUser.id as number;
  const { projectId, sessionId: _sessionId } = req.body as { projectId: number; sessionId?: string };

  if (!projectId || !Number.isFinite(projectId)) {
    res.status(400).json({ error: "Missing projectId" });
    return;
  }

  // Load project
  const [project] = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      description: projectsTable.description,
      memory: projectsTable.memory,
      status: projectsTable.status,
    })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Load committed decisions
  const committedEntries = await db
    .select({ id: entriesTable.id, title: entriesTable.title, summary: entriesTable.summary })
    .from(entriesTable)
    .where(and(eq(entriesTable.projectId, projectId), eq(entriesTable.status, "committed")))
    .limit(20);

  // Assess readiness
  const memorySummary = parseMemorySummary(project.memory);
  const hasMemory = memorySummary.length > 80;
  const hasDecisions = committedEntries.length > 0;
  const hasDescription = (project.description ?? "").length > 20;

  const missingCriteria: string[] = [];
  if (!hasMemory && !hasDecisions && !hasDescription) {
    missingCriteria.push("No project context found — run Deep Import in the Files tab or have a conversation with Atlas first");
  }
  if (!hasMemory && !hasDecisions) {
    missingCriteria.push("Commit at least one architectural decision in the LEDGER tab so Atlas knows what to build");
  }

  if (missingCriteria.length > 0) {
    res.json({ ready: false, missingCriteria });
    return;
  }

  // Build context for generation
  const decisionLines = committedEntries
    .map((e) => `• ${e.title}${e.summary ? ` — ${e.summary.slice(0, 120)}` : ""}`)
    .join("\n");

  const contextBlock = [
    `Project: ${project.name}`,
    project.description ? `Description: ${project.description}` : "",
    hasDecisions ? `\nCommitted decisions:\n${decisionLines}` : "",
    hasMemory ? `\nProject memory / architecture:\n${memorySummary}` : "",
  ].filter(Boolean).join("\n");

  // Generate a React component using Claude
  let generatedCode = "";
  let componentName = "ManifestPreview";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are generating a "First Artifact" — a polished React component that visually demonstrates the core concept of a product, based on everything known about it so far.

${contextBlock}

Generate a single self-contained React component that:
1. Shows the most important screen or interaction of this product (the "aha moment")
2. Uses inline styles only — no CSS imports, no Tailwind, no external dependencies except React
3. Uses a dark theme (#0C0A09 background, #E7E5E4 text, amber/gold accents #C9A24C)
4. Is production-quality — real content, real layout, real UX — not a wireframe or placeholder
5. Contains realistic sample data that matches the product's domain
6. Is interactive where it makes sense (hover states, simple toggles)

Rules:
- Export the component as default export
- Component name must be PascalCase and descriptive (e.g., "IntoIQFeed", "AxiomDashboard")
- No TypeScript — plain JavaScript JSX only
- No import statements (React is available globally as React)
- No external libraries (no Recharts, no Lucide, nothing)
- Inline styles on every element

Respond with ONLY the component code — no explanation, no markdown fences, no imports.
Start directly with: const ComponentName = () => {`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract component name from first line
    const nameMatch = raw.match(/^const\s+([A-Z][A-Za-z0-9]+)\s*=/m);
    if (nameMatch) componentName = nameMatch[1];

    // Wrap as a proper module export
    generatedCode = `const ${raw.includes("const " + componentName) ? "" : componentName + " = () => {\n"}${raw}

export default ${componentName};`;

    // Clean up double-declaration if the model included the const
    if (raw.startsWith("const ")) {
      generatedCode = `${raw}

export default ${componentName};`;
    }
  } catch (err) {
    res.status(500).json({ error: "AI generation failed — check ANTHROPIC_API_KEY" });
    return;
  }

  res.json({
    ready: true,
    decision: { activeEngine: "atlas-generated" },
    generatedCode,
    componentName,
  });
});

export default router;
