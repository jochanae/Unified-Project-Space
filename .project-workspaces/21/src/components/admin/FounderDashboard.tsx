import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Users, MessageSquare, AlertCircle, Star, Zap, Target, Trash2, CheckCircle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CenturionCelebration from './CenturionCelebration';
import BlueprintAnalyticsCard from './BlueprintAnalyticsCard';

interface FeedbackRow {
  id: string;
  user_id: string;
  user_name: string;
  overall_rating: number;
  liked_most: string | null;
  frustrated_by: string | null;
  bugs_encountered: string | null;
  missing_feature: string | null;
  created_at: string;
}

interface BugRow {
  id: string;
  error_message: string;
  error_stack: string | null;
  page_url: string | null;
  created_at: string;
  status: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  glowClass: string;
}

function StatCard({ label, value, icon, accent, glowClass }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative p-6 rounded-2xl border transition-all duration-500 group overflow-hidden',
        'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15]'
      )}
    >
      <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl', glowClass)} />
      <div className={cn('relative z-10 mb-4 opacity-40 group-hover:opacity-100 transition-opacity', accent)}>
        {icon}
      </div>
      <div className="relative z-10 text-2xl font-extralight text-foreground mb-1 tracking-tight">{value}</div>
      <div className="relative z-10 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">{label}</div>
    </motion.div>
  );
}

export default function FounderDashboard() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [bugCount, setBugCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBugs, setShowBugs] = useState(false);
  const [centurionTriggered, setCenturionTriggered] = useState(false);
  const centurionFiredRef = useState(() => false);

  // Fire Centurion push notification to all admins (once per session)
  const fireCenturionAlert = useCallback(async () => {
    if (centurionFiredRef[0]) return;
    centurionFiredRef[0] = true;

    try {
      // Get admin user IDs
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (!adminRoles?.length) return;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: adminRoles.map(r => r.user_id),
          title: '[Into Innovations] 🛩️ Milestone Achieved',
          body: 'Centurion Protocol Active. The 100th tester has boarded. Fleet capacity is now at 100%. Ready for next-phase deployment.',
          tag: 'centurion-milestone',
          url: '/admin',
        },
      });
      toast.success('Centurion milestone push sent to all admins');
    } catch (err) {
      console.error('Centurion push failed:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const [fbRes, profileRes, bugRes, bugListRes] = await Promise.all([
        supabase.from('beta_feedback').select('id, user_id, user_name, overall_rating, liked_most, frustrated_by, bugs_encountered, missing_feature, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('bug_reports').select('id, error_message, error_stack, page_url, created_at, status').eq('status', 'open').order('created_at', { ascending: false }).limit(50),
      ]);
      setFeedback((fbRes.data as FeedbackRow[]) || []);
      const count = profileRes.count || 0;
      setUserCount(count);
      setBugCount(bugRes.count || 0);
      setBugs((bugListRes.data as BugRow[]) || []);
      setLoading(false);

      // Trigger Centurion celebration at 100+
      if (count >= 100) {
        const alreadyCelebrated = sessionStorage.getItem('centurion-celebrated');
        if (!alreadyCelebrated) {
          sessionStorage.setItem('centurion-celebrated', '1');
          setCenturionTriggered(true);
          fireCenturionAlert();
        }
      }
    };
    load();
  }, []);

  const avgVibe = useMemo(() => {
    if (!feedback.length) return '—';
    const avg = feedback.reduce((s, f) => s + f.overall_rating, 0) / feedback.length;
    return avg.toFixed(1);
  }, [feedback]);

  // Build a unified "inscriptions" feed from feedback
  const inscriptions = useMemo(() => {
    const items: { id: string; text: string; userId: string; score: number; timestamp: string }[] = [];
    for (const f of feedback) {
      const texts = [
        f.liked_most && { text: f.liked_most, label: 'liked' },
        f.frustrated_by && { text: f.frustrated_by, label: 'pain' },
        f.bugs_encountered && { text: f.bugs_encountered, label: 'bug' },
        f.missing_feature && { text: f.missing_feature, label: 'wish' },
      ].filter(Boolean) as { text: string; label: string }[];

      for (const t of texts) {
        items.push({
          id: `${f.id}-${t.label}`,
          text: t.text,
          userId: f.user_id,
          score: f.overall_rating,
          timestamp: new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }
    }
    return items.slice(0, 20);
  }, [feedback]);

  const betaProgress = Math.min(userCount, 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <CenturionCelebration triggered={centurionTriggered} />
    <div className="space-y-8">
      {/* ── Mission Control Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-primary/60 mb-2 font-medium">Into Innovations</p>
          <h2 className="text-3xl sm:text-4xl font-extralight tracking-tight text-foreground">
            Founder's <span className="text-primary">Hub</span>
          </h2>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40">System Status</div>
          <div className="flex items-center gap-2 text-cyan-400 justify-end">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-xs uppercase tracking-widest">Live • {userCount} Testers</span>
          </div>
        </div>
      </div>

      {/* ── Centurion Milestone Gauge ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative w-full p-8 sm:p-12 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] sm:rounded-[2.5rem] backdrop-blur-2xl overflow-hidden group"
      >
        {/* Decorative corner glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-all duration-1000 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div className="space-y-1">
              <h3 className="text-[10px] uppercase tracking-[0.5em] text-primary/60 font-medium flex items-center gap-2">
                <Target className="h-3.5 w-3.5" />
                Alpha to Beta Transition
              </h3>
              <p className="text-3xl sm:text-4xl font-extralight text-foreground tracking-tighter">
                {betaProgress} <span className="text-foreground/20">/ 100</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/30 block mb-1">Fleet Readiness</span>
              <span className="text-xl font-light text-primary">{betaProgress}%</span>
            </div>
          </div>

          {/* Cinematic Progress Bar */}
          <div className="relative h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${betaProgress}%` }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-foreground/80 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
            />
            {/* Shimmer sweep overlay */}
            <div
              className="absolute top-0 left-0 h-full w-full animate-pulse"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, hsl(var(--foreground) / 0.08) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-sweep 3s ease-in-out infinite',
              }}
            />
          </div>

          <p className="mt-6 text-[9px] uppercase tracking-[0.3em] text-muted-foreground/30 text-center">
            {betaProgress < 100
              ? 'Awaiting final clearance for 100-tester deployment'
              : '✦ Fleet Capacity Reached • Ready for Full Launch ✦'}
          </p>

          {betaProgress >= 100 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-primary mt-3 flex items-center justify-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" /> Milestone reached — 100 founding testers onboarded
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* ── Stats Bento Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Insights"
          value={feedback.length}
          icon={<MessageSquare size={16} />}
          accent="text-primary"
          glowClass="bg-primary/10"
        />
        <StatCard
          label="Avg. Vibe Score"
          value={avgVibe}
          icon={<Star size={16} />}
          accent="text-cyan-400"
          glowClass="bg-cyan-500/10"
        />
        <StatCard
          label="Active Testers"
          value={userCount}
          icon={<Users size={16} />}
          accent="text-foreground"
          glowClass="bg-white/5"
        />
        <div className="cursor-pointer" onClick={() => setShowBugs(!showBugs)}>
          <StatCard
            label="Open Bugs"
            value={bugCount}
            icon={<AlertCircle size={16} />}
            accent="text-red-400"
            glowClass="bg-red-500/10"
          />
        </div>
      </div>

      {/* ── Bug Reports Panel ── */}
      <AnimatePresence>
        {showBugs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 sm:p-8 backdrop-blur-xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-medium flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                Open Bug Reports ({bugs.length})
              </h3>
              {bugs.length > 0 && (
                <button
                  onClick={async () => {
                    await supabase.from('bug_reports').update({ status: 'resolved', resolved_at: new Date().toISOString(), admin_notes: 'Bulk resolved from Founder Hub' } as any).eq('status', 'open');
                    setBugs([]);
                    setBugCount(0);
                    toast.success('All bug reports resolved');
                  }}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-destructive hover:text-destructive/80 transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Resolve All
                </button>
              )}
            </div>

            {bugs.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 italic py-6 text-center">🎉 No open bugs — clean slate</p>
            ) : (
              <div className="space-y-3">
                {bugs.map(bug => (
                  <div key={bug.id} className="group p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground/80 truncate">{bug.error_message}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/30">
                            {new Date(bug.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {bug.page_url && (
                            <span className="text-[9px] text-cyan-500/40 truncate max-w-[150px]">
                              {bug.page_url.replace(/https?:\/\/[^/]+/, '').split('?')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            const full = `Error: ${bug.error_message}\nRoute: ${bug.page_url || 'N/A'}\nTime: ${new Date(bug.created_at).toLocaleString()}\n\nStack:\n${bug.error_stack || 'N/A'}`;
                            navigator.clipboard.writeText(full).then(() => toast.success('Bug details copied'));
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] transition-all"
                          aria-label="Copy bug details"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={async () => {
                            await supabase.from('bug_reports').update({ status: 'resolved', resolved_at: new Date().toISOString() } as any).eq('id', bug.id);
                            setBugs(prev => prev.filter(b => b.id !== bug.id));
                            setBugCount(prev => Math.max(0, prev - 1));
                            toast.success('Bug resolved');
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] transition-all"
                          aria-label="Resolve bug"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Blueprint Analytics ── */}
      <BlueprintAnalyticsCard />

      {/* ── Recent Inscriptions Feed ── */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 sm:p-8 backdrop-blur-xl">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 mb-6 font-medium">Recent Inscriptions</h3>
        {inscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground/40 italic py-8 text-center">No feedback yet — awaiting tester voices</p>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {inscriptions.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group flex gap-4 sm:gap-6 p-3 sm:p-4 rounded-xl hover:bg-white/[0.02] transition-all border border-transparent hover:border-white/[0.05]"
                >
                  <div className="text-primary text-xs font-medium pt-0.5 shrink-0 tabular-nums w-5 text-right">
                    {item.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80 leading-relaxed italic truncate sm:whitespace-normal">
                      "{item.text}"
                    </p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/30">
                        User_{item.userId.slice(0, 5)}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-cyan-500/50">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
