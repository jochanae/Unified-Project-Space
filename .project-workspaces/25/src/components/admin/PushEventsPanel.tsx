/**
 * PushEventsPanel — admin view of recent push delivery events.
 *
 * Reads from `push_events` (admin-only RLS). Surfaces sent/failed/pruned/
 * silenced/retried with status codes so admins can spot endpoint churn or
 * delivery regressions.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Radio } from "lucide-react";
import { CollapsibleAdminCard } from "@/components/admin/CollapsibleAdminCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PushEventRow = {
  id: string;
  event_type: string;
  notification_id: string | null;
  user_id: string | null;
  endpoint_hash: string | null;
  status_code: number | null;
  error: string | null;
  created_at: string;
};

const TYPE_TONE: Record<string, string> = {
  sent: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
  failed: "text-red-300 border-red-500/30 bg-red-500/5",
  pruned: "text-amber-300 border-amber-500/30 bg-amber-500/5",
  silenced: "text-muted-foreground border-border/40 bg-muted/10",
  retried: "text-sky-300 border-sky-500/30 bg-sky-500/5",
};

export function PushEventsPanel() {
  const [rows, setRows] = useState<PushEventRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("push_events")
        .select(
          "id, event_type, notification_id, user_id, endpoint_hash, status_code, error, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        console.warn("push_events load failed", error);
        setRows([]);
        return;
      }
      setRows(data as PushEventRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    if (!rows) return null;
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.event_type] = (counts[r.event_type] ?? 0) + 1;
    return counts;
  }, [rows]);

  return (
    <CollapsibleAdminCard
      id="push-delivery"
      title={
        <span className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-gold" strokeWidth={1.5} />
          Push delivery
        </span>
      }
      description="Last 50 events from the push pipeline — delivery, retries, pruned endpoints, and quiet-hour skips."
      contentClassName="space-y-4"
    >
      {rows === null ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No push events recorded yet.
        </p>
      ) : (
        <>
          {summary && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary).map(([type, n]) => (
                <span
                  key={type}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wider",
                    TYPE_TONE[type] ?? "border-border/40 text-muted-foreground",
                  )}
                >
                  {type} · {n}
                </span>
              ))}
            </div>
          )}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/30 bg-background/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                      TYPE_TONE[r.event_type] ?? "border-border/40 text-muted-foreground",
                    )}
                  >
                    {r.event_type}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <p>
                    Status:{" "}
                    <span className="font-mono text-foreground/80">{r.status_code ?? "—"}</span>
                  </p>
                  <p>
                    Endpoint:{" "}
                    <span className="font-mono text-foreground/80">
                      {r.endpoint_hash ? r.endpoint_hash.slice(0, 10) + "…" : "—"}
                    </span>
                  </p>
                  {r.error ? <p className="break-words text-foreground/80">{r.error}</p> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground/70">
                <tr>
                  <th className="py-2 pr-3 font-normal">When</th>
                  <th className="py-2 pr-3 font-normal">Type</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                  <th className="py-2 pr-3 font-normal">Endpoint</th>
                  <th className="py-2 font-normal">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/30">
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground/80">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                          TYPE_TONE[r.event_type] ?? "border-border/40 text-muted-foreground",
                        )}
                      >
                        {r.event_type}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground/80">
                      {r.status_code ?? "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground/60">
                      {r.endpoint_hash ? r.endpoint_hash.slice(0, 10) + "…" : "—"}
                    </td>
                    <td className="max-w-[240px] truncate py-2 text-muted-foreground/70">
                      {r.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CollapsibleAdminCard>
  );
}
