import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Video, Search, Eye, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface VideoContent {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  thumbnail_url: string | null;
  category: string;
  age_group: string | null;
  duration_minutes: number | null;
  is_published: boolean;
  sort_order: number | null;
  view_count: number;
  created_at: string;
  is_featured: boolean;
  featured_order: number | null;
}

const categories = ["budgeting", "saving", "investing", "credit", "debt", "taxes", "retirement", "insurance", "real_estate", "general"];

export default function VideosManager() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoContent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content_url: "",
    thumbnail_url: "",
    category: "general",
    duration_minutes: "",
    is_published: false,
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from("learning_content")
      .select("id, title, description, content_url, thumbnail_url, category, duration_minutes, is_published, sort_order, view_count, created_at, age_group, is_featured, featured_order")
      .eq("type", "video")
      .in("age_group", ["adults", "all"])
      .order("featured_order", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (data) setVideos(data as VideoContent[]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    const videoData = {
      title: formData.title,
      description: formData.description || null,
      content_url: formData.content_url || null,
      thumbnail_url: formData.thumbnail_url || null,
      category: formData.category,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      is_published: formData.is_published,
      type: "video",
      created_by: user?.id,
    };

    if (editingVideo) {
      const { error } = await supabase
        .from("learning_content")
        .update(videoData)
        .eq("id", editingVideo.id);

      if (error) {
        toast.error("Failed to update video");
        return;
      }
      toast.success("Video updated!");
    } else {
      const { error } = await supabase.from("learning_content").insert(videoData);

      if (error) {
        toast.error("Failed to create video");
        return;
      }
      toast.success("Video created!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchVideos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    const { error } = await supabase.from("learning_content").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete video");
      return;
    }

    toast.success("Video deleted");
    fetchVideos();
  };

  const handleToggleFeatured = async (video: VideoContent) => {
    const newFeaturedStatus = !video.is_featured;
    
    // Get the next featured_order if adding to featured
    let nextOrder: number | null = null;
    if (newFeaturedStatus) {
      const featuredVideos = videos.filter(v => v.is_featured);
      nextOrder = featuredVideos.length + 1;
    }

    const { error } = await supabase
      .from("learning_content")
      .update({ 
        is_featured: newFeaturedStatus,
        featured_order: newFeaturedStatus ? nextOrder : null
      })
      .eq("id", video.id);

    if (error) {
      toast.error("Failed to update featured status");
      return;
    }

    toast.success(newFeaturedStatus 
      ? `"${video.title}" added to Featured Carousel` 
      : `"${video.title}" removed from Featured Carousel`
    );
    fetchVideos();
  };

  const openEditDialog = (video: VideoContent) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || "",
      content_url: video.content_url || "",
      thumbnail_url: video.thumbnail_url || "",
      category: video.category,
      duration_minutes: video.duration_minutes?.toString() || "",
      is_published: video.is_published,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingVideo(null);
    setFormData({
      title: "",
      description: "",
      content_url: "",
      thumbnail_url: "",
      category: "general",
      duration_minutes: "",
      is_published: false,
    });
  };

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredVideos = videos.filter(v => v.is_featured);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingVideo ? "Edit Video" : "Add New Video"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Video URL (YouTube or Vimeo)</Label>
                <Input
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste full YouTube or Vimeo URL
                </p>
              </div>
              <div>
                <Label>Thumbnail URL (optional)</Label>
                <Input
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="Auto-generated from YouTube if left empty"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Published</Label>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingVideo ? "Update Video" : "Create Video"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Featured Videos Banner */}
      {featuredVideos.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 dark:border-amber-700">
          <CardContent className="p-4 flex items-center gap-4">
            <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Dashboard Featured Carousel</p>
              <p className="font-semibold">{featuredVideos.length} video{featuredVideos.length !== 1 ? 's' : ''} in rotation</p>
            </div>
            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
              Max 5 videos
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{videos.length}</div>
            <div className="text-xs text-muted-foreground">Total Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{videos.filter((v) => v.is_published).length}</div>
            <div className="text-xs text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{videos.reduce((acc, v) => acc + (v.view_count || 0), 0)}</div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </CardContent>
        </Card>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredVideos.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            {searchQuery ? "No videos found" : "No videos yet"}
          </div>
        ) : (
          filteredVideos.map((video) => (
            <Card key={video.id} className={`overflow-hidden ${video.is_featured ? 'ring-2 ring-amber-400' : ''}`}>
              <div className="aspect-video bg-muted relative">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {video.duration_minutes && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                    {video.duration_minutes} min
                  </span>
                )}
                {video.is_featured && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-amber-500 text-white gap-1">
                      <Star className="h-3 w-3 fill-white" /> Featured #{video.featured_order}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium truncate">{video.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{video.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {video.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {video.view_count}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggleFeatured(video)} 
                      className={`h-8 w-8 ${video.is_featured ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
                      title={video.is_featured ? "Remove from Featured" : "Add to Featured Carousel"}
                      disabled={!video.is_featured && featuredVideos.length >= 5}
                    >
                      <Star className={`h-4 w-4 ${video.is_featured ? 'fill-amber-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(video)} className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(video.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
