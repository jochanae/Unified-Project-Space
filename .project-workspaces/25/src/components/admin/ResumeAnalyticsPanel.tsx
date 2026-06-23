/**
 * ResumeAnalyticsPanel — admin-only view of cross-device resume toast events (mobile-friendly).
 *
 * Filters: event type (shown/accepted/undo), version, and date range.
 * Stats and table reflect the active filter set. Reads from
 * `reader_resume_events` (RLS allows admins to view all rows).
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleAdminCard } from "@/components/admin/CollapsibleAdminCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type EventType = "shown" | "accepted" | "undo";

type ResumeEventRow = {
  id: string;
  user_id: string;
  event_type: EventType;
  book: string | null;
  chapter: number | null;
  verse: number | null;
  version: string | null;
  created_at: string;
};

type RangePreset = "1" | "7" | "30" | "custom";

const PRESET_DAYS: Record<Exclude<RangePreset, "custom">, number> = {
  "1": 1,
  "7": 7,
  "30": 30,
};

function isoDay(d: Date): string {
  // YYYY-MM-DD in local time, suitable for <input type="date" aria-label="Date">
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ResumeAnalyticsPanel() {
  const [rows, setRows] = useState<ResumeEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [rangePreset, setRangePreset] = useState<RangePreset>("7");
  const [customStart, setCustomStart] = useState<string>(
    isoDay(new Date(Date.now() - 7 * 86_400_000)),
  );
  const [customEnd, setCustomEnd] = useState<string>(isoDay(new Date()));
  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [version, setVersion] = useState<string>("all");

  const range = useMemo(() => {
    if (rangePreset === "custom") {
      const start = new Date(`${customStart}T00:00:00`);
      const end = new Date(`${customEnd}T23:59:59.999`);
      return { startISO: start.toISOString(), endISO: end.toISOString() };
    }
    const days = PRESET_DAYS[rangePreset];
    const start = new Date(Date.now() - days * 86_400_000);
    return { startISO: start.toISOString(), endISO: new Date().toISOString() };
  }, [rangePreset, customStart, customEnd]);

  const load = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("reader_resume_events")
      .select("id, user_id, event_type, book, chapter, verse, version, created_at")
      .gte("created_at", range.startISO)
      .lte("created_at", range.endISO)
      .order("created_at", { ascending: false })
      .limit(500);

    if (eventType !== "all") query = query.eq("event_type", eventType);
    if (version !== "all") query = query.eq("version", version);

    const { data, error } = await query;
    if (!error) setRows((data ?? []) as ResumeEventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startISO, range.endISO, eventType, version]);

  // Distinct versions across loaded rows for the dropdown.
  // We supplement with KJV/ASV defaults so the menu is useful even before data loads.
  const versionOptions = useMemo(() => {
    const set = new Set<string>(["KJV", "ASV"]);
    for (const r of rows) if (r.version) set.add(r.version);
    return Array.from(set).sort();
  }, [rows]);

  const totals = useMemo(() => {
    const counts = { shown: 0, accepted: 0, undo: 0 };
    for (const row of rows) counts[row.event_type] += 1;
    const decisions = counts.accepted + counts.undo;
    const acceptanceRate = decisions === 0 ? null : (counts.accepted / decisions) * 100;
    return { ...counts, acceptanceRate };
  }, [rows]);

  const rangeLabel =
    rangePreset === "custom"
      ? `${customStart} → ${customEnd}`
      : `last ${PRESET_DAYS[rangePreset]} day${PRESET_DAYS[rangePreset] === 1 ? "" : "s"}`;

  return (
    <CollapsibleAdminCard
      id="resume-analytics"
      title="Resume Analytics"
      description={`Cross-device "Resumed where you left off" toast — ${rangeLabel}.`}
      headerActions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="h-8 border-border/70 bg-background/30 px-3 text-[10px] uppercase tracking-[0.18em]"
        >
          <RefreshCw className={cn("mr-2 h-3 w-3", loading && "animate-spin")} />
          Refresh
        </Button>
      }
      contentClassName="space-y-5"
    >
      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/70 bg-background/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterBlock label="Range">
          <Select value={rangePreset} onValueChange={(v) => setRangePreset(v as RangePreset)}>
            <SelectTrigger className="h-9 bg-background/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>
        </FilterBlock>

        <FilterBlock label="Event">
          <Select value={eventType} onValueChange={(v) => setEventType(v as EventType | "all")}>
            <SelectTrigger className="h-9 bg-background/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="shown">Shown</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="undo">Undo</SelectItem>
            </SelectContent>
          </Select>
        </FilterBlock>

        <FilterBlock label="Version">
          <Select value={version} onValueChange={setVersion}>
            <SelectTrigger className="h-9 bg-background/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All versions</SelectItem>
              {versionOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBlock>

        {rangePreset === "custom" ? (
          <FilterBlock label="Dates">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 bg-background/40"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="date"
                value={customEnd}
                min={customStart}
                max={isoDay(new Date())}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 bg-background/40"
              />
            </div>
          </FilterBlock>
        ) : (
          <FilterBlock label="Reset">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-border/70 bg-background/40 text-[10px] uppercase tracking-[0.18em]"
              onClick={() => {
                setRangePreset("7");
                setEventType("all");
                setVersion("all");
              }}
            >
              Clear filters
            </Button>
          </FilterBlock>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Shown" value={totals.shown} />
        <Stat label="Accepted" value={totals.accepted} tone="positive" />
        <Stat label="Undo" value={totals.undo} tone="warn" />
        <Stat
          label="Acceptance"
          value={totals.acceptanceRate === null ? "—" : `${totals.acceptanceRate.toFixed(0)}%`}
        />
      </div>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-8 text-sm text-muted-foreground">
          No resume events match these filters.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.slice(0, 50).map((row) => (
              <div key={row.id} className="rounded-lg border border-border/70 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                      row.event_type === "accepted" && "bg-emerald-500/12 text-emerald-300",
                      row.event_type === "undo" && "bg-amber-500/12 text-amber-300",
                      row.event_type === "shown" && "bg-gold/12 text-gold-soft",
                    )}
                  >
                    {row.event_type}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <p className="break-words text-foreground">
                    {row.book
                      ? `${row.book} ${row.chapter}${row.verse ? `:${row.verse}` : ""}`
                      : "—"}
                  </p>
                  <p className="uppercase tracking-[0.18em]">{row.version ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                          row.event_type === "accepted" && "bg-emerald-500/12 text-emerald-300",
                          row.event_type === "undo" && "bg-amber-500/12 text-amber-300",
                          row.event_type === "shown" && "bg-gold/12 text-gold-soft",
                        )}
                      >
                        {row.event_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {row.book ? (
                        <>
                          {row.book} {row.chapter}
                          {row.verse ? `:${row.verse}` : ""}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {row.version ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </CollapsibleAdminCard>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "positive" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl",
          tone === "positive" && "text-emerald-300",
          tone === "warn" && "text-amber-300",
          !tone && "text-gold-soft",
        )}
      >
        {value}
      </p>
    </div>
  );
}
