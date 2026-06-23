import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, FolderKanban, CreditCard, Activity, Target, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  glowClass: string;
}

function StatCard({ label, value, icon, accent, glowClass }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative p-6 rounded-2xl border transition-all duration-500 group overflow-hidden',
        'bg-card/50 border-border/20 hover:border-border/40'
      )}
    >
      <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl', glowClass)} />
      <div className={cn('relative z-10 mb-4 opacity-40 group-hover:opacity-100 transition-opacity', accent)}>
        {icon}
      </div>
      <div className="relative z-10 text-2xl font-extralight text-foreground mb-1 tracking-tight">{value}</div>
      <div className="relative z-10 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">{label}</div>
    </div>
  );
}

export default function FounderDashboard() {
  const [stats, setStats] = useState({ users: 0, orgs: 0, projects: 0, activeSubs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [usersRes, orgsRes, projectsRes, subsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('id').eq('status', 'active'),
      ]);
      setStats({
        users: usersRes.count || 0,
        orgs: orgsRes.count || 0,
        projects: projectsRes.count || 0,
        activeSubs: (subsRes.data || []).length,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mission Control Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-primary/60 mb-2 font-medium">Into Innovations</p>
          <h2 className="text-3xl sm:text-4xl font-extralight tracking-tight text-foreground">
            Founder's <span className="text-primary">Hub</span>
          </h2>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40">System Status</div>
          <div className="flex items-center gap-2 text-primary justify-end">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs uppercase tracking-widest">Live • {stats.users} Users</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.users} icon={<Users size={16} />} accent="text-primary" glowClass="bg-primary/10" />
        <StatCard label="Organizations" value={stats.orgs} icon={<Activity size={16} />} accent="text-cyan-400" glowClass="bg-cyan-500/10" />
        <StatCard label="Projects" value={stats.projects} icon={<FolderKanban size={16} />} accent="text-foreground" glowClass="bg-white/5" />
        <StatCard label="Active Subs" value={stats.activeSubs} icon={<CreditCard size={16} />} accent="text-amber-400" glowClass="bg-amber-500/10" />
      </div>

      {/* Growth Target */}
      <div
        className="relative w-full p-8 sm:p-12 bg-card/30 border border-border/20 rounded-[2rem] backdrop-blur-xl overflow-hidden group"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-all duration-1000 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div className="space-y-1">
              <h3 className="text-[10px] uppercase tracking-[0.5em] text-primary/60 font-medium flex items-center gap-2">
                <Target className="h-3.5 w-3.5" /> Growth Target
              </h3>
              <p className="text-3xl sm:text-4xl font-extralight text-foreground tracking-tighter">
                {stats.users} <span className="text-foreground/20">/ 100</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/30 block mb-1">Progress</span>
              <span className="text-xl font-light text-primary">{Math.min(stats.users, 100)}%</span>
            </div>
          </div>
          <div className="relative h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-foreground/80 transition-all duration-1000"
              style={{ width: `${Math.min(stats.users, 100)}%` }}
            />
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[0.3em] text-muted-foreground/30 text-center">
            {stats.users < 100
              ? 'Building toward 100-user milestone'
              : '✦ Milestone Reached • Ready for Scale ✦'}
          </p>
        </div>
      </div>

    </div>
  );
}
