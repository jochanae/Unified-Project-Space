import { useCallback } from "react";
import { useDesignPlan } from "@/hooks/useDesignPlan";
import type { DesignPlanBody } from "@/hooks/useDesignPlan";

const MONO = "var(--app-font-mono)";
const GOLD = "var(--atlas-gold, #C9A24C)";
const FG = "var(--atlas-fg, #F5F0E8)";
const MUTED = "var(--atlas-muted, #8B8577)";
const BORDER = "var(--atlas-border, rgba(255,255,255,0.08))";
const BG = "var(--atlas-bg, #0E0D0B)";
const SURFACE = "var(--atlas-surface, rgba(255,255,255,0.03))";

const labelStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: GOLD,
  opacity: 0.7,
};

function PlanRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
      padding: "9px 0",
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontSize: 12.5, color: FG, lineHeight: 1.55, opacity: 0.9 }}>{value}</span>
    </div>
  );
}

function PlanListRow({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 5,
      padding: "9px 0",
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: GOLD, opacity: 0.4, fontFamily: MONO, fontSize: 10, marginTop: 1, flexShrink: 0 }}>
              {i + 1}.
            </span>
            <span style={{ fontSize: 12, color: FG, lineHeight: 1.5, opacity: 0.9 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponsiveRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "4px 0" }}>
      <span style={{
        fontFamily: MONO,
        fontSize: 9,
        color: MUTED,
        opacity: 0.6,
        width: 48,
        flexShrink: 0,
        paddingTop: 2,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: FG, lineHeight: 1.5, opacity: 0.85 }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status, version }: { status: "draft" | "proposed" | "committed"; version: number }) {
  const config = {
    draft: { color: MUTED, label: "Draft", glow: false },
    proposed: { color: "#FBBF24", label: "Proposed", glow: true },
    committed: { color: "#4ADE80", label: "Committed", glow: true },
  }[status];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: config.color,
          flexShrink: 0,
          boxShadow: config.glow ? `0 0 5px ${config.color}66` : "none",
        }} />
        <span style={{
          fontFamily: MONO,
          fontSize: 9,
          color: config.color,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          {config.label}
        </span>
      </div>
      <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.4 }}>
        v{version}
      </span>
    </div>
  );
}

interface DesignPlanPanelProps {
  projectId: number;
}

export function DesignPlanPanel({ projectId }: DesignPlanPanelProps) {
  const { plan, loading, generating, committing, generate, commit } = useDesignPlan(projectId);

  const handleGenerate = useCallback(async () => {
    await generate();
  }, [generate]);

  const handleCommit = useCallback(async () => {
    await commit();
  }, [commit]);

  const body = plan?.body as DesignPlanBody | undefined;
  const responsive = body?.responsiveIntent;
  const interaction = body?.interactionPatterns;

  if (loading && !plan) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, opacity: 0.5, fontStyle: "italic" }}>
          Loading…
        </span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, opacity: 0.5, fontStyle: "italic", display: "block", marginBottom: 4 }}>
            No Design Plan yet.
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, opacity: 0.35, fontStyle: "italic" }}>
            Atlas reads your Soul tab and generates a structured design brief.
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating}
          style={{
            padding: "7px 18px",
            borderRadius: 5,
            background: generating ? "transparent" : "rgba(201,162,76,0.1)",
            border: `1px solid rgba(201,162,76,${generating ? "0.2" : "0.4"})`,
            color: generating ? MUTED : GOLD,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: generating ? "default" : "pointer",
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? "Generating…" : "Generate Design Plan"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 24px", background: BG }}>
      {/* Header row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0 10px",
        borderBottom: `1px solid ${BORDER}`,
        marginBottom: 2,
      }}>
        <StatusBadge status={plan.status as "draft" | "proposed" | "committed"} version={plan.version} />
        <div style={{ display: "flex", gap: 6 }}>
          {plan.status !== "committed" && (
            <button
              type="button"
              onClick={() => void handleCommit()}
              disabled={committing}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                background: committing ? "transparent" : GOLD,
                border: "none",
                color: committing ? MUTED : BG,
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: committing ? "default" : "pointer",
                opacity: committing ? 0.5 : 1,
                fontWeight: 600,
              }}
            >
              {committing ? "Committing…" : "Commit"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              background: "transparent",
              border: `1px solid ${BORDER}`,
              color: generating ? MUTED : MUTED,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: generating ? "default" : "pointer",
              opacity: generating ? 0.5 : 0.7,
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!generating) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,162,76,0.3)";
                (e.currentTarget as HTMLButtonElement).style.color = GOLD;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
              (e.currentTarget as HTMLButtonElement).style.color = MUTED;
            }}
          >
            {generating ? "Generating…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Navigation + Layout */}
      <PlanRow label="Navigation" value={body?.navigationPattern} />
      <PlanRow label="Component Pattern" value={body?.componentPatterns} />

      {/* Responsive Intent */}
      {(responsive?.mobile || responsive?.tablet || responsive?.desktop) && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "9px 0",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <span style={{ ...labelStyle, marginBottom: 4 }}>Responsive Intent</span>
          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 5,
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <ResponsiveRow label="Mobile" value={responsive.mobile} />
            <ResponsiveRow label="Tablet" value={responsive.tablet} />
            <ResponsiveRow label="Desktop" value={responsive.desktop} />
          </div>
        </div>
      )}

      {/* Information Hierarchy */}
      <PlanListRow label="Information Hierarchy" items={body?.informationHierarchy} />

      {/* Aesthetics */}
      <PlanRow label="Motion" value={body?.motionPhilosophy} />
      <PlanRow label="Card Density" value={body?.cardDensity} />
      <PlanRow label="Typography Scale" value={body?.typographyScale} />
      <PlanRow label="Empty States" value={body?.emptyStates} />

      {/* Interaction Patterns */}
      {interaction && Object.values(interaction).some(Boolean) && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          padding: "9px 0",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <span style={{ ...labelStyle, marginBottom: 4 }}>Interactions</span>
          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 5,
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}>
            {[
              { key: "primaryAction", label: "Primary Action" },
              { key: "secondaryAction", label: "Secondary Action" },
              { key: "editingStyle", label: "Editing" },
              { key: "confirmationBehavior", label: "Confirmation" },
              { key: "gestures", label: "Gestures" },
              { key: "scrollingBehavior", label: "Scrolling" },
            ].map(({ key, label }) => {
              const val = interaction[key as keyof typeof interaction];
              if (!val) return null;
              return (
                <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    color: MUTED,
                    opacity: 0.55,
                    width: 90,
                    flexShrink: 0,
                    paddingTop: 2,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 12, color: FG, lineHeight: 1.45, opacity: 0.9 }}>{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer: committed date */}
      {plan.committedAt && (
        <div style={{ paddingTop: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.4 }}>
            Committed {new Date(plan.committedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
      )}
    </div>
  );
}
