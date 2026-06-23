import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Trash2, Sparkles, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { QuinnCard, type QuinnCardData } from "@/components/quinn-cards/QuinnCard";
import { cn } from "@/lib/utils";

interface ShelfRow {
  id: string;
  card_type: string;
  title: string;
  callout: string | null;
  sections: any;
  source_message_excerpt: string | null;
  pinned: boolean;
  created_at: string;
}

const CHIPS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pinned", label: "Pinned" },
  { value: "blueprint_proposal", label: "Blueprints" },
  { value: "strategy_comparison", label: "Comparisons" },
  { value: "tax_alert", label: "Tax" },
  { value: "risk_assessment", label: "Risk" },
  { value: "insight", label: "Insights" },
];

export default function QuinnShelf() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<ShelfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("quinn_cards")
        .select("id, card_type, title, callout, sections, source_message_excerpt, pinned, created_at")
        .eq("user_id", user.id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Could not load cards");
      } else {
        setRows((data ?? []) as ShelfRow[]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "pinned") return rows.filter((r) => r.pinned);
    return rows.filter((r) => r.card_type === filter);
  }, [rows, filter]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("quinn_cards").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete");
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Removed");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-[980px] mx-auto">
      <Helmet>
        <title>Bloom Shelf | CoinsBloom</title>
        <meta name="description" content="Your saved Bloom cards — blueprints, comparisons, and insights." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-3 py-2.5 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5 flex-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h1 className="text-base font-semibold">Bloom Shelf</h1>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
            {rows.length}
          </Badge>
        </div>
      </header>

      {/* Filter chips */}
      <div className="px-3 py-2 border-b border-border/40 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setFilter(chip.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                filter === chip.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-3">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Pin className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-foreground font-medium">No cards yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When Bloom surfaces a blueprint or comparison, pin it here for later.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate("/bloom-coach")}
              >
                Open Bloom
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((row) => {
                const data: QuinnCardData = {
                  card_type: row.card_type,
                  title: row.title,
                  callout: row.callout ?? undefined,
                  sections: Array.isArray(row.sections) ? row.sections : [],
                };
                return (
                  <div key={row.id} className="relative group">
                    <QuinnCard
                      data={data}
                      savedId={row.id}
                      initiallyPinned={row.pinned}
                      sourceExcerpt={row.source_message_excerpt ?? undefined}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2.5 right-16 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(row.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
