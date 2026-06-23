import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Users, Mail, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  step: { id: string; title: string; step_type?: string; views: number; leads: number } | null;
  projectId?: string;
}

export function StageDrilldownDialog({ open, onClose, step, projectId }: Props) {
  const navigate = useNavigate();

  const { data: pages } = useQuery({
    queryKey: ['stage-drilldown-pages', step?.id],
    enabled: open && !!step?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, slug, title, is_published')
        .eq('funnel_step_id', step!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const pageIds = (pages || []).map((p) => p.id);

  const { data: recentLeads } = useQuery({
    queryKey: ['stage-drilldown-leads', step?.id, pageIds],
    enabled: open && pageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('id, page_id, created_at, contact_id')
        .in('page_id', pageIds)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  if (!step) return null;

  const cvr = step.views > 0 ? (step.leads / step.views) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-serif">
            {step.title}
          </DialogTitle>
          {step.step_type && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {step.step_type}
            </p>
          )}
        </DialogHeader>

        {/* Stage stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<Eye className="h-3 w-3" />} label="Views" value={step.views.toLocaleString()} />
          <Stat icon={<Users className="h-3 w-3" />} label="Leads" value={step.leads.toLocaleString()} />
          <Stat icon={<Mail className="h-3 w-3" />} label="CVR" value={`${cvr.toFixed(1)}%`} />
        </div>

        {/* Pages in this stage */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pages in this step</p>
          {(pages || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No pages assigned to this funnel step.</p>
          ) : (
            <div className="space-y-1.5">
              {pages!.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/20">
                  <span className="text-xs truncate">
                    {p.is_published && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />}
                    {p.title || p.slug}
                  </span>
                  {projectId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => {
                        onClose();
                        navigate(`/projects?projectId=${projectId}&page=${p.id}`);
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent leads */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent leads</p>
          {(recentLeads || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No leads captured at this step yet.</p>
          ) : (
            <div className="divide-y divide-border/10 rounded-xl border border-border/20 overflow-hidden">
              {recentLeads!.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Lead captured</span>
                  <span className="text-muted-foreground/70 tabular-nums">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/20 p-2.5 space-y-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}
