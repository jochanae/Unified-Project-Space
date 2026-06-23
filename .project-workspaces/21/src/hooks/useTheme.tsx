import { ReactNode } from 'react';

// Dark mode is permanent — class="dark" is set in index.html before first paint.
export function useTheme() {
  return { theme: 'dark' as const, setTheme: () => {}, resolvedTheme: 'dark' as const };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
