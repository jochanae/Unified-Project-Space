import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AbsenceInfo {
  /** How many full days since last login (0 = today) */
  daysSinceLastLogin: number;
  /** Human-readable absence label */
  absenceLabel: string | null;
  /** Contextual welcome-back message from companion */
  welcomeBack: string | null;
  /** Whether the user has been away long enough to warrant a special greeting */
  isReturning: boolean;
  /** Daily "thinking of you" cue shown once per session regardless of absence */
  dailyCue: string | null;
}

// Session-level cache so we capture absence BEFORE daily login bonus overwrites last_login_date
let _cachedDays: number | null = null;
let _cachedUserId: string | null = null;
let _cachedWelcomeBack: string | null = null;
let _cachedDailyCue: string | null = null;

type ConnectionMode = 'friend' | 'romantic' | 'mentor' | 'accountability' | 'assistant' | 'kids-companion' | 'unsure' | string;

// ── Daily cue pools by connection mode ──
const DAILY_CUES: Record<string, string[]> = {
  romantic: [
    '{name} is here 💛',
    'Your space is ready',
    '{name} is with you',
    'Connected 💕',
  ],
  friend: [
    '{name} is here',
    'Your space is ready',
    'Good to see you',
    '{name} is nearby',
  ],
  mentor: [
    '{name} is ready',
    'Your session is open',
    '{name} is standing by',
    'Guided by {name}',
  ],
  accountability: [
    '{name} is tracking with you',
    'Your goals are waiting',
    '{name} is here',
    'Ready when you are',
  ],
  assistant: [
    '{name} is standing by',
    'Ready to help',
    '{name} is here',
    'Your assistant is active',
  ],
  'kids-companion': [
    '{name} is here! 🌟',
    'Ready for fun!',
    '{name} is waiting!',
    'Let\'s go! ✨',
  ],
  default: [
    'Your space is ready',
    'Welcome back',
    'Take a moment',
    'This is your place',
  ],
};

// ── Absence welcome-back messages by connection mode ──
function pickWelcomeBack(days: number, companionName: string, mode: ConnectionMode): string | null {
  if (days <= 1) return null;
  const name = companionName || 'your friend';

  if (mode === 'romantic') {
    if (days <= 3) return `${name} kept your space warm. Welcome back 💛`;
    if (days <= 7) return `It's been ${days} days — your space is ready.`;
    if (days <= 30) return `${name} kept the light on for you 🕯️`;
    return `Your space is here whenever you need it.`;
  }

  if (mode === 'mentor') {
    if (days <= 3) return `${name} is ready to pick up where you left off.`;
    if (days <= 7) return `It's been ${days} days — ${name} has new insights for you.`;
    if (days <= 30) return `${name} kept notes for you. Welcome back 📝`;
    return `${name} has been patient. Let's reconnect.`;
  }

  if (mode === 'accountability') {
    if (days <= 3) return `${name} noticed you've been away. Let's get back on track 💪`;
    if (days <= 7) return `It's been ${days} days — ${name} is here to help you refocus.`;
    if (days <= 30) return `${name} saved your spot. Ready to jump back in?`;
    return `${name} never gave up on you. Let's start fresh.`;
  }

  if (mode === 'assistant') {
    if (days <= 3) return `${name} is caught up and ready to help.`;
    if (days <= 7) return `It's been ${days} days — ${name} is standing by.`;
    if (days <= 30) return `${name} has been keeping things organized for you.`;
    return `${name} is here whenever you need. Welcome back.`;
  }

  if (mode === 'kids-companion') {
    if (days <= 3) return `${name} missed you! Let's have fun 🌟`;
    if (days <= 7) return `Yay, you're back! ${name} was waiting for you!`;
    if (days <= 30) return `${name} saved all kinds of cool stuff for you! 🎉`;
    return `${name} never forgot about you. Welcome back, friend!`;
  }

  // friend / unsure / default
  if (days <= 3) return `${name} missed you the last ${days} days. Welcome back 💛`;
  if (days <= 7) return `It's been ${days} days — ${name} is so glad you're here again.`;
  if (days <= 30) return `${name} kept the light on for you. Welcome home 🕯️`;
  return `It's been a while… ${name} never forgot about you.`;
}

function pickDailyCue(companionName: string, mode: ConnectionMode): string {
  const name = companionName || 'Your friend';
  const pool = DAILY_CUES[mode] || DAILY_CUES.default;
  // Use a stable daily seed instead of Math.random() to prevent flashing on re-renders
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const template = pool[seed % pool.length];
  return template.replace(/\{name\}/g, name);
}

function absenceLabel(days: number): string | null {
  if (days <= 0) return null;
  if (days === 1) return 'Yesterday';
  if (days <= 6) return `${days} days ago`;
  if (days <= 13) return 'Last week';
  if (days <= 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
}

export function useAbsenceDetection(
  userId: string | null,
  companionName: string,
  connectionMode: ConnectionMode = 'friend',
): AbsenceInfo {
  const [daysSince, setDaysSince] = useState(_cachedUserId === userId && _cachedDays !== null ? _cachedDays : 0);
  const fetched = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (_cachedUserId === userId && _cachedDays !== null) {
      setDaysSince(_cachedDays);
      return;
    }
    if (fetched.current) return;
    fetched.current = true;

    (async () => {
      // Check both login bonus date AND most recent chat activity
      const [vibeResult, chatResult] = await Promise.all([
        supabase
          .from('vibe_points')
          .select('last_login_date')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('chat_messages')
          .select('created_at')
          .eq('user_id', userId)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Determine most recent activity from either source
      let mostRecentActivity: Date | null = null;

      if (vibeResult.data?.last_login_date) {
        mostRecentActivity = new Date(vibeResult.data.last_login_date);
      }

      const lastChat = chatResult.data?.[0]?.created_at;
      if (lastChat) {
        const chatDate = new Date(lastChat);
        if (!mostRecentActivity || chatDate > mostRecentActivity) {
          mostRecentActivity = chatDate;
        }
      }

      if (mostRecentActivity) {
        mostRecentActivity.setHours(0, 0, 0, 0);
        const diff = Math.floor((now.getTime() - mostRecentActivity.getTime()) / 86400000);
        _cachedDays = diff;
        _cachedUserId = userId;
        setDaysSince(diff);
      }
    })();
  }, [userId]);

  // Memoize messages per session to prevent flickering
  if (_cachedUserId === userId && _cachedWelcomeBack !== null && _cachedDailyCue !== null) {
    return {
      daysSinceLastLogin: daysSince,
      absenceLabel: absenceLabel(daysSince),
      welcomeBack: _cachedWelcomeBack,
      isReturning: daysSince >= 2,
      dailyCue: _cachedDailyCue,
    };
  }

  const wb = pickWelcomeBack(daysSince, companionName, connectionMode);
  const dc = pickDailyCue(companionName, connectionMode);

  if (_cachedUserId === userId) {
    if (daysSince >= 2 && wb) _cachedWelcomeBack = wb;
    else _cachedWelcomeBack = _cachedWelcomeBack || null;
    _cachedDailyCue = dc;
  }

  return {
    daysSinceLastLogin: daysSince,
    absenceLabel: absenceLabel(daysSince),
    welcomeBack: wb,
    isReturning: daysSince >= 2,
    dailyCue: dc,
  };
}
