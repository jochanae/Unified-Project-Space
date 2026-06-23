import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Youtube, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Json } from "@/integrations/supabase/types";

interface Chapter {
  title: string;
  timestamp: string;
}

interface AddVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
  isKids?: boolean;
}

const parseVideoUrl = (url: string): { video_id: string | null; video_type: string } => {
  if (!url) return { video_id: null, video_type: "youtube" };
  
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) return { video_id: match[1], video_type: "youtube" };
  }
  
  // Vimeo pattern
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { video_id: vimeoMatch[1], video_type: "vimeo" };
  
  return { video_id: null, video_type: "other" };
};

const getYoutubeThumbnail = (videoId: string) => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

const getDefaultForm = (editData: any, isKids: boolean) => ({
  title: editData?.title || "",
  description: editData?.description || "",
  content_url: editData?.content_url || "",
  thumbnail_url: editData?.thumbnail_url || "",
  video_id: editData?.video_id || "",
  video_type: editData?.video_type || "youtube",
  category: editData?.category || "budgeting",
  age_group: editData?.age_group || (isKids ? "kids" : "all"),
  duration_minutes: editData?.duration_minutes || 5,
  is_published: editData?.is_published ?? false,
  is_premium: editData?.is_premium ?? false,
  chapters: editData?.chapters || [],
});

export default function AddVideoModal({ open, onOpenChange, onSuccess, editData, isKids = false }: AddVideoModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => getDefaultForm(editData, isKids));
  const [chapters, setChapters] = useState<Chapter[]>(editData?.chapters || []);

  useEffect(() => {
    if (open) {
      setForm(getDefaultForm(editData, isKids));
      setChapters(editData?.chapters || []);
    }
  }, [open, editData, isKids]);

  const handleUrlChange = (url: string) => {
    const { video_id, video_type } = parseVideoUrl(url);
    setForm({ 
      ...form, 
      content_url: url,
      video_id: video_id || "",
      video_type,
      thumbnail_url: video_id && video_type === "youtube" 
        ? getYoutubeThumbnail(video_id) 
        : form.thumbnail_url
    });
  };

  const addChapter = () => {
    setChapters([...chapters, { title: "", timestamp: "0:00" }]);
  };

  const updateChapter = (index: number, field: keyof Chapter, value: string) => {
    const updated = [...chapters];
    updated[index] = { ...updated[index], [field]: value };
    setChapters(updated);
  };

  const removeChapter = (index: number) => {
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content_url) {
      toast.error("Title and video URL are required");
      return;
    }

    setLoading(true);
    try {
      const chaptersData = chapters.length > 0 
        ? chapters.map(c => ({ title: c.title, timestamp: c.timestamp })) as unknown as Json
        : null;

      const payload = {
        ...form,
        type: "video",
        duration_minutes: Number(form.duration_minutes),
        chapters: chaptersData,
      };

      if (editData?.id) {
        const { error } = await supabase.from("learning_content").update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Video updated");
      } else {
        const { error } = await supabase.from("learning_content").insert(payload);
        if (error) throw error;
        toast.success("Video added");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const videoPreview = form.video_id && form.video_type === "youtube";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit" : "Add"} Video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <Label>Video URL * (YouTube, Vimeo, etc.)</Label>
            <div className="flex gap-2">
              <Input
                value={form.content_url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1"
              />
              {form.video_type === "youtube" && form.video_id && (
                <div className="flex items-center gap-1 px-2 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400 text-xs">
                  <Youtube className="h-3 w-3" />
                  Detected
                </div>
              )}
            </div>
            {form.video_id && (
              <p className="text-xs text-muted-foreground mt-1">
                Video ID: {form.video_id} ({form.video_type})
              </p>
            )}
          </div>

          {/* Video Preview */}
          {videoPreview && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-black relative">
                  <iframe
                    src={`https://www.youtube.com/embed/${form.video_id}`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label>Thumbnail URL</Label>
            <Input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="Auto-generated for YouTube videos"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Chapters Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Video Chapters (Optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addChapter}>
                <Plus className="h-3 w-3 mr-1" /> Add Chapter
              </Button>
            </div>
            {chapters.length > 0 ? (
              <div className="space-y-2">
                {chapters.map((chapter, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="0:00"
                      value={chapter.timestamp}
                      onChange={(e) => updateChapter(index, "timestamp", e.target.value)}
                      className="w-20"
                    />
                    <Input
                      placeholder="Chapter title"
                      value={chapter.title}
                      onChange={(e) => updateChapter(index, "title", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeChapter(index)}
                      className="text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No chapters added. Add timestamps to help viewers navigate.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budgeting">Budgeting</SelectItem>
                  <SelectItem value="saving">Saving</SelectItem>
                  <SelectItem value="spending">Spending</SelectItem>
                  <SelectItem value="earning">Earning</SelectItem>
                  <SelectItem value="investing">Investing</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                  <SelectItem value="taxes">Taxes</SelectItem>
                  <SelectItem value="basics">Basics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Age Group</Label>
              <Select value={form.age_group} onValueChange={(v) => setForm({ ...form, age_group: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kids">Kids (Under 13)</SelectItem>
                  <SelectItem value="teens">Teens (13-17)</SelectItem>
                  <SelectItem value="adults">Adults (18+)</SelectItem>
                  <SelectItem value="all">All Ages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_premium} onCheckedChange={(v) => setForm({ ...form, is_premium: v })} />
              <Label>Premium</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editData ? "Update" : "Add"} Video
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
