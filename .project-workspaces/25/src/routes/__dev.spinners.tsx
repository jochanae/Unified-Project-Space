import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import auditData from "@/dev/spinner-audit.json";

type Finding = {
  file: string;
  line: number;
  context: string | null;
  size: string | null;
  kind: "context" | "explicit-size" | "bare";
};

type Audit = {
  generatedAt: string;
  total: number;
  byKind: { context: number; "explicit-size": number; bare: number };
  findings: Finding[];
};

export const Route = createFileRoute("/__dev/spinners")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [{ title: "Spinner Audit (dev)" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SpinnerAuditPage,
});

const KIND_STYLES: Record<Finding["kind"], string> = {
  context: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  "explicit-size": "bg-amber-500/10 text-amber-300 border-amber-500/30",
  bare: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

const KIND_LABEL: Record<Finding["kind"], string> = {
  context: "context",
  "explicit-size": "size override",
  bare: "bare (defaults to md)",
};

function SpinnerAuditPage() {
  const audit = auditData as Audit;
  const groups = audit.findings.reduce<Record<string, Finding[]>>((acc, f) => {
    (acc[f.file] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-obsidian px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold">DEV · Spinner Audit</p>
          <h1 className="font-display text-3xl">LoadingSpinner usage</h1>
          <p className="text-sm text-muted-foreground">
            Generated {new Date(audit.generatedAt).toLocaleString()} · run{" "}
            <code className="rounded bg-obsidian-elevated/60 px-1.5 py-0.5 text-xs">
              bun run audit:spinners
            </code>{" "}
            to refresh.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Context" value={audit.byKind.context} tone="emerald" />
          <Stat label="Size override" value={audit.byKind["explicit-size"]} tone="amber" />
          <Stat label="Bare" value={audit.byKind.bare} tone="rose" />
        </div>

        <div className="space-y-4">
          {Object.entries(groups).map(([file, items]) => (
            <section
              key={file}
              className="rounded-lg border border-gold/12 bg-obsidian-elevated/40 p-4"
            >
              <h2 className="mb-3 font-mono text-xs text-gold-soft">{file}</h2>
              <ul className="space-y-1.5 text-sm">
                {items.map((f, i) => (
                  <li
                    key={`${f.file}-${f.line}-${i}`}
                    className="flex items-center gap-3 font-mono text-xs"
                  >
                    <span className="w-12 shrink-0 text-right text-muted-foreground">
                      L{f.line}
                    </span>
                    <span
                      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${KIND_STYLES[f.kind]}`}
                    >
                      {KIND_LABEL[f.kind]}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {f.context ? `context="${f.context}"` : null}
                      {f.size ? `${f.context ? " · " : ""}size="${f.size}"` : null}
                      {!f.context && !f.size ? "—" : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {audit.findings.length === 0 && (
            <p className="text-sm text-muted-foreground">No LoadingSpinner usages found.</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          See <code className="rounded bg-obsidian-elevated/60 px-1 py-0.5">docs/spinner.md</code>{" "}
          for the context guide.{" "}
          <Link to="/" className="text-gold-soft underline">
            Back to app
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-rose-300";
  return (
    <div className="rounded-lg border border-gold/12 bg-obsidian-elevated/40 p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-3xl ${toneClass}`}>{value}</p>
    </div>
  );
}
