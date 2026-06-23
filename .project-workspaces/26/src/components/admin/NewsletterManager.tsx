import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Video, Image, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  is_published: boolean;
  priority: number;
  published_at: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "news", label: "Financial News", emoji: "📰" },
  { value: "markets", label: "Markets", emoji: "📈" },
  { value: "savings", label: "Savings Tips", emoji: "💰" },
  { value: "credit", label: "Credit", emoji: "💳" },
  { value: "investing", label: "Investing", emoji: "📊" },
  { value: "updates", label: "App Updates", emoji: "🚀" },
  { value: "tips", label: "Money Tips", emoji: "💡" },
];

export default function NewsletterManager() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsletterItem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "",
    category: "news",
    source: "",
    image_url: "",
    video_url: "",
    external_link: "",
    is_featured: false,
    is_published: false,
    priority: 0,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["newsletter-items-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_items")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsletterItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("newsletter_items").insert({
        ...data,
        published_at: data.is_published ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-items-admin"] });
      toast.success("Newsletter item created");
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("newsletter_items")
        .update({
          ...data,
          published_at: data.is_published && !editingItem?.published_at 
            ? new Date().toISOString() 
            : editingItem?.published_at,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-items-admin"] });
      toast.success("Newsletter item updated");
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("newsletter_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-items-admin"] });
      toast.success("Newsletter item deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("newsletter_items")
        .update({ 
          is_published, 
          published_at: is_published ? new Date().toISOString() : null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-items-admin"] });
      toast.success("Status updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      title: "",
      summary: "",
      content: "",
      category: "news",
      source: "",
      image_url: "",
      video_url: "",
      external_link: "",
      is_featured: false,
      is_published: false,
      priority: 0,
    });
    setEditingItem(null);
    setIsOpen(false);
  };

  const handleEdit = (item: NewsletterItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      summary: item.summary,
      content: item.content || "",
      category: item.category,
      source: item.source || "",
      image_url: item.image_url || "",
      video_url: item.video_url || "",
      external_link: item.external_link || "",
      is_featured: item.is_featured,
      is_published: item.is_published,
      priority: item.priority,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getCategoryInfo = (category: string) => 
    CATEGORIES.find(c => c.value === category) || { label: category, emoji: "📄" };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading newsletter..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guidelines Section */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-primary mb-2">📋 Content Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Title</p>
            <p>Keep titles concise: 8-12 words max. Make it attention-grabbing!</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Summary</p>
            <p>2-3 sentences (40-60 words). This shows in the preview card.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Full Content</p>
            <p>150-300 words ideal. Use bullet points and bold text for readability.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Categories</p>
            <p>📰 News • 📈 Markets • 💰 Savings • 💳 Credit • 📊 Investing • 🚀 Updates • 💡 Tips</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-primary/20 text-xs text-muted-foreground">
          <strong>Pro Tips:</strong> Add images/videos for visual appeal • Set Priority higher to pin items to top • Feature important items with the ⭐ toggle
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Newsletter & News Feed</h2>
          <p className="text-sm text-muted-foreground">
            Manage financial news, tips, and updates shown to users
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Newsletter Item" : "Create Newsletter Item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Breaking: Federal Reserve Announces..."
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Summary *</Label>
                  <Textarea
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Brief summary shown in the card..."
                    rows={2}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Full Content (shown when expanded)</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Full article content..."
                    rows={5}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.emoji} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Bloomberg, CNBC, etc."
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Video URL</Label>
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="YouTube or video link"
                  />
                </div>
                <div>
                  <Label>External Link</Label>
                  <Input
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Priority (higher = top)</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2 flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label>Featured</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                    <Label>Published</Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No newsletter items yet. Create your first one!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const catInfo = getCategoryInfo(item.category);
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{catInfo.emoji}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {catInfo.label}
                      </span>
                      {item.is_featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {item.video_url && <Video className="h-4 w-4 text-purple-500" />}
                      {item.image_url && <Image className="h-4 w-4 text-blue-500" />}
                      {item.external_link && <ExternalLink className="h-4 w-4 text-green-500" />}
                    </div>
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.summary}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {item.source && <span>Source: {item.source}</span>}
                      <span>•</span>
                      <span>{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => togglePublishMutation.mutate({ 
                        id: item.id, 
                        is_published: !item.is_published 
                      })}
                    >
                      {item.is_published ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}