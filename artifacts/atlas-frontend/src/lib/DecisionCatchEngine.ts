export type CommitCardPayload = {
  v: 1;
  title: string;
  summary: string;
  severity: "blocker" | "decision";
  verb: "commit";
};

// These trigger words indicate Atlas is proposing something new.
// Keep them specific to forward-looking decision language.
const DECISION_TRIGGERS = [
  "decided",
  "going with",
  "the approach is",
  "locked in",
  "the fix is",
  "the pattern is",
  "the decision is",
  "i'd go with",
  "we're going with",
  "we'll use",
  "we've decided",
  "let's use",
  "let's go with",
  "we'll go with",
];

// If any of these appear, Atlas is summarizing existing context —
// not proposing a new decision. Suppress the card.
const SUMMARY_SUPPRESSORS = [
  "from what i can see",
  "from what i've seen",
  "from what i can tell",
  "looking at the project",
  "looking at your project",
  "the committed decisions",
  "committed decisions show",
  "what i can see",
  "as i understand",
  "here's a summary",
  "to summarize",
  "in summary",
  "reviewing your",
  "i've reviewed",
  "i've scanned",
  "based on the project",
  "based on what i",
  "here's what i found",
  "here's where we are",
  "here's what i know",
  "i can see that",
  "what we have so far",
  "the project shows",
  "the architecture shows",
  "based on the codebase",
  "as far as i can tell",
  "looking at what",
  "from the codebase",
];

const BLOCKER_TRIGGERS = ["block", "must", "critical"];

const CODE_BLOCK_RE = /```[\s\S]{200,}?```/;

function isCodeHeavy(message: string): boolean {
  if (message.includes("FILE_EDIT_START")) return true;
  if (message.includes("ARTIFACT:")) return true;
  if (message.includes("LINE_PATCH_START")) return true;
  const codeBlocks: string[] = message.match(/```[\s\S]*?```/g) ?? [];
  const codeChars = codeBlocks.reduce((sum, b) => sum + b.length, 0);
  if (codeChars > message.length * 0.35) return true;
  if (CODE_BLOCK_RE.test(message)) return true;
  return false;
}

function sentenceSplit(message: string): string[] {
  return message
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function detectDecisionMoment(message: string): CommitCardPayload | null {
  const clean = message.trim();
  if (clean.length <= 150) return null;

  if (isCodeHeavy(clean)) return null;

  const lower = clean.toLowerCase();

  // Summaries and recaps should never show a commit card —
  // Atlas is reporting what it found, not proposing something new.
  if (SUMMARY_SUPPRESSORS.some((s) => lower.includes(s))) return null;

  if (!DECISION_TRIGGERS.some((trigger) => lower.includes(trigger))) return null;

  const sentences = sentenceSplit(clean);
  const title = truncate(sentences[0] ?? clean, 80);
  const summarySource = sentences[1] ?? clean;
  const summary = truncate(summarySource, 200);
  const severity = BLOCKER_TRIGGERS.some((trigger) => lower.includes(trigger))
    ? "blocker"
    : "decision";

  return {
    v: 1,
    title,
    summary,
    severity,
    verb: "commit",
  };
}
