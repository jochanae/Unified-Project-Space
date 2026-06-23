import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsDialog } from '@/components/shortcuts/KeyboardShortcutsDialog';

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <>
      {children}
      <KeyboardShortcutsDialog />
    </>
  );
}
