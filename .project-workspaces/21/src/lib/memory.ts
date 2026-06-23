/**
 * Companion Memory Layer
 *
 * Stores structured memories about the user extracted from conversations.
 * Categories: general (life facts), emotional (moods, stressors, joys),
 * and wellness (health, habits, goals).
 *
 * Memories are persisted in localStorage and sent with every chat request
 * so the companion can reference them naturally.
 */

export interface MemoryEntry {
  text: string;
  category: 'general' | 'emotional' | 'wellness';
  extractedAt: string; // ISO date
}

export interface CompanionMemory {
  entries: MemoryEntry[];
  lastExtractedAt: string | null;
}

const MEMORY_KEY = 'compani-memory';
const MAX_ENTRIES = 60; // keep memory focused

export function loadMemory(): CompanionMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    localStorage.removeItem(MEMORY_KEY);
  }
  return { entries: [], lastExtractedAt: null };
}

export function saveMemory(memory: CompanionMemory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function mergeNewMemories(
  existing: CompanionMemory,
  newEntries: MemoryEntry[]
): CompanionMemory {
  // Deduplicate by text similarity (exact match)
  const existingTexts = new Set(existing.entries.map((e) => e.text.toLowerCase().trim()));
  const unique = newEntries.filter(
    (e) => !existingTexts.has(e.text.toLowerCase().trim())
  );

  if (unique.length === 0) return existing;

  const combined = [...existing.entries, ...unique];
  // If over limit, drop oldest entries
  const trimmed = combined.length > MAX_ENTRIES
    ? combined.slice(combined.length - MAX_ENTRIES)
    : combined;

  return {
    entries: trimmed,
    lastExtractedAt: new Date().toISOString(),
  };
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
}

/**
 * Format memories for inclusion in the system prompt.
 * Groups by category for natural reading.
 */
export function formatMemoriesForPrompt(memory: CompanionMemory): string {
  if (memory.entries.length === 0) return '';

  const grouped: Record<string, string[]> = {
    general: [],
    emotional: [],
    wellness: [],
  };

  for (const entry of memory.entries) {
    grouped[entry.category]?.push(entry.text);
  }

  const sections: string[] = [];

  if (grouped.general.length > 0) {
    sections.push(`Things you know about them:\n- ${grouped.general.join('\n- ')}`);
  }
  if (grouped.emotional.length > 0) {
    sections.push(`Emotional patterns you've noticed:\n- ${grouped.emotional.join('\n- ')}`);
  }
  if (grouped.wellness.length > 0) {
    sections.push(`Health & wellness context:\n- ${grouped.wellness.join('\n- ')}`);
  }

  return sections.join('\n\n');
}
