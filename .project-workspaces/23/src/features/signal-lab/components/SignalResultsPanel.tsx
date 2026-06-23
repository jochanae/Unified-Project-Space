import { useState } from 'react';
import { Sparkles, Zap, Loader2, Copy, Check, RotateCcw, Palette, Megaphone, Users, FileText, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import StyleSignal from './StyleSignal';
import SignalHooks from './SignalHooks';
import SignalPersona from './SignalPersona';
import SignalHistory from './SignalHistory';
import SignalExportPanel from './SignalExportPanel';
import { QuinnHooksToFunnelNudge } from '@/components/shared/QuinnUpgradeNudge';

import { useSubscription } from '@/features/billing';
import type { SignalOutputs, SavedSignal } from '../hooks/use-signal-lab';

const VIBE_PRESETS_PREVIEW = [
  'Obsidian & Gold',
  'Parisian Editorial',
  'Modern Coastal Luxury',
  'Vintage 80s CHANEL',
  'Minimalist Tech',
  'Desert Modernism',
];

/** Glassmorphism locked state for free-tier users on the Style tab */
function StyleSignalLockedState() {
  const navigate = useNavigate();
  return (
    <div className="relative rounded-2xl border border-border/20 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Blurred preview of what Identity Lock looks like */}
      <div className="p-5 sm:p-6 select-none pointer-events-none" style={{ filter: 'blur(6px)', opacity: 0.5 }}>
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-3">
            <Palette className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            The message is sharp. Now, let's give it a soul.
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {VIBE_PRESETS_PREVIEW.map((preset) => (
            <span key={preset} className="rounded-full border border-border/20 bg-background/30 px-3 py-1 text-xs text-muted-foreground">
              {preset}
            </span>
          ))}
        </div>
      </div>

      {/* Frosted glass overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        style={{
          background: 'hsl(var(--card) / 0.85)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full mb-4"
          style={{
            background: 'hsl(var(--primary) / 0.1)',
            border: '1px solid hsl(var(--primary) / 0.25)',
            boxShadow: '0 0 24px hsl(var(--primary) / 0.15)',
          }}
        >
          <Lock className="h-5 w-5 text-primary" />
        </div>

        <p className="text-xs font-medium text-primary/80 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          MarQ
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed max-w-sm mb-4">
          The Identity Lock is where your vision becomes visual DNA. This is where 'Vintage 80s CHANEL' or 'Modern Obsidian' translates into the palette, typography, and soul of your entire business engine.
        </p>

        <Button
          size="sm"
          className="gap-2"
          onClick={() => navigate('/pricing')}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Unlock Identity
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

type TabId = 'message' | 'style' | 'hooks' | 'persona' | 'export';

interface Props {
  outputs: SignalOutputs;
  copiedField: string | null;
  isSharpened: boolean;
  sharpening: boolean;
  activeTab: TabId;
  activeProjectId: string | null;
  activeProjectName: string | null;
  signalHistory: SavedSignal[];
  historyOpen: boolean;
  onCopy: (field: string, text: string) => void;
  onSharpen: () => void;
  onBuildFunnel: () => void;
  onReset: () => void;
  onTabChange: (tab: TabId) => void;
  onHistoryToggle: () => void;
  onLoadSignal: (signal: SavedSignal) => void;
}

const TABS = [
  { id: 'message' as const, label: 'Message', icon: Sparkles },
  { id: 'style' as const, label: 'Style', icon: Palette },
  { id: 'hooks' as const, label: 'Hooks', icon: Megaphone },
  { id: 'persona' as const, label: 'Persona', icon: Users },
  { id: 'export' as const, label: 'Export', icon: FileText },
];

export default function SignalResultsPanel({
  outputs, copiedField, isSharpened, sharpening, activeTab, activeProjectId, activeProjectName,
  signalHistory, historyOpen,
  onCopy, onSharpen, onBuildFunnel, onReset, onTabChange, onHistoryToggle, onLoadSignal,
}: Props) {
  const { tier } = useSubscription();
  
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
      {/* Signal Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/30 p-1 overflow-x-auto scrollbar-none -mx-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all justify-center whitespace-nowrap min-w-[4.5rem]',
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content: Core Message */}
      {activeTab === 'message' && (
        <>
          {([
            { key: 'oneLiner', label: 'The One-Liner', value: outputs.oneLiner },
            { key: 'elevatorPitch', label: 'The Elevator Pitch', value: outputs.elevatorPitch },
            { key: 'socialBio', label: 'The Social Bio', value: outputs.socialBio },
          ] as const).map(({ key, label, value }) => (
            <div key={key} className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</span>
                <button
                  onClick={() => onCopy(key, value)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === key ? (
                    <><Check className="h-3 w-3" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy</>
                  )}
                </button>
              </div>
              <div className="text-foreground text-base leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown>{value}</ReactMarkdown>
              </div>
            </div>
          ))}

          {/* MarQ refinement nudge */}
          {!isSharpened && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 flex items-start gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                  This is strong. But we can make it sharper.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  I'll strip the buzzwords and make it sound like you — not an AI.
                </p>
              </div>
              <Button size="sm" onClick={onSharpen} disabled={sharpening} className="gap-1.5 shrink-0">
                {sharpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                {sharpening ? 'Sharpening...' : 'Sharpen'}
              </Button>
            </div>
          )}

          {isSharpened && (
            <div className="flex items-center gap-2 text-xs text-primary/70 pt-1">
              <Zap className="h-3 w-3" />
              <span style={{ fontFamily: 'var(--font-heading)' }}>Signal sharpened by MarQ.</span>
            </div>
          )}
        </>
      )}

      {activeTab === 'style' && (
        tier === 'free' ? (
          <StyleSignalLockedState />
        ) : (
          <StyleSignal
            oneLiner={outputs.oneLiner}
            elevatorPitch={outputs.elevatorPitch}
            socialBio={outputs.socialBio}
            projectId={activeProjectId || undefined}
          />
        )
      )}

      {activeTab === 'hooks' && (
        <>
          <SignalHooks
            oneLiner={outputs.oneLiner}
            elevatorPitch={outputs.elevatorPitch}
            socialBio={outputs.socialBio}
            projectId={activeProjectId || undefined}
          />
          {tier === 'free' && (
            <div className="mt-4">
              <QuinnHooksToFunnelNudge />
            </div>
          )}
        </>
      )}

      {activeTab === 'persona' && (
        <SignalPersona
          oneLiner={outputs.oneLiner}
          elevatorPitch={outputs.elevatorPitch}
          socialBio={outputs.socialBio}
          projectId={activeProjectId || undefined}
        />
      )}

      {activeTab === 'export' && (
        <SignalExportPanel outputs={outputs} projectName={activeProjectName || undefined} projectId={activeProjectId || undefined} />
      )}


      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button onClick={onBuildFunnel} className="flex-1 gap-2 h-12 text-base">
          <Sparkles className="h-4 w-4" />
          Build Funnel from this Signal
        </Button>
        <Button variant="outline" onClick={onSharpen} disabled={sharpening} className="gap-2">
          {sharpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {sharpening ? 'Sharpening...' : 'Sharpen Again'}
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Start Over
        </Button>
      </div>


      {/* History */}
      <SignalHistory
        signals={signalHistory}
        currentOneLiner={outputs.oneLiner}
        open={historyOpen}
        onToggle={onHistoryToggle}
        onLoad={onLoadSignal}
      />
    </div>
  );
}
