import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FolderKanban, TrendingUp, Users, BarChart3 } from 'lucide-react';

interface ProjectStats {
  total: number;
  active: number;
  archived: number;
  uniqueOrgs: number;
  thisWeek: number;
  thisMonth: number;
  avgPerOrg: string;
}

export default function AdminProjectsTab() {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('status, created_at, org_id')
        .limit(1000);

      if (!data) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const uniqueOrgs = new Set(data.map(p => p.org_id)).size;
      const active = data.filter(p => p.status === 'active').length;
      const archived = data.filter(p => p.status !== 'active').length;
      const thisWeek = data.filter(p => p.created_at && new Date(p.created_at) >= weekAgo).length;
      const thisMonth = data.filter(p => p.created_at && new Date(p.created_at) >= monthAgo).length;

      setStats({
        total: data.length,
        active,
        archived,
        uniqueOrgs,
        thisWeek,
        thisMonth,
        avgPerOrg: uniqueOrgs > 0 ? (data.length / uniqueOrgs).toFixed(1) : '0',
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />;
  if (!stats) return <p className="text-sm text-muted-foreground text-center py-8">Unable to load project stats</p>;

  const statCards: { icon: typeof FolderKanban; label: string; value: string | number; sub?: string }[] = [
    { icon: FolderKanban, label: 'Total Projects', value: stats.total, sub: `${stats.active} active · ${stats.archived} archived` },
    { icon: Users, label: 'Unique Creators', value: stats.uniqueOrgs, sub: `${stats.avgPerOrg} projects per creator avg` },
    { icon: TrendingUp, label: 'New This Week', value: stats.thisWeek, sub: `${stats.thisMonth} this month` },
    { icon: BarChart3, label: 'Active Rate', value: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : '—', sub: 'of all projects are active' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Platform-wide project metrics — individual project content is private to each creator.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/30">
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-0.5">{card.value}</p>
                    {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
