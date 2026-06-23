/**
 * Axiom handoff — sends a blueprint card payload to the Axiom builder
 * and opens the resulting project in a new tab.
 *
 * Used by every BlueprintCard render site (chat inline, artifacts drawer,
 * project shelf, blueprints vault). Keep the AXIOM_URL and payload shape
 * in this single place so the integration stays consistent.
 */

import { toast } from "sonner";

export const AXIOM_URL =
  (import.meta.env.VITE_AXIOM_URL as string | undefined) ??
  "https://axiomsystem.app";

export interface BlueprintHandoffPayload {
  title: string;
  callout?: string | null;
  sections?: { heading: string; points: string[] }[] | null;
}

export async function buildInAxiom(blueprint: BlueprintHandoffPayload): Promise<void> {
  const sections = blueprint.sections ?? [];

  const decisions = sections.flatMap(section =>
    section.points.map(point => ({
      tier: 1,
      text: `${section.heading}: ${point}`,
    }))
  );

  const manifestLines = [
    `Blueprint: ${blueprint.title}`,
    blueprint.callout ? `→ ${blueprint.callout}` : '',
    '',
    ...sections.flatMap(s => [
      s.heading,
      ...s.points.map(p => `  • ${p}`),
      '',
    ]),
  ].filter(Boolean);

  try {
    const res = await fetch(`${AXIOM_URL}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: blueprint.title,
        builder: "replit",
        nodes_resolved: [],
        manifest: manifestLines.join('\n'),
        decisions,
      }),
    });
    if (!res.ok) throw new Error(`Import failed (${res.status})`);
    const { projectId } = (await res.json()) as { projectId: number };
    window.open(`${AXIOM_URL}/project/${projectId}?source=axiom`, "_blank");
  } catch (e) {
    console.error("Axiom handoff failed:", e);
    toast.error("Couldn't open in Axiom — try again in a moment");
  }
}
