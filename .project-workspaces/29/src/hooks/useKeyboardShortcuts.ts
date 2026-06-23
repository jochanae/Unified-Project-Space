import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    {
      key: 'q',
      alt: true,
      description: 'Open Quinn Mentor',
      action: () => navigate('/mentor'),
    },
    {
      key: 'j',
      alt: true,
      description: 'Open Trade Journal',
      action: () => navigate('/journal'),
    },
    {
      key: 'd',
      alt: true,
      description: 'Go to Dashboard',
      action: () => navigate('/dashboard'),
    },
    {
      key: 'c',
      alt: true,
      description: 'Open Options Calculator',
      action: () => navigate('/calculator'),
    },
    {
      key: 'p',
      alt: true,
      description: 'Open Youth Mode',
      action: () => navigate('/youth-mode'),
    },
    {
      key: 's',
      alt: true,
      description: 'Open Strategies',
      action: () => navigate('/strategies'),
    },
    {
      key: 'l',
      alt: true,
      description: 'Open Learning Hub',
      action: () => navigate('/learn'),
    },
    {
      key: 'r',
      alt: true,
      description: 'Open Reminders',
      action: () => navigate('/reminders'),
    },
    {
      key: 'a',
      alt: true,
      description: 'Open Analytics',
      action: () => navigate('/analytics'),
    },
    {
      key: 'g',
      alt: true,
      description: 'Open Glossary',
      action: () => navigate('/learn?tab=glossary'),
    },
    {
      key: '/',
      description: 'Show keyboard shortcuts',
      action: () => {
        // This will be handled by opening the shortcuts dialog
        document.dispatchEvent(new CustomEvent('toggle-shortcuts-dialog'));
      },
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        // Special case for '/' which shouldn't require modifiers
        if (shortcut.key === '/' && keyMatch && !event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          shortcut.action();
          return;
        }

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

// Helper to format shortcut display
export function formatShortcut(shortcut: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push('⇧');
  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}
