import { useState, useEffect } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Heart, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Quote {
  id: string;
  content: string;
  is_active: boolean;
  created_at: string;
  like_count?: number;
  dislike_count?: number;
}

export function QuotesManager() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [newQuote, setNewQuote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    const { data: quotesData, error } = await supabase
      .from("inspirational_quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load quotes");
      setLoading(false);
      return;
    }

    // Fetch reaction counts for each quote
    const { data: likesData } = await supabase
      .from("quote_likes")
      .select("quote_id, reaction_type");

    const countsMap: Record<string, { likes: number; dislikes: number }> = {};
    likesData?.forEach((like) => {
      if (!countsMap[like.quote_id]) {
        countsMap[like.quote_id] = { likes: 0, dislikes: 0 };
      }
      if (like.reaction_type === 'like') {
        countsMap[like.quote_id].likes++;
      } else {
        countsMap[like.quote_id].dislikes++;
      }
    });

    const quotesWithCounts = (quotesData || []).map((q) => ({
      ...q,
      like_count: countsMap[q.id]?.likes || 0,
      dislike_count: countsMap[q.id]?.dislikes || 0,
    }));

    setQuotes(quotesWithCounts);
    setLoading(false);
  };

  const addQuote = async () => {
    if (!newQuote.trim()) return;

    const { error } = await supabase
      .from("inspirational_quotes")
      .insert({ content: newQuote.trim() });

    if (error) {
      toast.error("Failed to add quote");
    } else {
      toast.success("Quote added!");
      setNewQuote("");
      fetchQuotes();
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("inspirational_quotes")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update quote");
    } else {
      fetchQuotes();
    }
  };

  const deleteQuote = async (id: string) => {
    const { error } = await supabase
      .from("inspirational_quotes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete quote");
    } else {
      toast.success("Quote deleted");
      fetchQuotes();
    }
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading quotes...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Inspirational Quotes
          <Badge variant="secondary">{quotes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new quote */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a new inspirational quote..."
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addQuote()}
          />
          <Button onClick={addQuote} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Quotes list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!quote.is_active ? "text-muted-foreground line-through" : ""}`}>
                  "{quote.content}"
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3 text-pink-500" />
                    {quote.like_count || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsDown className="h-3 w-3 text-red-500" />
                    {quote.dislike_count || 0}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleActive(quote.id, quote.is_active)}
                  className="h-8 w-8"
                >
                  {quote.is_active ? (
                    <ToggleRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteQuote(quote.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}