import { motion } from 'framer-motion';
import { Crown, Sparkles, Users, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircleInviteCardProps {
  circleName: string;
  circleEmoji: string;
  circleDescription: string;
  inviteCode: string;
  memberCount?: number;
  variant: 'kid' | 'adult';
  onCopyLink?: () => void;
}

export default function CircleInviteCard({
  circleName, circleEmoji, circleDescription, inviteCode,
  memberCount = 0, variant, onCopyLink,
}: CircleInviteCardProps) {
  if (variant === 'kid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF6347)',
          boxShadow: '0 8px 40px -8px rgba(255, 165, 0, 0.5)',
        }}
      >
        {/* Sparkle decorations */}
        <div className="absolute top-3 left-4 text-2xl animate-bounce [animation-delay:0ms]">⭐</div>
        <div className="absolute top-6 right-6 text-xl animate-bounce [animation-delay:200ms]">✨</div>
        <div className="absolute bottom-8 left-6 text-lg animate-bounce [animation-delay:400ms]">🌟</div>
        <div className="absolute bottom-4 right-4 text-2xl animate-bounce [animation-delay:100ms]">🎉</div>

        {/* Ticket perforated edge */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 rounded-r-full bg-background" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 rounded-l-full bg-background" />

        <div className="px-8 py-8 text-center">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="h-5 w-5 text-yellow-900/70" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-900/70">Golden Ticket</p>
            <Star className="h-5 w-5 text-yellow-900/70" />
          </div>

          {/* Emoji & Name */}
          <div className="text-5xl mb-3">{circleEmoji}</div>
          <h2
            className="text-2xl font-black text-yellow-900 mb-1"
            style={{ fontFamily: 'Quicksand, sans-serif' }}
          >
            {circleName}
          </h2>
          <p className="text-sm text-yellow-900/60 mb-4">{circleDescription}</p>

          {/* Dashed divider */}
          <div className="border-t-2 border-dashed border-yellow-900/20 my-4" />

          {/* Code */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-900/50 mb-1">Your Secret Code</p>
          <p
            className="text-2xl font-black tracking-[0.2em] text-yellow-900 mb-4"
            style={{ fontFamily: 'monospace' }}
          >
            {inviteCode}
          </p>

          {/* Members */}
          {memberCount > 0 && (
            <div className="flex items-center justify-center gap-1 mb-4">
              <Users className="h-3.5 w-3.5 text-yellow-900/50" />
              <span className="text-xs font-bold text-yellow-900/50">{memberCount} friend{memberCount !== 1 ? 's' : ''} inside</span>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onCopyLink}
            className="rounded-full bg-yellow-900/90 px-6 py-2.5 text-sm font-black text-yellow-100 transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            🎫 Copy Invite Link
          </button>
        </div>
      </motion.div>
    );
  }

  // ADULT: Black & Gold luxury RSVP
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 40%, #1a1612 100%)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 12px 48px -12px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(212, 175, 55, 0.15)',
      }}
    >
      {/* Gold corner accents */}
      <div
        className="absolute top-0 left-0 w-16 h-16"
        style={{
          borderTop: '2px solid rgba(212, 175, 55, 0.4)',
          borderLeft: '2px solid rgba(212, 175, 55, 0.4)',
          borderTopLeftRadius: '1rem',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-16 h-16"
        style={{
          borderBottom: '2px solid rgba(212, 175, 55, 0.4)',
          borderRight: '2px solid rgba(212, 175, 55, 0.4)',
          borderBottomRightRadius: '1rem',
        }}
      />

      <div className="px-8 py-10 text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D4AF37]/40" />
          <Crown className="h-4 w-4" style={{ color: '#D4AF37' }} />
          <p
            className="text-[10px] font-bold uppercase tracking-[0.4em]"
            style={{ color: '#D4AF37' }}
          >
            Private Invitation
          </p>
          <Crown className="h-4 w-4" style={{ color: '#D4AF37' }} />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D4AF37]/40" />
        </div>

        {/* Circle info */}
        <div className="text-4xl mb-3 drop-shadow-lg">{circleEmoji}</div>
        <h2
          className="text-xl font-bold text-white mb-1"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '0.05em' }}
        >
          {circleName}
        </h2>
        <p className="text-xs text-white/50 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          {circleDescription}
        </p>

        {/* Elegant divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-[#D4AF37]/20" />
          <Sparkles className="h-3 w-3" style={{ color: '#D4AF37' }} />
          <div className="h-px flex-1 bg-[#D4AF37]/20" />
        </div>

        {/* Code */}
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40 mb-2">
          Access Code
        </p>
        <p
          className="text-xl font-bold tracking-[0.25em] text-white/90 mb-6"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {inviteCode}
        </p>

        {/* Members */}
        {memberCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-5">
            <Users className="h-3.5 w-3.5 text-white/25" />
            <span className="text-xs text-white/40">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onCopyLink}
          className="rounded-full px-6 py-2.5 text-sm font-semibold transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #B8962E)',
            color: '#0d0d0d',
            boxShadow: '0 4px 20px -4px rgba(212, 175, 55, 0.4)',
          }}
        >
          Copy Invitation Link
        </button>
      </div>
    </motion.div>
  );
}
