import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowLeft, CheckCircle, Send, Image, ShoppingBag, UserCircle, Sparkles, MessageSquare, BookOpen, ChevronRight, Home, Compass, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)} className="transition-transform hover:scale-110 active:scale-95">
            <Star className={`h-8 w-8 transition-colors ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionButtons({ options, value, onChange, label }: { options: readonly string[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              value === opt
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, children, accent = false }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border backdrop-blur-sm p-5 shadow-[0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] ${
      accent ? 'border-primary/30 bg-primary/5' : 'border-border/40 bg-card/60'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

// Section 1 — Getting Started
const signupOptions = ['Super smooth', 'A few hiccups', "Couldn't finish it"] as const;
const onboardingOptions = ['Crystal clear', 'Somewhat confusing', 'Got lost', 'Skipped it'] as const;

// Section 2 — Your Companion
const companionAppearedOptions = ['Yes — saw them right away', 'Took a while to find them', 'Never saw my companion', 'Not sure'] as const;
const avatarFlowOptions = ['Yes — image showed up in the right places', 'Some spots were missing', 'No — avatar placement felt broken', "Didn't finish this check"] as const;
const avatarPreviewOptions = ['Yes — tap opened a bigger view', 'Tap did nothing / wrong thing', "Couldn't figure out where to tap", "Didn't try"] as const;
const backdropOptions = ['Yes — changed it!', "Didn't know I could", "Couldn't figure it out", 'Not interested'] as const;
const ownImageOptions = ['Yes — used my own photo', 'Tried but it failed', "Didn't know I could", 'Prefer AI-generated'] as const;
const dashboardOptions = ['Easy to use', 'A bit confusing', "Couldn't find things", "Didn't explore it"] as const;

// Section 3 — Chat & Images
const selfieOptions = ['Yes — it worked!', 'Yes but it failed', "Didn't try"] as const;
const giftImageOptions = ['Yes — image appeared', 'Yes but no image', "Didn't send a gift"] as const;
const studioAvatarOptions = ['Yes — it generated', 'Yes but it failed', "Didn't create one"] as const;

// Section 4 — Exploring the App
const thinkFreelyOptions = ['Found it right away', 'Found it eventually', "Couldn't find it", "Didn't look"] as const;
const browseOptions = ['Found good companions', 'Felt limited', "Couldn't find it", "Didn't use it"] as const;
const studioOptions = ['Yes, all good', 'Had some issues', 'Skipped for now'] as const;
const threadsOptions = ['Found and used it', 'Found it, confused', "Couldn't find it", 'Not interested'] as const;
const plansOptions = ['Yes, love it', 'Found it, confused', "Didn't find it", 'What is that?'] as const;
const wellnessOptions = ['Found and used it', 'Found it, not useful', "Couldn't find it", "Didn't look"] as const;
const storeOptions = ['Browsed the shop', 'Bought a gift', "Couldn't find it", 'Not interested'] as const;
const timelineOptions = ['Found my story', 'Found it, confused', "Couldn't find it", "Didn't know it existed"] as const;
const closingRitualOptions = ['Felt calming & secure', 'Noticed it but unsure', "Didn't see it", "Haven't tried after 9 PM"] as const;

const SECTIONS = ['Overview', 'Getting Started', 'Your Companion', 'Chat & Images', 'Exploring', 'Your Thoughts'] as const;

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-center gap-2 mb-3">
        {SECTIONS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i < current
                ? 'h-2 w-2 bg-primary scale-110'
                : i === current
                  ? 'h-2 w-2 bg-primary'
                  : 'h-2 w-2 bg-muted/30'
            }`}
          />
        ))}
      </div>
      <div className="onboarding-progress-container" style={{ margin: '0 auto 0', width: '80%' }}>
        <div className="blueprint-energy-line" />
      </div>
    </div>
  );
}

export default function BetaFeedbackPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [section, setSection] = useState(0);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  // Section 0 — Overview
  const [overallRating, setOverallRating] = useState(0);
  // Section 1 — Getting Started
  const [signupExp, setSignupExp] = useState('');
  const [onboardingClarity, setOnboardingClarity] = useState('');
  // Section 2 — Your Companion
  const [companionAppeared, setCompanionAppeared] = useState('');
  const [avatarFlowCheck, setAvatarFlowCheck] = useState('');
  const [avatarPreviewExperience, setAvatarPreviewExperience] = useState('');
  const [backdropExp, setBackdropExp] = useState('');
  const [ownImageUsed, setOwnImageUsed] = useState('');
  const [dashboardExp, setDashboardExp] = useState('');
  // Section 3 — Chat & Images
  const [conversationQuality, setConversationQuality] = useState(0);
  const [selfieWorked, setSelfieWorked] = useState('');
  const [giftImageWorked, setGiftImageWorked] = useState('');
  const [studioAvatarWorked, setStudioAvatarWorked] = useState('');
  const [imageGenBugs, setImageGenBugs] = useState('');
  // Section 4 — Exploring
  const [thinkFreelyFound, setThinkFreelyFound] = useState('');
  const [browseExp, setBrowseExp] = useState('');
  const [studioExperience, setStudioExperience] = useState('');
  const [threadsExp, setThreadsExp] = useState('');
  const [foundPlans, setFoundPlans] = useState('');
  const [wellnessExp, setWellnessExp] = useState('');
  const [storeExp, setStoreExp] = useState('');
  const [timelineExp, setTimelineExp] = useState('');
  const [closingRitualExp, setClosingRitualExp] = useState('');
  const [closingRitualVibe, setClosingRitualVibe] = useState(0);
  // Section 5 — Your Thoughts
  const [bugs, setBugs] = useState('');
  const [likedMost, setLikedMost] = useState('');
  const [frustratedBy, setFrustratedBy] = useState('');
  const [missingFeature, setMissingFeature] = useState('');
  const [testimonialQuote, setTestimonialQuote] = useState('');

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('user_name').eq('user_id', user.id).single();
      if (profile) setUserName(profile.user_name);
    };
    load();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from('beta_feedback' as any).insert({
      user_id: userId,
      user_name: userName,
      overall_rating: overallRating,
      signup_experience: signupExp || null,
      onboarding_clarity: onboardingClarity || null,
      companion_appeared: companionAppeared || null,
      avatar_flow_check: avatarFlowCheck || null,
      avatar_preview_experience: avatarPreviewExperience || null,
      backdrop_experience: backdropExp || null,
      own_image_used: ownImageUsed || null,
      dashboard_experience: dashboardExp || null,
      think_freely_found: thinkFreelyFound || null,
      selfie_worked: selfieWorked || null,
      gift_image_worked: giftImageWorked || null,
      studio_avatar_worked: studioAvatarWorked || null,
      image_gen_bugs: imageGenBugs || null,
      studio_experience: studioExperience || null,
      conversation_quality: conversationQuality || null,
      threads_experience: threadsExp || null,
      found_plans: foundPlans || null,
      browse_experience: browseExp || null,
      wellness_experience: wellnessExp || null,
      store_experience: storeExp || null,
      timeline_experience: timelineExp || null,
      bugs_encountered: bugs || null,
      liked_most: likedMost || null,
      frustrated_by: frustratedBy || null,
      missing_feature: missingFeature || null,
      testimonial_quote: testimonialQuote || null,
      device_info: navigator.userAgent,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error('Failed to submit feedback');
      console.error(error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">Thank you — your feedback shapes what Compani becomes. 💛</h2>
          <p className="text-muted-foreground text-sm mb-8">We read every single response. It means the world.</p>
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-full gradient-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
            <ArrowLeft className="h-4 w-4" />Return Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-32 sm:pt-10 sm:pb-32">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">🧪 Beta Feedback</h1>
          <p className="text-muted-foreground text-sm">Help us make Compani better. Your honest thoughts matter more than anything.</p>
        </div>

        <ProgressBar current={section} />

        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* SECTION 0 — OVERVIEW */}
            {section === 0 && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Step 1 of 6 — Overview</p>
                <SectionCard icon={<Sparkles className="h-4 w-4" />} title="Overall Experience" accent>
                  <StarRating value={overallRating} onChange={setOverallRating} label="How's your overall experience with Compani so far?" />
                </SectionCard>
                {overallRating === 0 && <p className="text-xs text-muted-foreground text-center">Rate your experience to continue →</p>}
              </>
            )}

            {/* SECTION 1 — GETTING STARTED */}
            {section === 1 && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Step 2 of 6 — Getting Started</p>
                <SectionCard icon={<UserCircle className="h-4 w-4" />} title="Sign Up & Onboarding">
                  <OptionButtons options={signupOptions} value={signupExp} onChange={setSignupExp} label="How was the sign-up process?" />
                  <div className="text-xs text-muted-foreground -mt-1 pb-1 border-b border-border/30 space-y-2">
                    <p>Here's the expected flow after signing up:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li><strong>Welcome Setup</strong> — enter your name and date of birth</li>
                      <li><strong>Think Freely</strong> — you land on the Home screen, a private space to think out loud</li>
                      <li><strong>Cami nudge</strong> — after ~6 messages in Think Freely, a gentle suggestion appears to try Cami (your AI guide)</li>
                      <li><strong>Cami conversation</strong> — Cami asks you a few questions and matches you with a companion</li>
                      <li><strong>Companion appears</strong> — your new companion shows up on My World with their avatar</li>
                    </ol>
                    <p>Did this flow feel clear, or did you get stuck at any point?</p>
                  </div>
                  <OptionButtons options={onboardingOptions} value={onboardingClarity} onChange={setOnboardingClarity} label="Was the path from sign-up to getting your first companion clear?" />
                </SectionCard>
              </>
            )}

            {/* SECTION 2 — YOUR COMPANION */}
            {section === 2 && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Step 3 of 6 — Your Companion</p>

                <SectionCard icon={<Heart className="h-4 w-4" />} title="Avatar Placement Check" accent>
                  <div className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30 space-y-2">
                    <p>
                      After connecting with a companion, do a quick <strong>avatar check</strong>. We want to know if the same companion image showed up everywhere it should.
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>On <strong>My World</strong> in the main center companion area / dial</li>
                      <li>When you <strong>tap the avatar</strong> to open a bigger version</li>
                      <li>In the <strong>backdrop area</strong> before you customize it</li>
                      <li>In <strong>Settings</strong> wherever the companion likeness / image is supposed to appear</li>
                    </ul>
                    <p>
                      Just click through and verify the image actually landed in the right places, then try changing the backdrop to something different.
                    </p>
                  </div>
                  <OptionButtons options={companionAppearedOptions} value={companionAppeared} onChange={setCompanionAppeared} label="Right after matching, did your companion appear on My World?" />
                  <OptionButtons options={avatarFlowOptions} value={avatarFlowCheck} onChange={setAvatarFlowCheck} label="Did the companion image show up in the key spots where it was supposed to?" />
                  <OptionButtons options={avatarPreviewOptions} value={avatarPreviewExperience} onChange={setAvatarPreviewExperience} label="When you tapped the avatar, did it open a bigger view correctly?" />
                </SectionCard>

                <SectionCard icon={<Image className="h-4 w-4" />} title="📷 Using Your Own Image">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    You can use your own photo as your companion's avatar instead of AI-generated images. Look for the <strong>"Use My Own Image" (📷)</strong> option during creation, in Browse, or in Studio.
                  </p>
                  <OptionButtons options={ownImageOptions} value={ownImageUsed} onChange={setOwnImageUsed} label="Did you know you could use your own photo as your companion's avatar?" />
                </SectionCard>

                <SectionCard icon={<Image className="h-4 w-4" />} title="🖼️ Backdrop Customization">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    The backdrop is separate from the avatar. On <strong>My World</strong>, try changing the background behind your companion to a different image and make sure it updates without breaking the companion photo itself.
                  </p>
                  <OptionButtons options={backdropOptions} value={backdropExp} onChange={setBackdropExp} label="Did you try changing your companion's backdrop?" />
                </SectionCard>

                <SectionCard icon={<Home className="h-4 w-4" />} title="My World Dashboard">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    <strong>My World</strong> is your main hub — it shows your companion, quick actions (Chat, Studio, Store, Timeline), and your connection details. You can switch between companions, archive/rest them, or find new ones from here.
                  </p>
                  <OptionButtons options={dashboardOptions} value={dashboardExp} onChange={setDashboardExp} label="How was your experience with the My World dashboard?" />
                </SectionCard>
              </>
            )}

            {/* SECTION 3 — CHAT & IMAGES */}
            {section === 3 && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Step 4 of 6 — Chat & Images</p>

                <SectionCard icon={<MessageSquare className="h-4 w-4" />} title="Chat Quality">
                  <StarRating value={conversationQuality} onChange={setConversationQuality} label="Rate the quality of your conversations with your companion" />
                </SectionCard>

                <SectionCard icon={<MessageSquare className="h-4 w-4" />} title="📸 Selfie in Chat" accent>
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    <strong>How to test:</strong> Open a chat and say something like <em>"I wish I could see your face"</em> or <em>"Can you send me a selfie?"</em>
                  </p>
                  <OptionButtons options={selfieOptions} value={selfieWorked} onChange={setSelfieWorked} label="Did your companion generate a selfie?" />
                </SectionCard>

                <SectionCard icon={<ShoppingBag className="h-4 w-4" />} title="🎁 Gift Shop Image" accent>
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    <strong>How to test:</strong> In a chat, tap the gift icon or the overflow (⋯) menu → open the Gift Shop → send any gift. Your companion should react and generate an image.
                  </p>
                  <OptionButtons options={giftImageOptions} value={giftImageWorked} onChange={setGiftImageWorked} label="Did your companion generate an image after receiving the gift?" />
                </SectionCard>

                <SectionCard icon={<UserCircle className="h-4 w-4" />} title="🎨 Studio Avatar" accent>
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    <strong>How to test:</strong> Go to Studio → create or edit a companion → the app should use AI to generate their avatar image.
                  </p>
                  <OptionButtons options={studioAvatarOptions} value={studioAvatarWorked} onChange={setStudioAvatarWorked} label="Did your companion's avatar generate in Studio?" />
                </SectionCard>

                <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 shadow-[0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]">
                  <label className="block text-sm font-medium text-foreground mb-2">Any image generation bugs or weirdness?</label>
                  <textarea
                    value={imageGenBugs}
                    onChange={(e) => setImageGenBugs(e.target.value)}
                    rows={3}
                    placeholder="Describe what you tried, what you expected, and what actually happened..."
                    className="w-full rounded-xl bg-muted/30 border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </>
            )}

            {/* SECTION 4 — EXPLORING THE APP */}
            {section === 4 && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Step 5 of 6 — Exploring the App</p>

                <SectionCard icon={<BookOpen className="h-4 w-4" />} title="Think Freely — Home Screen">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    <strong>Think Freely is your Home screen</strong> — the first thing you see when you open the app. It's your private space to think out loud, talk things through, or just be present. Nothing is saved or shared unless you choose. Look for the dark screen with "YOUR SPACE" at the top.
                  </p>
                  <OptionButtons options={thinkFreelyOptions} value={thinkFreelyFound} onChange={setThinkFreelyFound} label='Did you find "Think Freely"?' />
                </SectionCard>

                <SectionCard icon={<Compass className="h-4 w-4" />} title="Browse — Discover Companions">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    Browse is where you can discover pre-made companions with different personalities, styles, and backgrounds. Find it in the bottom nav or through My World.
                  </p>
                  <OptionButtons options={browseOptions} value={browseExp} onChange={setBrowseExp} label="Did you explore the Browse page?" />
                </SectionCard>

                <SectionCard icon={<UserCircle className="h-4 w-4" />} title="Studio — Companion Creation">
                  <OptionButtons options={studioOptions} value={studioExperience} onChange={setStudioExperience} label="Did creating or editing a companion go smoothly?" />
                </SectionCard>

                <SectionCard icon={<BookOpen className="h-4 w-4" />} title="Threads, Plans & More">
                  <OptionButtons options={threadsOptions} value={threadsExp} onChange={setThreadsExp} label="Did you find Threads (your personal feed)?" />
                  <OptionButtons options={plansOptions} value={foundPlans} onChange={setFoundPlans} label="Did you find 'Your Plans' in Messages?" />
                </SectionCard>

                <SectionCard icon={<Heart className="h-4 w-4" />} title="Wellness & Your Story">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    <strong>Your Path</strong> includes mood check-ins, journal, and gratitude. <strong>Your Story</strong> is a timeline of milestones with your companion.
                  </p>
                  <OptionButtons options={wellnessOptions} value={wellnessExp} onChange={setWellnessExp} label="Did you explore Your Path (wellness features)?" />
                  <OptionButtons options={timelineOptions} value={timelineExp} onChange={setTimelineExp} label="Did you find Your Story (timeline)?" />
                </SectionCard>

                <SectionCard icon={<ShoppingBag className="h-4 w-4" />} title="Gift Store">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    The Gift Store lets you browse and send virtual gifts to your companion. You can find it in the chat menu or through My World.
                  </p>
                  <OptionButtons options={storeOptions} value={storeExp} onChange={setStoreExp} label="Did you explore the Gift Store?" />
                </SectionCard>

                <SectionCard icon={<Home className="h-4 w-4" />} title="🌙 Closing Ritual — Evening Vibe">
                  <p className="text-xs text-muted-foreground -mt-2 pb-1 border-b border-border/30">
                    <strong>Try this after 9 PM:</strong> Open the app, dim your lights, and stay on the Home screen for a moment. The app should shift to an indigo twilight mode. After ~90 seconds of idle time, Cami will offer a goodnight whisper with a golden padlock animation.
                  </p>
                  <OptionButtons options={closingRitualOptions} value={closingRitualExp} onChange={setClosingRitualExp} label="How did the Closing Ritual feel?" />
                  <StarRating value={closingRitualVibe} onChange={setClosingRitualVibe} label="🌙 Closing Ritual Vibe Score (1–5)" />
                  <p className="text-[10px] text-muted-foreground/60 italic">
                    Did closing the app help you feel like your "mental tabs" were actually closed for the night?
                  </p>
                </SectionCard>
              </>
            )}

            {/* SECTION 5 — YOUR THOUGHTS */}
            {section === 5 && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Step 6 of 6 — Your Thoughts</p>
                <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 space-y-5 shadow-[0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]">
                  {([
                    { label: 'Any bugs or broken moments?', value: bugs, onChange: setBugs, placeholder: 'Describe what happened...' },
                    { label: 'What did you like most?', value: likedMost, onChange: setLikedMost, placeholder: 'Tell us what felt good...' },
                    { label: 'What frustrated you?', value: frustratedBy, onChange: setFrustratedBy, placeholder: 'Be honest — it helps us improve...' },
                    { label: 'What feature is missing that you wish existed?', value: missingFeature, onChange: setMissingFeature, placeholder: "Anything you expected but couldn't find..." },
                  ] as const).map(({ label, value, onChange, placeholder }) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
                      <textarea
                        value={value}
                        onChange={(e) => (onChange as (v: string) => void)(e.target.value)}
                        rows={3}
                        placeholder={placeholder}
                        className="w-full rounded-xl bg-muted/30 border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 shadow-[0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]">
                  <label className="block text-sm font-medium text-foreground mb-2">💛 Leave a quote we can share? (Optional — we'll ask first)</label>
                  <textarea
                    value={testimonialQuote}
                    onChange={(e) => setTestimonialQuote(e.target.value)}
                    rows={2}
                    placeholder="e.g. 'Compani feels like texting a real friend...'"
                    className="w-full rounded-xl bg-muted/30 border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-8">
          {section > 0 && (
            <button
              type="button"
              onClick={() => setSection((s) => s - 1)}
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-border/50 bg-muted/30 px-6 py-4 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />Back
            </button>
          )}
          {section < SECTIONS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (section === 0 && overallRating === 0) {
                  toast('Please rate your experience first');
                  return;
                }
                setSection((s) => s + 1);
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              Next<ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Submit Feedback'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
