import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildIcs, type IcsEvent } from "@/lib/ics";

const BIBLE_BOOKS_CHAPTERS: Record<string, number> = {
  // Common books — full list lives in scripture.json on the client.
  // For the feed we only need a sane upper-bound when computing daily reading windows.
};

export const Route = createFileRoute("/hooks/calendar/$token/ics")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = params.token;
        if (!token || token.length < 16) {
          return new Response("Invalid token", { status: 404 });
        }

        // Per-feed filter: ?feeds=plans,selah,events (default = all on)
        const url = new URL(request.url);
        const feedsParam = url.searchParams.get("feeds");
        const allow = feedsParam
          ? new Set(feedsParam.split(",").map((s) => s.trim().toLowerCase()))
          : new Set(["plans", "selah", "events"]);

        // Resolve user from token (service-role client; bypasses RLS intentionally).
        const { data: tokenRow, error: tokenErr } = await supabaseAdmin
          .from("calendar_tokens")
          .select("user_id, rotated_at")
          .eq("token", token)
          .maybeSingle();

        if (tokenErr || !tokenRow) {
          return new Response("Calendar not found", { status: 404 });
        }

        const userId = tokenRow.user_id;

        // Fetch in parallel
        const [eventsRes, planRes, prefRes, profileRes] = await Promise.all([
          supabaseAdmin
            .from("plan_events")
            .select("id, title, description, location, starts_at, ends_at, timezone, rrule")
            .eq("user_id", userId)
            .order("starts_at", { ascending: true })
            .limit(500),
          supabaseAdmin
            .from("reading_plans")
            .select("id, book, start_chapter, started_at, target_chapters_per_day, status")
            .eq("user_id", userId)
            .eq("status", "active"),
          supabaseAdmin
            .from("notification_preferences")
            .select("daily_verse_enabled, daily_verse_time, timezone")
            .eq("user_id", userId)
            .maybeSingle(),
          supabaseAdmin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
        ]);

        const tz = prefRes.data?.timezone || "UTC";
        const events: IcsEvent[] = [];

        // 1) Generative Workspace plan_events
        if (allow.has("events")) {
          for (const ev of eventsRes.data ?? []) {
            events.push({
              uid: `plan-${ev.id}@sanctumiq`,
              title: ev.title,
              description: ev.description,
              location: ev.location,
              startsAt: new Date(ev.starts_at),
              endsAt: new Date(ev.ends_at),
              timezone: ev.timezone || tz,
              rrule: ev.rrule,
            });
          }
        }

        // 2) Reading plans → recurring daily event for the next 90 days as RRULE
        if (allow.has("plans")) {
          for (const plan of planRes.data ?? []) {
            const start = new Date(plan.started_at);
            const [hh = 7, mm = 0] = (prefRes.data?.daily_verse_time ?? "07:00:00")
              .split(":")
              .map(Number);
            const anchor = new Date(start);
            anchor.setUTCHours(hh, mm, 0, 0);
            const end = new Date(anchor.getTime() + 30 * 60 * 1000);
            events.push({
              uid: `reading-${plan.id}@sanctumiq`,
              title: `Read ${plan.book} (${plan.target_chapters_per_day} ch)`,
              description: `Continue your reading plan in SanctumIQ. Starting at ${plan.book} ${plan.start_chapter}.`,
              location: null,
              startsAt: anchor,
              endsAt: end,
              timezone: tz,
              rrule: "FREQ=DAILY;COUNT=90",
            });
          }
        }

        // 3) Selah / daily verse reminder
        if (allow.has("selah") && prefRes.data?.daily_verse_enabled) {
          const [hh = 7, mm = 0] = (prefRes.data.daily_verse_time ?? "07:00:00")
            .split(":")
            .map(Number);
          const anchor = new Date();
          anchor.setUTCHours(hh, mm, 0, 0);
          const end = new Date(anchor.getTime() + 10 * 60 * 1000);
          events.push({
            uid: `selah-daily@${userId}@sanctumiq`,
            title: "Selah — daily reflection",
            description: "Pause for your daily verse and reflection in SanctumIQ.",
            location: null,
            startsAt: anchor,
            endsAt: end,
            timezone: tz,
            rrule: "FREQ=DAILY",
          });
        }

        const calName = profileRes.data?.display_name
          ? `SanctumIQ — ${profileRes.data.display_name}`
          : "SanctumIQ";

        const ics = buildIcs({
          calName,
          calDescription: "Reading plans, Selah reminders, and ministry events from SanctumIQ.",
          events,
          refreshMinutes: 60,
        });

        return new Response(ics, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="sanctumiq.ics"`,
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});

// Suppress unused warning on shared map (kept for future per-book chapter validation).
void BIBLE_BOOKS_CHAPTERS;
