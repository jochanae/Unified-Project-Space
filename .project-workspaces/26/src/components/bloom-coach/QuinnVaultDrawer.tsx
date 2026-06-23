import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import {
  FolderOpen, Map, Pin, Clock, Trash2, MessageCircle, Crown, Loader2,
  ExternalLink, ChevronRight, Search, X, FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface QuinnVaultDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
  currentConversationId: string | null;
  defaultTab?: "plans" | "shelf" | "history";
  onSelectPlan?: (plan: { id: string; title: string; plan_type: string }) => void;
  activeProjectId?: string | null;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface PlanRow {
  id: string;
  title: string;
  plan_type: string;
  progress: number;
}

interface ShelfRow {
  id: string;
  title: string;
  card_type: string;
  callout: string | null;
  created_at: string;
  pinned: boolean;
  mode_lens: string | null;
  project_id: string | null;
  promoted_to_plan_id: string | null;
}

const TAB_STORAGE_KEY = "quinn-vault-active-tab-v1";

function loadStoredTab(fallback: string): string {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY);
    if (v === "plans" || v === "shelf" || v === "history") return v;
  } catch {}
  return fallback;
}

export function QuinnVaultDrawer({
  open, onOpenChange, onSelectConversation, currentConversationId,
  defaultTab = "plans", onSelectPlan, activeProjectId = null,
}: QuinnVaultDrawerProps) {
  const { user } = useAuth();
  const { isPremiumUser } = useFeatureGating();
  const navigate = useNavigate();

  const [tab, setTab] = useState<string>(() => loadStoredTab(defaultTab));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [shelf, setShelf] = useState<ShelfRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Persist last selected tab
  useEffect(() => {
    try { localStorage.setItem(TAB_STORAGE_KEY, tab); } catch {}
  }, [tab]);

  // Restore stored tab on open (do not clobber user's last choice with defaultTab)
  useEffect(() => {
    if (open) setTab(loadStoredTab(defaultTab));
  }, [open, defaultTab]);

  // Reset search when drawer closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Plans
        const { data: planData } = await supabase
          .from("bloom_financial_plans")
          .select("id, title, plan_type, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10);

        let planRows: PlanRow[] = [];
        if (planData?.length) {
          const ids = planData.map(p => p.id);
          const { data: actions } = await supabase
            .from("bloom_plan_actions")
            .select("plan_id, is_completed")
            .in("plan_id", ids);
          planRows = planData.map(p => {
            const a = (actions || []).filter(x => x.plan_id === p.id);
            const total = a.length;
            const done = a.filter(x => x.is_completed).length;
            return {
              id: p.id, title: p.title, plan_type: p.plan_type,
              progress: total === 0 ? 0 : Math.round((done / total) * 100),
            };
          });
        }

        // Shelf — read from quinn_blueprint_cards (the canonical card store).
        // When a project is anchored, scope to that project + global (project_id IS NULL) cards.
        let shelfQuery = supabase
          .from("quinn_blueprint_cards")
          .select("id, title, card_type, callout, created_at, pinned, mode_lens, project_id, promoted_to_plan_id")
          .eq("user_id", user.id)
          .eq("archived", false)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(40);
        if (activeProjectId) {
          shelfQuery = shelfQuery.or(`project_id.eq.${activeProjectId},project_id.is.null`);
        }
        const { data: shelfData } = await shelfQuery;

        // History
        let convoQuery = supabase
          .from("bloom_coach_conversations")
          .select("id, title, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });
        if (!isPremiumUser) {
          const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
          convoQuery = convoQuery.gte("created_at", cutoff.toISOString());
        }
        const { data: convoData } = await convoQuery.limit(50);

        if (cancelled) return;
        setPlans(planRows);
        setShelf(shelfData || []);
        setConversations(convoData || []);
      } catch (err) {
        console.error("Vault load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user, isPremiumUser, activeProjectId]);

  const deleteConvo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("bloom_coach_conversations").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setConversations(prev => prev.filter(c => c.id !== id));
    toast.success("Conversation deleted");
  };

  const q = query.trim().toLowerCase();
  const filteredPlans = useMemo(
    () => !q ? plans : plans.filter(p =>
      p.title.toLowerCase().includes(q) || p.plan_type.toLowerCase().includes(q)
    ),
    [plans, q]
  );
  const filteredShelf = useMemo(
    () => !q ? shelf : shelf.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.callout?.toLowerCase().includes(q) ?? false) ||
      s.card_type.toLowerCase().includes(q)
    ),
    [shelf, q]
  );
  const filteredConvos = useMemo(
    () => !q ? conversations : conversations.filter(c =>
      c.title.toLowerCase().includes(q)
    ),
    [conversations, q]
  );

  const placeholder =
    tab === "plans" ? "Search plans…" :
    tab === "shelf" ? "Search saved cards…" :
    "Search conversations…";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[420px] p-0 flex flex-col bg-[hsl(160_22%_5%)] border-l border-[hsl(var(--quinn-champagne)/0.18)]">
        <SheetHeader className="px-4 pt-4 pb-3 pr-12 border-b border-[hsl(var(--quinn-champagne)/0.15)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                <FolderOpen className="h-4 w-4 text-champagne" />
                <span className="text-[15px] font-semibold tracking-tight">Bloom Vault</span>
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">Your plans, saved cards, and history — one place.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { onOpenChange(false); navigate("/quinn/memory"); }}
              className="h-7 px-2 text-[11px] text-champagne hover:text-champagne hover:bg-champagne/10 shrink-0"
              title="Download your full Blueprint as PDF or JSON"
            >
              <FileDown className="h-3.5 w-3.5 mr-1" />
              Blueprint
            </Button>
          </div>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-8 pl-8 pr-8 text-[12px] bg-white/[0.04] border-white/[0.08] focus-visible:ring-[hsl(var(--quinn-champagne)/0.4)] placeholder:text-muted-foreground/50"
              aria-label="Search the vault"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-champagne"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-3 bg-white/[0.03] border border-white/[0.06]">
            <TabsTrigger value="plans" className="text-xs gap-1 data-[state=active]:bg-[hsl(var(--quinn-champagne)/0.12)] data-[state=active]:text-champagne">
              <Map className="h-3 w-3" /> Plans
            </TabsTrigger>
            <TabsTrigger value="shelf" className="text-xs gap-1 data-[state=active]:bg-[hsl(var(--quinn-champagne)/0.12)] data-[state=active]:text-champagne">
              <Pin className="h-3 w-3" /> Saved
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1 data-[state=active]:bg-[hsl(var(--quinn-champagne)/0.12)] data-[state=active]:text-champagne">
              <Clock className="h-3 w-3" /> History
            </TabsTrigger>
          </TabsList>

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* PLANS */}
          <TabsContent value="plans" className="flex-1 min-h-0 mt-3 mx-0">
            <ScrollArea className="h-full px-4 pb-4">
              <Button
                variant="ghost" size="sm"
                onClick={() => { onOpenChange(false); navigate("/financial-plans"); }}
                className="w-full justify-between text-xs h-8 mb-2 text-muted-foreground hover:text-champagne"
              >
                <span>Open Living Money Plans</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
              {!loading && filteredPlans.length === 0 ? (
                q ? (
                  <EmptyState icon={Search} title="No plans match" hint={`Nothing for "${query}".`} />
                ) : (
                  <EmptyState icon={Map} title="No active plans yet" hint="Ask Bloom to build one." />
                )
              ) : (
                <div className="space-y-2">
                  {filteredPlans.map(p => {
                    const isActive = activeProjectId === p.id;
                    const clickable = !!onSelectPlan;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!clickable}
                        onClick={() => {
                          if (!onSelectPlan) return;
                          onSelectPlan({ id: p.id, title: p.title, plan_type: p.plan_type });
                          onOpenChange(false);
                          toast.success(`Anchored Bloom to "${p.title}"`);
                        }}
                        className={`w-full text-left quinn-glass rounded-xl p-3 transition-all ${
                          clickable ? "hover:ring-1 hover:ring-[hsl(var(--quinn-champagne)/0.3)] active:scale-[0.99]" : "cursor-default"
                        } ${isActive ? "ring-1 ring-[hsl(var(--quinn-champagne)/0.55)] shadow-[0_0_14px_hsl(var(--quinn-champagne)/0.20)]" : ""}`}
                        aria-pressed={isActive}
                        aria-label={clickable ? `Anchor Bloom to ${p.title}` : p.title}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h4 className="text-sm font-medium text-foreground truncate flex-1">{p.title}</h4>
                          <Badge variant="secondary" className={`text-[9px] border ${isActive ? "bg-[hsl(var(--quinn-champagne)/0.20)] text-champagne border-[hsl(var(--quinn-champagne)/0.45)]" : "bg-[hsl(var(--quinn-champagne)/0.10)] text-champagne border-[hsl(var(--quinn-champagne)/0.25)]"}`}>
                            {isActive ? "Anchored" : p.plan_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={p.progress} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground w-9 text-right">{p.progress}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* SHELF */}
          <TabsContent value="shelf" className="flex-1 min-h-0 mt-3 mx-0">
            <ScrollArea className="h-full px-4 pb-4">
              <Button
                variant="ghost" size="sm"
                onClick={() => { onOpenChange(false); navigate("/quinn-shelf"); }}
                className="w-full justify-between text-xs h-8 mb-2 text-muted-foreground hover:text-champagne"
              >
                <span>Open full Shelf</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
              {activeProjectId && (
                <p className="text-[10px] text-champagne/70 mb-2 flex items-center gap-1">
                  <Pin className="h-2.5 w-2.5" />
                  Showing cards for the anchored project + global pins.
                </p>
              )}
              {!loading && filteredShelf.length === 0 ? (
                q ? (
                  <EmptyState icon={Search} title="No saved cards match" hint={`Nothing for "${query}".`} />
                ) : (
                  <EmptyState icon={Pin} title="Nothing saved yet" hint="Pin a Bloom blueprint to save it here." />
                )
              ) : (
                <div className="space-y-2">
                  {filteredShelf.map(s => {
                    const isBlueprint = s.card_type === "blueprint_proposal";
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          onOpenChange(false);
                          if (s.promoted_to_plan_id) navigate("/financial-plans");
                          else navigate("/quinn-shelf");
                        }}
                        className={`w-full text-left quinn-glass rounded-xl p-3 transition-all hover:ring-1 ${
                          isBlueprint
                            ? "ring-1 ring-[hsl(var(--quinn-champagne)/0.45)] hover:ring-[hsl(var(--quinn-champagne)/0.7)] shadow-[0_0_18px_-6px_hsl(var(--quinn-champagne)/0.35)]"
                            : "hover:ring-[hsl(var(--quinn-champagne)/0.3)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              {isBlueprint && (
                                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 bg-[hsl(var(--quinn-champagne)/0.15)] text-champagne border border-[hsl(var(--quinn-champagne)/0.45)] tracking-[0.1em] uppercase">
                                  Blueprint
                                </Badge>
                              )}
                              {s.promoted_to_plan_id && (
                                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 tracking-[0.1em] uppercase">
                                  Plan
                                </Badge>
                              )}
                              {s.pinned && (
                                <Pin className="h-2.5 w-2.5 text-champagne fill-current" />
                              )}
                              {s.mode_lens && (
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                                  · {s.mode_lens}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                            {s.callout && (
                              <p className="text-[11px] italic text-muted-foreground/80 mt-0.5 line-clamp-1">→ {s.callout}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {format(new Date(s.created_at), "MMM d")} · {s.card_type.replace(/_/g, " ")}
                            </p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 mt-1 shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="flex-1 min-h-0 mt-3 mx-0">
            <ScrollArea className="h-full px-4 pb-4">
              {!isPremiumUser && (
                <button
                  type="button"
                  onClick={() => { onOpenChange(false); navigate("/settings?tab=billing"); }}
                  className="w-full text-left text-[11px] text-champagne/90 bg-[hsl(var(--quinn-champagne)/0.08)] rounded-lg p-2 mb-2 flex items-center gap-1.5 border border-[hsl(var(--quinn-champagne)/0.30)] hover:bg-[hsl(var(--quinn-champagne)/0.14)] hover:border-[hsl(var(--quinn-champagne)/0.50)] hover:shadow-[0_0_12px_hsl(var(--quinn-champagne)/0.25)] transition-all"
                  aria-label="Upgrade for unlimited history"
                >
                  <Crown className="h-3 w-3 text-champagne shrink-0" />
                  <span className="flex-1">Free plan shows the last 7 days.</span>
                  <span className="font-semibold tracking-wide">Upgrade →</span>
                </button>
              )}
              {!loading && filteredConvos.length === 0 ? (
                q ? (
                  <EmptyState icon={Search} title="No conversations match" hint={`Nothing for "${query}".`} />
                ) : (
                  <EmptyState icon={MessageCircle} title="No conversations yet" hint="Start chatting with Bloom." />
                )
              ) : (
                <div className="space-y-1">
                  {filteredConvos.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { onSelectConversation(c.id); onOpenChange(false); }}
                      className={`group w-full text-left p-3 rounded-xl transition-colors ${
                        currentConversationId === c.id
                          ? "bg-[hsl(var(--quinn-champagne)/0.12)] ring-1 ring-[hsl(var(--quinn-champagne)/0.3)]"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {format(new Date(c.updated_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => deleteConvo(c.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) {
  return (
    <div className="text-center py-10">
      <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground/60 mt-1">{hint}</p>
    </div>
  );
}
