import { useState, useCallback } from "react";
import type { ProjectDNA, ProjectDNAPatch, DnaFieldStatus } from "@/hooks/useProjectDNA";

const MONO = "var(--app-font-mono)";
const GOLD = "var(--atlas-gold, #C9A24C)";
const FG = "var(--atlas-fg, #F5F0E8)";
const MUTED = "var(--atlas-muted, #8B8577)";
const BORDER = "var(--atlas-border, rgba(255,255,255,0.08))";
const BG = "var(--atlas-bg, #0E0D0B)";
const SURFACE = "var(--atlas-surface, rgba(255,255,255,0.03))";

interface Props {
  dna: ProjectDNA;
  onSave: (patch: ProjectDNAPatch) => Promise<void>;
  saving?: boolean;
}

const STATUS_CONFIG: Record<DnaFieldStatus, { label: string; color: string }> = {
  guessed:   { label: "Guessed",   color: "rgba(139,133,119,0.7)" },
  inferred:  { label: "Inferred",  color: "rgba(201,162,76,0.65)" },
  confirmed: { label: "Confirmed", color: "#4ADE80" },
  committed: { label: "Committed", color: "#C9A24C" },
};

function StatusBadge({ status }: { status?: DnaFieldStatus }) {
  if (!status || status === "guessed") return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      fontFamily: MONO, fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase",
      color: cfg.color, border: `1px solid ${cfg.color}`, borderRadius: 2,
      padding: "1px 5px", opacity: 0.85, flexShrink: 0,
    }}>{cfg.label}</span>
  );
}

function ConfidencePip({ value }: { value?: number }) {
  if (!value) return null;
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "#4ADE80" : pct >= 40 ? "#FBBF24" : "#F87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 48, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 9, color, opacity: 0.8 }}>{pct}%</span>
    </div>
  );
}

function Tag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px",
      borderRadius: 3, background: SURFACE, border: `1px solid ${BORDER}`,
      fontSize: 11, color: FG, opacity: 0.9,
    }}>
      <span>{label}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: MUTED, fontSize: 10, lineHeight: 1, opacity: 0.7, display: "flex", alignItems: "center",
        }} title="Remove">✕</button>
      )}
    </div>
  );
}

function AddTagInput({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder?: string }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const trimmed = val.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setVal("");
  };
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
      <input
        value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={placeholder ?? "Add…"}
        style={{
          flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3,
          padding: "3px 8px", fontSize: 11, color: FG, fontFamily: "inherit", outline: "none", minWidth: 0,
        }}
      />
      <button type="button" onClick={submit} disabled={!val.trim()} style={{
        background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 3,
        padding: "3px 8px", fontFamily: MONO, fontSize: 10,
        color: val.trim() ? GOLD : MUTED, cursor: val.trim() ? "pointer" : "default",
        letterSpacing: "0.08em", opacity: val.trim() ? 1 : 0.5,
      }}>Add</button>
    </div>
  );
}

interface SectionProps {
  label: string;
  items: string[];
  editMode: boolean;
  onRemove: (i: number) => void;
  onAdd: (v: string) => void;
  placeholder?: string;
  status?: DnaFieldStatus;
}

function DnaSection({ label, items, editMode, onRemove, onAdd, placeholder, status }: SectionProps) {
  if (!editMode && items.length === 0) return null;
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, opacity: 0.7 }}>
          {label}
        </span>
        <StatusBadge status={status} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {items.map((item, i) => (
          <Tag key={i} label={item} onRemove={editMode ? () => onRemove(i) : undefined} />
        ))}
      </div>
      {editMode && <AddTagInput onAdd={onAdd} placeholder={placeholder} />}
    </div>
  );
}

export function ExperienceIntentCard({ dna, onSave, saving }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [localPrinciples, setLocalPrinciples] = useState<string[]>(() => [...dna.creativePrinciples]);
  const [localEI, setLocalEI] = useState(() => ({ ...dna.experienceIntent }));
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const startEdit = useCallback(() => {
    setLocalPrinciples([...dna.creativePrinciples]);
    setLocalEI({ ...dna.experienceIntent });
    setEditedFields(new Set());
    setEditMode(true);
  }, [dna]);

  const cancelEdit = useCallback(() => {
    setLocalPrinciples([...dna.creativePrinciples]);
    setLocalEI({ ...dna.experienceIntent });
    setEditedFields(new Set());
    setEditMode(false);
  }, [dna]);

  const markEdited = (field: string) => setEditedFields((s) => new Set(s).add(field));

  const handleSave = useCallback(async () => {
    const statusUpdates: Partial<Record<string, DnaFieldStatus>> = {};
    if (editedFields.has("creativePrinciples")) statusUpdates.creativePrinciples = "confirmed";
    if (editedFields.has("emotionalRegister"))  statusUpdates.emotionalRegister = "confirmed";
    if (editedFields.has("interactionPosture")) statusUpdates.interactionPosture = "confirmed";
    if (editedFields.has("visualLanguage"))     statusUpdates.visualLanguage = "confirmed";
    if (editedFields.has("designPrinciples"))   statusUpdates.designPrinciples = "confirmed";

    await onSave({
      creativePrinciples: localPrinciples,
      experienceIntent: localEI,
      ...(Object.keys(statusUpdates).length > 0 ? { status: statusUpdates as Record<string, DnaFieldStatus> } : {}),
    });
    setEditMode(false);
    setEditedFields(new Set());
  }, [onSave, localPrinciples, localEI, editedFields]);

  const eiSrc = editMode ? localEI : dna.experienceIntent;
  const principlesSrc = editMode ? localPrinciples : dna.creativePrinciples;
  const st = dna.status as Record<string, DnaFieldStatus>;

  const hasAnyEI =
    (eiSrc.emotionalRegister?.length ?? 0) > 0 ||
    (eiSrc.interactionPosture?.length ?? 0) > 0 ||
    (eiSrc.visualLanguage?.length ?? 0) > 0 ||
    (eiSrc.designPrinciples?.length ?? 0) > 0;
  const hasAny = hasAnyEI || principlesSrc.length > 0;

  if (!hasAny && !editMode) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, opacity: 0.5, fontStyle: "italic" }}>
          Share how you want this product to feel — talk about the vibe, attach a sketch. Axiom will build a profile here.
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 16px", background: BG }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 0 8px", borderBottom: `1px solid ${BORDER}`, marginBottom: 2,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, opacity: 0.6 }}>
            Project Soul
          </span>
          {eiSrc.confidence != null && eiSrc.confidence > 0 && <ConfidencePip value={eiSrc.confidence} />}
        </div>
        {!editMode ? (
          <button type="button" onClick={startEdit} style={{
            background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 3,
            padding: "4px 10px", fontFamily: MONO, fontSize: 9,
            letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, cursor: "pointer",
          }}>Edit</button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={cancelEdit} style={{
              background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 3,
              padding: "4px 10px", fontFamily: MONO, fontSize: 9,
              letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, cursor: "pointer",
            }}>Cancel</button>
            <button type="button" onClick={() => void handleSave()} disabled={saving} style={{
              background: GOLD, border: "none", borderRadius: 3, padding: "4px 12px",
              fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
              color: BG, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, fontWeight: 600,
            }}>{saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>

      <DnaSection
        label="Creative Principles" items={principlesSrc} editMode={editMode}
        status={st.creativePrinciples}
        onRemove={(i) => { setLocalPrinciples((p) => p.filter((_, idx) => idx !== i)); markEdited("creativePrinciples"); }}
        onAdd={(v) => { setLocalPrinciples((p) => [...p, v]); markEdited("creativePrinciples"); }}
        placeholder="Add a principle…"
      />
      <DnaSection
        label="Feel" items={eiSrc.emotionalRegister ?? []} editMode={editMode}
        status={st.emotionalRegister}
        onRemove={(i) => { setLocalEI((prev) => { const arr = [...(prev.emotionalRegister ?? [])]; arr.splice(i, 1); return { ...prev, emotionalRegister: arr }; }); markEdited("emotionalRegister"); }}
        onAdd={(v) => { setLocalEI((prev) => ({ ...prev, emotionalRegister: [...(prev.emotionalRegister ?? []), v] })); markEdited("emotionalRegister"); }}
        placeholder="calm, focused, playful…"
      />
      <DnaSection
        label="Usage Posture" items={eiSrc.interactionPosture ?? []} editMode={editMode}
        status={st.interactionPosture}
        onRemove={(i) => { setLocalEI((prev) => { const arr = [...(prev.interactionPosture ?? [])]; arr.splice(i, 1); return { ...prev, interactionPosture: arr }; }); markEdited("interactionPosture"); }}
        onAdd={(v) => { setLocalEI((prev) => ({ ...prev, interactionPosture: [...(prev.interactionPosture ?? []), v] })); markEdited("interactionPosture"); }}
        placeholder="quick decisions, low friction…"
      />
      <DnaSection
        label="Visual Language" items={eiSrc.visualLanguage ?? []} editMode={editMode}
        status={st.visualLanguage}
        onRemove={(i) => { setLocalEI((prev) => { const arr = [...(prev.visualLanguage ?? [])]; arr.splice(i, 1); return { ...prev, visualLanguage: arr }; }); markEdited("visualLanguage"); }}
        onAdd={(v) => { setLocalEI((prev) => ({ ...prev, visualLanguage: [...(prev.visualLanguage ?? []), v] })); markEdited("visualLanguage"); }}
        placeholder="minimal, high contrast…"
      />
      <DnaSection
        label="Design Principles" items={eiSrc.designPrinciples ?? []} editMode={editMode}
        status={st.designPrinciples}
        onRemove={(i) => { setLocalEI((prev) => { const arr = [...(prev.designPrinciples ?? [])]; arr.splice(i, 1); return { ...prev, designPrinciples: arr }; }); markEdited("designPrinciples"); }}
        onAdd={(v) => { setLocalEI((prev) => ({ ...prev, designPrinciples: [...(prev.designPrinciples ?? []), v] })); markEdited("designPrinciples"); }}
        placeholder="Show don't tell…"
      />

      {/* Visual sketches log */}
      {dna.visualSketches.length > 0 && (
        <div style={{ padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, opacity: 0.7 }}>
              Visual Memory
            </span>
            <StatusBadge status={st.visualSketches} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dna.visualSketches.map((sketch, i) => (
              <div key={i} style={{ padding: "8px 10px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, color: FG, lineHeight: 1.4, flex: 1 }}>{sketch.description}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.5, flexShrink: 0 }}>
                    {new Date(sketch.analyzedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                {(sketch.signals.visualLanguage?.length ?? 0) > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {sketch.signals.visualLanguage!.map((s, si) => (
                      <span key={si} style={{
                        fontFamily: MONO, fontSize: 9, padding: "2px 5px",
                        background: "rgba(201,162,76,0.08)", border: "1px solid rgba(201,162,76,0.15)",
                        borderRadius: 2, color: GOLD, opacity: 0.8,
                      }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extraction note */}
      {eiSrc.lastConfirmed && (
        <div style={{ paddingTop: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.4 }}>
            Confirmed {new Date(eiSrc.lastConfirmed).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
      )}
      {!eiSrc.lastConfirmed && hasAny && !editMode && (
        <div style={{ paddingTop: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.4 }}>
            Extracted from conversation — edit to confirm or refine
          </span>
        </div>
      )}
    </div>
  );
}
