import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Newspaper, ExternalLink, Loader2, ChevronRight, Star, Video, RefreshCw, TrendingUp, MessageSquare, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { formatDistanceToNow } from "date-fns";

interface NewsletterItem {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  category: string;
  source: string | null;
  image_url: string | null;
  video_url: string | null;
  external_link: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
}

const CATEGORY_STYLES: Record<string, { emoji: string; color: string }> = {
  tips: { emoji: "💡", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  updates: { emoji: "🚀", color: "bg-primary/10 text-primary" },
  insights: { emoji: "📊", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  news: { emoji: "📰", color: "bg-blue-500/10 text-blue-600" },
  markets: { emoji: "📈", color: "bg-green-500/10 text-green-600" },
};

const getTimeAgo = (date: string, category: string) => {
  if (category === "tips" || category === "insights") return "";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: false }).replace("about ", "") + " ago";
  } catch {
    return "";
  }
};

const getCategoryStyle = (category: string) =>
  CATEGORY_STYLES[category] || { emoji: "📄", color: "bg-muted text-muted-foreground" };

export const FinancialToolsCardContent = () => {
  const [selectedItem, setSelectedItem] = useState<NewsletterItem | null>(null);

  const { data: newsItems = [], isLoading } = useQuery({
    queryKey: ["newsletter-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_items")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("priority", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as NewsletterItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const topItem = newsItems[0];

  const handleItemClick = (item: NewsletterItem) => {
    if (item.external_link && !item.content) {
      window.open(item.external_link, "_blank");
    } else {
      setSelectedItem(item);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {/* Quick Links */}
        <div className="flex gap-1.5 flex-wrap">
          <a
            href="/blog"
            className="flex-1 flex items-center gap-1 px-1.5 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-[11px] font-medium text-primary"
          >
            <BookOpen className="h-3 w-3 flex-shrink-0" />
            <span>Blog</span>
          </a>
          <a
            href="https://www.xe.com/currencyconverter/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center gap-1 px-1.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-[11px] font-medium"
          >
            <Globe className="h-3 w-3 text-primary flex-shrink-0" />
            <span>XE</span>
            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto flex-shrink-0" />
          </a>
          <a
            href="https://finance.yahoo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center gap-1 px-1.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-[11px] font-medium"
          >
            <Newspaper className="h-3 w-3 text-emerald-500 flex-shrink-0" />
            <span>Yahoo</span>
            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto flex-shrink-0" />
          </a>
          <a
            href="https://www.marketwatch.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center gap-1 px-1.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-[11px] font-medium"
          >
            <TrendingUp className="h-3 w-3 text-blue-500 flex-shrink-0" />
            <span>MarketWatch</span>
            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto flex-shrink-0" />
          </a>
        </div>

        {/* Latest Bloom Update */}
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : topItem ? (
          <div
            className="cursor-pointer p-1.5 -mx-1 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => handleItemClick(topItem)}
          >
            <div className="flex items-center gap-1 mb-0.5">
              {topItem.is_featured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
              <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${getCategoryStyle(topItem.category).color}`}>
                {getCategoryStyle(topItem.category).emoji}
              </Badge>
              {getTimeAgo(topItem.published_at || topItem.created_at, topItem.category) && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {getTimeAgo(topItem.published_at || topItem.created_at, topItem.category)}
                </span>
              )}
            </div>
            <p className="text-xs font-medium line-clamp-2 text-foreground">{topItem.title}</p>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-1">No updates yet</p>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-tight">{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="space-y-4 pb-6">
                {selectedItem.image_url && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img src={selectedItem.image_url} alt={selectedItem.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={getCategoryStyle(selectedItem.category).color}>
                    {getCategoryStyle(selectedItem.category).emoji} {selectedItem.category}
                  </Badge>
                  {selectedItem.source && <span className="text-sm text-muted-foreground">{selectedItem.source}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>
                {selectedItem.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    {selectedItem.content.split("\n").map((line, i) => {
                      const parsed = line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                        if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
                        return part;
                      });
                      if (line.trim().startsWith("•") || line.trim().startsWith("-")) return <p key={i} className="pl-4 my-1">{parsed}</p>;
                      return line.trim() ? <p key={i} className="my-2">{parsed}</p> : <br key={i} />;
                    })}
                  </div>
                )}
                {selectedItem.external_link && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(selectedItem.external_link!, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Full Article
                  </Button>
                )}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">We're constantly improving CoinsBloom based on your feedback.</p>
                  <Button variant="secondary" className="w-full gap-2" onClick={() => { setSelectedItem(null); window.location.href = '/help-center'; }}>
                    <MessageSquare className="h-4 w-4" />
                    Share Your Feedback
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Expanded content for the sheet view - shows all Bloom Updates + links
export const FinancialToolsExpandedContent = () => {
  const [selectedItem, setSelectedItem] = useState<NewsletterItem | null>(null);

  const { data: newsItems = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["newsletter-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_items")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("priority", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as NewsletterItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleItemClick = (item: NewsletterItem) => {
    if (item.external_link && !item.content) {
      window.open(item.external_link, "_blank");
    } else {
      setSelectedItem(item);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* External Links */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href="https://www.xe.com/currencyconverter/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition-colors"
          >
            <Globe className="h-5 w-5 text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">XE.com</p>
              <p className="text-[10px] text-muted-foreground">Currency</p>
            </div>
          </a>
          <a
            href="https://finance.yahoo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition-colors"
          >
            <Newspaper className="h-5 w-5 text-emerald-500" />
            <div className="text-center">
              <p className="text-sm font-medium">Yahoo</p>
              <p className="text-[10px] text-muted-foreground">Finance</p>
            </div>
          </a>
          <a
            href="https://www.marketwatch.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition-colors"
          >
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <div className="text-center">
              <p className="text-sm font-medium">MarketWatch</p>
              <p className="text-[10px] text-muted-foreground">News</p>
            </div>
          </a>
        </div>

        {/* Bloom Updates List */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Bloom Updates</h3>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : newsItems.length === 0 ? (
          <div className="text-center py-8">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No updates yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {newsItems.map((item) => {
              const catStyle = getCategoryStyle(item.category);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex gap-3">
                    {item.image_url && (
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${catStyle.color}`}>
                          {catStyle.emoji}
                        </Badge>
                        {item.is_featured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        {item.video_url && <Video className="h-3 w-3 text-purple-500" />}
                      </div>
                      <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                      {(item.source || getTimeAgo(item.published_at || item.created_at, item.category)) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.source}
                          {item.source && getTimeAgo(item.published_at || item.created_at, item.category) && " • "}
                          {getTimeAgo(item.published_at || item.created_at, item.category)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-tight">{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="space-y-4 pb-6">
                {selectedItem.image_url && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img src={selectedItem.image_url} alt={selectedItem.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={getCategoryStyle(selectedItem.category).color}>
                    {getCategoryStyle(selectedItem.category).emoji} {selectedItem.category}
                  </Badge>
                  {selectedItem.source && <span className="text-sm text-muted-foreground">{selectedItem.source}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>
                {selectedItem.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    {selectedItem.content.split("\n").map((line, i) => {
                      const parsed = line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                        if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
                        return part;
                      });
                      if (line.trim().startsWith("•") || line.trim().startsWith("-")) return <p key={i} className="pl-4 my-1">{parsed}</p>;
                      return line.trim() ? <p key={i} className="my-2">{parsed}</p> : <br key={i} />;
                    })}
                  </div>
                )}
                {selectedItem.external_link && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(selectedItem.external_link!, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Full Article
                  </Button>
                )}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">We're constantly improving CoinsBloom based on your feedback.</p>
                  <Button variant="secondary" className="w-full gap-2" onClick={() => { setSelectedItem(null); window.location.href = '/help-center'; }}>
                    <MessageSquare className="h-4 w-4" />
                    Share Your Feedback
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
