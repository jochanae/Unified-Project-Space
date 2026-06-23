import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Target, X, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { fetchActiveGoal, upsertGoal, clearGoal, type FaithGoal } from "@/lib/faith-goal";
import { cn } from "@/lib/utils";

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

/**
 * Halo wraps the Stewardship Ribbon total with a circular gold progress ring
 * showing YTD giving against an annual Faith Goal. Tap the halo to set/edit.
 */
export function FaithGoalHalo({
  userId,
  ytdCents,
  children,
}: {
  userId: string;
  ytdCents: number;
  children: React.ReactNode;
}) {
  const [goal, setGoal] = useState<FaithGoal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const year = new Date().getUTCFullYear();

  useEffect(() => {
    fetchActiveGoal(userId, year)
      .then((g) => {
        setGoal(g);
        setLoaded(true);
      })
      .catch((e) => {
        toast.error(e.message);
        setLoaded(true);
      });
  }, [userId, year]);

  const target = goal?.target_cents ?? 0;
  const progress = target > 0 ? Math.min(1, ytdCents / target) : 0;
  const pct = Math.round(progress * 100);

  return (
    <>
      <div className="relative">
        {/* Halo ring — only when goal is set. SVG sits behind the ribbon. */}
        {loaded && goal && target > 0 && (
          <div
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
            aria-hidden
          >
            <ProgressRing progress={progress} />
          </div>
        )}

        <div className="relative z-10">{children}</div>

        {/* Goal label / set-goal CTA */}
        {loaded && (
          <div className="mt-3 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] transition-colors",
                goal
                  ? "border-gold/40 bg-gold/5 text-gold-soft hover:border-gold hover:bg-gold/10"
                  : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-gold-soft",
              )}
            >
              <Target className="h-3 w-3" />
              {goal ? `${pct}% of ${fmtMoney(target)} · ${year}` : `Set ${year} Faith Goal`}
            </button>
          </div>
        )}
      </div>

      <FaithGoalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        userId={userId}
        year={year}
        goal={goal}
        onSaved={(g) => {
          setGoal(g);
          setEditorOpen(false);
        }}
        onCleared={() => {
          setGoal(null);
          setEditorOpen(false);
        }}
      />
    </>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  // Single SVG ring sized to the ribbon. CSS percent ensures responsive scaling.
  const size = 320;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-[110%] w-[110%] max-w-none opacity-90">
      <defs>
        <linearGradient id="halo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f0d78c" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(201,168,76,0.12)"
        strokeWidth={stroke}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#halo-gradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
    </svg>
  );
}

function FaithGoalEditor({
  open,
  onOpenChange,
  userId,
  year,
  goal,
  onSaved,
  onCleared,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  year: number;
  goal: FaithGoal | null;
  onSaved: (g: FaithGoal) => void;
  onCleared: () => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const title = goal ? `Edit ${year} Faith Goal` : `Set ${year} Faith Goal`;
  const description =
    "A quiet target for your year of stewardship. Set a flat amount, or 10% of expected income.";

  const body = (
    <FaithGoalForm
      userId={userId}
      year={year}
      goal={goal}
      onSaved={onSaved}
      onCleared={onCleared}
      onClose={() => onOpenChange(false)}
    />
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

function FaithGoalForm({
  userId,
  year,
  goal,
  onSaved,
  onCleared,
  onClose,
}: {
  userId: string;
  year: number;
  goal: FaithGoal | null;
  onSaved: (g: FaithGoal) => void;
  onCleared: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"flat" | "percent">(
    goal?.percent_of_income ? "percent" : "flat",
  );
  const [flatAmount, setFlatAmount] = useState(
    goal?.target_cents ? String(goal.target_cents / 100) : "",
  );
  const [percent, setPercent] = useState(
    goal?.percent_of_income ? String(goal.percent_of_income) : "10",
  );
  const [income, setIncome] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let targetCents = 0;
    let pct: number | null = null;
    if (mode === "flat") {
      const n = parseFloat(flatAmount);
      if (!Number.isFinite(n) || n <= 0) return setError("Enter a target amount");
      targetCents = Math.round(n * 100);
    } else {
      const p = parseFloat(percent);
      const inc = parseFloat(income);
      if (!Number.isFinite(p) || p <= 0 || p > 100) return setError("Enter 1–100%");
      if (!Number.isFinite(inc) || inc <= 0) return setError("Enter expected annual income");
      pct = Math.round(p * 100) / 100;
      targetCents = Math.round(inc * 100 * (pct / 100));
    }

    setSaving(true);
    try {
      const saved = await upsertGoal({ userId, year, targetCents, percentOfIncome: pct });
      toast.success("Faith Goal saved");
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!goal) return;
    if (!confirm("Clear this Faith Goal?")) return;
    setSaving(true);
    try {
      await clearGoal(userId, year);
      toast("Goal cleared");
      onCleared();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("flat")}
          className={cn(
            "hairline rounded-lg px-3 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
            mode === "flat"
              ? "border-gold bg-gold/10 text-gold"
              : "bg-obsidian/40 text-muted-foreground hover:text-gold-soft",
          )}
        >
          Flat Amount
        </button>
        <button
          type="button"
          onClick={() => setMode("percent")}
          className={cn(
            "hairline rounded-lg px-3 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
            mode === "percent"
              ? "border-gold bg-gold/10 text-gold"
              : "bg-obsidian/40 text-muted-foreground hover:text-gold-soft",
          )}
        >
          % of Income
        </button>
      </div>

      {mode === "flat" ? (
        <div className="space-y-1.5">
          <Label htmlFor="flat" className="text-[11px] uppercase tracking-[0.18em] text-gold-soft">
            Annual Target (USD)
          </Label>
          <Input
            id="flat"
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            value={flatAmount}
            onChange={(e) => setFlatAmount(e.target.value)}
            placeholder="5000"
            className="bg-obsidian/40 text-2xl font-display text-gold-soft"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pct" className="text-[11px] uppercase tracking-[0.18em] text-gold-soft">
              Percent
            </Label>
            <Input
              id="pct"
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="bg-obsidian/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="income"
              className="text-[11px] uppercase tracking-[0.18em] text-gold-soft"
            >
              Expected Income
            </Label>
            <Input
              id="income"
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="50000"
              className="bg-obsidian/40"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-[#c4654a]/40 bg-[#c4654a]/10 px-3 py-2 text-[12px] text-[#e8a87c]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        {goal ? (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            <X className="inline h-3.5 w-3.5 mr-1" /> Cancel
          </button>
        )}
        <Button
          type="submit"
          disabled={saving}
          className="bg-gold text-obsidian hover:bg-gold-soft"
        >
          {saving ? "Saving…" : goal ? "Update Goal" : "Set Goal"}
        </Button>
      </div>
    </form>
  );
}
