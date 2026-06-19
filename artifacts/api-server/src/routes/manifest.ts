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
    return parts.join("\n").slice(0, 1400);
  } catch {
    return memory.slice(0, 800);
  }
}

/**
 * Strip anything that would break a browser <script type="text/babel"> execution:
 * - import statements (hooks are pre-destructured by the renderer)
 * - export statements
 * - markdown fences
 */
function sanitizeForBrowser(code: string): string {
  return code
    .replace(/^```[a-z]*\n?/gm, "")
    .replace(/^```$/gm, "")
    .replace(/^import\s+.*?(?:from\s+['"][^'"]+['"])?;?\s*$/gm, "")
    .replace(/^export\s+default\s+\w+;?\s*$/gm, "")
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, "")
    .replace(/^export\s+/gm, "")
    .trim();
}

// POST /api/manifest/decide
router.post("/manifest/decide", async (req, res): Promise<void> => {
  const userId = (req as any).authUser.id as number;
  const { projectId } = req.body as { projectId: unknown; sessionId?: unknown };

  const numericId = typeof projectId === "number" ? projectId : parseInt(String(projectId), 10);
  if (!Number.isFinite(numericId)) {
    res.status(400).json({ error: "Missing or invalid projectId" });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id, name: projectsTable.name, description: projectsTable.description, memory: projectsTable.memory, status: projectsTable.status })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, numericId), eq(projectsTable.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const committedEntries = await db
    .select({ id: entriesTable.id, title: entriesTable.title, summary: entriesTable.summary })
    .from(entriesTable)
    .where(and(eq(entriesTable.projectId, numericId), eq(entriesTable.status, "committed")))
    .limit(20);

  const memorySummary = parseMemorySummary(project.memory);
  const hasMemory = memorySummary.length > 80;
  const hasDecisions = committedEntries.length > 0;
  const hasDescription = (project.description ?? "").length > 20;

  if (!hasMemory && !hasDecisions && !hasDescription) {
    res.json({
      ready: false,
      missingCriteria: [
        "No project context yet — run Deep Import in the Files tab or have a conversation with Atlas first",
        "Commit at least one decision in the LEDGER so Atlas knows what to build",
      ],
    });
    return;
  }

  const decisionLines = committedEntries
    .map((e) => `• ${e.title}${e.summary ? ` — ${e.summary.slice(0, 120)}` : ""}`)
    .join("\n");

  const contextBlock = [
    `Project: ${project.name}`,
    project.description ? `Description: ${project.description}` : "",
    hasDecisions ? `\nKey decisions:\n${decisionLines}` : "",
    hasMemory ? `\nProject context:\n${memorySummary}` : "",
  ].filter(Boolean).join("\n");

  let generatedCode = "";
  let componentName = "ManifestPreview";
  let artifactName = `${project.name} — First Artifact`;
  let artifactDescription = "Core product experience, generated from project context.";
  let artifactSteps = ["Atlas analyzed your project", "Identified the core interaction", "Generated the component"];

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 5000,
      messages: [
        {
          role: "user",
          content: `You are generating a "First Artifact" — a high-quality React component that demonstrates the core experience of a product.

${contextBlock}

---

CRITICAL EXECUTION ENVIRONMENT RULES (violating these = blank white screen):
1. NO import statements whatsoever. React hooks are already available: useState, useEffect, useRef, useCallback, useMemo
2. NO export statements whatsoever. Do not write "export default" anywhere.
3. NO external libraries. No icons, no charts, no UI kits. Pure inline-style JSX only.
4. The component MUST be a plain const arrow function: const ComponentName = () => { ... }
5. The component name must be PascalCase and match what you write in the metadata

Design requirements:
- Dark theme: body bg #0C0A09, card bg #1A1714, text #E7E5E4, gold accents #C9A24C, muted #71717A
- Borders: 1px solid rgba(255,255,255,0.08) for cards, rgba(201,162,76,0.25) for highlighted
- Production-quality design — not a wireframe. Real content, real data, real interactions.
- Use realistic sample data that fits the product domain perfectly
- Include hover effects using useState for a polished feel
- The component should be the most impressive possible representation of this product's core value

Respond with EXACTLY this format — no markdown, no explanation, no fences:

METADATA
name: <artifact name>
description: <one sentence>
steps: <step 1> | <step 2> | <step 3>
END_METADATA

COMPONENT
const ComponentName = () => {
  const [someState, setSomeState] = useState(null);
  
  return (
    <div style={{ ... }}>
      ...
    </div>
  );
};
END_COMPONENT`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse metadata block
    const metaMatch = raw.match(/METADATA\n([\s\S]*?)\nEND_METADATA/);
    if (metaMatch) {
      const meta = metaMatch[1];
      const nameM = meta.match(/^name:\s*(.+)$/m);
      const descM = meta.match(/^description:\s*(.+)$/m);
      const stepsM = meta.match(/^steps:\s*(.+)$/m);
      if (nameM) artifactName = nameM[1].trim();
      if (descM) artifactDescription = descM[1].trim();
      if (stepsM) artifactSteps = stepsM[1].split("|").map((s) => s.trim()).filter(Boolean);
    }

    // Parse component block
    const compMatch = raw.match(/COMPONENT\n([\s\S]*?)\nEND_COMPONENT/);
    let rawCode = "";
    if (compMatch) {
      rawCode = compMatch[1].trim();
    } else {
      // Fallback: strip metadata, take everything left
      rawCode = raw
        .replace(/METADATA[\s\S]*?END_METADATA\n?/g, "")
        .replace(/COMPONENT\n?/g, "")
        .replace(/END_COMPONENT\n?/g, "")
        .trim();
    }

    // Extract component name
    const nameMatch = rawCode.match(/^const\s+([A-Z][A-Za-z0-9]+)\s*=/m);
    if (nameMatch) componentName = nameMatch[1];

    // Sanitize — remove any import/export that would crash the browser script
    generatedCode = sanitizeForBrowser(rawCode);

    if (!generatedCode || generatedCode.length < 50) {
      throw new Error("Generated component was empty after parsing");
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Generation failed: ${msg}` });
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
      engineReason: "Project context fully analyzed — Atlas generated this component.",
      complexity: "medium" as const,
      deploymentRequired: false,
    },
    generatedCode,
    componentName,
  });
});

export default router;
