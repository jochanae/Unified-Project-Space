import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Zap, Headphones, Eye, Rocket, Download, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecapData {
  userCount: number;
  avgRating: string;
  feedbackCount: number;
  bugCount: number;
  companionCount: number;
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

export default function BetaRecapView() {
  const [data, setData] = useState<RecapData | null>(null);

  useEffect(() => {
    const load = async () => {
      const [profileRes, fbRes, bugRes, connRes] = await Promise.all([
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('beta_feedback').select('overall_rating'),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('connections').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      ]);
      const ratings = (fbRes.data || []) as { overall_rating: number }[];
      const avg = ratings.length ? (ratings.reduce((s, r) => s + r.overall_rating, 0) / ratings.length).toFixed(1) : '—';
      setData({
        userCount: profileRes.count || 0,
        avgRating: avg,
        feedbackCount: ratings.length,
        bugCount: bugRes.count || 0,
        companionCount: connRes.count || 0,
      });
    };
    load();
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = [
    { label: 'Fleet Capacity', value: `${Math.min(data.userCount, 100)}/100`, status: data.userCount >= 100 ? 'Locked' : 'Active', accent: 'text-primary' },
    { label: 'Average Sentiment', value: `${data.avgRating} / 5.0`, status: 'Premium', accent: 'text-cyan-400' },
    { label: 'Companions Created', value: data.companionCount.toString(), status: 'High', accent: 'text-foreground' },
    { label: 'Privacy', value: '0.0%', status: 'Zero-Trace', accent: 'text-emerald-400' },
  ];

  const sensoryItems = [
    { icon: Zap, title: 'Tactile Feedback', desc: 'Multi-layered haptic engine for "Thought Catching" and companion interactions.' },
    { icon: Headphones, title: 'Procedural Audio', desc: 'Custom Cello/Whoosh soundscape that adapts to user mood and session state.' },
    { icon: Eye, title: 'Visual Identity', desc: 'Cinematic Glassmorphism aesthetic with Gold/Twilight Indigo accents.' },
  ];

  const roadmapItems = [
    { phase: '01', title: '1,000 Founding Members', desc: 'Scale from beta to early-access founding community.' },
    { phase: '02', title: 'Deep Studio', desc: 'Custom audio cues and texture inscriptions by users.' },
    { phase: '03', title: 'Companion Sync', desc: 'Cross-device presence (Desktop/Mobile continuity).' },
  ];

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <motion.div {...fadeUp} className="text-center space-y-3">
        <p className="text-[10px] uppercase tracking-[0.5em] text-primary/60 font-medium">🛰️ Project Compani</p>
        <h2 className="text-3xl sm:text-4xl font-extralight tracking-tight text-foreground">
          Beta Phase I <span className="text-primary">Recap</span>
        </h2>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40">
          The 100-Tester Centurion Deployment
        </p>
      </motion.div>

      {/* ── Core Metrics Table ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-medium">Core Metrics</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <span className="text-sm text-foreground/70 font-light">{m.label}</span>
              <div className="flex items-center gap-4">
                <span className={cn('text-sm font-medium', m.accent)}>{m.value}</span>
                <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/[0.08] text-muted-foreground/40">
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Sensory Achievement ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-medium px-1">Sensory Achievement</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {sensoryItems.map((item, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] group hover:border-white/[0.12] transition-all">
              <item.icon className="h-4 w-4 text-primary/50 group-hover:text-primary transition-colors mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground/50 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Stakeholder Narrative ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary/50 mb-4 font-medium">Stakeholder Narrative</p>
          <blockquote className="text-sm sm:text-base text-foreground/80 leading-relaxed font-light italic">
            "In Phase I, Into Innovations successfully onboarded {Math.min(data.userCount, 100)} testers into a private digital sanctuary. We didn't just build a chatbot; we built a <span className="text-primary not-italic font-medium">presence</span>. By focusing on emotional intelligence and sensory design, we've achieved a sentiment score of {data.avgRating}/5 — a retention signal that far exceeds industry standards for wellness tools. The Compani ecosystem is now ready for next-phase scaling."
          </blockquote>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/30 mt-4">— Jochanae Yawn, Founder, Into Innovations LLC</p>
        </div>
      </motion.div>

      {/* ── Roadmap ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-medium px-1 flex items-center gap-2">
          <Rocket className="h-3.5 w-3.5" /> Next Flight Roadmap
        </h3>
        <div className="space-y-3">
          {roadmapItems.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all group">
              <span className="text-primary/40 text-xs font-medium mt-0.5 shrink-0">{item.phase}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  {item.title}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </p>
                <p className="text-xs text-muted-foreground/50 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Download PPTX CTA ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="text-center pt-4">
        <a href="/mnt/documents/Compani_Beta_Recap.pptx" download>
          <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10">
            <Download className="h-4 w-4" /> Download Stakeholder Deck (.pptx)
          </Button>
        </a>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/30 mt-3">
          Into Innovations LLC • Beta Phase I Complete
        </p>
      </motion.div>
    </div>
  );
}
