import { useState, useEffect, useRef } from "react";
import type { ManifestDecision } from "@/components/workspace/PreviewPanel";

// ── Constants ──────────────────────────────────────────────────────────────────
const MONO = "var(--app-font-mono)";
const SANS = "var(--app-font-sans)";
const GOLD = "rgba(201,162,76,0.9)";
const GOLD_DIM = "rgba(201,162,76,0.22)";
const MUTED = "var(--atlas-muted)";
const FG = "var(--atlas-fg)";
const BORDER = "var(--atlas-border)";
const GREEN = "#6EE7B7";
const AMBER = "#f59e0b";
const BG = "var(--atlas-bg)";
const SURFACE = "var(--atlas-surface)";

const READINESS_THRESHOLD = 40;

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProjectGenome {
  purpose: string | null;
  coreEmotion: string | null;
  audience: string | null;
  confidenceScore: number;
  health: { clarity: number; momentum: string; confidence: string };
  openQuestions: string[];
}

type Completeness = "absent" | "thin" | "sufficient";
type TargetStatus = "available" | "warning" | "locked";

interface DnaAnchor {
  label: string;
  value: string | null;
  completeness: Completeness;
}

interface Target {
  id: string;
  label: string;
  status: TargetStatus;
  reason: string;
}

// ── Derivation helpers ────────────────────────────────────────────────────────
function deriveAnchors(genome: ProjectGenome | null): DnaAnchor[] {
  if (!genome) {
    return [
      { label: "Core Intent", value: null, completeness: "absent" },
      { label: "Core Audience", value: null, completeness: "absent" },
      { label: "Brand Posture", value: null, completeness: "absent" },
    ];
  }
  const clarity = genome.health.clarity;
  function comp(value: string | null, threshold = 40): Completeness {
    if (!value) return "absent";
    if (clarity < threshold) return "thin";
    return "sufficient";
  }
  return [
    { label: "Core Intent", value: genome.purpose, completeness: comp(genome.purpose, 35) },
    { label: "Core Audience", value: genome.audience, completeness: comp(genome.audience, 40) },
    { label: "Brand Posture", value: genome.coreEmotion, completeness: comp(genome.coreEmotion, 45) },
  ];
}

function deriveTargets(genome: ProjectGenome | null): Target[] {
  if (!genome) {
    return [
      { id: "landing-page", label: "Landing Page", status: "locked", reason: "Awaiting analysis…" },
      { id: "web-app", label: "Web App", status: "locked", reason: "Awaiting analysis…" },
      { id: "beta-program", label: "Beta Program", status: "locked", reason: "Awaiting analysis…" },
      { id: "investor-deck", label: "Investor Deck", status: "locked", reason: "Awaiting analysis…" },
    ];
  }
  const { clarity } = genome.health;
  const hasIntent = Boolean(genome.purpose);
  const hasAudience = Boolean(genome.audience);
  const hasBrand = Boolean(genome.coreEmotion);
  function status(unlocked: boolean, warn: boolean): TargetStatus {
    if (unlocked) return "available";
    if (warn) return "warning";
    return "locked";
  }
  return [
    {
      id: "landing-page", label: "Landing Page",
      status: status(hasIntent && clarity >= 30, hasIntent && clarity >= 15),
      reason: !hasIntent ? "Needs core intent" : clarity < 30 ? "Nearly ready" : "Ready to manifest",
    },
    {
      id: "web-app", label: "Web App",
      status: status(hasIntent && hasAudience && clarity >= 50, hasIntent && clarity >= 35),
      reason: !hasIntent ? "Needs core intent" : !hasAudience ? "Needs audience" : clarity < 50 ? `${50 - clarity}% more clarity` : "Ready to manifest",
    },
    {
      id: "beta-program", label: "Beta Program",
      status: status(hasIntent && hasAudience && clarity >= 55, hasIntent && hasAudience && clarity >= 40),
      reason: !hasIntent ? "Needs core intent" : !hasAudience ? "Needs audience" : clarity < 55 ? "Needs more clarity" : "Ready to manifest",
    },
    {
      id: "investor-deck", label: "Investor Deck",
      status: status(hasIntent && hasAudience && hasBrand && clarity >= 65, hasIntent && hasAudience && clarity >= 50),
      reason: !hasIntent ? "Needs core intent" : !hasAudience ? "Needs audience" : !hasBrand ? "Needs brand posture" : clarity < 65 ? "Needs conviction" : "Ready to manifest",
    },
    {
      id: "mobile-app", label: "Mobile App",
      status: status(hasIntent && hasAudience && hasBrand && clarity >= 75, hasIntent && hasAudience && hasBrand && clarity >= 60),
      reason: !hasIntent ? "Needs core intent" : !hasAudience ? "Needs audience" : !hasBrand ? "Needs brand posture" : clarity < 75 ? "Needs stronger foundation" : "Ready to manifest",
    },
  ];
}

function completenessColor(c: Completeness) {
  if (c === "sufficient") return GREEN;
  if (c === "thin") return AMBER;
  return "rgba(255,255,255,0.22)";
}

// ── Readiness ring ────────────────────────────────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const r = 10;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;
  const color = score >= 67 ? GREEN : score >= 34 ? AMBER : "rgba(255,255,255,0.28)";
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
      <circle
        cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 14 14)"
        style={{ transition: "stroke-dasharray 600ms ease, stroke 400ms ease" }}
      />
      <text x="14" y="18" textAnchor="middle" fill={color}
        style={{ fontSize: 7, fontFamily: MONO, fontWeight: 700 }}>
        {pct}
      </text>
    </svg>
  );
}

// ── Low-signal state ──────────────────────────────────────────────────────────
function LowSignalState({ genome, readiness }: { genome: ProjectGenome | null; readiness: number }) {
  const anchors = deriveAnchors(genome);
  const known = anchors.filter(a => a.value);
  const missing = anchors.filter(a => !a.value);
  const questions = genome?.openQuestions ?? [];

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, opacity: 0.45, marginBottom: 8 }}>
          Signal
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
              width: `${Math.min(100, readiness)}%`,
              background: readiness >= 34 ? AMBER : "rgba(255,255,255,0.22)",
              transition: "width 600ms ease",
            }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.55, flexShrink: 0 }}>
            {readiness}% · need {READINESS_THRESHOLD}%
          </span>
        </div>
      </div>

      {known.length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, opacity: 0.45, marginBottom: 10 }}>
            Atlas understands
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {known.map(a => (
              <div key={a.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: GREEN, fontSize: 10, marginTop: 2, flexShrink: 0 }}>✓</span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, opacity: 0.5, marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: FG, opacity: 0.75, lineHeight: 1.5 }}>{a.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(missing.length > 0 || questions.length > 0) && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, opacity: 0.45, marginBottom: 10 }}>
            Still unresolved
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {missing.map(a => (
              <div key={a.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 10, marginTop: 2, flexShrink: 0 }}>○</span>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, opacity: 0.45 }}>{a.label}</div>
              </div>
            ))}
            {questions.slice(0, 3).map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: AMBER, fontSize: 10, marginTop: 2, flexShrink: 0 }}>?</span>
                <div style={{ fontFamily: SANS, fontSize: 12, color: MUTED, opacity: 0.6, lineHeight: 1.45 }}>{q}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        padding: "12px 14px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${BORDER}`,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED, opacity: 0.4, marginBottom: 6 }}>
          Recommended next action
        </div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: FG, opacity: 0.65, lineHeight: 1.5 }}>
          {known.length === 0
            ? "Tell Atlas what you're building. Start with the problem it solves."
            : missing.some(a => a.label === "Core Audience")
            ? "Define who this is for — their situation before and after your product exists."
            : "Keep the conversation going. Atlas is building a clearer picture."}
        </div>
      </div>
    </div>
  );
}

// ── Target row ────────────────────────────────────────────────────────────────
function TargetRow({ target, selected, onSelect }: { target: Target; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isLocked = target.status === "locked";
  const isAvailable = target.status === "available";
  const iconColor = isAvailable ? GOLD : target.status === "warning" ? AMBER : "rgba(255,255,255,0.2)";

  return (
    <div
      onClick={!isLocked ? onSelect : undefined}
      onMouseEnter={() => !isLocked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 7,
        cursor: isLocked ? "default" : "pointer",
        background: selected ? "rgba(201,162,76,0.09)" : hovered ? "rgba(255,255,255,0.035)" : "transparent",
        border: `1px solid ${selected ? "rgba(201,162,76,0.28)" : "transparent"}`,
        opacity: isLocked ? 0.32 : 1,
        transition: "background 150ms ease, border-color 150ms ease",
        marginBottom: 1,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        background: isAvailable ? "rgba(201,162,76,0.1)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${iconColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8,
      }}>
        {isAvailable ? "✓" : target.status === "warning" ? "⚠" : "🔒"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontFamily: SANS, color: FG, fontWeight: selected ? 600 : 400 }}>{target.label}</div>
        <div style={{ fontSize: 9, fontFamily: MONO, color: MUTED, opacity: 0.45, letterSpacing: "0.02em", marginTop: 1 }}>{target.reason}</div>
      </div>
      {selected && <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export interface ManifestPanelProps {
  projectId: number | null;
  projectName?: string | null;
  readiness: number;
  onMaterialize: (targetId: string) => void;
  manifestDecision?: ManifestDecision | null;
  manifestLoading?: boolean;
}

export function ManifestPanel({
  projectId,
  projectName,
  readiness,
  onMaterialize,
  manifestDecision,
  manifestLoading = false,
}: ManifestPanelProps) {
  const [genome, setGenome] = useState<ProjectGenome | null>(null);
  const [genomeLoading, setGenomeLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [materializeHover, setMaterializeHover] = useState(false);
  const prevProjectId = useRef<number | null>(null);

  const isReady = readiness >= READINESS_THRESHOLD;

  useEffect(() => {
    if (!projectId || projectId <= 0) return;
    if (prevProjectId.current === projectId) return;
    prevProjectId.current = projectId;
    setGenomeLoading(true);
    setGenome(null);
    fetch(`/api/projects/${projectId}/genome`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.genome) setGenome(data.genome as ProjectGenome);
        else if (data?.purpose !== undefined) setGenome(data as ProjectGenome);
      })
      .catch(() => {})
      .finally(() => setGenomeLoading(false));
  }, [projectId]);

  const targets = deriveTargets(genome);
  const anchors = deriveAnchors(genome);
  const hasSelected = Boolean(selectedTarget);
  const selectedIsAvailable = targets.find(t => t.id === selectedTarget)?.status === "available";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--atlas-surface-alt)" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px 10px",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, opacity: 0.45, marginBottom: 3 }}>
            Manifest
          </div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: MUTED, opacity: 0.55 }}>
            {isReady ? "What can become real" : "Building signal…"}
          </div>
        </div>
        <ReadinessRing score={readiness} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {genomeLoading && (
          <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.4, letterSpacing: "0.12em" }}>
              Reading project…
            </div>
          </div>
        )}

        {!genomeLoading && !isReady && (
          <LowSignalState genome={genome} readiness={readiness} />
        )}

        {!genomeLoading && isReady && (
          <div style={{ padding: "16px 16px 12px" }}>
            {/* DNA anchors — what Atlas understands */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, opacity: 0.45, marginBottom: 10 }}>
                Atlas understands
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {anchors.map(a => (
                  <div key={a.label} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: a.value ? 4 : 0 }}>
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, opacity: 0.5 }}>{a.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 8, color: completenessColor(a.completeness), opacity: 0.8 }}>
                        {a.completeness === "sufficient" ? "✓" : a.completeness === "thin" ? "~" : "—"}
                      </span>
                    </div>
                    {a.value && (
                      <div style={{ fontFamily: SANS, fontSize: 12, color: FG, opacity: 0.78, lineHeight: 1.5 }}>{a.value}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Materialization opportunities */}
            <div>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, opacity: 0.45, marginBottom: 8 }}>
                Materialization opportunities
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {targets.map(t => (
                  <TargetRow
                    key={t.id}
                    target={t}
                    selected={selectedTarget === t.id}
                    onSelect={() => setSelectedTarget(t.id === selectedTarget ? null : t.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer — ▶ action */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {isReady ? (
          <button
            type="button"
            disabled={!hasSelected || !selectedIsAvailable || manifestLoading}
            onMouseEnter={() => setMaterializeHover(true)}
            onMouseLeave={() => setMaterializeHover(false)}
            onClick={() => selectedTarget && onMaterialize(selectedTarget)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${hasSelected && selectedIsAvailable ? "rgba(201,162,76,0.4)" : BORDER}`,
              background: hasSelected && selectedIsAvailable
                ? (materializeHover ? "rgba(201,162,76,0.15)" : "rgba(201,162,76,0.08)")
                : "rgba(255,255,255,0.03)",
              cursor: hasSelected && selectedIsAvailable && !manifestLoading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 160ms ease",
              opacity: hasSelected && selectedIsAvailable ? 1 : 0.4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polygon points="2,1 11,6 2,11" fill={hasSelected && selectedIsAvailable ? GOLD : "rgba(255,255,255,0.4)"} />
            </svg>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: hasSelected && selectedIsAvailable ? GOLD : MUTED }}>
              {manifestLoading ? "Materializing…" : hasSelected ? "Materialize" : "Select a target above"}
            </span>
          </button>
        ) : (
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, opacity: 0.3, textAlign: "center" }}>
            ▶ available at {READINESS_THRESHOLD}% signal
          </div>
        )}
      </div>
    </div>
  );
}
