import { Lock, Paintbrush, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export function AgencyBrandingLocked() {
  const navigate = useNavigate();

  return (
    <section className="glass relative rounded-2xl p-4 sm:p-6 mb-6 overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between mb-4 relative">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-primary" /> White-Label Branding
        </h2>
        <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide border-primary/40 text-primary">
          <Lock className="h-3 w-3" /> Innovation
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-4 relative">
        Brand IntoIQ as your own when serving clients. Upload your logo, set your color, and replace
        "IntoIQ" on shared reports and funnel pages.
      </p>

      {/* Mock preview chip */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 mb-5 relative">
        <div className="h-10 rounded-lg flex items-center px-3 gap-2 bg-gradient-to-r from-primary to-primary/70">
          <div className="h-6 w-6 rounded bg-background/90" />
          <span className="text-sm font-semibold text-primary-foreground">Your Brand</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-primary-foreground/70">
            Client View
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Preview — your logo & color on every client-facing surface.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap relative">
        <Button size="sm" onClick={() => navigate('/pricing')} className="gap-1.5">
          <Sparkles className="h-4 w-4" /> Upgrade to Innovation
        </Button>
        <span className="text-xs text-muted-foreground">$79/mo · cancel anytime</span>
      </div>
    </section>
  );
}
