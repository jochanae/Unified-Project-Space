import { useEffect, useMemo, useState } from 'react';
import { Lock, Shield, Sparkles } from 'lucide-react';

/**
 * IdentityLockPanel
 * -----------------
 * The "Architect's Workspace" header for the Signal Lab. Shows the locked
 * Identity (offer / persona / friction) alongside a live MarQ processing log.
 *
 * This is a pure presentation component — it consumes the parsed signalBlueprint
 * already loaded by the Signal Lab hook, so we don't double-fetch.
 */

interface SignalBlueprint {
  oneLiner?: string;
  elevatorPitch?: string;
  socialBio?: string;
  persona?: {
    role?: string;
    frustrations?: string[] | string;
    desires?: string[] | string;
    objections?: string[] | string;
  };
  hooks?: {
    instagram?: string[];
    linkedin?: string[];
    emailSubjects?: string[];
  };
}

interface IdentityLockPanelProps {
  blueprint: SignalBlueprint | null;
  projectName?: string;
  versionLabel?: string;
}

function pickFirst(value: string[] | string | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function buildLogLines(bp: SignalBlueprint | null, projectName?: string): string[] {
  const role = bp?.persona?.role || 'target persona';
  const friction = pickFirst(bp?.persona?.frustrations) || 'core friction';
  const hook = bp?.hooks?.instagram?.[0] || bp?.hooks?.linkedin?.[0] || bp?.hooks?.emailSubjects?.[0];
  const project = projectName || 'this project';
  return [
    `[SYSTEM] Syncing Identity Lock with Lead Hub…`,
    `[MarQ] Indexing ${role} signals for ${project}.`,
    `[MarQ] Validating friction: "${friction}".`,
    hook
      ? `[MarQ] Winning hook in rotation: "${hook}".`
      : `[MarQ] Awaiting hook performance data from live funnels.`,
    `[SYSTEM] Identity Lock stable. Watching for strategy drift.`,
  ];
}

export function IdentityLockPanel({ blueprint, projectName, versionLabel }: IdentityLockPanelProps) {
  const log = useMemo(() => buildLogLines(blueprint, projectName), [blueprint, projectName]);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    if (!log.length) return;
    const id = setInterval(() => {
      setVisible((v) => (v >= log.length ? log.length : v + 1));
    }, 600);
    return () => clearInterval(id);
  }, [log]);

  if (!blueprint) return null;

  const friction = pickFirst(blueprint.persona?.frustrations);
  const desire = pickFirst(blueprint.persona?.desires);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Core Identity */}
      <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl p-6 sm:p-8 group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.08] group-hover:opacity-[0.14] transition-opacity pointer-events-none">
          <Shield className="w-32 h-32 text-primary" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15 border border-primary/25">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
                  Identity Lock
                </p>
                <p className="text-xs text-muted-foreground">
                  {projectName || 'Active project'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/70">
              {versionLabel || 'v1.0_STABLE'}
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-bold mb-2">
                High-Octane Offer
              </p>
              <p className="text-xl sm:text-2xl font-medium text-foreground leading-snug">
                "{blueprint.oneLiner || 'Identity locked.'}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-background/50 border border-border/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Target Persona
                </p>
                <p className="text-sm font-bold text-foreground">
                  {blueprint.persona?.role || 'Awaiting refinement'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-background/50 border border-border/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Primary Friction
                </p>
                <p className="text-sm font-bold text-foreground line-clamp-2">
                  {friction || 'Pending signal capture'}
                </p>
              </div>
            </div>

            {desire && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary/70 mt-0.5 shrink-0" />
                <span>
                  MarQ is optimizing toward:{' '}
                  <span className="text-foreground/80 font-medium">{desire}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Processing Log */}
      <div className="rounded-3xl border border-border/40 bg-background/80 backdrop-blur-xl p-5 flex flex-col min-h-[280px]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
            Quinn_Process_Log
          </span>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>

        <div className="flex-1 font-mono text-[11px] space-y-2.5 text-muted-foreground/70 overflow-hidden">
          {log.slice(0, visible).map((line, idx) => {
            const isHighlight = line.includes('[MarQ]') && (line.includes('Winning hook') || line.includes('Validating'));
            return (
              <p
                key={`${idx}-${line}`}
                className={`animate-in fade-in slide-in-from-left-1 duration-300 ${
                  isHighlight ? 'text-foreground/90' : ''
                }`}
              >
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
