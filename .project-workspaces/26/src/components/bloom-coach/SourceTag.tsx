import { cn } from "@/lib/utils";
import { Database, Receipt, DollarSign, CreditCard, PieChart, Link2, PenLine } from "lucide-react";
import type { ReactNode } from "react";

// Map source label → icon + color tint.
const SOURCE_META: Record<string, { Icon: typeof Database; tint: string; label: string }> = {
  accounts: { Icon: Database, tint: "text-emerald-300/90 border-emerald-400/30 bg-emerald-950/40", label: "Accounts" },
  bills: { Icon: Receipt, tint: "text-amber-300/90 border-amber-400/30 bg-amber-950/40", label: "Bills" },
  income: { Icon: DollarSign, tint: "text-emerald-300/90 border-emerald-400/30 bg-emerald-950/40", label: "Income" },
  debts: { Icon: CreditCard, tint: "text-rose-300/90 border-rose-400/30 bg-rose-950/40", label: "Debts" },
  budgets: { Icon: PieChart, tint: "text-violet-300/90 border-violet-400/30 bg-violet-950/40", label: "Budgets" },
  plaid: { Icon: Link2, tint: "text-sky-300/90 border-sky-400/30 bg-sky-950/40", label: "Plaid" },
  manual: { Icon: PenLine, tint: "text-muted-foreground border-white/15 bg-white/[0.04]", label: "Manual" },
};

const SRC_TAG_RE = /\[src:([A-Za-z]+)\]/g;

interface SourceTagProps {
  source: string;
}

function SourceTag({ source }: SourceTagProps) {
  const key = source.toLowerCase();
  const meta = SOURCE_META[key];
  if (!meta) return null;
  const { Icon, tint, label } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1 py-[1px] mx-0.5 rounded-[4px] border text-[8px] font-semibold uppercase tracking-[0.08em] align-middle leading-none whitespace-nowrap",
        tint
      )}
      title={`Sourced from your ${label}`}
    >
      <Icon className="h-2 w-2" strokeWidth={2.5} />
      <span>{label}</span>
    </span>
  );
}

/**
 * Splits text into ReactNodes, replacing `[src:Label]` markers with inline
 * SourceTag badges. Used by ReactMarkdown's paragraph/list renderers.
 */
export function renderWithSourceTags(text: string): ReactNode[] {
  if (!text || !text.includes("[src:")) return [text];

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // Reset regex state because /g is stateful.
  SRC_TAG_RE.lastIndex = 0;

  while ((match = SRC_TAG_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<SourceTag key={`src-${match.index}`} source={match[1]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/**
 * Recursively walks ReactMarkdown children, transforming any string leaves.
 * Use as the renderer body for `p`, `li`, `strong`, `em`, etc.
 */
export function transformChildrenWithSourceTags(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return renderWithSourceTags(children);
  }
  if (Array.isArray(children)) {
    return children.flatMap((c, i) =>
      typeof c === "string"
        ? renderWithSourceTags(c).map((node, j) =>
            typeof node === "string" ? node : <span key={`${i}-${j}`}>{node}</span>
          )
        : [c]
    );
  }
  return children;
}
