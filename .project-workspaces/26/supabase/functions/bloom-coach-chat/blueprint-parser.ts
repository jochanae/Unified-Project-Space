// Extracts :::card fenced JSON blocks from Quinn's responses and persists them
// as quinn_blueprint_cards. Tolerates malformed JSON gracefully.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_CARD_TYPES = new Set([
  "blueprint_proposal",
  "strategy_comparison",
  "tax_alert",
  "risk_assessment",
  "insight",
]);

const ALLOWED_MODES = new Set(["focus", "brainstorm", "planner", "audit", "strategic"]);

interface ProjectContext {
  id: string;
  title: string;
}

interface ParsedCard {
  card_type: string;
  title: string;
  callout?: string;
  sections?: unknown;
}

// Match :::card ... ::: with permissive whitespace
const CARD_BLOCK_RE = /:::card\s*([\s\S]*?):::/g;

export function extractCardBlocks(content: string): ParsedCard[] {
  const cards: ParsedCard[] = [];
  if (!content || typeof content !== "string") return cards;

  let match: RegExpExecArray | null;
  while ((match = CARD_BLOCK_RE.exec(content)) !== null) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.card_type === "string" &&
        typeof parsed.title === "string" &&
        ALLOWED_CARD_TYPES.has(parsed.card_type)
      ) {
        cards.push(parsed as ParsedCard);
      } else {
        console.warn("Card block missing required fields or invalid card_type");
      }
    } catch (err) {
      console.warn("Failed to parse :::card block:", err instanceof Error ? err.message : err);
    }
  }
  return cards;
}

export async function persistBlueprintCards(
  supabase: SupabaseClient,
  userId: string,
  content: string,
  projectContext: ProjectContext | null,
  mode: string | null,
): Promise<void> {
  const cards = extractCardBlocks(content);
  if (cards.length === 0) return;

  const safeMode = mode && ALLOWED_MODES.has(mode) ? mode : null;

  const rows = cards.map((c) => ({
    user_id: userId,
    project_id: projectContext?.id ?? null,
    card_type: c.card_type,
    title: c.title.slice(0, 200),
    callout: typeof c.callout === "string" ? c.callout.slice(0, 500) : null,
    sections: Array.isArray(c.sections) ? c.sections : [],
    mode_lens: safeMode,
  }));

  const { error } = await supabase.from("quinn_blueprint_cards").insert(rows);
  if (error) {
    console.error("Insert blueprint cards failed:", error.message);
  } else {
    console.log(`Persisted ${rows.length} blueprint card(s) for user ${userId}`);
  }
}
