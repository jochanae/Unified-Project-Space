import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Eye, Headphones, LinkIcon, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareBoardButton } from "@/components/board/ShareBoardButton";
import { VideoLightbox } from "@/components/board/VideoLightbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import audioHeadphonesCover from "@/assets/board-audio-headphones.png";
import { supabase } from "@/integrations/supabase/client";
import {
  getPublicBoardByHandle,
  isValidHandleFormat,
  parseVideoUrl,
  resolveItemThumbnail,
  vimeoPosterUrl,
  youtubePosterFallbackUrl,
  type Board,
  type BoardItem,
  type PublicBoardProfile,
  type VideoProvider,
} from "@/lib/boards";
import { resolveTheme, themeToCssVars } from "@/lib/board-themes";
import { getOwnerIsPaid } from "@/lib/board-public.functions";

type LoaderData =
  | {
      mode: "public";
      profile: PublicBoardProfile;
      board: Board;
      items: BoardItem[];
      ownerIsPaid: boolean;
    }
  | { mode: "preview-pending"; handle: string };

export const Route = createFileRoute("/$handle")({
  loader: async ({ params }): Promise<LoaderData> => {
    const raw = params.handle;
    if (!raw?.startsWith("@")) throw notFound();
    const handle = raw.slice(1).toLowerCase();
    if (!isValidHandleFormat(handle)) throw notFound();
    const result = await getPublicBoardByHandle(handle);
    if (result) {
      const { isPaid } = await getOwnerIsPaid({ data: { userId: result.profile.id } }).catch(
        () => ({ isPaid: false }),
      );
      return { mode: "public", ...result, ownerIsPaid: isPaid };
    }
    // Defer to client to check if viewer is the owner (private preview)
    return { mode: "preview-pending", handle };
  },
  head: ({ loaderData }) => {
    if (!loaderData || loaderData.mode !== "public") {
      return { meta: [{ title: "Board — SanctumIQ" }, { name: "robots", content: "noindex" }] };
    }
    const name = loaderData.profile.display_name || `@${loaderData.profile.handle}`;
    const desc = loaderData.board.bio || `${name}'s sanctuary on SanctumIQ.`;
    const ogImage = `https://sanctumiq.app/api/public/og/${loaderData.profile.handle}`;
    return {
      meta: [
        { title: `${name} (@${loaderData.profile.handle}) — SanctumIQ` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} on SanctumIQ` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${name} on SanctumIQ` },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: ogImage },
      ],
    };
  },
  notFoundComponent: NotFoundView,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-obsidian px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-foreground mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  component: BoardRouteComponent,
});

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">Not found</p>
        <h1 className="font-display text-3xl text-foreground mb-2">No board here</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This handle isn't claimed, or its board is still private.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold hover:text-gold-soft"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          SanctumIQ
        </Link>
      </div>
    </div>
  );
}

type Theme = ReturnType<typeof resolveTheme>;

function BoardRouteComponent() {
  const data = Route.useLoaderData();

  // Public board: render directly
  if (data.mode === "public") {
    return (
      <PublicBoardView
        profile={data.profile}
        board={data.board}
        items={data.items}
        isPreview={false}
        ownerIsPaid={data.ownerIsPaid}
      />
    );
  }

  // Preview-pending: client-side owner check
  return <OwnerPreviewProbe handle={data.handle} />;
}

function OwnerPreviewProbe({ handle }: { handle: string }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "not-owner" }
    | { kind: "owner"; profile: PublicBoardProfile; board: Board; items: BoardItem[] }
  >({ kind: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        if (active) setState({ kind: "not-owner" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, handle, bio, avatar_mode")
        .eq("handle", handle)
        .maybeSingle();
      if (!profile || profile.id !== userId) {
        if (active) setState({ kind: "not-owner" });
        return;
      }
      const [{ data: board }, { data: items }] = await Promise.all([
        supabase.from("boards").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("board_items")
          .select("*")
          .eq("user_id", userId)
          .order("position", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setState({
        kind: "owner",
        profile: profile as PublicBoardProfile,
        board: (board as Board) ?? {
          user_id: userId,
          bio: null,
          featured_scripture_ref: null,
          theme: "quiet",
          published: false,
          show_bible_link: false,
          created_at: "",
          updated_at: "",
        },
        items: (items ?? []) as BoardItem[],
      });
    })();
    return () => {
      active = false;
    };
  }, [handle]);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian px-6">
        <div className="flex flex-col items-center gap-4 text-muted-foreground/70">
          <LoadingSpinner context="page" text="Loading preview…" />
          <p className="text-xs text-muted-foreground/50 text-center">
            If you don't see your board shortly, try signing in on this device.
          </p>
        </div>
      </div>
    );
  }
  if (state.kind === "not-owner") {
    return <NotFoundView />;
  }
  return (
    <PublicBoardView
      profile={state.profile}
      board={state.board}
      items={state.items}
      isPreview
      ownerIsPaid={false}
    />
  );
}

function PublicBoardView({
  profile,
  board,
  items,
  isPreview,
  ownerIsPaid,
}: {
  profile: PublicBoardProfile;
  board: Board;
  items: BoardItem[];
  isPreview: boolean;
  ownerIsPaid: boolean;
}) {
  const initials =
    (profile.display_name || profile.handle || "S")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "S";

  const theme = resolveTheme(board.theme);
  const themeStyle = themeToCssVars(theme);

  return (
    <div
      className="min-h-screen relative"
      style={{
        ...themeStyle,
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${theme.surface} 0%, ${theme.bg} 60%, ${theme.vignette} 100%)`,
        color: "var(--bt-text)",
      }}
    >
      {isPreview && (
        <div
          className="sticky top-0 z-50 backdrop-blur"
          style={{
            borderBottom: `1px solid ${theme.accent}55`,
            background: `${theme.accent}1A`,
          }}
        >
          <div className="mx-auto max-w-2xl px-6 py-2.5 flex items-center justify-between gap-3">
            <span
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]"
              style={{ color: theme.accent }}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview · only you can see this
            </span>
            <Link
              to="/account/board"
              className="text-[10px] uppercase tracking-[0.25em] hover:opacity-80"
              style={{ color: theme.accentSoft }}
            >
              Manage →
            </Link>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-2xl px-6 py-16">
        <header className="text-center mb-12">
          {profile.avatar_mode !== "none" && (
            <Avatar
              className="mx-auto mb-5 h-20 w-20"
              style={{ border: `2px solid ${theme.accent}55` }}
            >
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.display_name ?? ""} />
              ) : null}
              <AvatarFallback
                className="font-display text-2xl tracking-[0.2em]"
                style={{ background: `${theme.accent}1A`, color: theme.accentSoft }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
          <h1 className="font-display text-3xl" style={{ color: theme.text }}>
            {profile.display_name || `@${profile.handle}`}
          </h1>
          <p className="mt-1 text-xs tracking-[0.15em]" style={{ color: theme.accent }}>
            @{profile.handle}
          </p>
          {board.bio ? (
            <p
              className="mx-auto mt-5 max-w-md text-sm leading-relaxed"
              style={{ color: theme.textMuted, letterSpacing: "0.05em" }}
            >
              {board.bio}
            </p>
          ) : null}
          {profile.handle && !isPreview ? (
            <div className="mt-6 flex justify-center">
              <ShareBoardButton handle={profile.handle} displayName={profile.display_name} />
            </div>
          ) : null}
        </header>

        {board.featured_scripture_ref ? (
          <div className="text-center">
            <div
              className="mx-auto mb-4 h-px w-24"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
              }}
            />
            <p
              className="text-[10px] uppercase tracking-[0.4em]"
              style={{ color: theme.textMuted }}
            >
              Anchor
            </p>
            <p className="mt-2 font-display text-xl italic" style={{ color: theme.accentSoft }}>
              {board.featured_scripture_ref}
            </p>
            <div
              className="mx-auto mt-4 h-px w-24"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
              }}
            />
          </div>
        ) : null}

        {items.length === 0 && !board.bio && !board.featured_scripture_ref ? (
          <div
            className="rounded-xl px-8 py-14 text-center"
            style={{
              border: `1px solid ${theme.hairline}`,
              background: `${theme.surface}55`,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.3em] mb-3"
              style={{ color: theme.accent }}
            >
              Sanctuary
            </p>
            {isPreview ? (
              <>
                <p className="font-display text-lg" style={{ color: theme.text }}>
                  Your board is quiet for now.
                </p>
                <p
                  className="mx-auto mt-3 max-w-sm text-sm leading-relaxed"
                  style={{ color: theme.textMuted }}
                >
                  Add a poem, paste a video or audio link, or anchor it with a verse. Whatever you
                  choose, this page shapes itself around it.
                </p>
                <Link
                  to="/account/board"
                  className="mt-6 inline-block text-[10px] uppercase tracking-[0.25em] hover:opacity-80"
                  style={{ color: theme.accentSoft }}
                >
                  Open the editor →
                </Link>
              </>
            ) : (
              <>
                <p className="font-display text-lg" style={{ color: theme.text }}>
                  {profile.display_name ?? `@${profile.handle}`} is preparing something meaningful.
                </p>
                <p
                  className="mx-auto mt-3 max-w-sm text-sm leading-relaxed"
                  style={{ color: theme.textMuted }}
                >
                  Check back soon — you’re welcome here anytime.
                </p>
              </>
            )}
          </div>
        ) : items.length > 0 ? (
          <div>
            {board.featured_scripture_ref ? (
              <div className="flex justify-center" style={{ paddingTop: 32, paddingBottom: 32 }}>
                <DiamondDivider theme={theme} />
              </div>
            ) : null}
            <FreeformBoard items={items} theme={theme} />
          </div>
        ) : null}

        {(!ownerIsPaid || board.show_bible_link) && (
          <>
            {items.length > 0 && (
              <div className="flex justify-center" style={{ paddingTop: 32 }}>
                <DiamondDivider theme={theme} />
              </div>
            )}
            <footer
              className="flex flex-col items-center gap-4 text-center"
              style={{ marginTop: 48 }}
            >
              {!ownerIsPaid && (
                <Link
                  to="/"
                  className="text-[10px] uppercase tracking-[0.3em] hover:opacity-100 transition-opacity"
                  style={{ color: theme.textMuted, opacity: 0.6 }}
                >
                  Built on SanctumIQ
                </Link>
              )}
              {board.show_bible_link && (
                <Link
                  to="/reader"
                  aria-label="Open the SanctumIQ Bible"
                  title="Open the SanctumIQ Bible"
                  className="board-bible-link inline-flex items-center justify-center min-h-11 min-w-11"
                >
                  <BookOpen
                    className="board-bible-icon h-7 w-7"
                    strokeWidth={2.25}
                    style={{ color: theme.accent }}
                    aria-hidden
                  />
                </Link>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Diamond divider — small gold mark between blocks.
   ─────────────────────────────────────────────────────────────── */
function DiamondDivider({ theme }: { theme: Theme }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2" aria-hidden>
      <span
        className="h-px w-10"
        style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}55)` }}
      />
      <span
        className="inline-block h-1.5 w-1.5 rotate-45"
        style={{ background: theme.accent, boxShadow: `0 0 8px ${theme.accent}80` }}
      />
      <span
        className="h-px w-10"
        style={{ background: `linear-gradient(90deg, ${theme.accent}55, transparent)` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FreeformBoard — render items in the exact order the owner arranged
   them in the editor. A diamond divider sits between each item; no
   per-kind grouping, no section headers. What you arrange is what
   visitors see.
   ─────────────────────────────────────────────────────────────── */
/** Returns a strict carousel-group key for a media item, or null if the item
 *  should never be grouped (must stand alone vertically).
 *  Strict rule: only items sharing the EXACT same key may group together.
 *  Videos group with videos. Audio groups with audio. Voice groups with voice. */
function carouselGroupKey(item: BoardItem): "video" | "audio" | "voice" | null {
  // Voice reflection beats kind — a video card with an audio_reflection is a voice piece.
  if (item.audio_reflection) return "voice";
  if (item.kind === "video") return "video";
  if (item.kind === "audio") return "audio";
  // Auto-promote legacy YouTube/Vimeo links to the video group.
  const parsed =
    !item.video_provider && item.external_url ? parseVideoUrl(item.external_url) : null;
  if (parsed) return "video";
  return null;
}

type FreeformGroup =
  | { kind: "single"; item: BoardItem }
  | { kind: "media-carousel"; mediaKind: "video" | "audio" | "voice"; items: BoardItem[] };

function groupFreeformItems(items: BoardItem[]): FreeformGroup[] {
  const groups: FreeformGroup[] = [];
  let run: BoardItem[] = [];
  let runKey: "video" | "audio" | "voice" | null = null;
  const flush = () => {
    if (run.length === 0) return;
    if (run.length === 1 || runKey === null) {
      for (const it of run) groups.push({ kind: "single", item: it });
    } else {
      groups.push({ kind: "media-carousel", mediaKind: runKey, items: run });
    }
    run = [];
    runKey = null;
  };
  for (const it of items) {
    const key = carouselGroupKey(it);
    if (key === null) {
      flush();
      groups.push({ kind: "single", item: it });
      continue;
    }
    if (runKey === null) {
      runKey = key;
      run.push(it);
    } else if (key === runKey) {
      run.push(it);
    } else {
      flush();
      runKey = key;
      run.push(it);
    }
  }
  flush();
  return groups;
}

/** Eyebrow label for any group — singleton or carousel. One shape everywhere:
 *  small uppercase word, gold, centered. Carousels get a "· N" count suffix. */
function singletonLabel(item: BoardItem): string {
  if (item.audio_reflection) return "Voice";
  const parsed =
    !item.video_provider && item.external_url ? parseVideoUrl(item.external_url) : null;
  const kind = parsed ? "video" : item.kind;
  switch (kind) {
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "scripture":
      return "Scripture";
    case "link":
      return "Link";
    case "note":
      return "Memo";
    case "poem":
    default: {
      const sub = ((item as unknown as { subkind?: string | null }).subkind ?? "").toLowerCase();
      if (sub === "note") return "Memo";
      return "Poem";
    }
  }
}

function GroupEyebrow({ label, count, theme }: { label: string; count?: number; theme: Theme }) {
  return (
    <p
      className="font-display text-center text-[10px] uppercase tracking-[0.4em] mb-6"
      style={{ color: theme.accent, opacity: 0.85 }}
    >
      {label}
      {count && count > 1 ? (
        <>
          <span className="mx-2" style={{ opacity: 0.4 }} aria-hidden>
            ·
          </span>
          <span style={{ opacity: 0.6 }}>{count}</span>
        </>
      ) : null}
    </p>
  );
}

/* ── Carousel item with subtle parallax: opacity + shadow depth shift ── */
function CarouselItem({
  children,
  index,
  total,
  className,
}: {
  children: React.ReactNode;
  index: number;
  total: number;
  className?: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [visibility, setVisibility] = useState(index === 0 ? 1 : 0.6);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.closest("[data-carousel-track]");
    if (!parent) return;

    const update = () => {
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const center = parentRect.left + parentRect.width / 2;
      const elCenter = elRect.left + elRect.width / 2;
      const maxDist = parentRect.width / 2;
      const dist = Math.abs(center - elCenter);
      const ratio = Math.max(0, 1 - dist / maxDist);
      setVisibility(0.55 + ratio * 0.45);
    };

    parent.addEventListener("scroll", update, { passive: true });
    update();
    return () => parent.removeEventListener("scroll", update);
  }, []);

  return (
    <li
      ref={ref}
      className={className}
      aria-label={`Media ${index + 1} of ${total}`}
      style={{
        opacity: visibility,
        transform: `scale(${0.96 + visibility * 0.04})`,
        transition: "opacity 0.25s ease-out, transform 0.25s ease-out",
      }}
    >
      {children}
    </li>
  );
}

function FreeformBoard({ items, theme }: { items: BoardItem[]; theme: Theme }) {
  const groups = useMemo(() => groupFreeformItems(items), [items]);
  const carouselLabel: Record<"video" | "audio" | "voice", string> = {
    video: "Video",
    audio: "Audio",
    voice: "Voice",
  };
  return (
    <ul className="flex flex-col">
      {groups.map((g, i) => {
        const key =
          g.kind === "single" ? g.item.id : `carousel-${g.items.map((x) => x.id).join("-")}`;
        const label = g.kind === "single" ? singletonLabel(g.item) : carouselLabel[g.mediaKind];
        const count = g.kind === "single" ? 1 : g.items.length;
        return (
          <li key={key}>
            {i > 0 && (
              <div className="flex justify-center" style={{ paddingTop: 32, paddingBottom: 32 }}>
                <DiamondDivider theme={theme} />
              </div>
            )}
            <GroupEyebrow label={label} count={count} theme={theme} />
            {g.kind === "single" ? (
              <BoardItemRenderer item={g.item} theme={theme} hideKindLabel />
            ) : (
              <div
                className="-mx-6 overflow-x-auto snap-x snap-mandatory scrollbar-none"
                style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
                role="group"
                aria-roledescription="carousel"
                aria-label={`${g.items.length} ${g.mediaKind} items`}
                data-carousel-track
              >
                <ul className="flex gap-4 px-6 pb-2">
                  {g.items.map((item, idx) => (
                    <CarouselItem
                      key={item.id}
                      index={idx}
                      total={g.items.length}
                      className="snap-center shrink-0 w-[88%] sm:w-[420px]"
                    >
                      <BoardItemRenderer item={item} theme={theme} hideKindLabel />
                    </CarouselItem>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BoardSections — group items into per-kind horizontal swipe rails.
type SectionKey = "scripture" | "reflection" | "voice" | "video" | "audio" | "link";
const SECTION_ORDER: SectionKey[] = ["scripture", "reflection", "voice", "audio", "video", "link"];
const SECTION_LABEL: Record<SectionKey, string> = {
  scripture: "Scripture",
  reflection: "Reflections",
  voice: "Voice",
  video: "Videos",
  audio: "Audio",
  link: "Links",
};
// Sections that stack vertically (no horizontal carousel even when multiple items).
const VERTICAL_SECTIONS: ReadonlySet<SectionKey> = new Set(["reflection", "audio", "link", "scripture"]);

function classifyItem(item: BoardItem): SectionKey {
  // Auto-promote legacy YouTube/Vimeo URLs filed as "link" or "audio" to "video".
  const parsed = !item.video_provider && item.external_url ? parseVideoUrl(item.external_url) : null;
  const kind = (parsed ? "video" : item.kind) as BoardItem["kind"];
  if (kind === "video" && item.audio_reflection) return "voice";
  // Poems and notes both live under Reflections.
  if (kind === "poem" || (kind as string) === "note") return "reflection";
  if (kind === "video" || kind === "audio" || kind === "scripture" || kind === "link") {
    return kind;
  }
  return "link";
}

function BoardSections({ items, theme }: { items: BoardItem[]; theme: Theme }) {
  const groups = useMemo(() => {
    const map = new Map<SectionKey, BoardItem[]>();
    for (const it of items) {
      const key = classifyItem(it);
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return SECTION_ORDER
      .map((k) => ({ key: k, items: map.get(k) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [items]);

  // One rule for every section: diamond divider, uppercase label, content.
  // No per-item glyphs, no inline kind tags — the section header is the
  // only signal a new medium has begun.
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <div
          key={g.key}
          className="flex flex-col items-stretch"
          style={g.key === "reflection" ? { marginBottom: 32 } : undefined}
        >
          <div className="flex justify-center" style={{ paddingTop: 32, paddingBottom: 24 }}>
            <DiamondDivider theme={theme} />
          </div>
          <h2
            className="font-display text-center text-[11px] uppercase tracking-[0.2em] mb-6 pl-[0.2em]"
            style={{ color: theme.accent, opacity: 0.75 }}
          >
            {SECTION_LABEL[g.key]}
          </h2>
          <section aria-label={SECTION_LABEL[g.key]}>
            <SectionRail
              items={g.items}
              theme={theme}
              vertical={VERTICAL_SECTIONS.has(g.key)}
              sectionKey={g.key}
            />
          </section>
        </div>
      ))}
    </div>
  );
}

function SectionRail({
  items,
  theme,
  vertical,
  sectionKey,
}: {
  items: BoardItem[];
  theme: Theme;
  vertical: boolean;
  sectionKey: SectionKey;
}) {
  // Reflections (poems / notes / memos) get the in-section eyebrow + hairline
  // divider so distinct pieces don't visually run together.
  const showItemEyebrow = sectionKey === "reflection" && items.length > 1;

  // Vertical stack: every item full-width, separated by hairline space. No carousel.
  if (vertical) {
    return (
      <ul className="flex flex-col">
        {items.map((item, i) => (
          <li key={item.id}>
            {i > 0 && sectionKey === "reflection" ? (
              <div
                className="mx-auto my-10"
                style={{
                  height: 1,
                  maxWidth: "60ch",
                  backgroundColor: theme.accent,
                  opacity: 0.18,
                }}
                aria-hidden
              />
            ) : i > 0 ? (
              <div className="h-10" aria-hidden />
            ) : null}
            <BoardItemRenderer
              item={item}
              theme={theme}
              hideKindLabel={!showItemEyebrow}
            />
          </li>
        ))}
      </ul>
    );
  }
  // Single item in a horizontal section: render full-width, no scaffolding.
  if (items.length === 1) {
    return <BoardItemRenderer item={items[0]} theme={theme} hideKindLabel />;
  }
  return (
    <div
      className="-mx-6 overflow-x-auto snap-x snap-mandatory scrollbar-none"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      role="group"
      aria-roledescription="carousel"
      data-carousel-track
    >
      <ul className="flex gap-4 px-6 pb-2">
        {items.map((item, i) => (
          <CarouselItem
            key={item.id}
            index={i}
            total={items.length}
            className="snap-center shrink-0 w-[88%] sm:w-[420px]"
          >
            <BoardItemRenderer item={item} theme={theme} hideKindLabel />
          </CarouselItem>
        ))}
      </ul>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────
   Type-aware item renderer.
   Each kind gets its own treatment so a poem doesn't read like a link.
   ─────────────────────────────────────────────────────────────── */

function BoardItemRenderer({
  item,
  theme,
  hideKindLabel = false,
}: {
  item: BoardItem;
  theme: Theme;
  hideKindLabel?: boolean;
}) {
  // Legacy items may be filed as "link" or "audio" but actually be a YouTube/Vimeo URL.
  // Auto-promote to video so we render a real thumbnail + lightbox.
  const parsed =
    !item.video_provider && item.external_url ? parseVideoUrl(item.external_url) : null;
  const effectiveItem: BoardItem = parsed
    ? { ...item, kind: "video", video_provider: parsed.provider, video_id: parsed.id }
    : item;

  // Audio reflection: a video link that the owner wants presented as voice/audio
  // (gold headphones cover, "Voice" label, opens video lightbox on tap).
  if (effectiveItem.kind === "video" && effectiveItem.audio_reflection) {
    return <AudioReflectionItem item={effectiveItem} theme={theme} hideKindLabel={hideKindLabel} />;
  }

  switch (effectiveItem.kind) {
    case "poem":
    case "note":
      return <PoemItem item={effectiveItem} theme={theme} hideKindLabel={hideKindLabel} />;
    case "video":
      return <VideoItem item={effectiveItem} theme={theme} hideKindLabel={hideKindLabel} />;
    case "audio":
      return <AudioItem item={effectiveItem} theme={theme} hideKindLabel={hideKindLabel} />;
    case "scripture":
      return <ScriptureItem item={effectiveItem} theme={theme} hideKindLabel={hideKindLabel} />;
    case "link":
    default:
      return <LinkItem item={effectiveItem} theme={theme} hideKindLabel={hideKindLabel} />;
  }
}

/* ── Audio reflection: video link rendered as gold-headphones voice card ── */
function AudioReflectionItem({
  item,
  theme,
  hideKindLabel = false,
}: {
  item: BoardItem;
  theme: Theme;
  hideKindLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canPlay = !!item.video_provider && !!item.video_id;

  const Tile = (
    <div
      className="group relative w-full aspect-video overflow-hidden rounded-xl"
      style={{
        border: `1px solid ${theme.hairline}`,
        background: theme.bg,
        boxShadow: `0 0 0 1px ${theme.accent}10, 0 20px 40px -20px rgba(0,0,0,0.6)`,
      }}
    >
      <img
        src={audioHeadphonesCover}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      {/* glassmorphic veil for legibility + premium feel */}
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <span
        className="font-display text-[10px] uppercase tracking-[0.5em] absolute bottom-4 left-1/2 -translate-x-1/2"
        style={{ color: theme.accent, opacity: 0.7 }}
      >
        Tap to listen
      </span>
    </div>
  );

  return (
    <article className="px-2">
      {!hideKindLabel ? (
        <div className="flex items-center justify-center gap-3 mb-3">
          <Headphones className="h-3 w-3" style={{ color: theme.accent }} />
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: theme.accent, opacity: 0.85 }}
          >
            Voice
          </p>
        </div>
      ) : null}
      {canPlay ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={item.title ? `Play ${item.title}` : "Play voice reflection"}
          className="block w-full text-left"
        >
          {Tile}
        </button>
      ) : item.external_url ? (
        <a
          href={item.external_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.title ?? "Open voice reflection"}
          className="block"
        >
          {Tile}
        </a>
      ) : (
        <div>{Tile}</div>
      )}
      {(item.title || item.caption) && (
        <div className="mt-4 text-center">
          {item.title ? (
            <h3 className="font-display text-xl" style={{ color: theme.text }}>
              {item.title}
            </h3>
          ) : null}
          {item.caption ? (
            <p
              className="mt-2 text-sm leading-relaxed mx-auto max-w-prose"
              style={{ color: theme.textMuted }}
            >
              {item.caption}
            </p>
          ) : null}
        </div>
      )}
      {open && canPlay ? (
        <VideoLightbox
          provider={item.video_provider as VideoProvider}
          videoId={item.video_id as string}
          title={item.title}
          accent={theme.accent}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </article>
  );
}

/* ── Poem / Note / Memo: editorial, borderless, gold hairlines, full text ── */
function PoemItem({
  item,
  theme,
  hideKindLabel = false,
}: {
  item: BoardItem;
  theme: Theme;
  hideKindLabel?: boolean;
}) {
  const rawSub = (item as unknown as { subkind?: string | null }).subkind;
  const sub = (rawSub ?? (item.kind === "note" ? "note" : "poem")).toLowerCase();
  // The app surfaces "note" as "Memo" — keep one consistent label.
  const subLabel = sub === "poem" ? "Poem" : "Memo";

  // Suppress the title when it duplicates the caption's first line (the
  // "double header" effect). Also suppress legacy "Untitled poem".
  const captionFirstLine = (item.caption ?? "").split(/\r?\n/)[0]?.trim().toLowerCase() ?? "";
  const titleNorm = (item.title ?? "").trim().toLowerCase();
  const showTitle =
    !!item.title &&
    titleNorm !== "untitled poem" &&
    titleNorm !== captionFirstLine &&
    titleNorm !== sub; // hides titles literally set to "MEMO" / "NOTE" / "POEM"

  return (
    <article className="px-2">
      {!hideKindLabel ? (
        <p
          className="text-center text-[10px] uppercase tracking-[0.4em] mb-4"
          style={{ color: theme.accent, opacity: 0.85 }}
        >
          {subLabel}
        </p>
      ) : null}
      {showTitle ? (
        <h2
          className={`${sub === "poem" ? "text-center" : "text-left mx-auto"} font-display text-2xl mb-6`}
          style={{ color: theme.text, maxWidth: sub === "poem" ? undefined : "60ch" }}
        >
          {item.title}
        </h2>
      ) : null}
      {item.caption ? (
        sub === "poem" ? (
          <div
            className="font-display whitespace-pre-wrap text-center mx-auto max-w-prose"
            style={{
              color: theme.text,
              fontSize: "1.05rem",
              lineHeight: 1.85,
              letterSpacing: "0.005em",
            }}
          >
            {item.caption}
          </div>
        ) : (
          <div
            className="whitespace-pre-wrap text-left mx-auto"
            style={{
              color: theme.text,
              fontSize: "1rem",
              lineHeight: 1.7,
              maxWidth: "60ch",
            }}
          >
            {item.caption}
          </div>
        )
      ) : null}
    </article>
  );
}

/* ── Video: 16:9 thumbnail + lightbox. Title/caption sit BELOW the tile (no overlap). ── */
function VideoItem({
  item,
  theme,
  hideKindLabel = false,
}: {
  item: BoardItem;
  theme: Theme;
  hideKindLabel?: boolean;
}) {
  const initialThumb = resolveItemThumbnail(item);
  const [thumb, setThumb] = useState<string | null>(initialThumb);
  const [thumbStage, setThumbStage] = useState<"primary" | "fallback" | "failed">("primary");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (initialThumb) return;
    if (item.video_provider === "vimeo" && item.video_id) {
      let active = true;
      vimeoPosterUrl(item.video_id).then((url) => {
        if (active && url) setThumb(url);
      });
      return () => {
        active = false;
      };
    }
  }, [initialThumb, item.video_provider, item.video_id]);

  const onImgError = () => {
    // YouTube: try hqdefault, then give up to placeholder.
    if (thumbStage === "primary" && item.video_provider === "youtube" && item.video_id) {
      setThumb(youtubePosterFallbackUrl(item.video_id));
      setThumbStage("fallback");
      return;
    }
    setThumbStage("failed");
  };

  const canPlay = !!item.video_provider && !!item.video_id;
  const showFallback = !thumb || thumbStage === "failed";

  const handleOpen = (e: React.MouseEvent) => {
    if (canPlay) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const Tile = (
    <div
      className="group relative w-full aspect-video overflow-hidden rounded-xl"
      style={{
        border: `1px solid ${theme.hairline}`,
        background: theme.bg,
        boxShadow: `0 0 0 1px ${theme.accent}10, 0 20px 40px -20px rgba(0,0,0,0.6)`,
      }}
    >
      {!showFallback ? (
        <img
          src={thumb!}
          alt={item.title ?? "Video"}
          loading="lazy"
          onError={onImgError}
          onLoad={(e) => {
            // YouTube returns a 120x90 "video unavailable" placeholder when no real thumb exists.
            // Treat any tiny natural dimension as a failed load so we render the gold glass fallback.
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalWidth <= 120) {
              setThumbStage("failed");
            }
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `radial-gradient(ellipse at center, ${theme.surface} 0%, ${theme.bg} 70%, ${theme.vignette} 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, ${theme.accent}22 0%, transparent 40%), radial-gradient(circle at 80% 70%, ${theme.accent}15 0%, transparent 40%)`,
            }}
          />
          <span
            className="font-display text-xs uppercase tracking-[0.5em] absolute bottom-4 left-1/2 -translate-x-1/2"
            style={{ color: theme.accent, opacity: 0.6 }}
          >
            SanctumIQ
          </span>
        </div>
      )}
      {/* subtle vignette only — no text inside the tile */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-md transition-transform group-hover:scale-110"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${theme.accent}66`,
            boxShadow: `0 0 30px ${theme.accent}33`,
          }}
        >
          <Play className="h-6 w-6 fill-current ml-1" style={{ color: theme.accent }} />
        </div>
      </div>
    </div>
  );

  return (
    <article className="px-2">
      {!hideKindLabel ? (
        <div className="flex items-center justify-center gap-3 mb-3">
          <Play className="h-3 w-3 fill-current" style={{ color: theme.accent }} />
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: theme.accent, opacity: 0.85 }}
          >
            Video
          </p>
        </div>
      ) : null}
      {canPlay ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={item.title ?? "Play video"}
          className="block w-full text-left"
        >
          {Tile}
        </button>
      ) : item.external_url ? (
        <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="block">
          {Tile}
        </a>
      ) : (
        <div>{Tile}</div>
      )}
      {(item.title || item.caption) && (
        <div className="mt-4 text-center">
          {item.title ? (
            <h3 className="font-display text-xl" style={{ color: theme.text }}>
              {item.title}
            </h3>
          ) : null}
          {item.caption ? (
            <p
              className="mt-2 text-sm leading-relaxed mx-auto max-w-prose"
              style={{ color: theme.textMuted }}
            >
              {item.caption}
            </p>
          ) : null}
        </div>
      )}
      {open && canPlay ? (
        <VideoLightbox
          provider={item.video_provider as VideoProvider}
          videoId={item.video_id as string}
          title={item.title}
          accent={theme.accent}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </article>
  );
}

/* ── Audio: borderless editorial — gold icon, serif title, minimalist progress bar ── */
function AudioItem({
  item,
  theme,
  hideKindLabel = false,
}: {
  item: BoardItem;
  theme: Theme;
  hideKindLabel?: boolean;
}) {
  const isDirectAudio =
    !!item.external_url && /\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(item.external_url);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
    } else {
      a.pause();
    }
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <article
      className="px-2 rounded-xl"
      style={{
        border: `1px solid ${theme.accent}44`,
        background: `${theme.surface}55`,
        padding: "1.5rem 1.25rem",
        boxShadow: `0 0 0 1px ${theme.accent}10, 0 8px 24px -12px rgba(0,0,0,0.3)`,
      }}
    >
      {!hideKindLabel ? (
        <div className="flex items-center justify-center gap-3 mb-4">
          <span
            className="h-px w-8"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}80)` }}
          />
          <Headphones className="h-3.5 w-3.5" style={{ color: theme.accent }} />
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: theme.accent, opacity: 0.85 }}
          >
            Audio
          </p>
          <span
            className="h-px w-8"
            style={{ background: `linear-gradient(90deg, ${theme.accent}80, transparent)` }}
          />
        </div>
      ) : null}
      {item.title ? (
        <h3 className="text-center font-display text-2xl mb-2" style={{ color: theme.text }}>
          {item.title}
        </h3>
      ) : null}
      {item.caption ? (
        <p
          className="text-center text-sm leading-relaxed mx-auto max-w-prose mb-5"
          style={{ color: theme.textMuted }}
        >
          {item.caption}
        </p>
      ) : null}
      {isDirectAudio ? (
        <div className="mx-auto max-w-md">
          <audio
            ref={audioRef}
            src={item.external_url ?? undefined}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              setCurrent(t);
              setProgress(duration ? t / duration : 0);
            }}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105 shrink-0"
              style={{ border: `1px solid ${theme.accent}66`, background: `${theme.accent}14` }}
            >
              {playing ? (
                <span className="flex gap-0.5">
                  <span className="block h-3 w-[3px]" style={{ background: theme.accent }} />
                  <span className="block h-3 w-[3px]" style={{ background: theme.accent }} />
                </span>
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" style={{ color: theme.accent }} />
              )}
            </button>
            <div className="flex-1">
              <div
                className="relative h-px w-full cursor-pointer"
                onClick={onSeek}
                style={{ background: `${theme.accent}22` }}
              >
                <div
                  className="absolute left-0 top-0 h-px"
                  style={{ background: theme.accent, width: `${progress * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rotate-45"
                  style={{
                    background: theme.accent,
                    left: `calc(${progress * 100}% - 3px)`,
                    boxShadow: `0 0 6px ${theme.accent}`,
                  }}
                />
              </div>
              <div
                className="mt-2 flex justify-between text-[10px] tracking-[0.2em]"
                style={{ color: theme.textMuted }}
              >
                <span>{fmt(current)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : item.external_url ? (
        <div className="text-center">
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] hover:opacity-80"
            style={{ color: theme.accentSoft }}
          >
            Listen →
          </a>
        </div>
      ) : null}
    </article>
  );
}

/* ── Link: borderless editorial — gold icon, serif title, hairline underline ── */
function LinkItem({
  item,
  theme,
  hideKindLabel = false,
}: {
  item: BoardItem;
  theme: Theme;
  hideKindLabel?: boolean;
}) {
  const host = useMemo(() => {
    if (!item.external_url) return null;
    try {
      return new URL(item.external_url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }, [item.external_url]);

  const inner = (
    <article className="px-2 text-center group">
      {!hideKindLabel ? (
        <div className="flex items-center justify-center gap-3 mb-3">
          <LinkIcon className="h-3.5 w-3.5" style={{ color: theme.accent }} />
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: theme.accent, opacity: 0.85 }}
          >
            Link
          </p>
        </div>
      ) : null}
      {item.title ? (
        <h3
          className="font-display text-2xl mb-2 transition-opacity group-hover:opacity-80"
          style={{ color: theme.text }}
        >
          {item.title}
        </h3>
      ) : null}
      {item.caption ? (
        <p
          className="text-sm leading-relaxed mx-auto max-w-prose mb-3"
          style={{ color: theme.textMuted }}
        >
          {item.caption}
        </p>
      ) : null}
      {host ? (
        <div className="inline-flex items-center gap-2">
          <span className="h-px w-6" style={{ background: `${theme.accent}80` }} />
          <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: theme.accent }}>
            {host} →
          </span>
          <span className="h-px w-6" style={{ background: `${theme.accent}80` }} />
        </div>
      ) : null}
    </article>
  );

  return item.external_url ? (
    <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
}

/* ── Scripture: pull-quote ── */
function ScriptureItem({
  item,
  theme,
  hideKindLabel = false,
}: {
  item: BoardItem;
  theme: Theme;
  hideKindLabel?: boolean;
}) {
  return (
    <article className="px-2 text-center">
      {!hideKindLabel ? (
        <p
          className="text-[10px] uppercase tracking-[0.4em] mb-4"
          style={{ color: theme.accent, opacity: 0.85 }}
        >
          Scripture
        </p>
      ) : null}
      {item.caption ? (
        <blockquote
          className="font-display italic mx-auto max-w-prose"
          style={{ color: theme.text, fontSize: "1.15rem", lineHeight: 1.7 }}
        >
          “{item.caption}”
        </blockquote>
      ) : null}
      {item.title ? (
        <p className="mt-4 text-xs uppercase tracking-[0.3em]" style={{ color: theme.accentSoft }}>
          — {item.title}
        </p>
      ) : null}
    </article>
  );
}
