import { useState } from "react";
import { useCommunity } from "@/hooks/useCommunity";
import { TradeIdeaCard } from "./TradeIdeaCard";
import { CreateTradeIdeaDialog } from "./CreateTradeIdeaDialog";
import { CommentsModal } from "./CommentsModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function TradeIdeasFeed() {
  const { user } = useAuth();
  const { tradeIdeas, loadingIdeas, toggleLike, reportContent } = useCommunity();
  const [searchTerm, setSearchTerm] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  
  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingIdeaId, setReportingIdeaId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>("spam");
  const [reportDescription, setReportDescription] = useState("");

  // Comments modal state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [selectedIdeaTitle, setSelectedIdeaTitle] = useState<string>("");

  const filteredIdeas = tradeIdeas.filter((idea) => {
    const matchesSearch = 
      idea.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAsset = assetFilter === "all" || idea.asset_class === assetFilter;
    const matchesDirection = directionFilter === "all" || idea.trade_direction === directionFilter;
    return matchesSearch && matchesAsset && matchesDirection;
  });

  const handleLike = async (ideaId: string, hasLiked: boolean) => {
    await toggleLike.mutateAsync({ ideaId, hasLiked });
  };

  const handleComment = (ideaId: string) => {
    const idea = tradeIdeas.find(i => i.id === ideaId);
    setSelectedIdeaId(ideaId);
    setSelectedIdeaTitle(idea?.title || "");
    setCommentsOpen(true);
  };

  const handleReport = (ideaId: string) => {
    setReportingIdeaId(ideaId);
    setReportDialogOpen(true);
  };

  const submitReport = async () => {
    if (!reportingIdeaId) return;
    await reportContent.mutateAsync({
      content_type: "trade_idea",
      content_id: reportingIdeaId,
      reason: reportReason,
      description: reportDescription,
    });
    setReportDialogOpen(false);
    setReportingIdeaId(null);
    setReportReason("spam");
    setReportDescription("");
  };

  if (loadingIdeas) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symbols or titles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={assetFilter} onValueChange={setAssetFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              <SelectItem value="stocks">Stocks</SelectItem>
              <SelectItem value="options">Options</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="forex">Forex</SelectItem>
              <SelectItem value="futures">Futures</SelectItem>
              <SelectItem value="etfs">ETFs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
          {user && <CreateTradeIdeaDialog />}
        </div>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">No trade ideas yet. Be the first to share!</p>
          {user && (
            <CreateTradeIdeaDialog>
              <Button className="mt-4">Share Your First Idea</Button>
            </CreateTradeIdeaDialog>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredIdeas.map((idea) => (
            <TradeIdeaCard
              key={idea.id}
              idea={idea}
              onLike={handleLike}
              onComment={handleComment}
              onReport={handleReport}
            />
          ))}
        </div>
      )}

      {/* Comments Modal */}
      <CommentsModal
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        ideaId={selectedIdeaId}
        ideaTitle={selectedIdeaTitle}
      />

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for reporting</Label>
              <RadioGroup value={reportReason} onValueChange={setReportReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spam" id="spam" />
                  <Label htmlFor="spam">Spam or self-promotion</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="misinformation" id="misinfo" />
                  <Label htmlFor="misinfo">Misinformation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="harassment" id="harassment" />
                  <Label htmlFor="harassment">Harassment or abuse</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inappropriate" id="inappropriate" />
                  <Label htmlFor="inappropriate">Inappropriate content</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Additional details (optional)</Label>
              <Textarea
                id="description"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Provide more context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={reportContent.isPending}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
