import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Newspaper, ExternalLink, Loader2, Video, Image as ImageIcon, ChevronRight, X, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  // Legacy categories for backwards compatibility
  news: { emoji: "📰", color: "bg-blue-500/10 text-blue-600" },
  markets: { emoji: "📈", color: "bg-green-500/10 text-green-600" },
  savings: { emoji: "💰", color: "bg-yellow-500/10 text-yellow-600" },
  credit: { emoji: "💳", color: "bg-purple-500/10 text-purple-600" },
  investing: { emoji: "📊", color: "bg-indigo-500/10 text-indigo-600" },
  market_news: { emoji: "📈", color: "bg-green-500/10 text-green-600" },
};

export const NewsCardContent = () => {
  const [selectedItem, setSelectedItem] = useState<NewsletterItem | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);

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
        .limit(10);
      if (error) throw error;
      return data as NewsletterItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const displayItems = newsItems.slice(0, 2);

  const getTimeAgo = (date: string, category: string) => {
    // For evergreen content (tips/insights), don't show time ago
    if (category === 'tips' || category === 'insights') {
      return "";
    }
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false }).replace("about ", "") + " ago";
    } catch {
      return "";
    }
  };

  const getCategoryStyle = (category: string) => 
    CATEGORY_STYLES[category] || { emoji: "📄", color: "bg-muted text-muted-foreground" };

  const handleItemClick = (item: NewsletterItem) => {
    if (item.external_link && !item.content) {
      window.open(item.external_link, "_blank");
    } else {
      setSelectedItem(item);
    }
  };

  // When rendered in sheet mode, show full list
  const isInSheet = typeof window !== 'undefined' && 
    document.querySelector('[data-state="open"] .news-card-content');

  return (
    <>
      <div className="space-y-2 news-card-content">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Newspaper className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Bloom Updates</span>
            <a href="/blog" className="text-[10px] text-primary hover:underline ml-1">Read Blog →</a>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : newsItems.length === 0 ? (
          <div className="text-center py-4">
            <Newspaper className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No news available</p>
            <p className="text-xs text-muted-foreground">Check back soon for updates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item) => {
              const catStyle = getCategoryStyle(item.category);
              return (
                <div 
                  key={item.id} 
                  className="group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-start gap-2">
                    {item.image_url && (
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={item.image_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        {item.is_featured && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                        {item.video_url && (
                          <Video className="h-3 w-3 text-purple-500" />
                        )}
                        <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${catStyle.color}`}>
                          {catStyle.emoji}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-foreground hover:text-primary flex items-center gap-1 line-clamp-2">
                        {item.title}
                        {item.external_link && (
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                        )}
                      </p>
                      {(item.source || getTimeAgo(item.published_at || item.created_at, item.category)) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.source && <span>{item.source}</span>}
                          {item.source && getTimeAgo(item.published_at || item.created_at, item.category) && <span> • </span>}
                          {getTimeAgo(item.published_at || item.created_at, item.category)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {newsItems.length > 2 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs h-7"
            onClick={() => setShowAllModal(true)}
          >
            View all {newsItems.length} stories
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Single Item Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-tight">{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 pb-4">
                {/* Featured Image/Video */}
                {selectedItem.video_url ? (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {selectedItem.video_url.includes("youtube") || selectedItem.video_url.includes("youtu.be") ? (
                      <iframe
                        src={selectedItem.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                        onClick={() => window.open(selectedItem.video_url!, "_blank")}
                      >
                        <Play className="h-12 w-12 text-primary" />
                      </div>
                    )}
                  </div>
                ) : selectedItem.image_url && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={selectedItem.image_url} 
                      alt={selectedItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={getCategoryStyle(selectedItem.category).color}>
                    {getCategoryStyle(selectedItem.category).emoji} {selectedItem.category}
                  </Badge>
                  {selectedItem.source && (
                    <span className="text-sm text-muted-foreground">{selectedItem.source}</span>
                  )}
                  {getTimeAgo(selectedItem.published_at || selectedItem.created_at, selectedItem.category) && (
                    <span className="text-sm text-muted-foreground">
                      {getTimeAgo(selectedItem.published_at || selectedItem.created_at, selectedItem.category)}
                    </span>
                  )}
                </div>

                {/* Summary */}
                <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>

                {/* Full Content */}
                {selectedItem.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    {selectedItem.content.split('\n').map((line, i) => {
                      // Parse bold (**text**)
                      const parsedLine = line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      });
                      
                      // Handle bullet points
                      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                        return (
                          <p key={i} className="pl-4 my-1">
                            {parsedLine}
                          </p>
                        );
                      }
                      
                      return line.trim() ? <p key={i} className="my-2">{parsedLine}</p> : <br key={i} />;
                    })}
                  </div>
                )}

                {/* External Link */}
                {selectedItem.external_link && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(selectedItem.external_link!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Full Article
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* All Stories Modal */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              Bloom Updates
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 pb-4">
              {newsItems.map((item) => {
                const catStyle = getCategoryStyle(item.category);
                return (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowAllModal(false);
                      setTimeout(() => handleItemClick(item), 150);
                    }}
                  >
                    <div className="flex gap-3">
                      {item.image_url && (
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={item.image_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${catStyle.color}`}>
                            {catStyle.emoji}
                          </Badge>
                          {item.is_featured && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          )}
                          {item.video_url && (
                            <Video className="h-3 w-3 text-purple-500" />
                          )}
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                        {(item.source || getTimeAgo(item.published_at || item.created_at, item.category)) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.source && <span>{item.source}</span>}
                            {item.source && getTimeAgo(item.published_at || item.created_at, item.category) && <span> • </span>}
                            {getTimeAgo(item.published_at || item.created_at, item.category)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Expanded content for sheet view
export const NewsExpandedContent = () => {
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

  const getTimeAgo = (date: string, category: string) => {
    // For evergreen content (tips/insights), don't show time ago
    if (category === 'tips' || category === 'insights') {
      return "";
    }
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false }).replace("about ", "") + " ago";
    } catch {
      return "";
    }
  };

  const getCategoryStyle = (category: string) => 
    CATEGORY_STYLES[category] || { emoji: "📄", color: "bg-muted text-muted-foreground" };

  const handleItemClick = (item: NewsletterItem) => {
    if (item.external_link && !item.content) {
      window.open(item.external_link, "_blank");
    } else {
      setSelectedItem(item);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (newsItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Newspaper className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No Updates Yet</h3>
        <p className="text-muted-foreground">Check back soon for tips and updates</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{newsItems.length} stories available</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {newsItems.map((item) => {
            const catStyle = getCategoryStyle(item.category);
            return (
              <div 
                key={item.id} 
                className="p-4 rounded-xl border bg-card hover:bg-muted/50 cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex gap-4">
                  {item.image_url ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img 
                        src={item.image_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Newspaper className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="secondary" className={`text-xs ${catStyle.color}`}>
                        {catStyle.emoji} {item.category}
                      </Badge>
                      {item.is_featured && (
                        <Badge variant="default" className="text-xs bg-yellow-500 text-yellow-50">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      )}
                      {item.video_url && (
                        <Badge variant="outline" className="text-xs">
                          <Video className="h-3 w-3 mr-1" />
                          Video
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-base line-clamp-2 mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.summary}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.source && <span className="font-medium">{item.source}</span>}
                      {item.source && getTimeAgo(item.published_at || item.created_at, item.category) && <span>•</span>}
                      {getTimeAgo(item.published_at || item.created_at, item.category) && (
                        <span>{getTimeAgo(item.published_at || item.created_at, item.category)}</span>
                      )}
                      {item.external_link && (
                        <>
                          <span>•</span>
                          <ExternalLink className="h-3 w-3" />
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-tight">{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 pb-4">
                {selectedItem.video_url ? (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {selectedItem.video_url.includes("youtube") || selectedItem.video_url.includes("youtu.be") ? (
                      <iframe
                        src={selectedItem.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                        onClick={() => window.open(selectedItem.video_url!, "_blank")}
                      >
                        <Play className="h-12 w-12 text-primary" />
                      </div>
                    )}
                  </div>
                ) : selectedItem.image_url && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={selectedItem.image_url} 
                      alt={selectedItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={getCategoryStyle(selectedItem.category).color}>
                    {getCategoryStyle(selectedItem.category).emoji} {selectedItem.category}
                  </Badge>
                  {selectedItem.source && (
                    <span className="text-sm text-muted-foreground">{selectedItem.source}</span>
                  )}
                  {getTimeAgo(selectedItem.published_at || selectedItem.created_at, selectedItem.category) && (
                    <span className="text-sm text-muted-foreground">
                      {getTimeAgo(selectedItem.published_at || selectedItem.created_at, selectedItem.category)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>

                {selectedItem.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    {selectedItem.content.split('\n').map((line, i) => {
                      const parsedLine = line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      });
                      
                      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                        return <p key={i} className="pl-4 my-1">{parsedLine}</p>;
                      }
                      
                      return line.trim() ? <p key={i} className="my-2">{parsedLine}</p> : <br key={i} />;
                    })}
                  </div>
                )}

                {selectedItem.external_link && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(selectedItem.external_link!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Full Article
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};