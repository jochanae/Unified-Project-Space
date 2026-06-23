/**
 * LoadingAppShell — single source of truth for authenticated-route loading screens.
 *
 * Why: every authenticated route had its own `if (loading) return <AppShell pageTitle="..."><Skeleton /></AppShell>`
 * pattern. Easy to forget the `pageTitle` (which causes the marketing seal to flash)
 * or skip the spinner. This wrapper enforces both.
 *
 * Usage:
 *   if (loading) return <LoadingAppShell pageTitle="Notes" text="Fetching your notes…"><NotesSkeleton text="Fetching your notes…" /></LoadingAppShell>;
 *
 * The skeleton itself draws the spinner veil (see page-skeletons.tsx), so this
 * wrapper simply guarantees the AppShell + pageTitle are present.
 */

import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

interface LoadingAppShellProps {
  /** Required — keeps the master header stable so the seal never flashes. */
  pageTitle: string;
  /** Skeleton or any loading content to render inside the shell. */
  children: ReactNode;
}

export function LoadingAppShell({ pageTitle, children }: LoadingAppShellProps) {
  // force-obsidian: locks the loading view to the dark Sanctuary palette in
  // both themes. Prevents the parchment "light header / dark center / light
  // footer" sandwich while pages are loading. The real page paints over this
  // shell once data arrives, in whichever theme is active.
  return (
    <div className="force-obsidian min-h-screen">
      <AppShell pageTitle={pageTitle}>{children}</AppShell>
    </div>
  );
}

export default LoadingAppShell;
