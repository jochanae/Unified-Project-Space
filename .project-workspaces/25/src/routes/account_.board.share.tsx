import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getOwnBoard, getOwnHandle, type Board } from "@/lib/boards";

export const Route = createFileRoute("/account_/board/share")({
  head: () => ({
    meta: [
      { title: "Share Your Board — SanctumIQ" },
      { name: "description", content: "Share your public board — your anchor, in one quiet link." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShareBoardPage,
});

function GoldDiamond() {
  return (
    <div className="flex items-center justify-center gap-2 py-4" aria-hidden>
      <span className="h-px w-10 bg-gold/30" />
      <span className="inline-block h-1.5 w-1.5 rotate-45 bg-gold" />
      <span className="h-px w-10 bg-gold/30" />
    </div>
  );
}

function ShareBoardPage() {
  const { user, loading: authLoading } = useAuth();
  const profile = useProfile(user?.id);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      try {
        const [h, b] = await Promise.all([getOwnHandle(user.id), getOwnBoard(user.id)]);
        if (!active) return;
        setHandle(h);
        setBoard(b);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const shareUrl = useMemo(() => {
    if (!handle) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://sanctumiq.app";
    return `${origin}/@${handle}`;
  }, [handle]);

  const published = board?.published ?? false;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    const data = {
      title: profile.displayName ? `${profile.displayName} on SanctumIQ` : "My Board — SanctumIQ",
      text: "What anchors me. One quiet link.",
      url: shareUrl,
    };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(data);
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <LoadingAppShell pageTitle="Share your board">
        <AccountSkeleton text="Preparing your link…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Board"
        title="Sign in to share your board"
        description="Boards are public sanctuaries you opt into."
        redirectTo="/account/board/share"
      />
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <Link
          to="/account/board"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to your board
        </Link>

        <header className="text-center mb-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold">The Veranda</p>
          <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3">
            Share your board
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
            One quiet link — your name, your anchor, your work — for those you serve.
          </p>
        </header>

        <GoldDiamond />

        {/* No handle yet */}
        {!handle ? (
          <div className="border border-gold/15 bg-obsidian/40 p-8 text-center space-y-4">
            <p className="font-display italic text-gold-soft text-base">
              Claim a handle to receive your share link.
            </p>
            <Link
              to="/account/board"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/40 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
            >
              Claim your handle
            </Link>
          </div>
        ) : (
          <>
            {/* Link preview card */}
            <div className="border border-gold/20 bg-obsidian/60 backdrop-blur p-6 md:p-8 space-y-5">
              {/* Mini board preview */}
              <div className="border border-gold/15 bg-obsidian/80 p-6 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center overflow-hidden">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-gold text-lg">
                      {(profile.displayName?.[0] ?? handle[0] ?? "·").toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="font-display text-foreground text-lg">@{handle}</p>
                {board?.featured_scripture_ref && (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-gold">
                    {board.featured_scripture_ref}
                  </p>
                )}
                {board?.bio && (
                  <p className="font-display italic text-gold-soft text-sm leading-relaxed max-w-xs mx-auto">
                    "{board.bio}"
                  </p>
                )}
              </div>

              {/* URL */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  Public link
                </p>
                <div className="flex items-center justify-between gap-3 border border-gold/20 bg-obsidian px-4 py-3">
                  <code className="font-display text-sm text-gold-soft truncate">{shareUrl}</code>
                  <button
                    onClick={handleCopy}
                    className="inline-flex shrink-0 items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-gold hover:text-foreground transition-colors"
                    aria-label="Copy link"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Published status */}
              {!published && (
                <p className="text-xs text-amber-400/80 leading-relaxed border-l border-amber-400/40 pl-3">
                  Your board is currently unpublished. The link will only display content once you
                  publish from your board settings.
                </p>
              )}
            </div>

            <GoldDiamond />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-gold/50 bg-gold/10 px-6 py-3.5 font-display text-sm tracking-[0.18em] uppercase text-gold transition-colors hover:bg-gold/20"
              >
                <Share2 className="h-4 w-4" />
                Share Your Anchor
              </button>
              <a
                href={shareUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-gold/25 px-6 py-3.5 font-display text-sm tracking-[0.18em] uppercase text-foreground/85 transition-colors hover:bg-gold/5 hover:text-gold"
              >
                <ExternalLink className="h-4 w-4" />
                Open Board
              </a>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
