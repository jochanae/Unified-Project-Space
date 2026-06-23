import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Brain, Pin, Sparkles, FileText, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

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
  created_at: string;
  last_referenced_at: string | null;
}

interface BlueprintCard {
  id: string;
  title: string;
  summary: string | null;
  mode_lens: string | null;
  is_pinned: boolean;
  promoted_to_plan_id: string | null;
  created_at: string;
}

interface FinancialPlan {
  id: string;
  title: string;
  plan_type: string | null;
  status: string | null;
  target_amount: number | null;
  current_amount: number | null;
}

interface AdviceItem {
  id: string;
  topic: string | null;
  conclusion: string | null;
  conditions: string | null;
  is_active: boolean;
  created_at: string;
}

interface ConversationItem {
  id: string;
  title: string;
  category: string | null;
  updated_at: string;
}

const TIER_META: Record<MemoryTier, { label: string; emoji: string }> = {
  foundational: { label: "Foundational", emoji: "🌳" },
  identity:     { label: "Identity",     emoji: "🧬" },
  episodic:     { label: "Episodic",     emoji: "📍" },
  contextual:   { label: "Contextual",   emoji: "🔄" },
  transient:    { label: "Transient",    emoji: "💭" },
};
const TIER_ORDER: MemoryTier[] = ["foundational", "identity", "episodic", "contextual", "transient"];

export default function QuinnExport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<QuinnMemory[]>([]);
  const [cards, setCards] = useState<BlueprintCard[]>([]);
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [advice, setAdvice] = useState<AdviceItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [memRes, cardsRes, plansRes, adviceRes, convoRes, profRes] = await Promise.all([
          supabase.from("quinn_memories" as any)
            .select("id, tier, topic, content, current_score, is_pinned, is_active, emotional_weight, created_at, last_referenced_at")
            .eq("user_id", user.id)
            .order("is_active", { ascending: false })
            .order("current_score", { ascending: false }),
          supabase.from("quinn_blueprint_cards" as any)
            .select("id, title, summary, mode_lens, is_pinned, promoted_to_plan_id, created_at")
            .eq("user_id", user.id)
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase.from("bloom_financial_plans")
            .select("id, title, plan_type, status, target_amount, current_amount")
            .eq("user_id", user.id),
          supabase.from("bloom_advice_history")
            .select("id, topic, conclusion, conditions, is_active, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(40),
          supabase.from("bloom_coach_conversations")
            .select("id, title, category, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(20),
          supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        setMemories((memRes.data as unknown as QuinnMemory[]) || []);
        setCards((cardsRes.data as unknown as BlueprintCard[]) || []);
        setPlans((plansRes.data as unknown as FinancialPlan[]) || []);
        setAdvice((adviceRes.data as unknown as AdviceItem[]) || []);
        setConversations((convoRes.data as unknown as ConversationItem[]) || []);
        setProfileName(profRes.data?.first_name || user.email?.split("@")[0] || "Friend");
      } catch (err) {
        console.error("Export load failed:", err);
        toast.error("Couldn't load your Bloom summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const stats = useMemo(() => ({
    memoriesActive: memories.filter(m => m.is_active).length,
    memoriesForgotten: memories.filter(m => !m.is_active).length,
    memoriesPinned: memories.filter(m => m.is_pinned && m.is_active).length,
    cardsTotal: cards.length,
    cardsPinned: cards.filter(c => c.is_pinned).length,
    cardsPromoted: cards.filter(c => c.promoted_to_plan_id).length,
    plansActive: plans.filter(p => p.status === "active").length,
    adviceActive: advice.filter(a => a.is_active).length,
    conversations: conversations.length,
  }), [memories, cards, plans, advice, conversations]);

  const memoriesByTier = useMemo(() => {
    const grouped: Record<MemoryTier, QuinnMemory[]> = {
      foundational: [], identity: [], episodic: [], contextual: [], transient: [],
    };
    for (const m of memories.filter(x => x.is_active)) grouped[m.tier]?.push(m);
    return grouped;
  }, [memories]);

  const downloadJson = async () => {
    if (!user) return;
    trackEvent("blueprint_export_json", { memories: memories.length, cards: cards.length });
    toast.info("Preparing JSON export…");
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        memories,
        blueprint_cards: cards,
        financial_plans: plans,
        advice_history: advice,
        conversations,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quinn-blueprint-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const handlePrint = () => {
    trackEvent("blueprint_export_pdf", {
      memories: stats.memoriesActive,
      blueprints: stats.cardsTotal,
      plans: stats.plansActive,
    });
    // Set a friendly filename for "Save as PDF"
    const previousTitle = document.title;
    document.title = `Bloom Blueprint — ${profileName} — ${new Date().toISOString().split("T")[0]}`;
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 1000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Please sign in to view your Bloom export.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Bloom Brain Summary | CoinsBloom</title>
        <meta name="description" content="A printable summary of everything Bloom remembers about your financial life." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate("/coach")}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Bloom
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadJson}>
              <Download className="h-4 w-4 mr-1.5" /> JSON
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-champagne/15 hover:bg-champagne/25 text-champagne border border-champagne/30">
              <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 print:py-0 print:px-0 print:max-w-none">
        {/* Architect cover header */}
        <header className="text-center space-y-3 pb-6 border-b border-border/40 print:pb-4 print:border-b-2 print:border-black">
          <p className="text-[11px] uppercase tracking-[0.25em] text-champagne/80 font-medium print:text-black">
            Bloom — Financial Architect
          </p>
          <h1 className="text-3xl font-semibold tracking-tight print:text-4xl">Your Financial Blueprint</h1>
          <p className="text-sm text-muted-foreground print:text-black/70">
            Prepared for <span className="font-medium text-foreground print:text-black">{profileName}</span>
            {" · "}
            {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className="hidden print:block text-[10.5px] text-black/50 italic max-w-xl mx-auto pt-1">
            A snapshot of the strategies, memory, and plans Bloom is co-architecting with you. Private — for your records.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Compiling your summary…
          </div>
        ) : (
          <>
            {/* At-a-glance stats */}
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Memories" value={stats.memoriesActive} sub={`${stats.memoriesPinned} pinned`} />
                <StatTile label="Blueprints" value={stats.cardsTotal} sub={`${stats.cardsPromoted} promoted`} />
                <StatTile label="Active Plans" value={stats.plansActive} sub={`${plans.length} total`} />
                <StatTile label="Conversations" value={stats.conversations} sub="recent 20" />
              </div>
            </section>

            {/* Pinned blueprints — North Star */}
            <Section icon={<Pin className="h-4 w-4 text-champagne" />} title="North Star Blueprints" subtitle="Strategies Bloom anchors to in every conversation.">
              {cards.filter(c => c.is_pinned).length === 0 ? (
                <EmptyNote text="No blueprints pinned yet. Pin strategy cards in the Vault to see them here." />
              ) : (
                <ul className="space-y-2">
                  {cards.filter(c => c.is_pinned).map(c => (
                    <li key={c.id} className="rounded-md border border-border/50 bg-card/40 p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-medium text-foreground">{c.title}</span>
                        {c.mode_lens && <Badge variant="outline" className="text-[10px] capitalize">{c.mode_lens}</Badge>}
                        {c.promoted_to_plan_id && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Promoted to plan</Badge>}
                      </div>
                      {c.summary && <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">{c.summary}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Living Memory by tier */}
            <Section icon={<Brain className="h-4 w-4 text-champagne" />} title="Living Memory" subtitle={`${stats.memoriesActive} active across 5 tiers · ${stats.memoriesForgotten} forgotten (excluded).`}>
              {stats.memoriesActive === 0 ? (
                <EmptyNote text="Bloom hasn't remembered anything yet." />
              ) : (
                <div className="space-y-4">
                  {TIER_ORDER.map(tier => {
                    const list = memoriesByTier[tier];
                    if (!list?.length) return null;
                    const meta = TIER_META[tier];
                    return (
                      <div key={tier}>
                        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                          {meta.emoji} {meta.label} <span className="text-muted-foreground/60">· {list.length}</span>
                        </h3>
                        <ul className="space-y-1.5 print:space-y-1">
                          {list.map(m => (
                            <li key={m.id} className="rounded-md border border-border/40 bg-card/30 px-3 py-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {m.is_pinned && <Pin className="h-2.5 w-2.5 text-champagne" />}
                                <span className="text-[12.5px] font-medium text-foreground">{m.topic}</span>
                              </div>
                              <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{m.content}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Recent blueprints (unpinned) */}
            {cards.filter(c => !c.is_pinned).length > 0 && (
              <Section icon={<FileText className="h-4 w-4 text-champagne" />} title="Recent Blueprints" subtitle="Latest unpinned strategy cards Bloom has co-created with you.">
                <ul className="space-y-1.5">
                  {cards.filter(c => !c.is_pinned).slice(0, 12).map(c => (
                    <li key={c.id} className="rounded-md border border-border/40 bg-card/30 px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-medium text-foreground">{c.title}</span>
                        {c.mode_lens && <Badge variant="outline" className="text-[10px] capitalize">{c.mode_lens}</Badge>}
                        <span className="text-[10.5px] text-muted-foreground/60 ml-auto">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {c.summary && <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{c.summary}</p>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Active plans */}
            {plans.length > 0 && (
              <Section icon={<Sparkles className="h-4 w-4 text-champagne" />} title="Living Money Plans" subtitle="Plans promoted from Bloom's blueprints.">
                <ul className="space-y-1.5">
                  {plans.map(p => {
                    const pct = p.target_amount && p.target_amount > 0
                      ? Math.min(100, Math.round(((p.current_amount || 0) / p.target_amount) * 100))
                      : null;
                    return (
                      <li key={p.id} className="rounded-md border border-border/40 bg-card/30 px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12.5px] font-medium text-foreground">{p.title}</span>
                          {p.plan_type && <Badge variant="outline" className="text-[10px] capitalize">{p.plan_type}</Badge>}
                          {p.status && (
                            <Badge className={`text-[10px] ${p.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                              {p.status}
                            </Badge>
                          )}
                          {pct !== null && (
                            <span className="text-[10.5px] text-muted-foreground ml-auto">
                              ${(p.current_amount || 0).toLocaleString()} / ${(p.target_amount || 0).toLocaleString()} · {pct}%
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {/* Active advice */}
            {stats.adviceActive > 0 && (
              <Section icon={<Sparkles className="h-4 w-4 text-champagne" />} title="Active Guidance" subtitle="Recent durable advice Bloom is tracking.">
                <ul className="space-y-1.5">
                  {advice.filter(a => a.is_active).slice(0, 12).map(a => (
                    <li key={a.id} className="rounded-md border border-border/40 bg-card/30 px-3 py-2">
                      {a.topic && <p className="text-[12.5px] font-medium text-foreground">{a.topic}</p>}
                      {a.conclusion && <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{a.conclusion}</p>}
                      {a.conditions && (
                        <p className="text-[10.5px] text-muted-foreground/70 italic mt-1">If: {a.conditions}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Recent conversations */}
            {conversations.length > 0 && (
              <Section icon={<MessageSquare className="h-4 w-4 text-champagne" />} title="Recent Conversations" subtitle="Last 20 saved chats (private sessions are excluded).">
                <ul className="space-y-1">
                  {conversations.map(c => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md hover:bg-card/40">
                      <span className="text-[12.5px] text-foreground truncate">{c.title}</span>
                      <span className="text-[10.5px] text-muted-foreground/70 shrink-0">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Footer */}
            <Separator className="bg-border/40" />
            <footer className="text-center text-[11px] text-muted-foreground/70 pt-2">
              Generated by Bloom · CoinsBloom · {new Date().toISOString()}
              <br />
              <Link to="/coach" className="underline hover:text-champagne print:hidden">Return to Bloom</Link>
            </footer>
          </>
        )}
      </main>

      <style>{`
        @media print {
          @page {
            margin: 0.65in 0.6in 0.75in 0.6in;
            size: letter;
          }
          html, body {
            background: #ffffff !important;
            color: #111111 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Force readable colors on every element */
          * {
            color: #111111 !important;
            background-color: transparent !important;
            border-color: #d4d4d4 !important;
            box-shadow: none !important;
          }
          /* Keep champagne accent visible on key headings */
          h1, h2 { color: #111111 !important; }
          /* Subtle card surfaces */
          .bg-card\\/40, .bg-card\\/30 {
            background-color: #fafafa !important;
            border: 1px solid #e5e5e5 !important;
          }
          /* Badges still visible */
          [class*="Badge"], .badge { border: 1px solid #999 !important; }
          /* Page-break hygiene */
          section { break-inside: avoid; page-break-inside: avoid; }
          li { break-inside: avoid; page-break-inside: avoid; }
          h2, h3 { break-after: avoid; page-break-after: avoid; }
          /* Hide UI chrome */
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-3">
        <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-[10.5px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 print:break-inside-avoid">
      <header className="flex items-baseline gap-2 flex-wrap">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground flex items-center gap-2">
          {icon} {title}
        </h2>
        {subtitle && <p className="text-[11.5px] text-muted-foreground">{subtitle}</p>}
      </header>
      <div>{children}</div>
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="text-[11.5px] text-muted-foreground/70 italic px-3 py-2 border border-dashed border-border/50 rounded-md">
      {text}
    </p>
  );
}
