import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PulseCommandMapProps {
  projectId: string;
  onLeakNodes?: (nodes: StepNode[]) => void;
}

export interface StepNode {
  id: string;
  title: string;
  step_type: string;
  views: number;
  leads: number;
  rate: number;
}

export function PulseCommandMap({ projectId, onLeakNodes }: PulseCommandMapProps) {
  const [pulseFrame, setPulseFrame] = useState(0);

  // Animate pulse
  useEffect(() => {
    const interval = setInterval(() => setPulseFrame(f => f + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch funnel steps
  const { data: steps } = useQuery({
    queryKey: ['pulse-steps', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('funnel_steps')
        .select('id, title, step_type, order_index')
        .eq('project_id', projectId)
        .order('order_index');
      return data || [];
    },
  });

  // Fetch pages for these steps
  const { data: pages } = useQuery({
    queryKey: ['pulse-pages', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pages')
        .select('id, funnel_step_id')
        .eq('project_id', projectId);
      return data || [];
    },
  });

  const pageIds = useMemo(() => (pages || []).map(p => p.id), [pages]);

  // Last 7 days views + leads
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  const { data: views } = useQuery({
    queryKey: ['pulse-views', pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      const { data } = await supabase
        .from('page_views')
        .select('id, page_id')
        .in('page_id', pageIds)
        .gte('created_at', weekAgo);
      return data || [];
    },
    enabled: pageIds.length > 0,
  });

  const { data: submissions } = useQuery({
    queryKey: ['pulse-leads', pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      const { data } = await supabase
        .from('form_submissions')
        .select('id, page_id')
        .in('page_id', pageIds)
        .gte('created_at', weekAgo);
      return data || [];
    },
    enabled: pageIds.length > 0,
  });

  // Build nodes
  const nodes: StepNode[] = useMemo(() => {
    if (!steps?.length) return [];
    const viewMap: Record<string, number> = {};
    const subMap: Record<string, number> = {};
    views?.forEach(v => { viewMap[v.page_id] = (viewMap[v.page_id] || 0) + 1; });
    submissions?.forEach(s => { subMap[s.page_id] = (subMap[s.page_id] || 0) + 1; });

    return steps.map(step => {
      const stepPages = (pages || []).filter(p => p.funnel_step_id === step.id);
      const v = stepPages.reduce((sum, p) => sum + (viewMap[p.id] || 0), 0);
      const l = stepPages.reduce((sum, p) => sum + (subMap[p.id] || 0), 0);
      return { id: step.id, title: step.title, step_type: step.step_type, views: v, leads: l, rate: v > 0 ? (l / v) * 100 : 0 };
    });
  }, [steps, pages, views, submissions]);

  // Push nodes to parent for leak detection
  useEffect(() => {
    onLeakNodes?.(nodes);
  }, [nodes, onLeakNodes]);

  const maxViews = Math.max(...nodes.map(n => n.views), 1);

  if (!nodes.length) {
    return (
      <div className="glass rounded-2xl border border-primary/20 p-8 text-center">
        <div className="relative mx-auto w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
          <Activity className="h-6 w-6 text-primary/40 absolute inset-0 m-auto" />
        </div>
        <p className="text-sm font-medium text-foreground/80">Awaiting your first launch</p>
        <p className="text-xs text-muted-foreground mt-1">Build and publish a funnel to see live traffic flow here.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-border/30 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pulse Command Map</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Traffic Flow</span>
      </div>

      <div className="p-5 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-fit">
          {nodes.map((node, i) => {
            const intensity = node.views / maxViews;
            const pipeWidth = i < nodes.length - 1
              ? nodes[i + 1].views > 0
                ? Math.max((nodes[i + 1].views / node.views) * 100, 20)
                : 20
              : 0;
            const isPulsing = pulseFrame % nodes.length === i;

            return (
              <div key={node.id} className="flex items-center">
                {/* Node */}
                <div
                  className={cn(
                    'relative w-[110px] sm:w-[130px] rounded-xl border p-3 transition-all duration-700',
                    'bg-card/60 backdrop-blur-md',
                    isPulsing
                      ? 'border-primary/60 shadow-[0_0_25px_hsl(var(--primary)/0.2)]'
                      : 'border-border/30'
                  )}
                >
                  {/* Glow ring */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-[0.08] pointer-events-none transition-opacity duration-700"
                    style={{
                      background: `radial-gradient(circle, hsl(var(--primary)), transparent 70%)`,
                      opacity: isPulsing ? 0.12 : intensity * 0.06,
                    }}
                  />

                  <div className="relative">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{node.step_type}</p>
                    <p className="text-xs font-medium truncate mb-2">{node.title}</p>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" /> {node.views}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users className="h-2.5 w-2.5" /> {node.leads}
                      </span>
                    </div>

                    {/* Mini conversion bar */}
                    <div className="h-1 rounded-full bg-muted/30 mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(node.rate, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">{node.rate.toFixed(1)}% conv.</p>
                  </div>
                </div>

                {/* Animated pipe */}
                {i < nodes.length - 1 && (
                  <div className="relative w-12 sm:w-16 h-8 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 64 32">
                      {/* Pipe background */}
                      <line
                        x1="0" y1="16" x2="64" y2="16"
                        stroke="hsl(var(--border))"
                        strokeWidth={Math.max(pipeWidth / 20, 2)}
                        strokeOpacity="0.3"
                      />
                      {/* Animated flow */}
                      <line
                        x1="0" y1="16" x2="64" y2="16"
                        stroke="hsl(var(--primary))"
                        strokeWidth={Math.max(pipeWidth / 25, 1.5)}
                        strokeDasharray="8 6"
                        strokeOpacity="0.6"
                        className="animate-pulse"
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from="28" to="0"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </line>
                      {/* Arrow */}
                      <polygon
                        points="56,11 64,16 56,21"
                        fill="hsl(var(--primary))"
                        fillOpacity="0.5"
                      />
                    </svg>

                    {/* Drop-off label */}
                    {node.views > 0 && nodes[i + 1].views > 0 && (
                      <span className="absolute -bottom-1 text-[8px] text-muted-foreground/50">
                        {((1 - nodes[i + 1].views / node.views) * 100).toFixed(0)}% drop
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
