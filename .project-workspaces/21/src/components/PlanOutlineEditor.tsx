/**
 * Collapsible outline editor for Plan / Blueprint artifacts.
 * Parses markdown `## Heading` sections and lets each be collapsed
 * and edited independently. Recomposes back to markdown on every change.
 */
import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Section {
  heading: string; // e.g. "🎯 Goal"
  body: string;    // raw markdown body under the heading
}

interface ParsedPlan {
  preface: string;     // anything before the first `## ` (usually `# Title`)
  sections: Section[];
}

const DEFAULT_SECTIONS: Section[] = [
  { heading: '🎯 Goal', body: '' },
  { heading: '🧭 Context', body: '' },
  { heading: '🪜 Steps', body: '1. \n2. \n3. ' },
  { heading: '✅ Success criteria', body: '- ' },
  { heading: '📝 Notes', body: '' },
];

function parsePlan(md: string): ParsedPlan {
  if (!md.trim()) {
    return { preface: '# New plan\n', sections: DEFAULT_SECTIONS };
  }
  const lines = md.split('\n');
  const sections: Section[] = [];
  let preface = '';
  let current: Section | null = null;
  let inPreface = true;

  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1], body: '' };
      inPreface = false;
      continue;
    }
    if (inPreface) {
      preface += (preface ? '\n' : '') + line;
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);

  // Trim trailing blank lines from each body
  for (const s of sections) s.body = s.body.replace(/\n+$/, '');
  preface = preface.replace(/\n+$/, '');

  return { preface, sections: sections.length ? sections : DEFAULT_SECTIONS };
}

function serialize(parsed: ParsedPlan): string {
  const head = parsed.preface.trim();
  const body = parsed.sections
    .map(s => `## ${s.heading}\n${s.body}`.trimEnd())
    .join('\n\n');
  return [head, body].filter(Boolean).join('\n\n') + '\n';
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

export default function PlanOutlineEditor({ value, onChange, className }: Props) {
  const parsed = useMemo(() => parsePlan(value), [value]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [titleDraft, setTitleDraft] = useState(parsed.preface);

  // Keep title in sync if external value changes (e.g. switching artifacts)
  useEffect(() => { setTitleDraft(parsed.preface); }, [parsed.preface]);

  const update = (next: ParsedPlan) => onChange(serialize(next));

  const updateSection = (idx: number, patch: Partial<Section>) => {
    const sections = parsed.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    update({ ...parsed, sections });
  };

  const removeSection = (idx: number) => {
    const sections = parsed.sections.filter((_, i) => i !== idx);
    update({ ...parsed, sections });
  };

  const addSection = () => {
    update({ ...parsed, sections: [...parsed.sections, { heading: 'New section', body: '' }] });
  };

  const updateTitle = (next: string) => {
    setTitleDraft(next);
    update({ ...parsed, preface: next });
  };

  return (
    <div className={cn('rounded-lg border border-[hsl(45_60%_52%/0.25)] bg-[#0a0a0a] p-3 space-y-2', className)}>
      {/* Plan title */}
      <input
        type="text"
        value={titleDraft.replace(/^#\s*/, '')}
        onChange={e => updateTitle(`# ${e.target.value}`)}
        placeholder="Plan title"
        className="w-full bg-transparent border-b border-white/10 pb-1.5 text-[14px] font-medium tracking-wide text-foreground/95 focus:outline-none focus:border-[hsl(45_60%_52%/0.5)]"
      />

      {parsed.sections.map((section, idx) => {
        const isCollapsed = collapsed[idx];
        return (
          <div
            key={idx}
            className="rounded-md border border-white/[0.06] bg-white/[0.015] overflow-hidden"
          >
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                onClick={() => setCollapsed(c => ({ ...c, [idx]: !isCollapsed }))}
                className="text-muted-foreground hover:text-[hsl(45_70%_70%)] shrink-0"
                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <input
                type="text"
                value={section.heading}
                onChange={e => updateSection(idx, { heading: e.target.value })}
                className="flex-1 bg-transparent text-[12px] font-medium tracking-wide text-[hsl(45_70%_70%)] focus:outline-none"
              />
              <button
                onClick={() => removeSection(idx)}
                className="text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-destructive px-1"
                title="Remove section"
              >
                ✕
              </button>
            </div>
            {!isCollapsed && (
              <textarea
                value={section.body}
                onChange={e => updateSection(idx, { body: e.target.value })}
                spellCheck
                rows={Math.max(3, section.body.split('\n').length)}
                className="w-full bg-black/40 border-t border-white/[0.05] p-2.5 text-[12.5px] leading-relaxed text-foreground/90 font-sans resize-y focus:outline-none focus:bg-black/60"
                placeholder="Write here…"
              />
            )}
          </div>
        );
      })}

      <button
        onClick={addSection}
        className="flex items-center gap-1.5 w-full justify-center rounded-md border border-dashed border-white/10 px-3 py-2 text-[11px] tracking-wide text-muted-foreground/70 hover:text-[hsl(45_70%_70%)] hover:border-[hsl(45_60%_52%/0.3)]"
      >
        <Plus className="h-3 w-3" />
        Add section
      </button>
    </div>
  );
}
