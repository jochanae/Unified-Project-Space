import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Settings as SettingsIcon, Brain, Lock, Sparkles, Database,
  Trash2, Loader2, ChevronRight, Info, Download, Pin, PinOff,
  Search, Archive, RotateCcw, FileText, ChevronDown,
  Wallet, TrendingUp, Home, CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface QuinnSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MemoryTier = "foundational" | "identity" | "episodic" | "contextual" | "transient";

interface QuinnMemory {
  id: string;
  tier: MemoryTier;
  topic: string;
  content: string;
  current_score: number;
  is_pinned: boolean;
  is_active: boolean;
  emotional_weight: number;
}

interface LinkedAccount {
  id: string;
  name: string;
  account_type: string | null;
  balance: number | null;
}

const PERSONA_LABELS = ["Gentle", "Balanced", "Direct", "Assertive"];
const TIER_META: Record<MemoryTier, { label: string; emoji: string; tone: string }> = {
  foundational: { label: "Foundational", emoji: "🌳", tone: "text-[hsl(var(--quinn-champagne))]" },
  identity:     { label: "Identity",     emoji: "🧬", tone: "text-emerald-300" },
  episodic:     { label: "Episodic",     emoji: "📍", tone: "text-sky-300" },
  contextual:   { label: "Contextual",   emoji: "🔄", tone: "text-violet-300" },
  transient:    { label: "Transient",    emoji: "💭", tone: "text-muted-foreground" },
};
const TIER_ORDER: MemoryTier[] = ["foundational", "identity", "episodic", "contextual", "transient"];

// Asset-class grouping for the Data Context section. Maps any account_type
// string to one of four "weight classes" so the user reads a portfolio
// instead of a flat toggle list.
type AssetClass = "cash" | "investments" | "assets" | "debt";
const ASSET_CLASS_META: Record<AssetClass, { label: string; sublabel: string; icon: typeof Wallet; tone: string; ring: string }> = {
  cash: {
    label: "Cash", sublabel: "The War Chest",
    icon: Wallet,
    tone: "text-[hsl(158_70%_72%)]",
    ring: "hsl(158 70% 48% / 0.35)",
  },
  investments: {
    label: "Investments", sublabel: "The Growth Engine",
    icon: TrendingUp,
    tone: "text-[hsl(268_75%_80%)]",
    ring: "hsl(268 70% 62% / 0.4)",
  },
  assets: {
    label: "Assets", sublabel: "The Pillars",
    icon: Home,
    tone: "text-[hsl(40_85%_75%)]",
    ring: "hsl(40 70% 60% / 0.4)",
  },
  debt: {
    label: "Debt", sublabel: "The Obligations",
    icon: CreditCard,
    tone: "text-[hsl(0_85%_76%)]",
    ring: "hsl(0 75% 58% / 0.4)",
  },
};
const ASSET_CLASS_ORDER: AssetClass[] = ["cash", "investments", "assets", "debt"];

function classifyAccount(type: string | null): AssetClass {
  const t = (type || "").toLowerCase();
  if (/(check|sav|cash|money_market)/.test(t)) return "cash";
  if (/(invest|brokerage|retire|401|ira|roth|hsa)/.test(t)) return "investments";
  if (/(real_estate|home|property|vehicle|auto(?!_loan)|other)/.test(t)) return "assets";
  if (/(loan|mortgage|credit|debt|liab)/.test(t)) return "debt";
  return "assets";
}

const PRIVACY_KEY_DEFAULT = "quinn:privacy:defaultPrivate";
const PRIVACY_KEY_AUTOCLEAR = "quinn:privacy:autoClear";
const PERSONA_KEY_AUDIT = "quinn:persona:auditIntensity";
const PERSONA_KEY_STRATEGIST = "quinn:persona:strategistIntensity";
const DATA_KEY_LISTENING = "quinn:data:listeningAccountIds";

function readBool(key: string, fallback: boolean) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === "true"; } catch { return fallback; }
}
function readNum(key: string, fallback: number) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : Number(v); } catch { return fallback; }
}

export function QuinnSettingsDrawer({ open, onOpenChange }: QuinnSettingsDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<QuinnMemory[]>([]);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [memorySearch, setMemorySearch] = useState("");
  const [showForgotten, setShowForgotten] = useState(false);

  const [defaultPrivate, setDefaultPrivate] = useState(() => readBool(PRIVACY_KEY_DEFAULT, false));
  const [autoClear, setAutoClear] = useState(() => readBool(PRIVACY_KEY_AUTOCLEAR, true));
  const [auditIntensity, setAuditIntensity] = useState(() => readNum(PERSONA_KEY_AUDIT, 1));
  const [strategistIntensity, setStrategistIntensity] = useState(() => readNum(PERSONA_KEY_STRATEGIST, 1));
  const [listeningIds, setListeningIds] = useState<Set<string>>(() => {
    try { const raw = localStorage.getItem(DATA_KEY_LISTENING); return new Set<string>(raw ? JSON.parse(raw) : []); }
    catch { return new Set(); }
  });
  // Collapsible state for the four asset-class groups in Data Context.
  // Default: only "Cash" expanded so the section opens light, not as a wall.
  const [openClasses, setOpenClasses] = useState<Record<AssetClass, boolean>>({
    cash: true, investments: false, assets: false, debt: false,
  });

  useEffect(() => { try { localStorage.setItem(PRIVACY_KEY_DEFAULT, String(defaultPrivate)); } catch {} }, [defaultPrivate]);
  useEffect(() => { try { localStorage.setItem(PRIVACY_KEY_AUTOCLEAR, String(autoClear)); } catch {} }, [autoClear]);
  useEffect(() => { try { localStorage.setItem(PERSONA_KEY_AUDIT, String(auditIntensity)); } catch {} }, [auditIntensity]);
  useEffect(() => { try { localStorage.setItem(PERSONA_KEY_STRATEGIST, String(strategistIntensity)); } catch {} }, [strategistIntensity]);
  useEffect(() => { try { localStorage.setItem(DATA_KEY_LISTENING, JSON.stringify([...listeningIds])); } catch {} }, [listeningIds]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [memRes, acctRes] = await Promise.all([
          supabase
            .from("quinn_memories" as any)
            .select("id, tier, topic, content, current_score, is_pinned, is_active, emotional_weight")
            .eq("user_id", user.id)
            .order("is_active", { ascending: false })
            .order("current_score", { ascending: false })
            .limit(200),
          supabase
            .from("accounts")
            .select("id, name, account_type, balance")
            .eq("user_id", user.id)
            .limit(20),
        ]);
        if (cancelled) return;
        setMemories((memRes.data as unknown as QuinnMemory[]) || []);
        setAccounts(acctRes.data || []);
      } catch (err) {
        console.error("Settings load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  const forgetMemory = async (id: string) => {
    const { error } = await supabase
      .from("quinn_memories" as any)
      .update({ is_active: false })
      .eq("id", id);
    if (error) { toast.error("Couldn't forget that"); return; }
    setMemories(prev => prev.map(m => m.id === id ? { ...m, is_active: false } : m));
    toast.success("Bloom will forget this");
  };

  const restoreMemory = async (id: string) => {
    const { error } = await supabase
      .from("quinn_memories" as any)
      .update({ is_active: true, last_referenced_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Couldn't restore that"); return; }
    setMemories(prev => prev.map(m => m.id === id ? { ...m, is_active: true } : m));
    toast.success("Memory restored — Bloom will use it again");
  };

  const togglePin = async (m: QuinnMemory) => {
    const next = !m.is_pinned;
    const { error } = await supabase
      .from("quinn_memories" as any)
      .update({ is_pinned: next })
      .eq("id", m.id);
    if (error) { toast.error("Couldn't update"); return; }
    setMemories(prev => prev.map(x => x.id === m.id ? { ...x, is_pinned: next } : x));
    toast.success(next ? "Memory pinned — won't decay" : "Memory unpinned");
  };

  const toggleListening = (accountId: string, checked: boolean) => {
    setListeningIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(accountId); else next.delete(accountId);
      return next;
    });
  };
  const isListening = (id: string) => listeningIds.size === 0 ? true : listeningIds.has(id);

  const exportAllData = async () => {
    if (!user) return;
    toast.info("Preparing your Bloom data export…");
    try {
      const [convos, advice, cards, plans, mems] = await Promise.all([
        supabase.from("bloom_coach_conversations").select("*").eq("user_id", user.id),
        supabase.from("bloom_advice_history").select("*").eq("user_id", user.id),
        supabase.from("quinn_blueprint_cards" as any).select("*").eq("user_id", user.id),
        supabase.from("bloom_financial_plans").select("*").eq("user_id", user.id),
        supabase.from("quinn_memories" as any).select("*").eq("user_id", user.id),
      ]);

      const sections: Array<{ title: string; rows: string[] }> = [
        {
          title: "Conversations",
          rows: (convos.data || []).map((c: any) =>
            `[${new Date(c.created_at).toLocaleString()}] ${c.role || "user"}: ${c.content || c.message || ""}`
          ),
        },
        {
          title: "Advice History",
          rows: (advice.data || []).map((a: any) =>
            `[${new Date(a.created_at).toLocaleString()}] ${a.topic || a.title || ""}\n${a.content || a.advice || ""}`
          ),
        },
        {
          title: "Blueprint Cards",
          rows: ((cards.data as any[]) || []).map((c: any) =>
            `${c.title || c.name || "Card"}: ${c.summary || c.content || ""}`
          ),
        },
        {
          title: "Financial Plans",
          rows: (plans.data || []).map((p: any) =>
            `${p.title || p.name || "Plan"}: ${p.description || p.summary || ""}`
          ),
        },
        {
          title: "Memories",
          rows: ((mems.data as any[]) || []).map((m: any) =>
            `[${m.tier || "memory"}] ${m.topic || ""} — ${m.content || ""}`
          ),
        },
      ];

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (h: number) => {
        if (y + h > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(20, 20, 20);
      doc.text("Bloom — Personal Data Export", margin, y);
      y += 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110, 110, 110);
      doc.text(`Exported ${new Date().toLocaleString()}`, margin, y);
      y += 14;
      doc.text(`User ID: ${user.id}`, margin, y);
      y += 20;

      sections.forEach((section) => {
        ensureSpace(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text(`${section.title} (${section.rows.length})`, margin, y);
        y += 6;
        doc.setDrawColor(200, 180, 120);
        doc.line(margin, y, pageWidth - margin, y);
        y += 14;

        if (section.rows.length === 0) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text("No entries.", margin, y);
          y += 18;
          return;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        section.rows.forEach((row) => {
          const lines = doc.splitTextToSize(row, maxWidth) as string[];
          ensureSpace(lines.length * 12 + 6);
          doc.text(lines, margin, y);
          y += lines.length * 12 + 6;
        });
        y += 10;
      });

      // Footer page numbers
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${total} • CoinsBloom · Bloom`, pageWidth / 2, pageHeight - 20, { align: "center" });
      }

      doc.save(`quinn-export-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF export downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  };

  // Filter + group memories by tier for display
  const activeCount = useMemo(() => memories.filter(m => m.is_active).length, [memories]);
  const forgottenCount = useMemo(() => memories.filter(m => !m.is_active).length, [memories]);

  const visibleMemories = useMemo(() => {
    const q = memorySearch.trim().toLowerCase();
    return memories.filter(m => {
      if (showForgotten ? m.is_active : !m.is_active) return false;
      if (!q) return true;
      return m.topic?.toLowerCase().includes(q) || m.content?.toLowerCase().includes(q);
    });
  }, [memories, memorySearch, showForgotten]);

  const grouped: Record<MemoryTier, QuinnMemory[]> = {
    foundational: [], identity: [], episodic: [], contextual: [], transient: [],
  };
  for (const m of visibleMemories) grouped[m.tier]?.push(m);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[360px] sm:w-[440px] p-0 flex flex-col bg-[hsl(160_22%_5%)] border-l border-[hsl(var(--quinn-champagne)/0.18)]"
      >
        <SheetHeader className="px-4 pt-4 pb-3 pr-12 border-b border-[hsl(var(--quinn-champagne)/0.15)]">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <SettingsIcon className="h-4 w-4 text-champagne" />
            <span className="text-[15px] font-semibold tracking-tight">Bloom's Brain</span>
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Tune what Bloom remembers, how she speaks, and what she sees.
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-6">

            {/* MEMORY MANAGEMENT — 5-Tier */}
            <section>
              <header className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-champagne" />
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-champagne">
                    Living Memory
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                  {showForgotten ? `${forgottenCount} forgotten` : `${activeCount} active`}
                </Badge>
              </header>
              <p className="text-[11px] text-muted-foreground/70 mb-3 leading-relaxed">
                Five tiers from <span className="text-champagne">Foundational</span> (eternal) to{" "}
                <span className="text-muted-foreground">Transient</span> (decays in days). Pin to lock; trash to forget.
              </p>

              {/* Search + Forgotten toggle */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder={showForgotten ? "Search forgotten memories…" : "Search memories…"}
                    className="h-8 pl-7 text-[11.5px] bg-white/[0.03] border-white/10 focus-visible:border-champagne/40 placeholder:text-muted-foreground/50"
                  />
                </div>
                <Button
                  variant={showForgotten ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowForgotten(v => !v)}
                  className={`h-8 px-2 text-[10.5px] gap-1 ${
                    showForgotten
                      ? "bg-champagne/15 hover:bg-champagne/20 text-champagne border border-champagne/30"
                      : "border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                  title={showForgotten ? "Show active memories" : "Show forgotten memories"}
                >
                  <Archive className="h-3 w-3" />
                  {showForgotten ? "Active" : `Forgotten${forgottenCount ? ` (${forgottenCount})` : ""}`}
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : visibleMemories.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/60 italic px-2 py-3 border border-dashed border-white/10 rounded-md">
                  {memorySearch
                    ? "No memories match that search."
                    : showForgotten
                      ? "No forgotten memories. Bloom hasn't been told to forget anything yet."
                      : "Bloom hasn't remembered anything yet. Have a conversation and watch this fill in."}
                </div>
              ) : (
                <div className="space-y-3">
                  {TIER_ORDER.map(tier => {
                    const list = grouped[tier];
                    if (!list?.length) return null;
                    const meta = TIER_META[tier];
                    const limit = memorySearch ? 50 : 6;
                    return (
                      <div key={tier}>
                        <div className={`flex items-center gap-1.5 mb-1.5 text-[10.5px] uppercase tracking-wider font-semibold ${meta.tone}`}>
                          <span>{meta.emoji}</span><span>{meta.label}</span>
                          <span className="text-muted-foreground/40">· {list.length}</span>
                        </div>
                        <div className="space-y-1">
                          {list.slice(0, limit).map((m) => (
                            <div
                              key={m.id}
                              className={`group flex items-start gap-2 p-2 rounded-md border transition-colors ${
                                m.is_active
                                  ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                                  : "bg-white/[0.015] border-white/[0.04] opacity-70 hover:opacity-100"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-medium truncate flex items-center gap-1.5 ${
                                  m.is_active ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40"
                                }`}>
                                  {m.is_pinned && <Pin className="h-2.5 w-2.5 text-champagne shrink-0" />}
                                  {m.topic}
                                </p>
                                <p className="text-[10.5px] text-muted-foreground/80 line-clamp-2 leading-snug">
                                  {m.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {m.is_active ? (
                                  <>
                                    <Button
                                      variant="ghost" size="icon"
                                      onClick={() => togglePin(m)}
                                      className="h-6 w-6 text-muted-foreground/60 hover:text-champagne"
                                      title={m.is_pinned ? "Unpin" : "Pin (lock from decay)"}
                                    >
                                      {m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      variant="ghost" size="icon"
                                      onClick={() => forgetMemory(m.id)}
                                      className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
                                      title="Forget this"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost" size="icon"
                                    onClick={() => restoreMemory(m.id)}
                                    className="h-6 w-6 text-muted-foreground/60 hover:text-champagne"
                                    title="Restore — Bloom will use this again"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          {!memorySearch && list.length > limit && (
                            <p className="text-[10px] text-muted-foreground/50 text-center">
                              + {list.length - limit} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <Separator className="bg-white/5" />

            {/* PRIVACY */}
            <section>
              <header className="flex items-center gap-2 mb-2">
                <Lock className="h-3.5 w-3.5 text-champagne" />
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-champagne">Privacy</h3>
              </header>
              <p className="text-[11px] text-muted-foreground/70 mb-3 leading-relaxed">
                Mental Shredder defaults. Private sessions are not stored and don't extract memories.
              </p>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground">Start in Private Mode</p>
                    <p className="text-[10.5px] text-muted-foreground/70">New chats default to private.</p>
                  </div>
                  <Switch checked={defaultPrivate} onCheckedChange={setDefaultPrivate} />
                </label>
                <label className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground">Auto-clear on close</p>
                    <p className="text-[10.5px] text-muted-foreground/70">Wipe private session memory when you exit Bloom.</p>
                  </div>
                  <Switch checked={autoClear} onCheckedChange={setAutoClear} />
                </label>
              </div>
            </section>

            <Separator className="bg-white/5" />

            {/* PERSONA */}
            <section>
              <header className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-champagne" />
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-champagne">Persona</h3>
              </header>
              <p className="text-[11px] text-muted-foreground/70 mb-3 leading-relaxed">
                How firm Bloom gets in her Auditor and Strategist modes.
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11.5px] font-medium text-foreground flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(205_80%_60%)] shadow-[0_0_6px_hsl(205_80%_60%/0.7)]" />
                      Auditor
                    </span>
                    <span className="text-[10.5px] font-medium text-[hsl(200_90%_78%)]">{PERSONA_LABELS[auditIntensity]}</span>
                  </div>
                  <Slider value={[auditIntensity]} onValueChange={(v) => setAuditIntensity(v[0])}
                    min={0} max={3} step={1}
                    className="
                      [&_[role=slider]]:bg-[hsl(205_80%_60%)] [&_[role=slider]]:border-[hsl(205_80%_60%)]
                      [&_[role=slider]]:shadow-[0_0_10px_hsl(205_80%_60%/0.55)]
                      [&_.bg-primary]:bg-[hsl(205_80%_55%)]
                    " />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11.5px] font-medium text-foreground flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(268_70%_62%)] shadow-[0_0_6px_hsl(268_70%_62%/0.7)]" />
                      Strategist
                    </span>
                    <span className="text-[10.5px] font-medium text-[hsl(270_85%_80%)]">{PERSONA_LABELS[strategistIntensity]}</span>
                  </div>
                  <Slider value={[strategistIntensity]} onValueChange={(v) => setStrategistIntensity(v[0])}
                    min={0} max={3} step={1}
                    className="
                      [&_[role=slider]]:bg-[hsl(268_70%_62%)] [&_[role=slider]]:border-[hsl(268_70%_62%)]
                      [&_[role=slider]]:shadow-[0_0_10px_hsl(268_70%_62%/0.55)]
                      [&_.bg-primary]:bg-[hsl(268_70%_58%)]
                    " />
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/60 italic pt-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>Persona dial is local — applied next time you switch modes.</span>
                </div>
              </div>
            </section>

            <Separator className="bg-white/5" />

            {/* DATA CONTEXT */}
            <section>
              <header className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-champagne" />
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-champagne">Data Context</h3>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                  {listeningIds.size === 0 ? "All" : `${listeningIds.size} of ${accounts.length}`}
                </Badge>
              </header>
              <p className="text-[11px] text-muted-foreground/70 mb-3 leading-relaxed">
                Which accounts Bloom references. Toggle off to keep an account out of her view.
              </p>
              {accounts.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/60 italic px-2 py-3 border border-dashed border-white/10 rounded-md">
                  No linked accounts. Add one to give Bloom context.
                </div>
              ) : (
                <div className="space-y-2">
                  {ASSET_CLASS_ORDER.map((cls) => {
                    const meta = ASSET_CLASS_META[cls];
                    const inClass = accounts.filter(a => classifyAccount(a.account_type) === cls);
                    if (inClass.length === 0) return null;
                    const Icon = meta.icon;
                    const isOpen = openClasses[cls];
                    const listeningCount = inClass.filter(a => isListening(a.id)).length;
                    const total = inClass.reduce((sum, a) => sum + (a.balance || 0), 0);
                    return (
                      <div
                        key={cls}
                        className="rounded-lg border bg-white/[0.02] overflow-hidden"
                        style={{ borderColor: meta.ring }}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenClasses(p => ({ ...p, [cls]: !p[cls] }))}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-white/[0.03] transition-colors"
                          aria-expanded={isOpen}
                        >
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-md ${meta.tone}`}
                            style={{ background: `${meta.ring}`, boxShadow: `inset 0 0 8px ${meta.ring}` }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-[12px] font-semibold leading-tight ${meta.tone}`}>
                              {meta.label}
                              <span className="ml-1.5 text-[10px] text-muted-foreground/60 font-normal">
                                · {inClass.length} · {listeningCount}/{inClass.length} listening
                              </span>
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 leading-tight">
                              {meta.sublabel} · ${total.toLocaleString()}
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-muted-foreground/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-2 pb-2 pt-0.5 space-y-1">
                            {inClass.map((a) => (
                              <label key={a.id}
                                className="flex items-center justify-between gap-3 p-2 rounded-md bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                                <div className="flex-1 min-w-0">
                                  {/* High-contrast: bold white name, muted-gold sub-line */}
                                  <p className="text-[11.5px] font-semibold text-foreground truncate">{a.name}</p>
                                  <p className="text-[10px] text-[hsl(40_55%_70%)]/85 capitalize">
                                    {a.account_type || "account"}
                                    {typeof a.balance === "number" && ` · $${a.balance.toLocaleString()}`}
                                  </p>
                                </div>
                                <Switch checked={isListening(a.id)} onCheckedChange={(c) => toggleListening(a.id, c)} />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <Separator className="bg-white/5" />

            {/* EXPORT + ESCAPE HATCH */}
            <section className="space-y-2">
              <Button
                variant="outline"
                onClick={() => { onOpenChange(false); navigate("/quinn/memory"); }}
                className="
                  w-full justify-between text-[12px] font-medium
                  border-[hsl(var(--quinn-emerald)/0.45)]
                  bg-gradient-to-r from-[hsl(var(--quinn-emerald)/0.08)] via-[hsl(40_55%_50%/0.06)] to-[hsl(var(--quinn-emerald)/0.08)]
                  shadow-[0_0_18px_-4px_hsl(var(--quinn-emerald)/0.45),inset_0_0_12px_hsl(40_55%_50%/0.08)]
                  hover:border-[hsl(var(--quinn-emerald)/0.7)]
                  hover:shadow-[0_0_24px_-4px_hsl(var(--quinn-emerald)/0.6),inset_0_0_14px_hsl(40_55%_50%/0.12)]
                  transition-all
                ">
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-champagne drop-shadow-[0_0_4px_hsl(40_70%_72%/0.7)]" />
                  View Brain Summary
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-champagne/80" />
              </Button>
              <Button variant="ghost" onClick={exportAllData}
                className="w-full justify-between text-[11.5px] text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <Download className="h-3.5 w-3.5" />
                  Download PDF report
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost"
                onClick={() => { onOpenChange(false); navigate("/settings"); }}
                className="w-full justify-between text-[11.5px] text-muted-foreground hover:text-foreground">
                <span>Global app settings</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </section>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
