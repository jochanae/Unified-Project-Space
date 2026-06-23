import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Video, FileText, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Content {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  thumbnail_url: string | null;
  content_url: string | null;
  video_id: string | null;
  is_published: boolean;
}

interface PartnerContentManagerProps {
  partnerId: string;
}

export function PartnerContentManager({ partnerId }: PartnerContentManagerProps) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "video",
    category: "general",
    thumbnail_url: "",
    content_url: "",
    video_id: "",
    is_published: false,
  });

  useEffect(() => {
    fetchContent();
  }, [partnerId]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("learning_content")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const contentData = {
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        category: formData.category || null,
        thumbnail_url: formData.thumbnail_url || null,
        content_url: formData.content_url || null,
        video_id: formData.video_id || null,
        is_published: formData.is_published,
      };

      if (editingContent) {
        const { error } = await supabase
          .from("learning_content")
          .update({ ...contentData, updated_at: new Date().toISOString() })
          .eq("id", editingContent.id);

        if (error) throw error;
        toast.success("Content updated");
      } else {
        const { error } = await supabase
          .from("learning_content")
          .insert({ ...contentData, partner_id: partnerId });

        if (error) throw error;
        toast.success("Content created");
      }

      setDialogOpen(false);
      resetForm();
      fetchContent();
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;

    try {
      const { error } = await supabase.from("learning_content").delete().eq("id", id);
      if (error) throw error;
      toast.success("Content deleted");
      fetchContent();
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete content");
    }
  };

  const togglePublished = async (item: Content) => {
    try {
      const { error } = await supabase
        .from("learning_content")
        .update({ is_published: !item.is_published })
        .eq("id", item.id);

      if (error) throw error;
      setContent(content.map((c) => 
        c.id === item.id ? { ...c, is_published: !c.is_published } : c
      ));
      toast.success(item.is_published ? "Content unpublished" : "Content published");
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update content");
    }
  };

  const openEditDialog = (item: Content) => {
    setEditingContent(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      type: item.type,
      category: item.category || "general",
      thumbnail_url: item.thumbnail_url || "",
      content_url: item.content_url || "",
      video_id: item.video_id || "",
      is_published: item.is_published,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContent(null);
    setFormData({
      title: "",
      description: "",
      type: "video",
      category: "general",
      thumbnail_url: "",
      content_url: "",
      video_id: "",
      is_published: false,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "game":
        return <Gamepad2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredContent = content.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="md" text="Loading content..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContent ? "Edit Content" : "Add Content"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Content title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="lesson">Lesson</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="game">Game</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="budgeting">Budgeting</SelectItem>
                      <SelectItem value="saving">Saving</SelectItem>
                      <SelectItem value="investing">Investing</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Video ID / Content URL</Label>
                <Input
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  placeholder="YouTube video ID or URL"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Published</Label>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingContent ? "Update" : "Add"} Content
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No content found. Add your first content above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredContent.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                        {getTypeIcon(item.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{item.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_published}
                      onCheckedChange={() => togglePublished(item)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
