/**
 * ChatUtils — shared utilities for chat components.
 */

export /**
 * PlanStepsList — renders numbered plan steps in chat messages.
 */
function PlanStepsList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-2 space-y-1">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
          <span className="shrink-0 font-semibold text-primary">{i + 1}.</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export /**
 * formatSessionDate — formats a timestamp for chat date separators.
 */
function formatSessionDate(date: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOf(new Date());
  const that = startOf(date);
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
