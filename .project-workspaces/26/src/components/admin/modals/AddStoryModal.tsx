import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, BookOpen, GripVertical } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface StoryChapter {
  title: string;
  content: string;
}

interface AddStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

const getDefaultForm = (editData: any) => ({
  title: editData?.title || "",
  description: editData?.description || "",
  content: editData?.content || "",
  thumbnail_url: editData?.thumbnail_url || "",
  category: editData?.category || "saving",
  age_group: editData?.age_group || "kids",
  duration_minutes: editData?.duration_minutes || 5,
  is_published: editData?.is_published ?? false,
});

export default function AddStoryModal({ open, onOpenChange, onSuccess, editData }: AddStoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => getDefaultForm(editData));
  const [useChapters, setUseChapters] = useState(false);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);

  useEffect(() => {
    if (open) {
      setForm(getDefaultForm(editData));
      // Load chapters if editing
      if (editData?.chapters && Array.isArray(editData.chapters)) {
        setChapters(editData.chapters as StoryChapter[]);
        setUseChapters(true);
      } else {
        setChapters([]);
        setUseChapters(false);
      }
    }
  }, [open, editData]);

  const addChapter = () => {
    setChapters([...chapters, { title: `Chapter ${chapters.length + 1}`, content: "" }]);
  };

  const updateChapter = (index: number, field: keyof StoryChapter, value: string) => {
    const updated = [...chapters];
    updated[index][field] = value;
    setChapters(updated);
  };

  const removeChapter = (index: number) => {
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const getTotalWordCount = () => {
    if (useChapters) {
      return chapters.reduce((acc, ch) => acc + getWordCount(ch.content), 0);
    }
    return getWordCount(form.content);
  };

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error("Title is required");
      return;
    }

    if (useChapters && chapters.length === 0) {
      toast.error("Add at least one chapter");
      return;
    }

    if (!useChapters && !form.content) {
      toast.error("Story content is required");
      return;
    }

    setLoading(true);
    try {
      const combinedContent = useChapters 
        ? chapters.map((ch, i) => `## ${ch.title}\n\n${ch.content}`).join("\n\n---\n\n")
        : form.content;

      const payload = {
        ...form,
        content: combinedContent,
        type: "story",
        duration_minutes: Number(form.duration_minutes),
        chapters: useChapters ? (chapters as unknown as Json) : null,
      };

      if (editData?.id) {
        const { error } = await supabase.from("learning_content").update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Story updated");
      } else {
        const { error } = await supabase.from("learning_content").insert(payload);
        if (error) throw error;
        toast.success("Story created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit" : "Add"} Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Story Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., The Piggy Bank Adventure"
            />
          </div>

          <div>
            <Label>Short Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="A fun story about saving money"
            />
          </div>

          <div>
            <Label>Cover Image URL</Label>
            <Input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="https://..."
            />
            {form.thumbnail_url && (
              <div className="mt-2">
                <img 
                  src={form.thumbnail_url} 
                  alt="Cover preview" 
                  className="h-24 w-auto rounded-lg object-cover border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
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
                  <SelectItem value="saving">Saving</SelectItem>
                  <SelectItem value="spending">Spending</SelectItem>
                  <SelectItem value="earning">Earning</SelectItem>
                  <SelectItem value="sharing">Sharing</SelectItem>
                  <SelectItem value="budgeting">Budgeting</SelectItem>
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
                  <SelectItem value="kids">Kids (5-9)</SelectItem>
                  <SelectItem value="tweens">Tweens (10-12)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Read Time (min)</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Chapter Toggle */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Switch 
              checked={useChapters} 
              onCheckedChange={setUseChapters}
              id="chapter-mode"
            />
            <Label htmlFor="chapter-mode" className="cursor-pointer">
              <span className="font-medium">Multi-chapter story</span>
              <p className="text-xs text-muted-foreground">Break your story into chapters for easier reading</p>
            </Label>
          </div>

          {useChapters ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Story Chapters ({chapters.length})
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addChapter}>
                  <Plus className="h-4 w-4 mr-1" /> Add Chapter
                </Button>
              </div>
              
              {chapters.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No chapters yet. Click "Add Chapter" to start.</p>
                  </CardContent>
                </Card>
              )}

              {chapters.map((chapter, index) => (
                <Card key={index} className="border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={chapter.title}
                        onChange={(e) => updateChapter(index, 'title', e.target.value)}
                        placeholder="Chapter title"
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeChapter(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={chapter.content}
                      onChange={(e) => updateChapter(index, 'content', e.target.value)}
                      placeholder="Once upon a time..."
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {getWordCount(chapter.content)} words
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div>
              <Label>Story Content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="min-h-[250px]"
                placeholder="Once upon a time..."
              />
            </div>
          )}

          {/* Word count summary */}
          <div className="text-sm text-muted-foreground">
            Total: {getTotalWordCount()} words • ~{Math.ceil(getTotalWordCount() / 200)} min read
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            <Label>Published</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editData ? "Update" : "Create"} Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
