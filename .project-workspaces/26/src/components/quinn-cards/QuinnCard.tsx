import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Pin, PinOff, Copy, Check, Sparkles, Map, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LiquidityWorkstation, type LiquidityMetadata } from "@/components/quinn-cards/LiquidityWorkstation";
import { renderWithSourceTags } from "@/components/bloom-coach/SourceTag";

export interface QuinnCardSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface QuinnCardData {
  card_type?: string;
  title: string;
  callout?: string;
  sections: QuinnCardSection[];
  /** Optional rich metadata. Currently used by risk_assessment cards
   *  to render the 14-day liquidity timeline + bill deferral simulator. */
  metadata?: LiquidityMetadata & Record<string, any>;
}

interface QuinnCardProps {
  data: QuinnCardData;
  sourceExcerpt?: string;
  /** If provided, treat as already-saved card (id from quinn_blueprint_cards). */
  savedId?: string;
  initiallyPinned?: boolean;
  /** If the card has already been promoted, lock the action and show "View plan". */
  initiallyPromotedPlanId?: string | null;
  className?: string;
  /** Optional context for richer persistence into quinn_blueprint_cards. */
  projectId?: string | null;
  conversationId?: string | null;
  modeLens?: "focus" | "brainstorm" | "planner" | "audit" | "strategic" | "market" | null;
}

const CARD_TYPE_LABELS: Record<string, string> = {
  strategy_comparison: "Strategy Comparison",
  tax_alert: "Tax Alert",
  blueprint_proposal: "Blueprint",
  risk_assessment: "Risk Assessment",
  insight: "Insight",
  manual_pin: "Pinned Note",
};

const PLAN_TYPE_BY_MODE: Record<string, string> = {
  planner: "roadmap",
  audit: "optimization",
  strategic: "strategic",
  brainstorm: "custom",
  focus: "custom",
};

export function QuinnCard({
  data,
  sourceExcerpt,
  savedId,
  initiallyPinned = false,
  initiallyPromotedPlanId = null,
  className,
  projectId = null,
  conversationId = null,
  modeLens = null,
}: QuinnCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pinned, setPinned] = useState(initiallyPinned);
  const [savingId, setSavingId] = useState<string | null>(savedId ?? null);
  const [promotedPlanId, setPromotedPlanId] = useState<string | null>(initiallyPromotedPlanId);
  const [promoting, setPromoting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const cardType = data.card_type || "insight";
  const typeLabel = CARD_TYPE_LABELS[cardType] || "Insight";
  const isBlueprint = cardType === "blueprint_proposal";

  const handlePinToggle = async () => {
    if (!user) {
      toast.error("Sign in to pin cards");
      return;
    }
    setBusy(true);
    try {
      if (savingId) {
        const newPinned = !pinned;
        const { error } = await supabase
          .from("quinn_blueprint_cards")
          .update({ pinned: newPinned })
          .eq("id", savingId);
        if (error) throw error;
        setPinned(newPinned);
        toast.success(newPinned ? "Pinned to your vault" : "Unpinned");
      } else {
        const { data: inserted, error } = await supabase
          .from("quinn_blueprint_cards")
          .insert({
            user_id: user.id,
            card_type: cardType,
            title: data.title,
            callout: data.callout ?? null,
            sections: data.sections as any,
            pinned: true,
            project_id: projectId,
            conversation_id: conversationId,
            mode_lens: modeLens,
          })
          .select("id")
          .single();
        if (error) throw error;
        setSavingId(inserted.id);
        setPinned(true);
        toast.success(isBlueprint ? "Blueprint saved to vault" : "Saved to your vault");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save card");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    const text = [
      data.title,
      data.callout ? `→ ${data.callout}` : "",
      ...data.sections.map(
        (s) =>
          `\n${s.heading.toUpperCase()}\n${s.body}${
            s.bullets?.length ? "\n" + s.bullets.map((b) => `• ${b}`).join("\n") : ""
          }`
      ),
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Card copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handlePromote = async () => {
    if (!user) {
      toast.error("Sign in to promote a blueprint");
      return;
    }
    if (promotedPlanId) {
      navigate("/financial-plans");
      return;
    }
    if (!data.sections?.length) {
      toast.error("This blueprint has no sections to promote");
      return;
    }
    setPromoting(true);
    try {
      // Ensure card exists in quinn_blueprint_cards so we can stamp the linkage.
      let cardId = savingId;
      if (!cardId) {
        const { data: insertedCard, error: cardErr } = await supabase
          .from("quinn_blueprint_cards")
          .insert({
            user_id: user.id,
            card_type: cardType,
            title: data.title,
            callout: data.callout ?? null,
            sections: data.sections as any,
            pinned: true,
            project_id: projectId,
            conversation_id: conversationId,
            mode_lens: modeLens,
          })
          .select("id")
          .single();
        if (cardErr) throw cardErr;
        cardId = insertedCard.id;
        setSavingId(cardId);
        setPinned(true);
      }

      // Create the plan
      const planType = (modeLens && PLAN_TYPE_BY_MODE[modeLens]) || "custom";
      const { data: plan, error: planErr } = await supabase
        .from("bloom_financial_plans")
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.callout ?? null,
          plan_type: planType,
          status: "active",
          priority: "medium",
          conversation_id: conversationId,
        })
        .select("id")
        .single();
      if (planErr) throw planErr;

      // Build milestones (one per section) and actions (one per bullet).
      const milestonePayload = data.sections.map((s, i) => ({
        plan_id: plan.id,
        user_id: user.id,
        title: s.heading || `Step ${i + 1}`,
        description: s.body || null,
        order_index: i,
        status: "pending",
      }));

      const { data: milestones, error: msErr } = await supabase
        .from("bloom_plan_milestones")
        .insert(milestonePayload)
        .select("id, order_index");
      if (msErr) throw msErr;

      // Map order_index -> milestone id for action linkage
      const msIndex: Record<number, string> = {};
      (milestones || []).forEach((m: any) => { msIndex[m.order_index] = m.id; });

      const actionRows: any[] = [];
      data.sections.forEach((s, i) => {
        const mid = msIndex[i];
        if (!mid) return;
        (s.bullets || []).forEach((b, j) => {
          actionRows.push({
            plan_id: plan.id,
            milestone_id: mid,
            user_id: user.id,
            title: b.length > 120 ? b.slice(0, 117) + "…" : b,
            description: b.length > 120 ? b : null,
            order_index: j,
          });
        });
      });

      if (actionRows.length > 0) {
        const { error: actErr } = await supabase.from("bloom_plan_actions").insert(actionRows);
        if (actErr) throw actErr;
      }

      // Stamp the card with the plan id (best-effort, non-fatal)
      if (cardId) {
        await supabase
          .from("quinn_blueprint_cards")
          .update({ promoted_to_plan_id: plan.id })
          .eq("id", cardId);
      }

      setPromotedPlanId(plan.id);
      toast.success("Blueprint promoted to a Living Money Plan", {
        action: { label: "View", onClick: () => navigate("/financial-plans") },
      });
    } catch (err: any) {
      console.error("Promote failed:", err);
      toast.error(err?.message || "Could not promote blueprint");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div
      className={cn(
        "my-3 rounded-2xl quinn-glass overflow-hidden min-w-0 max-w-[calc(100vw-32px)]",
        isBlueprint
          ? "ring-2 ring-[hsl(var(--quinn-champagne))]/55 shadow-[0_12px_44px_-10px_hsl(var(--quinn-champagne)/0.45),inset_0_1px_0_hsl(var(--quinn-champagne)/0.25)]"
          : "ring-1 ring-[hsl(var(--quinn-emerald))]/20 shadow-[0_8px_32px_-12px_hsl(158_80%_8%/0.6)]",
        className
      )}
    >
      {isBlueprint && (
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[hsl(var(--quinn-champagne))] to-transparent opacity-80" />
      )}
      {/* Header */}
      <div className={cn(
        "flex items-start justify-between gap-2 px-4 pt-3.5 pb-2.5 border-b",
        isBlueprint
          ? "border-[hsl(var(--quinn-champagne))]/35 bg-gradient-to-b from-[hsl(var(--quinn-champagne)/0.06)] to-transparent"
          : "border-[hsl(var(--quinn-champagne))]/15"
      )}>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3 w-3 text-emerald" />
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 h-4 font-semibold tracking-[0.12em] uppercase bg-[hsl(var(--quinn-champagne))]/10 text-champagne border border-[hsl(var(--quinn-champagne))]/30 rounded-full"
            >
              {typeLabel}
            </Badge>
          </div>
          <h3 className="text-sm font-bold text-foreground leading-snug break-words">
            {renderWithSourceTags(data.title)}
          </h3>
          {data.callout && (
            <p className="text-xs italic text-muted-foreground mt-1 leading-snug">
              → {renderWithSourceTags(data.callout)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-white/5"
            onClick={handlePinToggle}
            disabled={busy}
            title={pinned ? "Unpin" : "Pin to shelf"}
          >
            {pinned ? (
              <Pin className="h-3.5 w-3.5 text-champagne fill-current" />
            ) : (
              <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-white/5"
            onClick={handleCopy}
            title="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="px-2 py-1.5">
        {data.sections.map((section, i) => (
          <Collapsible key={i} defaultOpen={i === 0}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-emerald">
                {renderWithSourceTags(section.heading)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2.5 pt-0.5">
              {section.body && (
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {renderWithSourceTags(section.body)}
                </p>
              )}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {section.bullets.map((b, j) => (
                    <li key={j} className="text-xs text-foreground/85 flex gap-1.5 leading-relaxed">
                      <span className="text-champagne shrink-0">◆</span>
                      <span>{renderWithSourceTags(b)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Liquidity Workstation — embedded for risk_assessment cards Bloom flagged */}
      {cardType === "risk_assessment" && data.metadata?.show_liquidity_timeline && (
        <LiquidityWorkstation metadata={data.metadata} />
      )}

      {/* Promote-to-Plan footer (blueprints only) */}
      {isBlueprint && (
        <div className={cn(
          "px-3 py-2.5 border-t flex items-center justify-between gap-2",
          "border-[hsl(var(--quinn-champagne))]/25 bg-gradient-to-b from-transparent to-[hsl(var(--quinn-champagne)/0.05)]"
        )}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Map className="h-3 w-3 text-champagne shrink-0" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-champagne/85 truncate">
              {promotedPlanId ? "Promoted to a Living Money Plan" : "Turn this into a tracked plan"}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePromote}
            disabled={promoting}
            className={cn(
              "h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-full border transition-all",
              promotedPlanId
                ? "border-[hsl(var(--quinn-champagne)/0.45)] text-champagne hover:bg-[hsl(var(--quinn-champagne)/0.12)]"
                : "border-[hsl(var(--quinn-champagne)/0.55)] text-champagne bg-[hsl(var(--quinn-champagne)/0.08)] hover:bg-[hsl(var(--quinn-champagne)/0.18)] shadow-[0_0_12px_-4px_hsl(var(--quinn-champagne)/0.45)]"
            )}
          >
            {promoting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Building…
              </>
            ) : promotedPlanId ? (
              <>
                View plan
                <ArrowRight className="h-3 w-3" />
              </>
            ) : (
              <>
                Promote to Plan
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
