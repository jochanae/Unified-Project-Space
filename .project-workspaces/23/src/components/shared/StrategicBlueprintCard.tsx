import { FolderOpen, AlertCircle, ListChecks } from 'lucide-react';

export interface StrategicBlueprintData {
  project?: string;
  problem?: string;
  steps?: string[];
}

/**
 * Luxury Obsidian SmartCard rendered when MarQ emits a <StrategicBlueprint />
 * tag inside a chat reply. Glassmorphic container with a gold left-rule accent.
 */
export function StrategicBlueprintCard({ project, problem, steps }: StrategicBlueprintData) {
  const hasAny = project || problem || (steps && steps.length > 0);
  if (!hasAny) return null;

  return (
    <div className="relative my-2 overflow-hidden rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]">
      {/* Gold anchor rule */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: 'linear-gradient(180deg, #d4a84c 0%, #c9a84c 50%, #8a6e2c 100%)' }}
      />
      {/* Faint inner gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ background: 'radial-gradient(120% 80% at 0% 0%, #d4a84c 0%, transparent 60%)' }}
      />

      <div className="relative pl-5 pr-4 py-4 space-y-4">
        {project && (
          <Row icon={<FolderOpen className="h-3.5 w-3.5" />} label="Project">
            <p className="text-sm font-semibold text-foreground leading-snug">{project}</p>
          </Row>
        )}

        {problem && (
          <Row icon={<AlertCircle className="h-3.5 w-3.5" />} label="The Problem">
            <p className="text-[13px] text-foreground/80 leading-relaxed">{problem}</p>
          </Row>
        )}

        {steps && steps.length > 0 && (
          <>
            <div className="border-t border-border/20" />
            <Row icon={<ListChecks className="h-3.5 w-3.5" />} label="Action Steps">
              <ol className="space-y-1.5">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] text-foreground/85 leading-relaxed">
                    <span
                      className="shrink-0 mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
                      style={{ background: 'rgba(212,168,76,0.15)', color: '#d4a84c' }}
                    >
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Row>
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5" style={{ color: '#d4a84c' }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

/**
 * Parse a single <StrategicBlueprint project="..." problem="..." steps='[...]' />
 * tag. Returns null if attributes can't be parsed.
 */
export function parseBlueprintTag(raw: string): StrategicBlueprintData | null {
  const get = (name: string) => {
    const m =
      raw.match(new RegExp(`${name}\\s*=\\s*"([\\s\\S]*?)"`)) ||
      raw.match(new RegExp(`${name}\\s*=\\s*'([\\s\\S]*?)'`));
    return m?.[1];
  };
  const project = get('project');
  const problem = get('problem');
  const stepsRaw = get('steps');

  let steps: string[] | undefined;
  if (stepsRaw) {
    try {
      // Tolerate single-quoted JSON by swapping outer wrapper handled already
      const parsed = JSON.parse(stepsRaw);
      if (Array.isArray(parsed)) steps = parsed.map((s) => String(s));
    } catch {
      // Fallback: split on " | " or newlines
      steps = stepsRaw
        .split(/\n|\|/)
        .map((s) => s.replace(/^[-*\d.\s]+/, '').trim())
        .filter(Boolean);
    }
  }

  if (!project && !problem && !steps) return null;
  return { project, problem, steps };
}

/**
 * Split assistant message content into a sequence of text + blueprint segments.
 */
export type MessageSegment =
  | { kind: 'text'; text: string }
  | { kind: 'blueprint'; data: StrategicBlueprintData };

export function splitBlueprintSegments(content: string): MessageSegment[] {
  const re = /<StrategicBlueprint\b[\s\S]*?\/>/g;
  const segments: MessageSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      segments.push({ kind: 'text', text: content.slice(last, m.index) });
    }
    const data = parseBlueprintTag(m[0]);
    if (data) segments.push({ kind: 'blueprint', data });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ kind: 'text', text: content.slice(last) });
  if (segments.length === 0) segments.push({ kind: 'text', text: content });
  return segments;
}
