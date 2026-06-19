import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db, projectsTable, entriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseMemorySummary(memory: string | null | undefined): string {
  if (!memory) return "";
  try {
    const m = JSON.parse(memory) as Record<string, unknown>;
    const parts: string[] = [];
    if (m?.summary && typeof m.summary === "string") parts.push(m.summary);
    if (m?.identity) parts.push(`Identity: ${JSON.stringify(m.identity).slice(0, 300)}`);
    if (m?.tiers && typeof m.tiers === "object") {
      const allTiers = Object.values(m.tiers as Record<string, unknown[]>).flat() as Array<{ content?: string; text?: string }>;
      const texts = allTiers.map((t) => t?.content ?? t?.text ?? "").filter(Boolean).slice(0, 6);
      parts.push(...texts);
    }
    return parts.join("\n").slice(0, 1200);
  } catch {
    return memory.slice(0, 800);
  }
}

// POST /api/manifest/decide — assess readiness and generate first artifact component
router.post("/manifest/decide", async (req, res): Promise<void> => {
  const userId = (req as any).authUser.id as number;
  const { projectId } = req.body as { projectId: unknown; sessionId?: unknown };

  const numericId = typeof projectId === "number" ? projectId : parseInt(String(projectId), 10);
  if (!Number.isFinite(numericId)) {
    res.status(400).json({ error: "Missing or invalid projectId" });
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
    .where(and(eq(projectsTable.id, numericId), eq(projectsTable.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Load committed decisions
  const committedEntries = await db
    .select({ id: entriesTable.id, title: entriesTable.title, summary: entriesTable.summary })
    .from(entriesTable)
    .where(and(eq(entriesTable.projectId, numericId), eq(entriesTable.status, "committed")))
    .limit(20);

  // Assess readiness
  const memorySummary = parseMemorySummary(project.memory);
  const hasMemory = memorySummary.length > 80;
  const hasDecisions = committedEntries.length > 0;
  const hasDescription = (project.description ?? "").length > 20;

  if (!hasMemory && !hasDecisions && !hasDescription) {
    res.json({
      ready: false,
      missingCriteria: [
        "No project context found — run Deep Import in the Files tab or have a conversation with Atlas first",
        "Commit at least one architectural decision in the LEDGER tab so Atlas knows what to build",
      ],
    });
    return;
  }

  // Build context block for AI
  const decisionLines = committedEntries
    .map((e) => `• ${e.title}${e.summary ? ` — ${e.summary.slice(0, 120)}` : ""}`)
    .join("\n");

  const contextBlock = [
    `Project: ${project.name}`,
    project.description ? `Description: ${project.description}` : "",
    hasDecisions ? `\nCommitted decisions:\n${decisionLines}` : "",
    hasMemory ? `\nProject memory / architecture:\n${memorySummary}` : "",
  ].filter(Boolean).join("\n");

  // Generate the component with Claude
  let generatedCode = "";
  let componentName = "ManifestPreview";
  let artifactName = `${project.name} — First Artifact`;
  let artifactDescription = "The core interaction of this product, generated from project context.";
  let artifactSteps = ["Atlas analyzed your project context", "Determined the core user interaction", "Generated a production-quality React component"];

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are generating a "First Artifact" — a polished React component that visually demonstrates the core concept of a product.

${contextBlock}

Your job:
1. Pick the most important screen or interaction of this product (the "aha moment")
2. Generate a self-contained React component for it
3. Also output a JSON metadata block

Rules for the component:
- Uses inline styles ONLY — no CSS imports, no Tailwind, no external dependencies except React
- Dark theme: background #0C0A09, text #E7E5E4, amber/gold accents #C9A24C
- Production-quality — real content, real layout, real UX — NOT a wireframe
- Realistic sample data matching the product domain
- Interactive where appropriate (hover states, simple toggles using useState)
- No TypeScript — plain JavaScript JSX only
- No import statements (React is globally available)
- No external libraries (no Recharts, no Lucide, nothing external)

Output format — respond with EXACTLY this structure, nothing else:

METADATA_START
name: <concise artifact name, e.g. "IntoIQ Feed Dashboard">
description: <one sentence describing what this demonstrates>
steps: <step 1> | <step 2> | <step 3>
METADATA_END

COMPONENT_START
const ComponentName = () => {
  // your component code here
};
export default ComponentName;
COMPONENT_END`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse metadata
    const metaMatch = raw.match(/METADATA_START\n([\s\S]*?)\nMETADATA_END/);
    if (metaMatch) {
      const meta = metaMatch[1];
      const nameM = meta.match(/^name:\s*(.+)$/m);
      const descM = meta.match(/^description:\s*(.+)$/m);
      const stepsM = meta.match(/^steps:\s*(.+)$/m);
      if (nameM) artifactName = nameM[1].trim();
      if (descM) artifactDescription = descM[1].trim();
      if (stepsM) artifactSteps = stepsM[1].split("|").map((s) => s.trim()).filter(Boolean);
    }

    // Parse component
    const compMatch = raw.match(/COMPONENT_START\n([\s\S]*?)\nCOMPONENT_END/);
    if (compMatch) {
      generatedCode = compMatch[1].trim();
      const nameMatch = generatedCode.match(/^const\s+([A-Z][A-Za-z0-9]+)\s*=/m);
      if (nameMatch) componentName = nameMatch[1];
    } else {
      // Fallback: just use the raw response
      generatedCode = raw.replace(/METADATA_START[\s\S]*?METADATA_END\n?/g, "").trim();
      const nameMatch = generatedCode.match(/^const\s+([A-Z][A-Za-z0-9]+)\s*=/m);
      if (nameMatch) componentName = nameMatch[1];
      if (!generatedCode.includes("export default")) {
        generatedCode += `\n\nexport default ${componentName};`;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `AI generation failed: ${msg}` });
    return;
  }

  res.json({
    ready: true,
    decision: {
      firstArtifact: {
        name: artifactName,
        description: artifactDescription,
        steps: artifactSteps,
      },
      activeEngine: "atlas-generated",
      suggestedEngine: "atlas-generated",
      engineReason: "Project context analyzed — Atlas-generated component selected for V1.",
      complexity: "medium" as const,
      deploymentRequired: false,
    },
    generatedCode,
    componentName,
  });
});

export default router;
