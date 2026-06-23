export const OBJECT_TYPES = [
  "Idea", "Goal", "Blocker", "Decision",
  "Audience", "Feature", "Risk", "Insight",
] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];
