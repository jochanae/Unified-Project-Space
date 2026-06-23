/**
 * Shared shape for creating a parked Entry.
 * Used by every "park this" path so the workspace handler and the
 * /parking-lot capture bar can never drift from each other.
 */
export function buildParkedEntryPayload(
  content: string,
  sessionId?: number | string | null,
  sourceMessageId?: number | null,
  contextWhat?: string | null,
  details?: string | null,
) {
  const trimmed = content.trim();
  const title = trimmed.replace(/\n/g, " ").slice(0, 80).trim();
  return {
    title,
    summary: trimmed.slice(0, 500),
    status: "parked" as const,
    severity: "parked" as const,
    mode: "think" as const,
    ...(sessionId != null ? { sessionId: sessionId as number } : {}),
    ...(sourceMessageId != null ? { sourceMessageId } : {}),
    ...(contextWhat != null ? { contextWhat: contextWhat.slice(0, 120) } : {}),
    ...(details != null && details.trim() ? { details: details.trim().slice(0, 2000) } : {}),
  };
}
