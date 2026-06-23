import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ExternalLink, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  PRESETS,
  getPreset,
  openPaymentLink,
  validateCustomUrl,
  type PaymentKind,
  type PaymentLink,
} from "@/lib/payment-links";
import { cn } from "@/lib/utils";

const MAX_LINKS = 5;

type Row = {
  id: string;
  kind: PaymentKind;
  label: string;
  handle: string | null;
  url: string;
  position: number;
};

const fmtTotalShort = (cents: number) => {
  if (cents <= 0) return null;
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1)}k`;
  return `$${dollars.toFixed(0)}`;
};

export function StewardshipDirectory({
  userId,
  totalsByLinkId,
  onTagContribution,
}: {
  userId: string;
  /** YTD total in cents per payment_link_id. Optional. */
  totalsByLinkId?: Record<string, number>;
  /** Called when user taps a destination — opens tagging composer before opening external link. */
  onTagContribution?: (link: PaymentLink) => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("user_payment_links")
      .select("id,kind,label,handle,url,position")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setRows((data ?? []) as Row[]);
      });
  }, [userId]);

  const handleCreated = (row: Row) => {
    setRows((prev) => [...(prev ?? []), row]);
    setSheetOpen(false);
  };

  const handleDelete = async (id: string) => {
    const prev = rows;
    setRows((r) => (r ?? []).filter((x) => x.id !== id));
    const { error } = await supabase.from("user_payment_links").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
    }
  };

  const atLimit = (rows?.length ?? 0) >= MAX_LINKS;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Stewardship Directory</p>
        <button
          type="button"
          disabled={atLimit}
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-obsidian/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:border-gold hover:bg-gold/10 disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          {atLimit ? "Full" : "Add"}
        </button>
      </div>

      <div className="hairline rounded-2xl bg-obsidian-elevated/40 p-5 md:p-6">
        {rows === null ? (
          <DirectorySkeleton />
        ) : rows.length === 0 ? (
          <EmptyState onAdd={() => setSheetOpen(true)} />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {rows.map((r) => (
              <DestinationTile
                key={r.id}
                row={r}
                ytdTotalCents={totalsByLinkId?.[r.id] ?? 0}
                onDelete={() => handleDelete(r.id)}
                onTagContribution={onTagContribution}
              />
            ))}
          </div>
        )}
        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground/90">
          SanctumIQ does not access your bank or store payment details. We simply provide a secure
          bridge to your trusted destinations.
        </p>
      </div>

      <AddDestinationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        userId={userId}
        existingCount={rows?.length ?? 0}
        onCreated={handleCreated}
      />
    </section>
  );
}

function DirectorySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="hairline h-16 animate-pulse rounded-lg bg-obsidian/40" />
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gold/25 bg-obsidian/20 px-6 py-10 text-center transition-colors hover:border-gold/50 hover:bg-gold/5"
    >
      <Sparkles className="h-5 w-5 text-gold/60 transition-colors group-hover:text-gold" />
      <div>
        <p className="font-display text-sm text-gold-soft">Waiting for purpose</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Add your church, Cash App, or any giving destination.
        </p>
      </div>
    </button>
  );
}

function DestinationTile({
  row,
  ytdTotalCents,
  onDelete,
  onTagContribution,
}: {
  row: Row;
  ytdTotalCents: number;
  onDelete: () => void;
  onTagContribution?: (link: PaymentLink) => void;
}) {
  const link: PaymentLink = {
    id: row.id,
    kind: row.kind,
    label: row.label,
    handle: row.handle,
    url: row.url,
  };
  const totalLabel = fmtTotalShort(ytdTotalCents);
  const handleOpen = () => {
    if (onTagContribution) onTagContribution(link);
    else openPaymentLink(link);
  };
  return (
    <div className="group hairline relative flex items-center justify-between gap-2 rounded-lg bg-obsidian/40 px-4 py-4 transition-colors hover:border-gold/40 hover:bg-gold/5">
      <button
        type="button"
        onClick={handleOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <KindMark kind={row.kind} />
        <span className="min-w-0">
          <span className="block font-display text-sm text-foreground">{row.label}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {totalLabel ? (
              <>
                <span className="text-gold-soft/80 tabular-nums">{totalLabel}</span>
                <span className="text-muted-foreground/60"> · YTD</span>
                {row.handle && <span className="text-muted-foreground/60"> · {row.handle}</span>}
              </>
            ) : (
              (row.handle ?? <span className="text-muted-foreground/40">No giving yet</span>)
            )}
          </span>
        </span>
      </button>
      <div className="flex items-center gap-1">
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60" />
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${row.label}`}
          className="rounded-md p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Sacred-geometric placeholder mark. */
function KindMark({ kind }: { kind: PaymentKind }) {
  const letter =
    kind === "cashapp"
      ? "$"
      : kind === "venmo"
        ? "V"
        : kind === "paypal"
          ? "P"
          : kind === "zelle"
            ? "Z"
            : "✦";
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-obsidian/60 font-display text-sm text-gold">
      {letter}
    </span>
  );
}

// ---------- Add Destination (Adaptive: Drawer on mobile, Dialog on desktop) ----------

function AddDestinationSheet({
  open,
  onOpenChange,
  userId,
  existingCount,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  existingCount: number;
  onCreated: (row: Row) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const title = "Add Destination";
  const description = `Stewardship address book — ${existingCount}/${MAX_LINKS} used.`;
  const body = (
    <AddDestinationForm userId={userId} existingCount={existingCount} onCreated={onCreated} />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hairline max-w-md bg-obsidian-elevated/90 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="hairline bg-obsidian-elevated/95 backdrop-blur-2xl">
        <DrawerHeader>
          <DrawerTitle className="font-display text-gold">{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}

function AddDestinationForm({
  userId,
  existingCount,
  onCreated,
}: {
  userId: string;
  existingCount: number;
  onCreated: (row: Row) => void;
}) {
  const [kind, setKind] = useState<PaymentKind>("cashapp");
  const [handle, setHandle] = useState("");
  const [label, setLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preset = kind !== "custom" ? getPreset(kind) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (existingCount >= MAX_LINKS) {
      setError(`Maximum of ${MAX_LINKS} destinations`);
      return;
    }

    let payload: { kind: PaymentKind; label: string; handle: string | null; url: string };

    if (preset) {
      const cleaned = preset.normalize(handle);
      if (!cleaned) {
        setError(`Enter your ${preset.name.toLowerCase()} handle`);
        return;
      }
      payload = {
        kind: preset.kind,
        label: label.trim() || preset.name,
        handle: cleaned,
        url: preset.toUrl(cleaned),
      };
    } else {
      if (!label.trim()) {
        setError("Add a label so you remember what this is");
        return;
      }
      const v = validateCustomUrl(customUrl);
      if (!v.ok) {
        setError(v.error);
        return;
      }
      payload = { kind: "custom", label: label.trim(), handle: null, url: v.url };
    }

    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("user_payment_links")
      .insert({ ...payload, user_id: userId, position: existingCount })
      .select("id,kind,label,handle,url,position")
      .single();
    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not save");
      return;
    }
    toast.success("Destination added");
    onCreated(data as Row);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Quick Add presets */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Quick Add
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.kind}
              type="button"
              onClick={() => {
                setKind(p.kind);
                setError(null);
              }}
              className={cn(
                "hairline flex flex-col items-center gap-1 rounded-lg bg-obsidian/40 px-2 py-3 text-[11px] transition-colors",
                kind === p.kind
                  ? "border-gold bg-gold/10 text-gold"
                  : "text-muted-foreground hover:border-gold/40 hover:text-gold-soft",
              )}
            >
              <KindMark kind={p.kind} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setKind("custom");
            setError(null);
          }}
          className={cn(
            "mt-2 w-full rounded-lg border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors",
            kind === "custom"
              ? "border-gold bg-gold/10 text-gold"
              : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-gold-soft",
          )}
        >
          + Custom Website / URL
        </button>
      </div>

      {/* Conditional fields */}
      {preset ? (
        <>
          <div className="space-y-1.5">
            <Label
              htmlFor="handle"
              className="text-[11px] uppercase tracking-[0.18em] text-gold-soft"
            >
              {preset.hint}
            </Label>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={preset.placeholder}
              autoComplete="off"
              className="bg-obsidian/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="label"
              className="text-[11px] uppercase tracking-[0.18em] text-gold-soft"
            >
              Label (optional)
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={preset.name}
              maxLength={60}
              className="bg-obsidian/40"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label
              htmlFor="label"
              className="text-[11px] uppercase tracking-[0.18em] text-gold-soft"
            >
              Label
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Local Church"
              maxLength={60}
              className="bg-obsidian/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url" className="text-[11px] uppercase tracking-[0.18em] text-gold-soft">
              Website URL
            </Label>
            <Input
              id="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://yourchurch.org/give"
              type="url"
              autoComplete="off"
              maxLength={500}
              className="bg-obsidian/40"
            />
          </div>
        </>
      )}

      {error && (
        <p className="rounded-md border border-[#c4654a]/40 bg-[#c4654a]/10 px-3 py-2 text-[12px] text-[#e8a87c]">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={saving}
        className="w-full bg-gold text-obsidian hover:bg-gold-soft"
      >
        {saving ? "Saving…" : "Add to Directory"}
      </Button>
    </form>
  );
}
