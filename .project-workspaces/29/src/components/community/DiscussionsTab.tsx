import { useState } from "react";
import { useCommunity } from "@/hooks/useCommunity";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Eye, Pin, Lock, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  general: "bg-gray-500/10 text-gray-500",
  strategies: "bg-purple-500/10 text-purple-500",
  analysis: "bg-blue-500/10 text-blue-500",
  education: "bg-green-500/10 text-green-500",
  beginners: "bg-orange-500/10 text-orange-500",
};

export function DiscussionsTab() {
  const { user } = useAuth();
  const { threads, loadingThreads, createThread } = useCommunity();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // New thread form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  const filteredThreads = threads.filter((thread) => {
    const matchesSearch = 
      thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || thread.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateThread = async () => {
    await createThread.mutateAsync({
      title: newTitle,
      content: newContent,
      category: newCategory,
    });
    setNewTitle("");
    setNewContent("");
    setNewCategory("general");
    setCreateDialogOpen(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loadingThreads) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discussions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="strategies">Strategies</SelectItem>
              <SelectItem value="analysis">Analysis</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="beginners">Beginners</SelectItem>
            </SelectContent>
          </Select>
          {user && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Discussion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start a Discussion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="thread-title">Title</Label>
                    <Input
                      id="thread-title"
                      placeholder="What would you like to discuss?"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thread-category">Category</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="strategies">Strategies</SelectItem>
                        <SelectItem value="analysis">Analysis</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="beginners">Beginners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thread-content">Content</Label>
                    <Textarea
                      id="thread-content"
                      placeholder="Share your thoughts..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateThread}
                    disabled={!newTitle || !newContent || createThread.isPending}
                  >
                    {createThread.isPending ? "Creating..." : "Create Discussion"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Threads List */}
      {filteredThreads.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">No discussions yet. Start one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreads.map((thread) => (
            <Card 
              key={thread.id} 
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                thread.is_pinned && "border-primary/50"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={thread.author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(thread.author?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.is_pinned && (
                        <Pin className="h-3.5 w-3.5 text-primary" />
                      )}
                      {thread.is_locked && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <h3 className="font-medium text-sm truncate">{thread.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{thread.author?.full_name || "Anonymous"}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Badge className={cn("text-xs shrink-0", categoryColors[thread.category])}>
                    {thread.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {thread.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {thread.replies_count} replies
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {thread.views_count} views
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
