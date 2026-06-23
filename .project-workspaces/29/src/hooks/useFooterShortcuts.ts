import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type FooterShortcutId = 'keys' | 'journal' | 'learn' | 'community' | 'notepad' | 'feedback' | 'plan' | 'strategies' | 'calculator' | 'paper' | 'analytics' | 'videos' | 'glossary' | 'reminders' | 'help';

export interface FooterShortcut {
  id: FooterShortcutId;
  label: string;
  href?: string;
  icon: string;
  color: string;
  action?: 'keys' | 'feedback';
}

export const ALL_SHORTCUTS: FooterShortcut[] = [
  // Core navigation
  { id: 'community', label: 'Community', href: '/community', icon: 'Users', color: 'text-gain' },
  { id: 'journal', label: 'Journal', href: '/journal', icon: 'FileText', color: 'text-chart-2' },
  { id: 'keys', label: 'Keys', icon: 'Keyboard', color: 'text-chart-4', action: 'keys' },
  { id: 'plan', label: 'Money Plan', href: '/plan', icon: 'Target', color: 'text-chart-3' },
  { id: 'learn', label: 'Learn', href: '/learn', icon: 'BookOpen', color: 'text-primary' },
  // Additional options
  { id: 'strategies', label: 'Strategies', href: '/strategies', icon: 'Layers', color: 'text-chart-5' },
  { id: 'calculator', label: 'Calculator', href: '/options-calculator', icon: 'Calculator', color: 'text-amber-500' },
  { id: 'paper', label: 'Paper Trade', href: '/youth-mode', icon: 'LineChart', color: 'text-blue-500' },
  { id: 'analytics', label: 'Analytics', href: '/analytics', icon: 'BarChart3', color: 'text-purple-500' },
  { id: 'videos', label: 'Videos', href: '/videos', icon: 'PlayCircle', color: 'text-loss' },
  { id: 'glossary', label: 'Glossary', href: '/glossary', icon: 'BookMarked', color: 'text-emerald-500' },
  { id: 'reminders', label: 'Reminders', href: '/reminders', icon: 'Bell', color: 'text-orange-500' },
  { id: 'notepad', label: 'Notepad', href: '/tools/notepad', icon: 'StickyNote', color: 'text-gold' },
  { id: 'feedback', label: 'Feedback', icon: 'MessageSquare', color: 'text-primary', action: 'feedback' },
];

const DEFAULT_SHORTCUTS: FooterShortcutId[] = ['strategies', 'journal', 'keys', 'plan', 'learn'];

export function useFooterShortcuts() {
  const { user } = useAuth();
  const [shortcuts, setShortcuts] = useState<FooterShortcutId[]>(DEFAULT_SHORTCUTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchShortcuts();
    } else {
      setShortcuts(DEFAULT_SHORTCUTS);
    }
  }, [user?.id]);

  const fetchShortcuts = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('footer_shortcuts')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data?.footer_shortcuts && Array.isArray(data.footer_shortcuts)) {
        // Migrate legacy 'help' shortcut ID to 'feedback'
        const raw = data.footer_shortcuts as string[];
        const needsMigration = raw.includes('help');
        const migrated = raw.map(id => id === 'help' ? 'feedback' : id) as FooterShortcutId[];
        // Deduplicate in case both 'help' and 'feedback' existed
        const unique = [...new Set(migrated)] as FooterShortcutId[];
        setShortcuts(unique);

        // Persist migration back to DB so the stale 'help' ID is gone
        if (needsMigration && user?.id) {
          supabase
            .from('profiles')
            .update({ footer_shortcuts: unique })
            .eq('user_id', user.id)
            .then(() => {});
        }
      }
    } catch (error) {
      console.error('Error fetching footer shortcuts:', error);
    }
  };

  const updateShortcuts = async (newShortcuts: FooterShortcutId[]) => {
    if (!user?.id) {
      toast.error('Please sign in to customize shortcuts');
      return;
    }

    if (newShortcuts.length < 2 || newShortcuts.length > 5) {
      toast.error('Please select 2-5 shortcuts');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ footer_shortcuts: newShortcuts })
        .eq('user_id', user.id);

      if (error) throw error;

      setShortcuts(newShortcuts);
      toast.success('Footer shortcuts updated!');
    } catch (error: any) {
      console.error('Error updating shortcuts:', error);
      toast.error('Failed to update shortcuts');
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveShortcuts = (): FooterShortcut[] => {
    return shortcuts
      .map(id => ALL_SHORTCUTS.find(s => s.id === id))
      .filter((s): s is FooterShortcut => s !== undefined);
  };

  return {
    shortcuts,
    activeShortcuts: getActiveShortcuts(),
    allShortcuts: ALL_SHORTCUTS,
    updateShortcuts,
    isLoading,
  };
}
