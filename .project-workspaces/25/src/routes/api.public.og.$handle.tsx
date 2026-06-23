/**
 * Public share image for boards. Served as SVG for broad compatibility on web
 * surfaces (X, LinkedIn, Discord, Slack, Facebook, Telegram, Bluesky).
 *
 * iMessage / WhatsApp prefer raster — they will simply omit the preview image
 * and still show the og:title and og:description.
 *
 * Endpoint: /api/public/og/$handle
 *   $handle = "@username" (URL-encoded) or "username"
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveTheme } from "@/lib/board-themes";

const HANDLE_RE = /^[a-z][a-z0-9_]{2,29}$/;

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length > maxCharsPerLine) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.length > maxCharsPerLine - 1) lines[maxLines - 1] = clamp(last, maxCharsPerLine);
    else if (text.length > lines.join(" ").length)
      lines[maxLines - 1] = clamp(last + "…", maxCharsPerLine);
  }
  return lines;
}

function buildSvg(opts: {
  displayName: string;
  handle: string;
  bio: string | null;
  anchor: string | null;
  themeId: string;
  initials: string;
}): string {
  const t = resolveTheme(opts.themeId);
  const W = 1200;
  const H = 630;

  const name = escapeXml(clamp(opts.displayName, 38));
  const handle = escapeXml("@" + opts.handle);
  const bioLines = opts.bio ? wrapLines(opts.bio, 56, 3).map(escapeXml) : [];
  const anchor = opts.anchor ? escapeXml(clamp(opts.anchor, 40)) : null;
  const initials = escapeXml(opts.initials);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg}"/>
      <stop offset="100%" stop-color="${t.surface}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.7">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="${t.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${t.hairline}" stroke-width="1"/>

  <!-- Avatar circle -->
  <circle cx="140" cy="170" r="56" fill="${t.surface}" stroke="${t.accent}" stroke-opacity="0.55" stroke-width="2"/>
  <text x="140" y="170" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="36" letter-spacing="4" fill="${t.accentSoft}">${initials}</text>

  <!-- Name + handle block -->
  <text x="220" y="148"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="56" font-weight="500" fill="${t.text}">${name}</text>
  <text x="220" y="198"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="22" letter-spacing="6" fill="${t.accent}">${handle.toUpperCase()}</text>

  <!-- Hairline divider -->
  <line x1="100" y1="280" x2="${W - 100}" y2="280" stroke="${t.hairline}" stroke-width="1"/>

  <!-- Bio -->
  ${bioLines
    .map(
      (line, i) =>
        `<text x="100" y="${340 + i * 44}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="28" fill="${t.text}" fill-opacity="0.9">${line}</text>`,
    )
    .join("\n  ")}

  <!-- Anchor scripture -->
  ${
    anchor
      ? `<text x="100" y="${H - 130}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="18" letter-spacing="4" fill="${t.textMuted}">ANCHOR · <tspan fill="${t.accentSoft}">${anchor}</tspan></text>`
      : ""
  }

  <!-- Footer brand -->
  <text x="100" y="${H - 75}" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="${t.text}">SanctumIQ</text>
  <text x="100" y="${H - 50}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" letter-spacing="3" fill="${t.textMuted}">A SANCTUARY FOR THE WORD</text>

  <!-- Seal mark, top right -->
  <text x="${W - 100}" y="${H - 50}" text-anchor="end"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="14" letter-spacing="3" fill="${t.textMuted}">sanctumiq.app/${handle}</text>
</svg>`;
}

function initialsFor(name: string, handle: string): string {
  const seed = (name || handle || "S").trim();
  const parts = seed.split(/\s+/).filter(Boolean).slice(0, 2);
  const out = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return out || "S";
}

export const Route = createFileRoute("/api/public/og/$handle")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const raw = decodeURIComponent(params.handle ?? "");
        const handle = raw.replace(/^@/, "").trim().toLowerCase();
        if (!HANDLE_RE.test(handle)) {
          return new Response("Invalid handle", { status: 400 });
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name, handle, bio, updated_at")
          .eq("handle", handle)
          .maybeSingle();

        if (!profile) {
          return new Response("Not found", { status: 404 });
        }

        const { data: board } = await supabaseAdmin
          .from("boards")
          .select("bio, featured_scripture_ref, theme, published, updated_at")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (!board || !board.published) {
          return new Response("Not published", { status: 404 });
        }

        // Build a stable ETag from the inputs that change the rendered card.
        const etagSource = [
          handle,
          profile.display_name ?? "",
          board.bio ?? profile.bio ?? "",
          board.featured_scripture_ref ?? "",
          board.theme ?? "",
          board.updated_at ?? "",
          profile.updated_at ?? "",
        ].join("|");
        // djb2-style hash → short hex; strong enough for cache validation.
        let h = 5381;
        for (let i = 0; i < etagSource.length; i++)
          h = ((h << 5) + h + etagSource.charCodeAt(i)) | 0;
        const etag = `W/"og-${(h >>> 0).toString(16)}"`;

        if (request.headers.get("if-none-match") === etag) {
          return new Response(null, {
            status: 304,
            headers: {
              ETag: etag,
              "Cache-Control":
                "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
            },
          });
        }

        const svg = buildSvg({
          displayName: profile.display_name || `@${handle}`,
          handle,
          bio: board.bio || profile.bio,
          anchor: board.featured_scripture_ref,
          themeId: board.theme,
          initials: initialsFor(profile.display_name ?? "", handle),
        });

        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
            ETag: etag,
          },
        });
      },
    },
  },
});
