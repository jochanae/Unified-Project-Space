import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Sprout,
  Leaf,
  Coins,
  MoreHorizontal,
  X,
  Check,
  ShieldCheck,
  ExternalLink,
  Trash2,
  FileDown,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { generateAnnualReport } from "@/lib/finance-report";
import { StewardshipDirectory } from "@/components/finances/StewardshipDirectory";
import { FinancesSkeleton } from "@/components/ui/page-skeletons";
import { FaithGoalHalo } from "@/components/finances/FaithGoalHalo";
import { openPaymentLink, type PaymentLink } from "@/lib/payment-links";

type Category = "tithe" | "offering" | "dues" | "other";
type Method = "cash_app" | "venmo" | "paypal" | "zelle" | "check" | "cash" | "other";

type Entry = {
  id: string;
  category: Category;
  amount_cents: number;
  recipient: string | null;
  memo: string | null;
  entry_date: string;
  verified: boolean;
  method: Method | null;
  payment_link_id: string | null;
};

const METHOD_LABELS: Record<Method, string> = {
  cash_app: "Cash App",
  venmo: "Venmo",
  paypal: "PayPal",
  zelle: "Zelle",
  check: "Check",
  cash: "Cash",
  other: "Other",
};

export const Route = createFileRoute("/finances")({
  head: () => ({
    meta: [
      { title: "Steward Ledger — SanctumIQ" },
      {
        name: "description",
        content:
          "A private steward's ledger for tithes, offerings, and dues. We never touch your bank.",
      },
      { property: "og:title", content: "Steward Ledger — SanctumIQ" },
      {
        property: "og:description",
        content:
          "A private steward's ledger for tithes, offerings, and dues. We never touch your bank.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: FinancesPage,
});

const CATEGORY_META: Record<Category, { label: string; Icon: typeof Leaf }> = {
  tithe: { label: "Tithe", Icon: Leaf },
  offering: { label: "Offering", Icon: Sprout },
  dues: { label: "Dues", Icon: Coins },
  other: { label: "Other", Icon: MoreHorizontal },
};

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function FinancesPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);
  const [pendingTagLink, setPendingTagLink] = useState<PaymentLink | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("finance_entries")
      .select("id,category,amount_cents,recipient,memo,entry_date,verified,method,payment_link_id")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setEntries((data ?? []) as Entry[]);
      });
  }, [user]);

  // Monthly summary
  const summary = useMemo(() => {
    if (!entries)
      return {
        total: 0,
        byCat: { tithe: 0, offering: 0, dues: 0, other: 0 } as Record<Category, number>,
      };
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const byCat: Record<Category, number> = { tithe: 0, offering: 0, dues: 0, other: 0 };
    let total = 0;
    for (const e of entries) {
      if (e.entry_date.startsWith(ym)) {
        byCat[e.category] += e.amount_cents;
        total += e.amount_cents;
      }
    }
    return { total, byCat };
  }, [entries]);

  // YTD totals (for halo + per-link tiles)
  const ytd = useMemo(() => {
    const yr = String(new Date().getUTCFullYear());
    const byLink: Record<string, number> = {};
    let total = 0;
    for (const e of entries ?? []) {
      if (!e.entry_date.startsWith(yr)) continue;
      total += e.amount_cents;
      if (e.payment_link_id)
        byLink[e.payment_link_id] = (byLink[e.payment_link_id] ?? 0) + e.amount_cents;
    }
    return { total, byLink };
  }, [entries]);

  if (loading) return <SkeletonShell />;
  if (!user) return <SignedOutShell />;

  const onCreated = (entry: Entry) => {
    setEntries((prev) => [entry, ...(prev ?? [])]);
    setComposerOpen(false);
    toast.success("Contribution logged", {
      description: `${CATEGORY_META[entry.category].label} · ${fmtMoney(entry.amount_cents)}`,
    });
  };
  const onUpdated = (entry: Entry) => {
    setEntries((prev) => (prev ?? []).map((e) => (e.id === entry.id ? entry : e)));
    setActiveEntry(null);
  };
  const onDeleted = (id: string) => {
    setEntries((prev) => (prev ?? []).filter((e) => e.id !== id));
    setActiveEntry(null);
    toast("Entry removed");
  };

  return (
    <AppShell pageTitle="Stewardship">
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12 space-y-10">
        {/* Stewardship Ribbon — wrapped in Faith Goal halo */}
        <section>
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3 text-center">
            Stewardship Ribbon
          </p>
          <FaithGoalHalo userId={user.id} ytdCents={ytd.total}>
            <div className="hairline rounded-2xl bg-obsidian-elevated/50 px-6 py-8 md:py-10 text-center">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                This Month
              </p>
              <p className="font-display text-5xl md:text-6xl text-gold-soft tracking-tight">
                {fmtMoney(summary.total)}
              </p>
              <div className="mt-7 grid grid-cols-3 gap-3 max-w-md mx-auto">
                <BreakdownStat label="Tithes" value={summary.byCat.tithe} />
                <BreakdownStat label="Offerings" value={summary.byCat.offering} />
                <BreakdownStat label="Dues" value={summary.byCat.dues} />
              </div>
              <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setComposerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-gold/50 bg-transparent px-5 py-2.5 text-sm text-gold-soft hover:bg-gold/10 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Log New Contribution
                </button>
                <ExportReport entries={entries} />
              </div>
            </div>
          </FaithGoalHalo>
        </section>

        {/* Giving Chart */}
        <GivingChart entries={entries ?? []} />

        {/* The Ledger */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">The Ledger</p>
            {entries && entries.length > 0 && (
              <p className="text-xs text-muted-foreground">{entries.length} entries</p>
            )}
          </div>
          {entries === null ? (
            <LedgerSkeleton />
          ) : entries.length === 0 ? (
            <EmptyLedger onAdd={() => setComposerOpen(true)} />
          ) : (
            <ul className="space-y-2.5">
              {entries.map((e) => (
                <EntryCard key={e.id} entry={e} onClick={() => setActiveEntry(e)} />
              ))}
            </ul>
          )}
        </section>

        {/* Stewardship Directory */}
        {user && (
          <StewardshipDirectory
            userId={user.id}
            totalsByLinkId={ytd.byLink}
            onTagContribution={(link) => setPendingTagLink(link)}
          />
        )}
      </div>

      {composerOpen && user && (
        <EntryComposer
          userId={user.id}
          onClose={() => setComposerOpen(false)}
          onCreated={onCreated}
        />
      )}
      {activeEntry && user && (
        <EntryDetail
          userId={user.id}
          entry={activeEntry}
          onClose={() => setActiveEntry(null)}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      )}
      {pendingTagLink && user && (
        <TagAndOpenSheet
          userId={user.id}
          link={pendingTagLink}
          onClose={() => setPendingTagLink(null)}
          onLogged={(entry) => {
            setEntries((prev) => [entry, ...(prev ?? [])]);
            setPendingTagLink(null);
            openPaymentLink(pendingTagLink);
            toast.success("Logged & opening", {
              description: `${CATEGORY_META[entry.category].label} · ${fmtMoney(entry.amount_cents)}`,
            });
          }}
          onSkip={() => {
            const link = pendingTagLink;
            setPendingTagLink(null);
            openPaymentLink(link);
          }}
        />
      )}
    </AppShell>
  );
}

/** Quick-tag sheet: choose category, log entry tied to payment link, then open external app. */
function TagAndOpenSheet({
  userId,
  link,
  onClose,
  onLogged,
  onSkip,
}: {
  userId: string;
  link: PaymentLink;
  onClose: () => void;
  onLogged: (entry: Entry) => void;
  onSkip: () => void;
}) {
  const [category, setCategory] = useState<Category>("tithe");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("finance_entries")
      .insert({
        user_id: userId,
        category,
        amount_cents: cents,
        recipient: link.label,
        memo: null,
        entry_date: new Date().toISOString().slice(0, 10),
        method: null,
        payment_link_id: link.id ?? null,
      })
      .select("id,category,amount_cents,recipient,memo,entry_date,verified,method,payment_link_id")
      .single();
    setSaving(false);
    if (error || !data) return toast.error(error?.message ?? "Could not save");
    onLogged(data as Entry);
  };

  return (
    <Sheet onClose={onClose} title={`Tag & Open · ${link.label}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Log this contribution before opening {link.label}, or skip and just open the app.
        </p>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Category
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
              const { Icon, label } = CATEGORY_META[c];
              const active = category === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md hairline px-2 py-3 text-[11px] transition-colors",
                    active
                      ? "bg-gold/15 border-gold/60 text-gold-soft"
                      : "bg-obsidian/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <LabeledInput label="Amount (USD)">
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent outline-none text-2xl font-display text-gold-soft placeholder:text-muted-foreground/40"
            aria-label="0.00"
          />
        </LabeledInput>
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip & open
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-gold/90 hover:bg-gold text-obsidian text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving ? "Saving…" : "Log & Open"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function BreakdownStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-lg md:text-xl text-foreground">{fmtMoney(value)}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function EntryCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const { Icon, label } = CATEGORY_META[entry.category];
  const date = new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left hairline rounded-lg bg-obsidian-elevated/40 hover:bg-gold/5 transition-colors px-4 py-4 flex items-center gap-4"
      >
        <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display text-base text-foreground truncate">
              {entry.recipient || label}
            </p>
            {entry.verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-gold shrink-0" aria-label="Verified" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {label} · {date}
            {entry.method ? ` · ${METHOD_LABELS[entry.method]}` : ""}
            {entry.memo ? ` · ${entry.memo}` : ""}
          </p>
        </div>
        <p className="font-display text-lg text-gold-soft tabular-nums">
          {fmtMoney(entry.amount_cents)}
        </p>
      </button>
    </li>
  );
}

function EmptyLedger({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="hairline rounded-lg p-10 text-center bg-obsidian-elevated/30">
      <p className="font-display text-xl text-foreground mb-2">No entries yet</p>
      <p className="text-sm text-muted-foreground mb-5">
        Log your first contribution to begin your private ledger.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-md bg-gold/90 hover:bg-gold text-obsidian text-sm font-medium px-4 py-2 transition-colors"
      >
        <Plus className="h-4 w-4" /> Log First Contribution
      </button>
    </div>
  );
}

function ExportReport({ entries }: { entries: Entry[] | null }) {
  const [open, setOpen] = useState(false);
  const years = useMemo(() => {
    const set = new Set<number>();
    const currentYear = new Date().getUTCFullYear();
    set.add(currentYear);
    (entries ?? []).forEach((e) => {
      const y = parseInt(e.entry_date.slice(0, 4), 10);
      if (Number.isFinite(y)) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [entries]);

  const exportYear = (year: number) => {
    setOpen(false);
    if (!entries || entries.length === 0) {
      toast("Nothing to export yet");
      return;
    }
    const yearEntries = entries.filter((e) => e.entry_date.startsWith(String(year)));
    if (yearEntries.length === 0) {
      toast(`No entries for ${year}`);
      return;
    }
    generateAnnualReport(entries, { year });
    toast.success(`${year} report generated`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-gold/20 bg-transparent px-4 py-2.5 text-xs text-muted-foreground hover:text-gold-soft hover:border-gold/40 transition-colors"
      >
        <FileDown className="h-3.5 w-3.5" />
        Annual Report
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 min-w-[140px] hairline rounded-md bg-obsidian-elevated/95 backdrop-blur-xl py-1 shadow-xl">
            <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Export Year
            </p>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => exportYear(y)}
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-gold/10 hover:text-gold-soft transition-colors"
              >
                {y}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <ul className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <li key={i} className="hairline rounded-lg bg-obsidian-elevated/30 h-16 animate-pulse" />
      ))}
    </ul>
  );
}

// PaymentVault was replaced by <StewardshipDirectory /> — see src/components/finances/StewardshipDirectory.tsx

function EntryComposer({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (e: Entry) => void;
}) {
  const [category, setCategory] = useState<Category>("tithe");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [memo, setMemo] = useState("");
  const [method, setMethod] = useState<Method | "">("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("finance_entries")
      .insert({
        user_id: userId,
        category,
        amount_cents: cents,
        recipient: recipient.trim() || null,
        memo: memo.trim() || null,
        entry_date: entryDate,
        method: (method || null) as Method | null,
      })
      .select("id,category,amount_cents,recipient,memo,entry_date,verified,method,payment_link_id")
      .single();
    setSaving(false);
    if (error || !data) return toast.error(error?.message ?? "Could not save");
    onCreated(data as Entry);
  };

  return (
    <Sheet onClose={onClose} title="Log Contribution">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Category
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
              const { Icon, label } = CATEGORY_META[c];
              const active = category === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md hairline px-2 py-3 text-[11px] transition-colors",
                    active
                      ? "bg-gold/15 border-gold/60 text-gold-soft"
                      : "bg-obsidian/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <LabeledInput label="Amount (USD)">
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent outline-none text-2xl font-display text-gold-soft placeholder:text-muted-foreground/40"
            aria-label="0.00"
          />
        </LabeledInput>

        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Date">
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-transparent outline-none text-sm text-foreground"
              aria-label="Date"
            />
          </LabeledInput>
          <LabeledInput label="Recipient">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Church, ministry…"
              className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
              aria-label="Church, ministry…"
            />
          </LabeledInput>
        </div>

        <LabeledInput label="Memo (optional)">
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Note to self…"
            className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
            aria-label="Note to self…"
          />
        </LabeledInput>

        <LabeledInput label="Method (optional)">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Method | "")}
            className="w-full bg-transparent outline-none text-sm text-foreground"
          >
            <option value="">— Select method</option>
            {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </LabeledInput>

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-gold/90 hover:bg-gold text-obsidian text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function EntryDetail({
  userId,
  entry,
  onClose,
  onUpdated,
  onDeleted,
}: {
  userId: string;
  entry: Entry;
  onClose: () => void;
  onUpdated: (e: Entry) => void;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggleVerified = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("finance_entries")
      .update({ verified: !entry.verified })
      .eq("id", entry.id)
      .eq("user_id", userId)
      .select("id,category,amount_cents,recipient,memo,entry_date,verified,method,payment_link_id")
      .single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not update");
    onUpdated(data as Entry);
    toast.success(data.verified ? "Marked verified" : "Verification removed");
  };

  const remove = async () => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setBusy(true);
    const { error } = await supabase
      .from("finance_entries")
      .delete()
      .eq("id", entry.id)
      .eq("user_id", userId);
    setBusy(false);
    if (error) return toast.error(error.message);
    onDeleted(entry.id);
  };

  const { label, Icon } = CATEGORY_META[entry.category];
  const date = new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Sheet onClose={onClose} title="Entry Details">
      <div className="text-center py-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold mb-3">
          <Icon className="h-5 w-5" />
        </span>
        <p className="font-display text-4xl text-gold-soft">{fmtMoney(entry.amount_cents)}</p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">{label}</p>
      </div>

      <dl className="hairline rounded-lg bg-obsidian/40 divide-y divide-[var(--gold-muted)]">
        <DetailRow label="Date" value={date} />
        <DetailRow label="Recipient" value={entry.recipient || "—"} />
        <DetailRow label="Method" value={entry.method ? METHOD_LABELS[entry.method] : "—"} />
        <DetailRow label="Memo" value={entry.memo || "—"} />
        <DetailRow label="Status" value={entry.verified ? "Verified" : "Pending"} />
      </dl>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          onClick={remove}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
        <button
          onClick={toggleVerified}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors",
            entry.verified
              ? "hairline bg-obsidian/40 text-foreground hover:bg-gold/5"
              : "bg-gold/90 hover:bg-gold text-obsidian",
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          {entry.verified ? "Mark Pending" : "Mark Verified"}
        </button>
      </div>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground text-right max-w-[60%] truncate">{value}</dd>
    </div>
  );
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </span>
      <div className="rounded-md border border-gold/20 bg-obsidian/40 px-3 py-2.5 focus-within:border-gold/50 transition-colors">
        {children}
      </div>
    </label>
  );
}

function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-obsidian/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-lg hairline rounded-t-2xl md:rounded-2xl bg-obsidian-elevated/95 backdrop-blur-xl p-5 md:p-6 m-0 md:m-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-lg text-gold-soft">{title}</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   GIVING CHART
   Collapsible area chart — 1M / 6M / 12M / All
   Touch/hover a point to see date + amount tooltip
   ───────────────────────────────────────────────────────────── */
const CHART_COLLAPSE_KEY = "sanctumiq:finance:chart-collapsed";

type Range = "1M" | "6M" | "12M" | "All";
const RANGES: Range[] = ["1M", "6M", "12M", "All"];

function GivingChart({ entries }: { entries: Entry[] }) {
  const [range, setRange] = useState<Range>("1M");
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(CHART_COLLAPSE_KEY);
      // Default to collapsed for new users; respect stored preference otherwise.
      return stored === null ? true : stored === "1";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(CHART_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    if (range === "1M") {
      cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
    } else if (range === "6M") {
      cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 6);
    } else if (range === "12M") {
      cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    } else {
      cutoff = new Date(0);
    }

    // Group by day
    const byDay: Record<string, number> = {};
    for (const e of entries) {
      if (new Date(e.entry_date + "T00:00:00") < cutoff) continue;
      byDay[e.entry_date] = (byDay[e.entry_date] ?? 0) + e.amount_cents / 100;
    }

    if (Object.keys(byDay).length === 0) return [];

    // Fill gaps between first entry and today
    const dates = Object.keys(byDay).sort();
    const start = new Date(dates[0] + "T00:00:00");
    const end = new Date();
    const result = [];
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      result.push({
        date: key,
        label: new Date(key + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        amount: Math.round((byDay[key] ?? 0) * 100) / 100,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [entries, range]);

  const hasData = chartData.some((d) => d.amount > 0);

  const summary = useMemo(() => {
    const total = chartData.reduce((sum, d) => sum + d.amount, 0);
    const days = chartData.filter((d) => d.amount > 0).length;
    return { total, days };
  }, [chartData]);

  const rangeLabel: Record<Range, string> = {
    "1M": "Last month",
    "6M": "Last 6 months",
    "12M": "Last 12 months",
    All: "All time",
  };

  if (entries.length === 0) return null;

  return (
    <section>
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => {
          if (open === collapsed) toggle();
        }}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center justify-between gap-3 mb-3 text-left"
            aria-label={collapsed ? "Show giving over time chart" : "Hide giving over time chart"}
          >
            <div className="flex items-baseline gap-3 min-w-0 flex-wrap">
              <p className="text-xs uppercase tracking-[0.3em] text-gold">Giving Over Time</p>
              {collapsed && hasData && (
                <span className="text-[11px] text-muted-foreground/80 truncate">
                  · {rangeLabel[range]} ·{" "}
                  <span className="text-gold-soft">${summary.total.toFixed(2)}</span>
                  {summary.days > 0 && (
                    <>
                      {" "}
                      · {summary.days} {summary.days === 1 ? "day" : "days"}
                    </>
                  )}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-all duration-300 shrink-0 group-hover:text-gold-soft",
                collapsed ? "rotate-0" : "rotate-180",
              )}
              strokeWidth={1.5}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="hairline rounded-2xl bg-obsidian-elevated/40 px-4 py-5">
            {/* Range selector */}
            <div className="flex items-center gap-1 mb-5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors",
                    range === r
                      ? "bg-gold/15 text-gold-soft border border-gold/30"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            {!hasData ? (
              <p className="text-xs text-muted-foreground/60 text-center py-8">
                No entries in this period.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="givingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#c9a84c" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(201,168,76,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "rgba(201,168,76,0.5)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "rgba(201,168,76,0.5)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.21 0 0 / 0.97)",
                      border: "1px solid rgba(201,168,76,0.25)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#f0d78c",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Given"]}
                    labelStyle={{ color: "rgba(201,168,76,0.7)", fontSize: 11, marginBottom: 2 }}
                    cursor={{ stroke: "rgba(201,168,76,0.3)", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#c9a84c"
                    strokeWidth={2}
                    fill="url(#givingGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#c9a84c", stroke: "oklch(0.21 0 0)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function SignedOutShell() {
  return (
    <SanctuaryGate
      eyebrow="Steward Ledger"
      title="Your private ledger"
      description="Track tithes, offerings, and giving — no bank connections, no third parties. Yours alone."
      redirectTo="/finances"
      features={[
        "Track tithes, offerings, and dues",
        "No bank connections ever",
        "Fully private — your data only",
      ]}
      showReaderLink
    />
  );
}

function SkeletonShell() {
  return (
    <LoadingAppShell pageTitle="Stewardship">
      <FinancesSkeleton text="Fetching your ledger…" />
    </LoadingAppShell>
  );
}
