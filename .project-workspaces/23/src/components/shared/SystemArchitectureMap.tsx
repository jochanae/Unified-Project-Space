import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Globe, MousePointer2, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

/**
 * SystemArchitectureMap
 * ---------------------
 * The 3-step "System Map" stepper: Signal Lab → Marketing Studio → Lead Hub.
 * Each node reflects the real status of the active project so the user sees
 * their revenue system come online stage-by-stage.
 */

interface SystemArchitectureMapProps {
  projectId: string;
}

type Step = {
  label: string;
  status: string;
  desc: string;
  icon: typeof CheckCircle2;
  active: boolean;
  to: string;
};

export function SystemArchitectureMap({ projectId }: SystemArchitectureMapProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const { data: status } = useQuery({
    queryKey: ['system-architecture-map', projectId, orgId],
    enabled: !!projectId && !!orgId,
    queryFn: async () => {
      const [signalRes, pagesRes, leadsRes] = await Promise.all([
        supabase
          .from('project_context')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('context_type', 'signal_lab'),
        supabase
          .from('pages')
          .select('id, is_published', { count: 'exact' })
          .eq('project_id', projectId),
        supabase
          .from('lead_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId),
      ]);

      const signalCount = signalRes.count ?? 0;
      const totalPages = pagesRes.count ?? 0;
      const livePages = (pagesRes.data || []).filter((p: any) => p.is_published).length;
      const leadCount = leadsRes.count ?? 0;

      return { signalCount, totalPages, livePages, leadCount };
    },
  });

  const signalDone = (status?.signalCount ?? 0) > 0;
  const studioLive = (status?.livePages ?? 0) > 0;
  const leadsCaptured = (status?.leadCount ?? 0) > 0;

  const steps: Step[] = [
    {
      label: 'Signal Lab',
      status: signalDone ? 'Verified' : 'Pending',
      desc: signalDone ? 'Identity Lock active' : 'Lock your message first',
      icon: signalDone ? CheckCircle2 : Circle,
      active: signalDone,
      to: '/signal-lab',
    },
    {
      label: 'Marketing Studio',
      status: studioLive ? 'Live' : status?.totalPages ? 'Drafted' : 'Idle',
      desc: studioLive
        ? `${status?.livePages} live ${status?.livePages === 1 ? 'page' : 'pages'}`
        : status?.totalPages
        ? 'Ready to deploy'
        : 'No assets yet',
      icon: Globe,
      active: studioLive,
      to: '/workspace',
    },
    {
      label: 'Lead Hub',
      status: leadsCaptured ? 'Capturing' : 'Standby',
      desc: leadsCaptured
        ? `${status?.leadCount} ${status?.leadCount === 1 ? 'signal' : 'signals'} captured`
        : 'Awaiting first lead',
      icon: MousePointer2,
      active: leadsCaptured,
      to: '/dashboard',
    },
  ];

  return (
    <section className="glass rounded-3xl border border-border/30 p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            System Architecture
          </p>
          <h3 className="mt-1 text-lg font-serif tracking-tight text-foreground">
            Your revenue engine, end-to-end
          </h3>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto md:flex md:items-start md:justify-between">
        {/* Connector line */}
        <div
          className="absolute left-4 right-4 md:left-0 md:right-0 h-px top-8 -z-0"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, hsl(var(--primary) / 0.35) 15%, hsl(var(--primary) / 0.35) 85%, transparent 100%)',
          }}
        />

        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.label}
              onClick={() => navigate(step.to)}
              className="relative z-10 flex flex-col items-center text-center group flex-1 min-w-0"
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border transition-all shadow-lg ${
                  step.active
                    ? 'bg-primary/10 border-primary/40 group-hover:border-primary/60 shadow-primary/10'
                    : 'bg-background border-border/40 group-hover:border-border/70'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    step.active ? 'text-primary' : 'text-muted-foreground/60'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <h4 className="text-foreground font-bold text-sm">{step.label}</h4>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    step.active ? 'text-primary' : 'text-muted-foreground/60'
                  }`}
                >
                  {step.status}
                </p>
                <p className="text-xs text-muted-foreground max-w-[140px] mx-auto">
                  {step.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
