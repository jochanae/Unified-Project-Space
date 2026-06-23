/**
 * PageSkeletons — page-shaped loading states for authenticated routes.
 *
 * Each export mirrors the rough layout of a real page so the loading state
 * feels like the page is materializing rather than a blank screen with a
 * spinner. The custom <LoadingSpinner /> overlays softly on top, anchoring
 * the eye while the skeleton conveys structure.
 *
 * Pure presentation. No data, no hooks beyond render. Hairline + obsidian
 * tokens only — no raw hex.
 */

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

/* ─────────────────── Building blocks ─────────────────── */

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-gold/5 via-gold/10 to-gold/5 animate-pulse",
        className,
      )}
    />
  );
}

function Card({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "hairline rounded-xl bg-obsidian-elevated/30 backdrop-blur-xl animate-pulse",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Full-screen obsidian veil + centered gold spinner. Locked to dark in both
 * themes so the spinner's gold glow always reads cleanly and page→page
 * transitions feel like a deliberate curtain rather than a stutter.
 */
function SpinnerVeil({ text }: { text?: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-[hsl(28_22%_8%/0.92)] backdrop-blur-md">
      <LoadingSpinner context="page" text={text} />
    </div>
  );
}

/* ─────────────────── Page-shaped skeletons ─────────────────── */

/** Account / Billing — stacked cards in a narrow column. */
export function AccountSkeleton({ text = "Preparing your sanctuary…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-lg px-6 py-16 space-y-6">
        <Card className="h-32" />
        <Card className="h-40" />
        <Card className="h-28" />
        <Card className="h-24" />
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Notifications — header + list of message rows. */
export function NotificationsSkeleton({
  text = "Gathering your notifications…",
}: {
  text?: string;
}) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Bar className="h-6 w-40" />
          <Bar className="h-8 w-24" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-20 px-4 py-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-gold/10" />
            <div className="flex-1 space-y-2">
              <Bar className="h-3 w-2/3" />
              <Bar className="h-3 w-full" />
            </div>
          </Card>
        ))}
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Settings — short stack of toggles/option rows. */
export function SettingsSkeleton({ text = "Loading settings…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        <Bar className="h-7 w-48" />
        <Bar className="h-3 w-72" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-20" />
          ))}
        </div>
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Notes — editor column + side list. */
export function NotesSkeleton({ text = "Preparing your notes…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bar className="h-8 w-24" />
            <Bar className="h-8 w-24" />
          </div>
          <Card className="h-[60svh]" />
        </div>
        <div className="space-y-3">
          <Bar className="h-9 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-16" />
          ))}
        </div>
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Vault — collection rail + items grid. */
export function VaultSkeleton({ text = "Opening your Vault…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <Bar className="h-7 w-40" />
          <Bar className="h-9 w-28" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-12 w-32 shrink-0" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-28" />
          ))}
        </div>
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Saved & Highlights — tabs + list of verse cards. */
export function SavedSkeleton({ text = "Loading your saved verses…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        <div className="flex gap-2">
          <Bar className="h-9 w-28" />
          <Bar className="h-9 w-28" />
          <Bar className="h-9 w-28" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-24 px-4 py-4 space-y-2">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-5/6" />
          </Card>
        ))}
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Journey — pair of placeholder cards. */
export function JourneySkeleton({ text = "Gathering your journey…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-2xl px-6 py-16 space-y-8">
        <Bar className="h-7 w-48 mx-auto" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="h-44" />
          <Card className="h-44" />
        </div>
        <Card className="h-32" />
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Stewardship / Finances — ribbon + chart + ledger. */
export function FinancesSkeleton({ text = "Opening your ledger…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12 space-y-10">
        {/* Ribbon */}
        <Card className="h-56 px-6 py-8 space-y-4 flex flex-col items-center justify-center">
          <Bar className="h-3 w-24" />
          <Bar className="h-12 w-48" />
          <div className="grid grid-cols-3 gap-3 max-w-sm w-full pt-4">
            <Bar className="h-10" />
            <Bar className="h-10" />
            <Bar className="h-10" />
          </div>
        </Card>
        {/* Chart */}
        <Card className="h-48" />
        {/* Ledger */}
        <div className="space-y-3">
          <Bar className="h-3 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-16" />
          ))}
        </div>
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Workspace — header + sermon rail + activity rails. */
export function WorkspaceSkeleton({ text = "Preparing your workspace…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <div className="flex flex-col items-center gap-3">
          <Bar className="h-8 w-56" />
          <Bar className="h-3 w-72" />
        </div>
        <Card className="h-40" />
        <div className="space-y-3">
          <Bar className="h-3 w-40" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-36 w-64 shrink-0" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Bar className="h-3 w-40" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-32 w-60 shrink-0" />
            ))}
          </div>
        </div>
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Sermon Composer — wizard step shell. */
export function SermonComposerSkeleton({ text = "Opening Sermon Composer…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <div className="flex items-center gap-2">
          <Bar className="h-2 w-16" />
          <Bar className="h-2 w-16" />
          <Bar className="h-2 w-16" />
        </div>
        <Bar className="h-8 w-64" />
        <Card className="h-[50svh]" />
        <div className="flex justify-between">
          <Bar className="h-10 w-24" />
          <Bar className="h-10 w-32" />
        </div>
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Sermon detail — manuscript editor shell. */
export function SermonDetailSkeleton({ text = "Loading sermon…" }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div className="space-y-3">
          <Bar className="h-3 w-32" />
          <Bar className="h-9 w-2/3" />
          <Bar className="h-3 w-48" />
        </div>
        <div className="flex gap-2">
          <Bar className="h-9 w-24" />
          <Bar className="h-9 w-24" />
          <Bar className="h-9 w-24" />
        </div>
        <Card className="h-[55svh]" />
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}

/** Generic — for routes without a strong layout signature yet. */
export function GenericPageSkeleton({ text }: { text?: string }) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-2xl px-6 py-16 space-y-6">
        <Bar className="h-8 w-48" />
        <Bar className="h-3 w-72" />
        <Card className="h-48" />
        <Card className="h-48" />
      </div>
      <SpinnerVeil text={text} />
    </div>
  );
}
