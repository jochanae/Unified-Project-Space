/**
 * ContextSelector — Phase 1 stub. Phase 2 renders the
 * Logo | Flyer | Social | Hero | Free-form tab strip.
 */

import type { StudioMode } from '../types';

const MODES: { id: StudioMode; label: string }[] = [
  { id: 'logo', label: 'Logo' },
  { id: 'flyer', label: 'Flyer' },
  { id: 'social', label: 'Social' },
  { id: 'hero', label: 'Hero' },
  { id: 'freeform', label: 'Free-form' },
];

interface Props {
  value: StudioMode;
  onChange: (mode: StudioMode) => void;
}

export function ContextSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-border/40 bg-muted/20 p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === m.id ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
