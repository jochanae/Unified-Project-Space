import React, { useState, useCallback, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { playSelectSound } from '@/hooks/useOnboardingSfx';
import { compressImage } from '@/lib/imageCompression';
import { uploadCompanionPhoto } from '@/lib/companionPhotoUpload';
import { moderateImage } from '@/lib/imageModeration';
import { toast } from 'sonner';

import camiAvatarImg from '@/assets/cami-avatar.jpg';

function CompaniHeart({ size = 10, style }: { size?: number; style?: React.CSSProperties }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', ...style }}>
      <defs>
        <linearGradient id={`oh-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="50%" stopColor="#E8547C" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={`url(#oh-${id})`} />
    </svg>
  );
}

interface OnboardingProps {
  userId: string;
  kidsMode?: boolean;
  onComplete: (path: string) => void;
}

const PATHS = [
  {
    id: 'cami' as const,
    emoji: '✨',
    title: 'Find my companion',
    sub: 'Browse our curated gallery — recommended',
    route: '/browse',
    avatar: camiAvatarImg,
    isRecommended: true,
  },
  {
    id: 'browse' as const,
    emoji: '👀',
    title: 'Browse companions',
    sub: 'Choose from curated personalities yourself',
    route: '/browse',
    avatar: undefined,
    isRecommended: false,
  },
  {
    id: 'studio' as const,
    emoji: '🛠️',
    title: 'Create my own',
    sub: 'Build from scratch or upload your own image',
    route: '/studio?from=onboarding',
    avatar: undefined,
    isRecommended: false,
  },
];

const PATHS_MINORS = [
  {
    id: 'cami' as const,
    emoji: '✨',
    title: 'Find my companion',
    sub: 'Browse our curated gallery — recommended',
    route: '/browse',
    avatar: camiAvatarImg,
    isRecommended: true,
  },
  {
    id: 'browse' as const,
    emoji: '👀',
    title: 'Browse companions',
    sub: 'Choose from curated personalities yourself',
    route: '/browse',
    avatar: undefined,
    isRecommended: false,
  },
  {
    id: 'studio' as const,
    emoji: '🎨',
    title: 'Create my own',
    sub: 'Design your own companion from scratch',
    route: '/studio?from=onboarding',
    avatar: undefined,
    isRecommended: false,
  },
];

const fade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Onboarding({ userId, kidsMode = false, onComplete }: OnboardingProps) {
  const [saving, setSaving] = useState(false);

  const [companionName, setCompanionName] = useState('');
  const [path, setPath] = useState('cami');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pathsForStep = kidsMode ? PATHS_MINORS : PATHS;

  const canContinue = !!path;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const memberId = `companion-${Date.now()}`;
      const result = await uploadCompanionPhoto({
        file: compressed,
        userId,
        memberId,
        target: 'avatar',
      });
      if ('publicUrl' in result) {
        // Moderation check for minors
        if (kidsMode) {
          const mod = await moderateImage(result.publicUrl, true);
          if (!mod.approved) {
            const filePath = result.publicUrl.split('/companion-avatars/')[1];
            if (filePath) await supabase.storage.from('companion-avatars').remove([decodeURIComponent(filePath)]);
            toast.error(mod.reason || "That image didn't pass our safety check — try a different one!");
            setUploading(false);
            return;
          }
        }
        setUploadedAvatarUrl(result.publicUrl);
        playSelectSound('confirm');
      }
    } catch (err) {
      console.error('[Onboarding] Upload failed:', err);
      toast.error('Upload failed — try again');
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = useCallback(async () => {
    playSelectSound('confirm');
    setSaving(true);
    try {
      const pathList = kidsMode ? PATHS_MINORS : PATHS;
      const chosenPath = pathList.find((p) => p.id === path);

      // Step 1: Write onboarding_completed to DB
      const { error } = await supabase.from('profiles').update({
        preferred_companion_name: companionName.trim() || null,
        onboarding_path: path,
        onboarding_completed: true,
      } as any).eq('user_id', userId);

      if (error) {
        console.error('[Onboarding] DB update failed:', error);
        toast.error("Couldn't save your profile — please try again.");
        setSaving(false);
        return;
      }

      // Step 2: Verify the write landed before navigating.
      // This prevents the loop bug: window.location.href reloads the page,
      // if the profile query re-reads before Supabase replication catches up,
      // onboarding_completed is still false and onboarding shows again.
      let verified = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, 400));
        const { data: check } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', userId)
          .single();
        if ((check as any)?.onboarding_completed === true) {
          verified = true;
          break;
        }
      }

      if (!verified) {
        // DB confirmed the write but read-replica hasn't caught up yet.
        // Store a flag in sessionStorage so AppLayout skips the onboarding
        // gate on the first render after reload, even before the profile refetches.
        console.warn('[Onboarding] Read-back not confirmed — using sessionStorage bypass');
        sessionStorage.setItem('onboarding_bypass', userId);
      }

      // Step 3: Navigate
      if (uploadedAvatarUrl) {
        sessionStorage.setItem('onboarding_direct_avatar', uploadedAvatarUrl);
        onComplete('/studio?from=onboarding');
      } else {
        onComplete(chosenPath?.route || '/browse');
      }
    } catch (e) {
      console.error('[Onboarding] Save failed:', e);
      setSaving(false);
    }
  }, [userId, kidsMode, companionName, path, uploadedAvatarUrl, onComplete]);

  return (
    <div className="min-h-[100svh] w-full flex flex-col" style={{ background: '#0f1221' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex-1 flex flex-col px-5 pb-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key="s0" {...fade} className="flex-1 flex flex-col">
            {/* Sign-out breadcrumb */}
            <div className="flex justify-end pt-3 pb-1">
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>

            <div className="pt-2 pb-4">
              <h1 className="text-xl font-bold text-foreground text-center">
                How would you like to meet your companion?
              </h1>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Your companion will naturally adapt to your style over time
              </p>
            </div>

            <div className="space-y-3">
              {pathsForStep.map(({ id, emoji, title, sub, avatar, isRecommended }) => (
                <button
                  key={id}
                  onClick={() => {
                    playSelectSound(path === id ? 'deselect' : 'select');
                    setPath(id);
                  }}
                  className={cn(
                    'w-full rounded-2xl p-4 text-left transition-all duration-200 border flex items-start gap-3',
                    path === id
                      ? isRecommended
                        ? 'bg-primary/15 border-primary/40 shadow-[0_0_12px_rgba(212,175,80,0.1)]'
                        : 'bg-white/15 border-white/40'
                      : 'bg-white/5 backdrop-blur-xl border-white/10'
                  )}
                >
                  {avatar ? (
                    <div className="relative flex-shrink-0">
                      <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none bg-background rounded-full p-0.5">{emoji}</span>
                    </div>
                  ) : (
                    <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{title}</span>
                      {isRecommended && (
                        <span className="text-[10px] font-semibold text-primary/80 bg-primary/10 rounded-full px-2 py-0.5">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Name field — compact, no label, sits tight below path buttons */}
            {!kidsMode && path === 'studio' && (
              <input
                value={companionName}
                onChange={(e) => setCompanionName(e.target.value)}
                placeholder="Their name (optional — you can change it later)"
                maxLength={30}
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-primary/40 transition-colors"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom button */}
        <div className="pt-4 flex gap-3">
          <motion.button
            disabled={saving || !canContinue || uploading}
            onClick={() => {
              if (path === 'upload' && !uploadedAvatarUrl) {
                fileInputRef.current?.click();
                return;
              }
              handleFinish();
            }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {(saving || uploading)
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : null}
            {path === 'upload' && !uploadedAvatarUrl
              ? 'Choose image'
              : 'Meet your Compani →'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
