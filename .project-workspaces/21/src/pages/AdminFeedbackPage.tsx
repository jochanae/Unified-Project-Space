import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, ChevronDown, ChevronUp, Shield, Image, ShoppingBag, MessageSquare, UserCircle, BookOpen, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackRow {
  id: string;
  user_name: string;
  overall_rating: number;
  // Onboarding
  signup_experience: string | null;
  onboarding_clarity: string | null;
  cami_matched: string | null;
  think_freely_found: string | null;
  // Image gen
  selfie_worked: string | null;
  gift_image_worked: string | null;
  studio_avatar_worked: string | null;
  image_gen_bugs: string | null;
  // Features
  studio_experience: string | null;
  conversation_quality: number | null;
  threads_experience: string | null;
  found_plans: string | null;
  // Thoughts
  bugs_encountered: string | null;
  liked_most: string | null;
  frustrated_by: string | null;
  missing_feature: string | null;
  testimonial_quote: string | null;
  device_info: string | null;
  created_at: string;
}

function MiniStars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= count ? 'fill-primary text-primary' : 'text-muted-foreground/20'}`} />
      ))}
    </div>
  );
}

function Pill({ label, value, color = 'default' }: { label: string; value: string; color?: 'default' | 'green' | 'red' | 'yellow' }) {
  const colors = {
    default: 'bg-muted/40 text-muted-foreground border-border/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${colors[color]}`}>
      {label}: {value}
    </span>
  );
}

function imageGenColor(value: string | null): 'default' | 'green' | 'red' | 'yellow' {
  if (!value) return 'default';
  if (value.includes('worked') || value.includes('appeared') || value.includes('generated')) return 'green';
  if (value.includes('failed') || value.includes('no image')) return 'red';
  return 'yellow';
}

function FeedbackCard({ fb }: { fb: FeedbackRow }) {
  const [expanded, setExpanded] = useState(false);
  const [imgExpanded, setImgExpanded] = useState(false);

  const hasImageGenData = fb.selfie_worked || fb.gift_image_worked || fb.studio_avatar_worked || fb.image_gen_bugs;
  const hasOnboardingData = fb.signup_experience || fb.onboarding_clarity || fb.cami_matched || fb.think_freely_found;
  const hasFeaturesData = fb.studio_experience || fb.threads_experience || fb.found_plans;
  const hasTextData = fb.bugs_encountered || fb.liked_most || fb.frustrated_by || fb.missing_feature || fb.testimonial_quote;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{fb.user_name || 'Anonymous'}</p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MiniStars count={fb.overall_rating} />
          {fb.conversation_quality && (
            <span className="text-[11px] text-muted-foreground">Chat: {fb.conversation_quality}/5</span>
          )}
        </div>
      </div>

      {/* Onboarding pills */}
      {hasOnboardingData && (
        <div className="flex flex-wrap gap-1.5">
          {fb.signup_experience && <Pill label="Signup" value={fb.signup_experience} />}
          {fb.onboarding_clarity && <Pill label="Onboarding" value={fb.onboarding_clarity} />}
          {fb.cami_matched && <Pill label="Cami" value={fb.cami_matched} />}
          {fb.think_freely_found && <Pill label="Think Freely" value={fb.think_freely_found} />}
        </div>
      )}

      {/* Image gen summary row */}
      {hasImageGenData && (
        <div>
          <button onClick={() => setImgExpanded(!imgExpanded)} className="flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors mb-1.5">
            <Image className="h-3.5 w-3.5" />
            Image Generation Results
            {imgExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {imgExpanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pl-4 border-l border-primary/20 ml-1.5">
              <div className="flex flex-wrap gap-1.5">
                {fb.selfie_worked && <Pill label="💬 Selfie in chat" value={fb.selfie_worked} color={imageGenColor(fb.selfie_worked)} />}
                {fb.gift_image_worked && <Pill label="🎁 Gift image" value={fb.gift_image_worked} color={imageGenColor(fb.gift_image_worked)} />}
                {fb.studio_avatar_worked && <Pill label="🎨 Studio avatar" value={fb.studio_avatar_worked} color={imageGenColor(fb.studio_avatar_worked)} />}
              </div>
              {fb.image_gen_bugs && (
                <div className="text-xs text-red-400/80 bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/10">
                  <p className="font-medium mb-0.5">Image bugs:</p>
                  <p>{fb.image_gen_bugs}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Features pills */}
      {hasFeaturesData && (
        <div className="flex flex-wrap gap-1.5">
          {fb.studio_experience && <Pill label="Studio" value={fb.studio_experience} />}
          {fb.threads_experience && <Pill label="Threads" value={fb.threads_experience} />}
          {fb.found_plans && <Pill label="Plans" value={fb.found_plans} />}
        </div>
      )}

      {/* Expandable text details */}
      {hasTextData && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Collapse' : 'View written feedback'}
          </button>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 text-sm border-t border-border/30 pt-3">
              {fb.liked_most && (
                <div>
                  <p className="text-[11px] font-medium text-green-400/70 mb-0.5">💚 Liked most</p>
                  <p className="text-muted-foreground">{fb.liked_most}</p>
                </div>
              )}
              {fb.frustrated_by && (
                <div>
                  <p className="text-[11px] font-medium text-red-400/70 mb-0.5">🔴 Frustrated by</p>
                  <p className="text-muted-foreground">{fb.frustrated_by}</p>
                </div>
              )}
              {fb.bugs_encountered && (
                <div>
                  <p className="text-[11px] font-medium text-yellow-400/70 mb-0.5">🐛 Bugs</p>
                  <p className="text-muted-foreground">{fb.bugs_encountered}</p>
                </div>
              )}
              {fb.missing_feature && (
                <div>
                  <p className="text-[11px] font-medium text-primary/70 mb-0.5">✨ Missing feature</p>
                  <p className="text-muted-foreground">{fb.missing_feature}</p>
                </div>
              )}
              {fb.testimonial_quote && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-[11px] font-medium text-primary/70 mb-1">💛 Quote</p>
                  <p className="text-foreground italic">"{fb.testimonial_quote}"</p>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// ── Image generation stats ───────────────────────────────────────────────────

function ImageGenStats({ feedback }: { feedback: FeedbackRow[] }) {
  const countResult = (field: keyof FeedbackRow, keyword: string) =>
    feedback.filter(f => typeof f[field] === 'string' && (f[field] as string).includes(keyword)).length;

  const stats = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Selfie in Chat',
      worked: countResult('selfie_worked', 'worked'),
      failed: countResult('selfie_worked', 'failed'),
      skipped: countResult('selfie_worked', "Didn't"),
    },
    {
      icon: <ShoppingBag className="h-4 w-4" />,
      label: 'Gift Shop Image',
      worked: countResult('gift_image_worked', 'appeared'),
      failed: countResult('gift_image_worked', 'no image'),
      skipped: countResult('gift_image_worked', "Didn't"),
    },
    {
      icon: <UserCircle className="h-4 w-4" />,
      label: 'Studio Avatar',
      worked: countResult('studio_avatar_worked', 'generated'),
      failed: countResult('studio_avatar_worked', 'failed'),
      skipped: countResult('studio_avatar_worked', "Didn't"),
    },
  ];

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Image className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Image Generation Summary</h3>
      </div>
      {stats.map(({ icon, label, worked, failed, skipped }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-primary/70 flex-shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{label}</p>
            <div className="flex gap-3 mt-0.5">
              <span className="text-[11px] text-green-400">✓ {worked} worked</span>
              <span className="text-[11px] text-red-400">✗ {failed} failed</span>
              <span className="text-[11px] text-muted-foreground/60">— {skipped} skipped</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data: roleData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!roleData) { navigate('/'); return; }
      setAuthorized(true);
      const { data, error } = await supabase.from('beta_feedback' as any).select('*').order('created_at', { ascending: false });
      if (!error && data) setFeedback(data as any);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (!authorized) return null;

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.overall_rating, 0) / feedback.length).toFixed(1)
    : '—';

  const avgChat = (() => {
    const rows = feedback.filter(f => f.conversation_quality);
    if (!rows.length) return '—';
    return (rows.reduce((s, f) => s + (f.conversation_quality ?? 0), 0) / rows.length).toFixed(1);
  })();

  const hasImageGenBugs = feedback.filter(f => f.image_gen_bugs).length;

  const exportCSV = () => {
    const headers = ['user_name','created_at','overall_rating','signup_experience','onboarding_clarity','cami_matched','think_freely_found','selfie_worked','gift_image_worked','studio_avatar_worked','image_gen_bugs','studio_experience','conversation_quality','threads_experience','found_plans','bugs_encountered','liked_most','frustrated_by','missing_feature','testimonial_quote'];
    const rows = feedback.map(f => headers.map(h => JSON.stringify((f as any)[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'beta_feedback.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" />Back to Admin
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Beta Feedback</h1>
        </div>
        {feedback.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-full px-3 py-1.5 hover:bg-muted/30 transition-all">
            <Download className="h-3 w-3" />Export CSV
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { value: feedback.length, label: 'Submissions' },
          { value: avgRating, label: 'Avg Rating' },
          { value: avgChat, label: 'Avg Chat' },
          { value: hasImageGenBugs, label: 'Image Bugs' },
        ].map(({ value, label }) => (
          <div key={label} className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Image gen summary */}
      {feedback.length > 0 && <div className="mb-6"><ImageGenStats feedback={feedback} /></div>}

      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-10">Loading feedback...</p>
      ) : feedback.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-10">No feedback yet.</p>
      ) : (
        <div className="space-y-4">
          {feedback.map((fb) => <FeedbackCard key={fb.id} fb={fb} />)}
        </div>
      )}
    </div>
  );
}
