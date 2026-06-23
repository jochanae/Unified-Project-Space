/**
 * MiniProgressBeats — compact 3-dot Outline / Manuscript / Revise indicator
 * for use in sermon library rows. Each dot lights gold when its stage is
 * reached. Tooltip via title attribute keeps the row visually quiet.
 */
export function MiniProgressBeats({
  outlineDone,
  manuscriptDone,
  reviseDone,
}: {
  outlineDone: boolean;
  manuscriptDone: boolean;
  reviseDone: boolean;
}) {
  const beats = [
    { label: "Outline", done: outlineDone },
    { label: "Manuscript", done: manuscriptDone },
    { label: "Revised", done: reviseDone },
  ] as const;

  const reached = beats.filter((b) => b.done).length;
  const aria = `Progress: ${reached} of 3 — ${beats.map((b) => `${b.label} ${b.done ? "done" : "pending"}`).join(", ")}`;

  return (
    <span role="img" aria-label={aria} title={aria} className="inline-flex items-center gap-1">
      {beats.map((b) => (
        <span
          key={b.label}
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            b.done ? "bg-gold shadow-[0_0_6px_rgba(201,168,76,0.55)]" : "bg-gold/15"
          }`}
        />
      ))}
    </span>
  );
}
