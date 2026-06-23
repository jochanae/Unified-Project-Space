/**
 * Curated topic → verse references map for QuickSearch.
 * Each ref is { bookIndex, chapter, verse } using KJV indexing.
 */
export type TopicVerseRef = { bookIndex: number; chapter: number; verse: number };
export type Topic = {
  id: string;
  label: string;
  keywords: string[];
  refs: TopicVerseRef[];
};

export const TOPICS: Topic[] = [
  {
    id: "anxiety",
    label: "Anxiety",
    keywords: ["anxiety", "anxious", "worry", "worried", "stress", "panic"],
    refs: [
      { bookIndex: 49, chapter: 4, verse: 6 }, // Phil 4:6
      { bookIndex: 39, chapter: 6, verse: 34 }, // Matt 6:34
      { bookIndex: 59, chapter: 5, verse: 7 }, // 1 Pet 5:7
      { bookIndex: 18, chapter: 55, verse: 22 }, // Ps 55:22
    ],
  },
  {
    id: "fear",
    label: "Fear",
    keywords: ["fear", "afraid", "scared", "courage", "brave"],
    refs: [
      { bookIndex: 22, chapter: 41, verse: 10 }, // Isa 41:10
      { bookIndex: 54, chapter: 1, verse: 7 }, // 2 Tim 1:7
      { bookIndex: 5, chapter: 1, verse: 9 }, // Josh 1:9
      { bookIndex: 18, chapter: 23, verse: 4 }, // Ps 23:4
    ],
  },
  {
    id: "peace",
    label: "Peace",
    keywords: ["peace", "calm", "rest", "stillness"],
    refs: [
      { bookIndex: 42, chapter: 14, verse: 27 }, // John 14:27
      { bookIndex: 49, chapter: 4, verse: 7 }, // Phil 4:7
      { bookIndex: 22, chapter: 26, verse: 3 }, // Isa 26:3
      { bookIndex: 50, chapter: 3, verse: 15 }, // Col 3:15
    ],
  },
  {
    id: "love",
    label: "Love",
    keywords: ["love", "charity", "beloved"],
    refs: [
      { bookIndex: 45, chapter: 13, verse: 4 }, // 1 Cor 13:4
      { bookIndex: 42, chapter: 3, verse: 16 }, // John 3:16
      { bookIndex: 61, chapter: 4, verse: 19 }, // 1 John 4:19
      { bookIndex: 44, chapter: 8, verse: 38 }, // Rom 8:38
    ],
  },
  {
    id: "hope",
    label: "Hope",
    keywords: ["hope", "hopeful", "future"],
    refs: [
      { bookIndex: 23, chapter: 29, verse: 11 }, // Jer 29:11
      { bookIndex: 44, chapter: 15, verse: 13 }, // Rom 15:13
      { bookIndex: 44, chapter: 8, verse: 24 }, // Rom 8:24
    ],
  },
  {
    id: "faith",
    label: "Faith",
    keywords: ["faith", "believe", "trust"],
    refs: [
      { bookIndex: 57, chapter: 11, verse: 1 }, // Heb 11:1
      { bookIndex: 19, chapter: 3, verse: 5 }, // Prov 3:5
      { bookIndex: 39, chapter: 17, verse: 20 }, // Matt 17:20
      { bookIndex: 44, chapter: 10, verse: 17 }, // Rom 10:17
    ],
  },
  {
    id: "money",
    label: "Money",
    keywords: ["money", "wealth", "riches", "tithe", "tithing", "finance", "finances", "giving"],
    refs: [
      { bookIndex: 39, chapter: 6, verse: 24 }, // Matt 6:24
      { bookIndex: 53, chapter: 6, verse: 10 }, // 1 Tim 6:10
      { bookIndex: 38, chapter: 3, verse: 10 }, // Mal 3:10
      { bookIndex: 19, chapter: 3, verse: 9 }, // Prov 3:9
    ],
  },
  {
    id: "forgiveness",
    label: "Forgiveness",
    keywords: ["forgive", "forgiveness", "mercy", "pardon"],
    refs: [
      { bookIndex: 48, chapter: 4, verse: 32 }, // Eph 4:32
      { bookIndex: 50, chapter: 3, verse: 13 }, // Col 3:13
      { bookIndex: 39, chapter: 6, verse: 14 }, // Matt 6:14
      { bookIndex: 61, chapter: 1, verse: 9 }, // 1 John 1:9
    ],
  },
  {
    id: "strength",
    label: "Strength",
    keywords: ["strength", "strong", "weary", "tired", "endurance"],
    refs: [
      { bookIndex: 49, chapter: 4, verse: 13 }, // Phil 4:13
      { bookIndex: 22, chapter: 40, verse: 31 }, // Isa 40:31
      { bookIndex: 18, chapter: 46, verse: 1 }, // Ps 46:1
    ],
  },
  {
    id: "wisdom",
    label: "Wisdom",
    keywords: ["wisdom", "wise", "understanding", "discernment"],
    refs: [
      { bookIndex: 58, chapter: 1, verse: 5 }, // James 1:5
      { bookIndex: 19, chapter: 9, verse: 10 }, // Prov 9:10
      { bookIndex: 19, chapter: 3, verse: 13 }, // Prov 3:13
    ],
  },
  {
    id: "healing",
    label: "Healing",
    keywords: ["healing", "heal", "sick", "sickness", "health"],
    refs: [
      { bookIndex: 22, chapter: 53, verse: 5 }, // Isa 53:5
      { bookIndex: 58, chapter: 5, verse: 14 }, // James 5:14
      { bookIndex: 18, chapter: 147, verse: 3 }, // Ps 147:3
    ],
  },
  {
    id: "marriage",
    label: "Marriage",
    keywords: ["marriage", "marry", "wife", "husband", "spouse"],
    refs: [
      { bookIndex: 48, chapter: 5, verse: 25 }, // Eph 5:25
      { bookIndex: 0, chapter: 2, verse: 24 }, // Gen 2:24
      { bookIndex: 45, chapter: 13, verse: 4 }, // 1 Cor 13:4
    ],
  },
  {
    id: "purpose",
    label: "Purpose",
    keywords: ["purpose", "calling", "destiny", "plan"],
    refs: [
      { bookIndex: 23, chapter: 29, verse: 11 }, // Jer 29:11
      { bookIndex: 44, chapter: 8, verse: 28 }, // Rom 8:28
      { bookIndex: 48, chapter: 2, verse: 10 }, // Eph 2:10
    ],
  },
  {
    id: "salvation",
    label: "Salvation",
    keywords: ["salvation", "saved", "born again", "eternal life"],
    refs: [
      { bookIndex: 44, chapter: 10, verse: 9 }, // Rom 10:9
      { bookIndex: 48, chapter: 2, verse: 8 }, // Eph 2:8
      { bookIndex: 42, chapter: 3, verse: 16 }, // John 3:16
    ],
  },
];

/** Find topics whose label or keywords match any token in the query. */
export function matchTopics(query: string): Topic[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const out: Topic[] = [];
  for (const topic of TOPICS) {
    const hay = [topic.label.toLowerCase(), ...topic.keywords];
    const hit = tokens.some((t) => hay.some((h) => h.includes(t) || t.includes(h)));
    if (hit) out.push(topic);
  }
  return out;
}

/** Tokenize and AND-match: every token must appear in the verse text. */
export function tokenMatch(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  for (const t of tokens) {
    if (!lower.includes(t)) return false;
  }
  return true;
}

export function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}
