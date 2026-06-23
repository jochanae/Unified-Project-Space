// Deterministic glow colors for collaborator avatars (HSL, design-system tokens fallback)
const PALETTE = [
  'hsl(180, 70%, 55%)', // teal
  'hsl(280, 65%, 65%)', // violet
  'hsl(35, 90%, 60%)',  // amber
  'hsl(340, 70%, 60%)', // rose
  'hsl(140, 55%, 55%)', // emerald
  'hsl(210, 80%, 60%)', // azure
  'hsl(50, 85%, 60%)',  // gold
  'hsl(15, 80%, 60%)',  // ember
];

export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function initialsFor(name?: string | null, email?: string | null): string {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
