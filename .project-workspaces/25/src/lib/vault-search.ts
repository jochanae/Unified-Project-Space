/**
 * Search + saved-view helpers for /vault collections.
 *
 * Operators:
 *   color:gold              → accent color matches (case-insensitive)
 *   archived:true|false     → only archived/active (default: active)
 *   has:thought|description → require master_thought / description present
 *   "exact phrase"          → must appear in title / thought / description
 *   plain words             → ANDed substring matches across title/thought/desc
 */

export type VaultSortKey = "recent" | "oldest" | "alpha" | "manual";

export type SearchableCollection = {
  title: string;
  master_thought: string | null;
  description: string | null;
  color: string;
  archived: boolean;
  updated_at: string;
  created_at: string;
};

export type ParsedVaultQuery = {
  colors: string[];
  archived: "true" | "false" | null;
  requires: string[]; // 'thought' | 'description'
  phrases: string[];
  terms: string[];
};

const HAS_KEYWORDS = new Set(["thought", "description"]);

export function parseVaultQuery(input: string): ParsedVaultQuery {
  const out: ParsedVaultQuery = {
    colors: [],
    archived: null,
    requires: [],
    phrases: [],
    terms: [],
  };
  if (!input.trim()) return out;
  const phraseRe = /"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(input)) !== null) out.phrases.push(m[1].trim().toLowerCase());
  const rest = input.replace(phraseRe, " ");
  for (const tokenRaw of rest.split(/\s+/)) {
    const token = tokenRaw.trim();
    if (!token) continue;
    const colon = token.indexOf(":");
    if (colon > 0) {
      const key = token.slice(0, colon).toLowerCase();
      const val = token.slice(colon + 1).toLowerCase();
      if (!val) continue;
      if (key === "color") {
        out.colors.push(val);
        continue;
      }
      if (key === "archived" && (val === "true" || val === "false")) {
        out.archived = val;
        continue;
      }
      if (key === "has" && HAS_KEYWORDS.has(val)) {
        out.requires.push(val);
        continue;
      }
    }
    out.terms.push(token.toLowerCase());
  }
  return out;
}

export function matchesVaultQuery(c: SearchableCollection, q: ParsedVaultQuery): boolean {
  const title = c.title.toLowerCase();
  const thought = (c.master_thought ?? "").toLowerCase();
  const desc = (c.description ?? "").toLowerCase();
  const color = c.color.toLowerCase();

  if (q.colors.length && !q.colors.includes(color)) return false;
  if (q.archived === "true" && !c.archived) return false;
  if (q.archived === "false" && c.archived) return false;
  for (const r of q.requires) {
    if (r === "thought" && !thought) return false;
    if (r === "description" && !desc) return false;
  }
  for (const p of q.phrases) {
    if (!title.includes(p) && !thought.includes(p) && !desc.includes(p)) return false;
  }
  for (const t of q.terms) {
    if (!title.includes(t) && !thought.includes(t) && !desc.includes(t)) return false;
  }
  return true;
}

export function sortVaultCollections<
  T extends SearchableCollection & { id: string; position: number },
>(items: T[], key: VaultSortKey, manualOrder?: string[]): T[] {
  const out = [...items];
  switch (key) {
    case "oldest":
      return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case "alpha":
      return out.sort((a, b) => a.title.localeCompare(b.title));
    case "recent":
      return out.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    case "manual":
    default: {
      if (manualOrder && manualOrder.length) {
        const idx = new Map(manualOrder.map((id, i) => [id, i]));
        return out.sort((a, b) => (idx.get(a.id) ?? 9999) - (idx.get(b.id) ?? 9999));
      }
      return out.sort((a, b) => a.position - b.position);
    }
  }
}

/* Saved views */

export type VaultSavedView = {
  id: string;
  name: string;
  query: string;
  colorFilter: string | null;
  sort: VaultSortKey;
};

const VIEWS_KEY = "sanctumiq:vault:saved-views";

export function loadVaultSavedViews(): VaultSavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v.id === "string") : [];
  } catch {
    return [];
  }
}

export function saveVaultSavedViews(views: VaultSavedView[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    /* ignore */
  }
}
