import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart, Pencil, Check, User, ChevronRight, ChevronDown, Calendar, Star } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import type { Profile } from '@/hooks/useProfile';

interface UserAvatarLightboxProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdateProfile: (updates: Partial<Profile>) => void;
}

/* ── Ghost-glow trait pill ─────────────────────────────────── */
function TraitPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-primary/40 bg-transparent px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors"
      style={{
        color: 'hsl(var(--primary))',
        textShadow: '0 0 8px hsl(var(--primary) / 0.5)',
        boxShadow: '0 0 6px hsl(var(--primary) / 0.15), inset 0 0 6px hsl(var(--primary) / 0.05)',
      }}
    >
      {children}
    </span>
  );
}

/* ── Inline-editable field ── */
function InlineField({ icon: Icon, label, value, onSave, placeholder }: {
  icon: React.ElementType; label: string; value: string;
  onSave: (v: string) => void; placeholder?: string;
}) {
  const [localVal, setLocalVal] = useState(value);

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 mt-2 shrink-0 text-primary/60" />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
        <Input
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => {
            if (localVal !== value) {
              onSave(localVal);
              toast.success(`${label} updated`);
            }
          }}
          placeholder={placeholder}
          className="h-7 bg-white/5 border-white/10 text-xs text-white/80"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

/* ── Content ─────────────────────────────────── */
function UserBiographyContent({ profile, onUpdateProfile, isMobile }: {
  profile: Profile; onUpdateProfile: (updates: Partial<Profile>) => void; isMobile: boolean;
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const imageUrl = profile.userReferenceImageUrl || profile.avatarUrl;
  const displayName = profile.preferredName || profile.userName;

  return (
    <>
      {/* ── Blurred backdrop ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" aria-hidden className="h-full w-full object-cover scale-110 blur-[40px] brightness-[0.35] saturate-[1.3]" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
      </div>

      {/* ── Cover photo banner ── */}
      <div className={`relative w-full overflow-hidden ${isMobile ? 'h-56' : 'h-44'}`}>
        {imageUrl ? (
          <motion.img
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            src={imageUrl}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            style={{ objectPosition: 'center 15%' }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />
      </div>

      {/* ── Hero portrait ── */}
      <div className={`relative mx-auto ${isMobile ? '-mt-20 mb-3' : '-mt-16 mb-2'}`}>
        <div
          className="relative mx-auto overflow-hidden rounded-full shadow-2xl ring-4 ring-background/80"
          style={{
            width: isMobile ? 140 : 120,
            height: isMobile ? 140 : 120,
            boxShadow: '0 0 0 3px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.15), 0 20px 60px -15px rgba(0,0,0,0.5)',
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/20 text-primary font-display font-bold text-4xl">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <motion.div
          className="absolute rounded-full border border-primary/20 pointer-events-none"
          style={{
            width: isMobile ? 140 : 120,
            height: isMobile ? 140 : 120,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Name ── */}
      <h2
        className={`text-center font-display font-bold text-white ${isMobile ? 'text-3xl' : 'text-2xl'}`}
        style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
      >
        {displayName}
      </h2>
      {profile.username && (
        <p className="text-center text-xs text-white/50 mt-0.5">@{profile.username}</p>
      )}

      {/* ── Vibe badge ── */}
      {profile.vibe && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 flex justify-center"
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm"
            style={{
              color: 'hsl(var(--primary))',
              textShadow: '0 0 10px hsl(var(--primary) / 0.6)',
              boxShadow: '0 0 12px hsl(var(--primary) / 0.1)',
            }}
          >
            <Sparkles className="h-3 w-3" />
            {profile.vibe}
          </span>
        </motion.div>
      )}

      {/* ── Bio quote ── */}
      {profile.bio && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 mx-auto max-w-xs px-4"
        >
          <div
            className="rounded-2xl border border-white/10 px-5 py-4 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <Heart className="h-4 w-4 text-primary/60 mx-auto mb-2" />
            <p className="text-sm leading-relaxed text-white/80 italic">
              "{profile.bio}"
            </p>
          </div>
        </motion.div>
      )}

      {/* ── About You collapsible section ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-5 mx-auto max-w-xs px-4"
      >
        <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
          <CollapsibleTrigger className="w-full">
            <div
              className="flex items-center justify-between w-full rounded-xl border border-white/10 px-4 py-3 transition-colors hover:border-primary/30"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <span className="text-xs font-semibold text-white/70">About You</span>
              {aboutOpen
                ? <ChevronDown className="h-3.5 w-3.5 text-white/50" />
                : <ChevronRight className="h-3.5 w-3.5 text-white/50" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div
              className="mt-1 rounded-xl border border-white/10 px-4 py-3 space-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <InlineField
                icon={User}
                label="Preferred Name"
                value={profile.preferredName || ''}
                placeholder="e.g. Jo"
                onSave={(v) => onUpdateProfile({ preferredName: v || undefined })}
              />
              <InlineField
                icon={Sparkles}
                label="Vibe"
                value={profile.vibe || ''}
                placeholder="Your energy..."
                onSave={(v) => onUpdateProfile({ vibe: v || undefined })}
              />
              <InlineField
                icon={Pencil}
                label="About Me"
                value={profile.bio || ''}
                placeholder="Tell people about yourself..."
                onSave={(v) => onUpdateProfile({ bio: v || undefined })}
              />
              <InlineField
                icon={Star}
                label="Interests"
                value={profile.interests || ''}
                placeholder="Music, cooking, hiking..."
                onSave={(v) => onUpdateProfile({ interests: v || undefined })}
              />
              {profile.namePronunciation && (
                <div className="flex items-start gap-2.5 py-1.5">
                  <User className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-white/50 block">Pronunciation</span>
                    <span className="text-xs text-white/80">{profile.namePronunciation}</span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* ── Trait pills ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-5 flex flex-wrap justify-center gap-2 px-4"
      >
        {profile.vibe && <TraitPill>{profile.vibe}</TraitPill>}
        {profile.interests && profile.interests.split(',').slice(0, 3).map((i) => (
          <TraitPill key={i}>{i.trim()}</TraitPill>
        ))}
      </motion.div>

      {/* ── Member since ── */}
      {profile.createdAt && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 mb-8 flex items-center justify-center gap-1.5 text-xs text-white/40"
        >
          <Calendar className="h-3 w-3" />
          Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </motion.p>
      )}
    </>
  );
}

export default function UserAvatarLightbox({ open, onClose, profile, onUpdateProfile }: UserAvatarLightboxProps) {
  const isMobile = useIsMobile();

  if (!open) return null;

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 flex flex-col items-center overflow-y-auto pb-32"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              >
                <X className="h-5 w-5" />
              </button>
              <UserBiographyContent profile={profile} onUpdateProfile={onUpdateProfile} isMobile />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-sm w-full max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl pb-8 pt-2"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              <X className="h-4 w-4" />
            </button>
            <UserBiographyContent profile={profile} onUpdateProfile={onUpdateProfile} isMobile={false} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
