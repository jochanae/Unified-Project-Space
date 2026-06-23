import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  DollarSign,
  GraduationCap,
  Settings,
  Target,
  Building2,
  FileText,
  BarChart3,
  HelpCircle,
  Sliders,
  Gift,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FooterShortcutEditor } from './FooterShortcutEditor';
import { QuinnIcon } from '@/components/icons/QuinnIcon';
import { Sparkles } from 'lucide-react';

export interface FooterShortcut {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  color?: string; // HSL color for the icon
}

export const AVAILABLE_SHORTCUTS: FooterShortcut[] = [
  { id: 'budgets', label: 'Budgets', icon: <Clock className="h-5 w-5" />, route: '/budgets', color: 'hsl(270, 60%, 60%)' },
  { id: 'transactions', label: 'Activity', icon: <DollarSign className="h-5 w-5" />, route: '/transactions', color: 'hsl(160, 55%, 45%)' },
  { id: 'goals', label: 'Goals', icon: <Target className="h-5 w-5" />, route: '/goals', color: 'hsl(45, 80%, 50%)' },
  { id: 'accounts', label: 'Accounts', icon: <Building2 className="h-5 w-5" />, route: '/accounts', color: 'hsl(200, 65%, 50%)' },
  { id: 'bills', label: 'Bills', icon: <FileText className="h-5 w-5" />, route: '/bills', color: 'hsl(340, 65%, 55%)' },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" />, route: '/reports', color: 'hsl(220, 60%, 55%)' },
  { id: 'money-academy', label: 'Learn', icon: <GraduationCap className="h-5 w-5" />, route: '/money-academy', color: 'hsl(280, 55%, 55%)' },
  { id: 'help-center', label: 'Help', icon: <HelpCircle className="h-5 w-5" />, route: '/help-center', color: 'hsl(180, 50%, 45%)' },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, route: '/settings', color: 'hsl(240, 40%, 55%)' },
  { id: 'refer', label: 'Refer', icon: <Gift className="h-5 w-5" />, route: '/refer-business', color: 'hsl(30, 80%, 55%)' },
];

const DEFAULT_LEFT = ['transactions', 'bills'];
const DEFAULT_RIGHT = ['budgets', 'accounts'];
const LEGACY_DEFAULT_LEFT = ['transactions', 'bills', 'budgets'];
const LEGACY_DEFAULT_RIGHT = ['accounts', 'refer', 'settings'];

const isShortcutId = (value: unknown): value is string =>
  typeof value === 'string' && AVAILABLE_SHORTCUTS.some((shortcut) => shortcut.id === value);

const normalizeShortcutIds = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return [...fallback];

  const normalized = [...new Set(value.filter(isShortcutId))].slice(0, 3);

  return normalized.length ? normalized : [...fallback];
};

const isLegacyDefaultLayout = (left: string[], right: string[]) =>
  left.length === LEGACY_DEFAULT_LEFT.length &&
  right.length === LEGACY_DEFAULT_RIGHT.length &&
  left.every((id, index) => id === LEGACY_DEFAULT_LEFT[index]) &&
  right.every((id, index) => id === LEGACY_DEFAULT_RIGHT[index]);

const persistFooterPreferences = async (userId: string, left: string[], right: string[]) => {
  const { error } = await supabase
    .from('user_footer_preferences')
    .upsert({
      user_id: userId,
      left_shortcuts: left as any,
      right_shortcuts: right as any,
    }, { onConflict: 'user_id' });

  if (error) throw error;
};

// Routes where footer should NOT show
const HIDDEN_ROUTES = ['/coach', '/kidsbloom', '/signin', '/auth', '/', '/admin'];

export function AppFooterBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [leftIds, setLeftIds] = useState<string[]>(DEFAULT_LEFT);
  const [rightIds, setRightIds] = useState<string[]>(DEFAULT_RIGHT);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load user preferences
  useEffect(() => {
    if (!user) {
      setLeftIds(DEFAULT_LEFT);
      setRightIds(DEFAULT_RIGHT);
      setLoaded(true);
      return;
    }

    setLoaded(false);

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('user_footer_preferences')
          .select('left_shortcuts, right_shortcuts')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setLeftIds(DEFAULT_LEFT);
          setRightIds(DEFAULT_RIGHT);
          return;
        }

        const nextLeft = normalizeShortcutIds(data.left_shortcuts, DEFAULT_LEFT);
        const nextRight = normalizeShortcutIds(data.right_shortcuts, DEFAULT_RIGHT);

        if (isLegacyDefaultLayout(nextLeft, nextRight)) {
          setLeftIds(DEFAULT_LEFT);
          setRightIds(DEFAULT_RIGHT);
          await persistFooterPreferences(user.id, DEFAULT_LEFT, DEFAULT_RIGHT);
          return;
        }

        setLeftIds(nextLeft);
        setRightIds(nextRight);
      } catch (error) {
        console.error('Failed to load footer preferences:', error);
        setLeftIds(DEFAULT_LEFT);
        setRightIds(DEFAULT_RIGHT);
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, [user]);

  const savePreferences = async (left: string[], right: string[]) => {
    setLeftIds(left);
    setRightIds(right);

    if (!user) return;

    await persistFooterPreferences(user.id, left, right);
  };

  // Hide on certain routes
  const shouldHide = HIDDEN_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(r + '/'));
  if (shouldHide || !loaded) return null;

  const getShortcut = (id: string) => AVAILABLE_SHORTCUTS.find(s => s.id === id);
  const leftShortcuts = leftIds.map(getShortcut).filter(Boolean) as FooterShortcut[];
  const rightShortcuts = rightIds.map(getShortcut).filter(Boolean) as FooterShortcut[];

  const isActive = (route: string) => location.pathname === route;

  const renderShortcut = (shortcut: FooterShortcut) => {
    const active = isActive(shortcut.route);
    return (
      <button
        key={shortcut.id}
        onClick={() => navigate(shortcut.route)}
        className={cn(
          'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[48px]',
          active
            ? 'bg-primary/10 ring-1 ring-primary/30 shadow-sm'
            : 'hover:bg-muted/50'
        )}
        style={{ color: active ? undefined : shortcut.color }}
      >
        <span className={active ? 'text-primary' : ''}>{shortcut.icon}</span>
        <span className={cn(
          'text-[10px] font-medium leading-none',
          active ? 'text-primary' : 'opacity-80'
        )} style={{ color: active ? undefined : shortcut.color }}>
          {shortcut.label}
        </span>
      </button>
    );
  };

  const NOTCH_RADIUS = 40; // CSS mask circle radius
  const BAR_H = 56;
  const CENTER_BTN_SIZE = 56; // h-14 w-14

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40" data-mobile-nav="true">
        {/* Floating edit pill above footer */}
        <div className="flex justify-end pr-3 mb-1">
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/80 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm text-[10px] font-medium"
          >
            <Sliders className="h-3 w-3" />
            Edit
          </button>
        </div>

        {/* Floating Bloom button — Compani-style glassmorphic orb */}
        <div className="absolute left-1/2 -translate-x-1/2 z-[41] flex flex-col items-center pointer-events-auto" style={{ bottom: BAR_H - 28 }}>
          <motion.button
            onClick={() => navigate('/coach')}
            whileTap={{ scale: 0.92 }}
            className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-md overflow-hidden animate-[quinnPulseRing_3s_ease-in-out_infinite]"
            style={{
              boxShadow: '0 0 0 2.5px hsl(174 84% 45% / 0.5), 0 0 14px 2px hsl(174 84% 45% / 0.2), 0 4px 16px -4px rgba(0,0,0,0.4)',
              background: 'linear-gradient(135deg, hsl(174 84% 45% / 0.15), hsl(270 60% 55% / 0.08))',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <Sparkles className="h-5 w-5 text-[hsl(174,84%,45%)]" />
            <span className="text-[7px] font-bold text-[hsl(174,84%,45%)] uppercase tracking-[0.08em] leading-none mt-0.5">
              Bloom
            </span>
          </motion.button>
        </div>

        {/* Main footer bar with CSS mask notch */}
        <div className="relative safe-area-bottom">
          <div
            className="bg-background/60 backdrop-blur-2xl border-t border-white/20 shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.12)] rounded-t-2xl"
            style={{
              height: BAR_H,
              WebkitMaskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, transparent ${NOTCH_RADIUS - 2}px, black ${NOTCH_RADIUS - 1}px)`,
              maskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, transparent ${NOTCH_RADIUS - 2}px, black ${NOTCH_RADIUS - 1}px)`,
            }}
          >
            <div className="flex items-center h-full px-2 max-w-lg mx-auto relative">
              {/* Left shortcuts */}
              <div className="flex items-center justify-evenly flex-1">
                {leftShortcuts.map(renderShortcut)}
              </div>

              {/* Center spacer for Bloom */}
              <div style={{ width: NOTCH_RADIUS * 2 + 8 }} className="shrink-0" />

              {/* Right shortcuts */}
              <div className="flex items-center justify-evenly flex-1">
                {rightShortcuts.map(renderShortcut)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind footer */}
      <div className="h-28" />

      <FooterShortcutEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        leftIds={leftIds}
        rightIds={rightIds}
        onSave={savePreferences}
      />
    </>
  );
}
