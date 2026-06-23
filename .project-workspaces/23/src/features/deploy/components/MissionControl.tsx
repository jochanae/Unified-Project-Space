import { useState, useEffect } from 'react';
import { ExternalLink, Download, Globe, Users, Eye, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BuildStreamResult } from '@/features/quinn';
import { useSubscription } from '@/features/billing';
import { PaywallModal } from '@/features/billing';
import { generateExportBundle } from '@/lib/export-bundle';

interface MissionControlProps {
  projectId: string;
  projectSlug: string;
  result: BuildStreamResult;
  deployed: boolean;
}

function StatCard({ label, value, icon: Icon, glow }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  glow?: boolean;
}) {
  return (
    <div className={cn(
      'glass rounded-xl p-4 border border-border/30 flex items-center gap-3 card-hover-glow',
      glow && 'border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.1)]'
    )}>
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function MissionControl({ projectId, projectSlug, result, deployed }: MissionControlProps) {
  const [isLive, setIsLive] = useState(deployed);
  const [leadCount, setLeadCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [togglingLive, setTogglingLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { isGrowth, startCheckout } = useSubscription();
  const [showExportPaywall, setShowExportPaywall] = useState(false);

  const publishedBase = import.meta.env.VITE_SUPABASE_URL
    ? `https://intoiq.lovable.app/p/${projectSlug}`
    : `${window.location.origin}/p/${projectSlug}`;
  const liveUrl = publishedBase;

  // Fetch lead count + view count
  useEffect(() => {
    const fetchStats = async () => {
      // Get the page for this project
      const { data: pages } = await supabase
        .from('pages')
        .select('id')
        .eq('project_id', projectId);

      const pageIds = pages?.map(p => p.id) || [];

      // Lead count
      const { count: leads } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('source_project_id', projectId);
      setLeadCount(leads || 0);

      // View count
      if (pageIds.length > 0) {
        const { count: views } = await supabase
          .from('page_views')
          .select('*', { count: 'exact', head: true })
          .in('page_id', pageIds);
        setViewCount(views || 0);
      }
    };
    fetchStats();

    // Subscribe to realtime contact inserts
    const channel = supabase
      .channel(`leads-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'contacts',
        filter: `source_project_id=eq.${projectId}`,
      }, () => {
        setLeadCount(c => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCode = async () => {
    if (!isGrowth) {
      setShowExportPaywall(true);
      return;
    }
    setExporting(true);
    try {
      const html = generateExportBundle(result, projectSlug);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectSlug}-landing-page.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Code exported!', { description: 'Your standalone landing page has been downloaded.' });
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
    <PaywallModal
      open={showExportPaywall}
      onClose={() => setShowExportPaywall(false)}
      trigger="export"
      onCheckout={startCheckout}
    />
    <div className="glass rounded-2xl border border-primary/20 overflow-hidden card-hover-glow">
      {/* Header */}
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center',
              isLive
                ? 'bg-green-500/15 border border-green-500/25'
                : 'bg-muted border border-border/50'
            )}>
              <Globe className={cn(
                'h-5 w-5',
                isLive ? 'text-green-400' : 'text-muted-foreground'
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">Mission Control</h3>
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
                  isLive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-muted text-muted-foreground border border-border/50'
                )}>
                  {isLive ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Your deployed funnel asset</p>
            </div>
          </div>

          {/* Live/Maintenance Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs"
            disabled={togglingLive}
            onClick={async () => {
              setTogglingLive(true);
              const newState = !isLive;
              // Update all pages for this project
              const { error } = await supabase
                .from('pages')
                .update({ is_published: newState })
                .eq('project_id', projectId);
              if (error) {
                toast.error('Failed to update page status');
              } else {
                setIsLive(newState);
                toast.success(newState ? 'Page is now Live' : 'Page set to Maintenance');
              }
              setTogglingLive(false);
            }}
          >
            {isLive ? (
              <><ToggleRight className="h-4 w-4 text-green-400" /> Live</>
            ) : (
              <><ToggleLeft className="h-4 w-4 text-muted-foreground" /> Offline</>
            )}
          </Button>
        </div>

        {/* URL Bar */}
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-3 border',
          isLive
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-muted/30 border-border/50'
        )}>
          <Globe className={cn(
            'h-4 w-4 shrink-0',
            isLive ? 'text-green-400' : 'text-muted-foreground'
          )} />
          <span className={cn(
            'text-sm font-mono flex-1 truncate',
            isLive ? 'text-green-400' : 'text-muted-foreground'
          )}>
            {liveUrl}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopyUrl}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {isLive && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6 grid grid-cols-2 gap-3">
        <StatCard label="Leads Captured" value={leadCount} icon={Users} glow={leadCount > 0} />
        <StatCard label="Page Views" value={viewCount} icon={Eye} />
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={handleExportCode}
          disabled={exporting}
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Download Code'}
        </Button>
        {isLive && (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="w-full gap-2 glow-button">
              <ExternalLink className="h-4 w-4" /> Visit Live Site
            </Button>
          </a>
        )}
      </div>
    </div>
    </>
  );
}
