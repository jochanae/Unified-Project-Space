import { useState } from 'react';
import { Wand2, QrCode, Link2, Sparkles, Package, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AssetGeneratorDialog } from './AssetGeneratorDialog';
import { CampaignBundleDialog } from './CampaignBundleDialog';
import { StrategistDialog, type StrategistPlan } from './StrategistDialog';
import { useBrandKit } from '../hooks/use-brand-kit';
import type { AssetConfig } from '../types';
import { useMarketingAssets } from '../hooks/use-marketing-assets';
import { downloadBlob, generateQrDataUrl } from '../lib/render';

interface Props {
  projectId: string | null;
  projectName: string | null;
  projectGoal?: string | null;
}

/**
 * The "Spoke" — a glassmorphic Marketing Toolkit card that lives inside the project view.
 * Mirrors the StrategyLogCard layout for visual consistency.
 */
export function MarketingQuickStart({ projectId, projectName, projectGoal }: Props) {
  const [open, setOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [strategistOpen, setStrategistOpen] = useState(false);
  const [bundleDefaults, setBundleDefaults] = useState<Partial<AssetConfig> | null>(null);
  const { effective: brand } = useBrandKit(projectId);
  const { assets } = useMarketingAssets(projectId);

  const handleStrategistApply = (plan: StrategistPlan) => {
    // Seed the bundle dialog with the lead (first/awareness) asset.
    const lead = plan.assets[0];
    if (lead) {
      setBundleDefaults({
        headline: lead.headline,
        subhead: lead.subhead,
        cta: lead.cta,
        url: leadUrl,
      });
      setBundleOpen(true);
      toast.success(`Loaded "${plan.campaign_name}" into bundle`);
    }
  };

  // Pulled from project; users can override in the dialog.
  const leadUrl = projectName
    ? `${window.location.origin}/p/${projectName.toLowerCase().replace(/\s+/g, '-')}`
    : '';

  const handleQr = async () => {
    if (!leadUrl) {
      toast.error('Deploy your funnel first to get a QR code');
      return;
    }
    try {
      const dataUrl = await generateQrDataUrl(leadUrl, { dark: '#0a0a0f' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, `${(projectName || 'project').toLowerCase().replace(/\s+/g, '-')}-qr.png`);
      toast.success('QR code downloaded');
    } catch {
      toast.error('Could not generate QR');
    }
  };

  const handleCopyLink = async () => {
    if (!leadUrl) {
      toast.error('No live link yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(leadUrl);
      toast.success('Lead link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <section className="glass relative overflow-hidden rounded-3xl border border-gold/20 p-5 sm:p-7 shadow-[0_0_28px_-8px_hsl(var(--gold)/0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
              Marketing Toolkit
            </p>
          </div>
          <h2 className="mt-1 text-xl font-serif tracking-tight">
            Press {projectName ? `for ${projectName}` : 'your story'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Branded flyers, social tiles & QR codes — pre-filled with your project.
          </p>
        </div>
      </div>

      {/* Mini preview frame */}
      <div className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gold/15 relative">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 70% 30%, ${brand.accent_hex}33 0%, transparent 60%), linear-gradient(135deg, #14141f 0%, #0a0a0f 100%)`,
          }}
        />
        <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] text-gold">
              {brand.brand_name || 'IntoIQ'}
            </span>
          </div>
          <div>
            <p className="text-base sm:text-xl font-bold leading-tight text-white line-clamp-2">
              {projectName || 'Your Project'}
            </p>
            {projectGoal && (
              <p className="text-[10px] sm:text-xs text-white/60 line-clamp-1 mt-1">
                {projectGoal}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Primary action */}
      <button
        onClick={() => setOpen(true)}
        disabled={!projectId}
        className={cn(
          'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all',
          'bg-gold text-black hover:bg-gold/90 active:scale-[0.98]',
          'shadow-[0_0_24px_-8px_hsl(var(--gold)/0.6)]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        )}
      >
        <Wand2 className="h-4 w-4" />
        Generate Branded Assets
      </button>

      {/* MarQ Strategist — top of secondary stack */}
      <button
        onClick={() => setStrategistOpen(true)}
        disabled={!projectId}
        className={cn(
          'mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 to-gold/5 px-4 py-2.5 text-xs font-semibold text-gold transition-all',
          'hover:from-gold/25 hover:to-gold/10 hover:border-gold/60 disabled:opacity-40 disabled:cursor-not-allowed',
        )}
      >
        <Brain className="h-3.5 w-3.5" />
        Strategize with MarQ
      </button>

      {/* Campaign bundle */}
      <button
        onClick={() => {
          setBundleDefaults(null);
          setBundleOpen(true);
        }}
        disabled={!projectId}
        className={cn(
          'mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-gold transition-all',
          'hover:bg-gold/20 hover:border-gold/60 disabled:opacity-40 disabled:cursor-not-allowed',
        )}
      >
        <Package className="h-3.5 w-3.5" />
        Generate Campaign Bundle (.zip)
      </button>

      {/* Secondary actions */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={handleQr}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-muted/30 px-3 py-2 text-xs text-foreground/80 transition-colors hover:bg-muted/60"
        >
          <QrCode className="h-3.5 w-3.5" /> Download QR
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-muted/30 px-3 py-2 text-xs text-foreground/80 transition-colors hover:bg-muted/60"
        >
          <Link2 className="h-3.5 w-3.5" /> Copy Lead Link
        </button>
      </div>

      {assets.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-gold/70" />
            {assets.length} asset{assets.length === 1 ? '' : 's'} in library
          </span>
          <a href="/studio" className="text-gold/80 hover:text-gold underline-offset-2 hover:underline">
            Open Brand Vault →
          </a>
        </div>
      )}

      <AssetGeneratorDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        defaults={{
          headline: projectName || '',
          subhead: projectGoal || '',
          url: leadUrl,
          cta: 'Get Started',
        }}
      />

      <CampaignBundleDialog
        open={bundleOpen}
        onOpenChange={setBundleOpen}
        projectId={projectId}
        defaults={
          bundleDefaults ?? {
            headline: projectName || '',
            subhead: projectGoal || '',
            url: leadUrl,
            cta: 'Get Started',
          }
        }
      />

      <StrategistDialog
        open={strategistOpen}
        onOpenChange={setStrategistOpen}
        projectId={projectId}
        brand={brand}
        onApply={handleStrategistApply}
      />
    </section>
  );
}
