import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  RefreshCw,
  Lightbulb,
  Loader2,
  Map,
  ArrowRight,
  Folder,
  Brain,
  Layers,
  ShieldOff,
  Shield,
  Target,
  ClipboardList,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useNavigate } from "react-router-dom";

interface CoachInsights {
  summary: string;
  insights: string[];
  actions: string[];
  warnings: string[];
}

type QuinnMode = "focus" | "brainstorm" | "planner" | "audit" | "strategic" | null;

interface QuinnProjectLite {
  id?: string;
  name?: string;
}

// Jewel-tone spectrum (mirrors QuinnModeChips). Each entry: ring color (HSL),
// soft background, label, and icon — used to make the dashboard card "remember"
// where the user left off.
const MODE_THEME: Record<
  Exclude<QuinnMode, null>,
  { label: string; ring: string; tint: string; text: string; Icon: typeof Sparkles }
> = {
  focus:      { label: "Focus",       ring: "hsl(0 75% 58% / 0.55)",   tint: "hsl(0 75% 58% / 0.10)",   text: "hsl(0 85% 75%)",   Icon: Target },
  brainstorm: { label: "Brainstorm",  ring: "hsl(48 90% 55% / 0.55)",  tint: "hsl(48 90% 55% / 0.10)",  text: "hsl(48 95% 72%)",  Icon: Lightbulb },
  planner:    { label: "Planner",     ring: "hsl(158 70% 48% / 0.55)", tint: "hsl(158 70% 48% / 0.10)", text: "hsl(158 75% 65%)", Icon: ClipboardList },
  audit:      { label: "Wealth Audit",ring: "hsl(205 80% 60% / 0.55)", tint: "hsl(205 80% 60% / 0.10)", text: "hsl(200 90% 78%)", Icon: ShieldCheck },
  strategic:  { label: "Strategist",  ring: "hsl(268 70% 62% / 0.55)", tint: "hsl(268 70% 62% / 0.10)", text: "hsl(270 85% 80%)", Icon: Zap },
};

const DEFAULT_RING = "hsl(158 70% 48% / 0.4)"; // Emerald fallback

export const AICoachCardContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<CoachInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [counts, setCounts] = useState({ plans: 0, cards: 0, memories: 0 });

  // Read live state from the Bloom workstation (localStorage-backed)
  const [activeProject, setActiveProject] = useState<QuinnProjectLite | null>(null);
  const [lastMode, setLastMode] = useState<QuinnMode>(null);
  const [privateMode, setPrivateMode] = useState(false);
  const [liveInsight, setLiveInsight] = useState<{ message: string; emoji?: string } | null>(null);

  useEffect(() => {
    const readLocal = () => {
      try {
        const p = localStorage.getItem("quinn-active-project-v1");
        setActiveProject(p ? JSON.parse(p) : null);
      } catch { setActiveProject(null); }
      try {
        setLastMode((localStorage.getItem("quinn-active-mode-v1") as QuinnMode) || null);
      } catch { setLastMode(null); }
      try {
        setPrivateMode(localStorage.getItem("quinn:privacy:defaultPrivate") === "true");
      } catch { setPrivateMode(false); }
      try {
        const raw = localStorage.getItem("quinn:lastInsight:v1");
        setLiveInsight(raw ? JSON.parse(raw) : null);
      } catch { setLiveInsight(null); }
    };
    readLocal();
    window.addEventListener("focus", readLocal);
    window.addEventListener("storage", readLocal);
    window.addEventListener("quinn:insight-updated", readLocal);
    return () => {
      window.removeEventListener("focus", readLocal);
      window.removeEventListener("storage", readLocal);
      window.removeEventListener("quinn:insight-updated", readLocal);
    };
  }, []);

  const theme = useMemo(() => (lastMode ? MODE_THEME[lastMode] : null), [lastMode]);
  const borderRing = theme?.ring ?? DEFAULT_RING;

  const fetchInsights = async () => {
    if (!user) return;
    if (user.email?.includes("@kidsbloom.internal")) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("bloom-coach-insights", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const errorMessage = error.message || "";
        const errorBodyStr =
          typeof error.context?.body === "string"
            ? error.context.body
            : JSON.stringify(error.context?.body || "");
        const is401 = errorMessage.includes("401") || errorBodyStr.includes("Unauthorized");
        const is402 =
          errorMessage.includes("402") || errorBodyStr.includes("402") || errorBodyStr.includes("credits exhausted");
        const is429 = errorMessage.includes("429");

        if (is429) toast.error("Rate limit exceeded. Please try again later.");
        else if (is401 || is402) setHasLoaded(true);
        else {
          console.error("Error fetching insights:", error);
          toast.error("Failed to get AI insights");
        }
        return;
      }

      setInsights(data);
      setHasLoaded(true);
    } catch (error: any) {
      console.error("Error:", error);
      if (!error?.message?.includes("402")) toast.error("Failed to connect to Bloom");
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounts = async () => {
    if (!user) return;
    try {
      const [plansRes, cardsRes, memRes] = await Promise.all([
        supabase
          .from("bloom_financial_plans")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["active", "in_progress"]),
        supabase
          .from("quinn_blueprint_cards" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("quinn_memories" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_active", true),
      ]);
      setCounts({
        plans: plansRes.count || 0,
        cards: cardsRes.count || 0,
        memories: memRes.count || 0,
      });
    } catch (e) {
      // Silent — counts are decorative
    }
  };

  useEffect(() => {
    if (user && !hasLoaded) {
      fetchInsights();
      fetchCounts();
    }
  }, [user]);

  const handleTogglePrivate = () => {
    const next = !privateMode;
    setPrivateMode(next);
    try {
      localStorage.setItem("quinn:privacy:defaultPrivate", next ? "true" : "false");
    } catch { /* ignore */ }
    toast.success(
      next
        ? "Private mode on — next session leaves no trace"
        : "Private mode off — Bloom will remember your sessions"
    );
  };

  if (isLoading && !insights) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Bloom is analyzing your finances…</p>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading your workstation..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* === Identity row: avatar + mode-tinted ring === */}
      <div
        className="flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors"
        style={{
          borderColor: borderRing,
          background: theme?.tint ?? "transparent",
          boxShadow: `0 0 14px -4px ${borderRing}`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(158 70% 42%), hsl(165 75% 38%))",
              boxShadow: "0 0 12px hsl(158 70% 48% / 0.5)",
            }}
          >
            <Sparkles className="h-4 w-4 text-[hsl(160,30%,8%)]" strokeWidth={2.5} />
            {/* Recognition pulse */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background animate-pulse"
              style={{ background: privateMode ? "hsl(40 70% 60%)" : "hsl(158 70% 55%)" }}
              aria-label={privateMode ? "Private mode" : "Active"}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight truncate">
              Bloom · Financial Architect
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">
              {theme ? (
                <span className="inline-flex items-center gap-1" style={{ color: theme.text }}>
                  <theme.Icon className="h-2.5 w-2.5" />
                  Last in {theme.label}
                </span>
              ) : (
                "Ready to brief you"
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex-shrink-0"
          onClick={() => { fetchInsights(); fetchCounts(); }}
          disabled={isLoading}
          title="Refresh"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* === Active Project ribbon === */}
      {activeProject?.name && (
        <button
          onClick={() => navigate("/coach")}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-[hsl(40_55%_68%/0.08)] border border-[hsl(40_55%_68%/0.30)] hover:bg-[hsl(40_55%_68%/0.14)] transition-colors group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Folder className="h-3.5 w-3.5 text-[hsl(40_70%_72%)] flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-[hsl(40_55%_68%)]/80 leading-none">
                Active Project
              </p>
              <p className="text-xs font-medium text-foreground truncate leading-tight">
                {activeProject.name}
              </p>
            </div>
          </div>
          <ArrowRight className="h-3 w-3 text-[hsl(40_70%_72%)] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        </button>
      )}

      {/* === Live Insight (echoed from the chat Insight Bar) === */}
      {liveInsight?.message && (
        <button
          onClick={() => navigate("/coach")}
          className="w-full text-left p-2 rounded-lg bg-[hsl(40_55%_68%/0.08)] border border-[hsl(40_55%_68%/0.30)] hover:bg-[hsl(40_55%_68%/0.14)] transition-colors group flex items-start gap-2"
          title="Open Bloom to discuss this insight"
        >
          <Sparkles className="h-3.5 w-3.5 text-[hsl(40_70%_72%)] flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-wider text-[hsl(40_55%_68%)]/80 leading-none">
              Live Insight
            </p>
            <p className="text-xs text-foreground/90 mt-0.5 line-clamp-2 leading-snug">
              {liveInsight.message}
            </p>
          </div>
          <ArrowRight className="h-3 w-3 text-[hsl(40_70%_72%)] group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5" />
        </button>
      )}

      {/* === AI Insight summary === */}
      {insights?.summary && (
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-[10px] font-medium flex items-center gap-1 text-primary uppercase tracking-wider">
            <Lightbulb className="h-3 w-3" />
            Today's Briefing
          </p>
          <p className="text-xs text-foreground/85 mt-1 line-clamp-3 leading-relaxed">
            {insights.summary}
          </p>
        </div>
      )}

      {/* === Mini-Vault counts === */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => navigate("/financial-plans")}
          className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors text-center"
          title="Living Money Plans"
        >
          <Map className="h-3 w-3 text-emerald-500 mx-auto" />
          <p className="text-sm font-bold text-foreground leading-tight mt-0.5">{counts.plans}</p>
          <p className="text-[9px] text-muted-foreground leading-none">Plans</p>
        </button>
        <button
          onClick={() => navigate("/coach")}
          className="p-1.5 rounded-lg bg-[hsl(40_55%_68%/0.10)] border border-[hsl(40_55%_68%/0.25)] hover:bg-[hsl(40_55%_68%/0.16)] transition-colors text-center"
          title="Blueprint cards in your Vault"
        >
          <Layers className="h-3 w-3 text-[hsl(40_70%_72%)] mx-auto" />
          <p className="text-sm font-bold text-foreground leading-tight mt-0.5">{counts.cards}</p>
          <p className="text-[9px] text-muted-foreground leading-none">Cards</p>
        </button>
        <button
          onClick={() => navigate("/coach")}
          className="p-1.5 rounded-lg bg-[hsl(268_70%_62%/0.10)] border border-[hsl(268_70%_62%/0.25)] hover:bg-[hsl(268_70%_62%/0.16)] transition-colors text-center"
          title="Active memories in Bloom's Brain"
        >
          <Brain className="h-3 w-3 text-[hsl(270_85%_80%)] mx-auto" />
          <p className="text-sm font-bold text-foreground leading-tight mt-0.5">{counts.memories}</p>
          <p className="text-[9px] text-muted-foreground leading-none">Memories</p>
        </button>
      </div>

      {/* === Quick actions === */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="default"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => navigate("/coach")}
        >
          <Sparkles className="h-3 w-3" />
          Open Bloom
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 px-2 text-xs gap-1 ${
            privateMode
              ? "border-[hsl(40_55%_68%/0.5)] text-[hsl(40_70%_72%)] bg-[hsl(40_55%_68%/0.08)]"
              : ""
          }`}
          onClick={handleTogglePrivate}
          title={privateMode ? "Private mode on — tap to disable" : "Start next session in private mode"}
        >
          {privateMode ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
          {privateMode ? "Private" : "Standard"}
        </Button>
      </div>
    </div>
  );
};
