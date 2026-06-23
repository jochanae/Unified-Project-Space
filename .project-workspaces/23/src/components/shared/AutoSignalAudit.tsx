import { useMemo, useState } from 'react';
import { AlertTriangle, TrendingDown, Sparkles, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AutoSignalAuditProps {
  views: number;
  leads: number;
  conversionRate: number;
  topProjectName?: string;
  topProjectViews?: number;
  topProjectLeads?: number;
}

interface AuditFinding {
  severity: 'critical' | 'warn' | 'info';
  title: string;
  body: string;
  action?: { label: string; href: string };
}

/**
 * Auto-triggered analytics audit. Surfaces deterministic findings
 * once traffic crosses meaningful thresholds — no API call needed.
 *
 * Trigger gate: at least 30 views OR at least 1 lead.
 * Below that, the panel is hidden (avoids noisy guidance with no data).
 */
export function AutoSignalAudit({
  views,
  leads,
  conversionRate,
  topProjectName,
  topProjectViews = 0,
  topProjectLeads = 0,
}: AutoSignalAuditProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const findings = useMemo<AuditFinding[]>(() => {
    const out: AuditFinding[] = [];

    // Conversion rate diagnostics
    if (views >= 30 && conversionRate < 1) {
      out.push({
        severity: 'critical',
        title: 'Conversion below 1%',
        body: 'Traffic is arriving but almost nothing converts. The hook may not match the offer, or the form is too heavy.',
        action: { label: 'Refine in Signal Lab', href: '/signal-lab' },
      });
    } else if (views >= 50 && conversionRate < 3) {
      out.push({
        severity: 'warn',
        title: 'Conversion under benchmark',
        body: `${conversionRate.toFixed(1)}% is below the 3% Tactical Grace floor. Tighten the headline or trim a form field.`,
        action: { label: 'Edit page copy', href: '/projects' },
      });
    } else if (conversionRate >= 8 && leads >= 5) {
      out.push({
        severity: 'info',
        title: 'Conversion is exceptional',
        body: `${conversionRate.toFixed(1)}% CVR clears the 8% Gold Pulse threshold. Scale traffic with paid or social.`,
        action: { label: 'Plan a campaign', href: '/social' },
      });
    }

    // Funnel drop-off concentrated on single project
    if (topProjectViews >= 50 && topProjectLeads === 0) {
      out.push({
        severity: 'critical',
        title: `"${topProjectName}" has zero conversions`,
        body: 'Significant traffic with no leads usually means a broken form, missing CTA, or off-target hook.',
        action: { label: 'Open project', href: '/workspace' },
      });
    }

    // Email follow-up gap
    if (leads >= 3) {
      out.push({
        severity: 'warn',
        title: 'Leads landing — sequence ready?',
        body: `${leads} captured. Without an automated follow-up, ~70% go cold within 48h.`,
        action: { label: 'Set up sequence', href: '/projects' },
      });
    }

    return out;
  }, [views, leads, conversionRate, topProjectName, topProjectViews, topProjectLeads]);

  // Trigger gate
  const shouldShow = (views >= 30 || leads >= 1) && findings.length > 0 && !dismissed;
  if (!shouldShow) return null;

  return (
    <section className="glass rounded-3xl border border-amber-500/20 p-5 sm:p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 70% 30%, hsl(45 90% 55%), transparent 70%)' }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 shadow-[0_0_20px_hsl(45_90%_55%/0.15)]">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-400/80 font-medium mb-1">
              Auto Signal Audit
            </p>
            <p className="text-sm font-medium">
              MarQ detected {findings.length} {findings.length === 1 ? 'signal' : 'signals'} worth your attention
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss audit"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative space-y-2.5">
        {findings.map((f, i) => (
          <FindingRow key={i} finding={f} onAction={(href) => navigate(href)} />
        ))}
      </div>
    </section>
  );
}

function FindingRow({ finding, onAction }: { finding: AuditFinding; onAction: (href: string) => void }) {
  const sev = finding.severity;
  const Icon = sev === 'critical' ? AlertTriangle : sev === 'warn' ? TrendingDown : Sparkles;
  const tone =
    sev === 'critical'
      ? 'text-red-400 bg-red-500/10 ring-red-500/20'
      : sev === 'warn'
      ? 'text-amber-400 bg-amber-500/10 ring-amber-500/20'
      : 'text-primary bg-primary/10 ring-primary/20';

  return (
    <div className="glass rounded-2xl border border-border/20 p-3.5 flex items-start gap-3">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1', tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{finding.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{finding.body}</p>
      </div>
      {finding.action && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAction(finding.action!.href)}
          className="shrink-0 h-7 px-2.5 text-xs gap-1"
        >
          {finding.action.label}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
