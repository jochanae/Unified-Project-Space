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
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Json } from "@/integrations/supabase/types";

interface Chapter {
  title: string;
  content: string;
}

interface AddLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
  isKids?: boolean;
}

const getDefaultForm = (editData: any, isKids: boolean) => ({
  title: editData?.title || "",
  description: editData?.description || "",
  content: editData?.content || "",
  category: editData?.category || "budgeting",
  age_group: editData?.age_group || (isKids ? "kids" : "all"),
  difficulty_level: editData?.difficulty_level || "beginner",
  duration_minutes: editData?.duration_minutes || 10,
  is_published: editData?.is_published ?? false,
  is_premium: editData?.is_premium ?? false,
  thumbnail_url: editData?.thumbnail_url || "",
});

export default function AddLessonModal({ open, onOpenChange, onSuccess, editData, isKids = false }: AddLessonModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => getDefaultForm(editData, isKids));
  const [chapters, setChapters] = useState<Chapter[]>(editData?.chapters || []);
  const [useChapters, setUseChapters] = useState(!!editData?.chapters?.length);

  useEffect(() => {
    if (open) {
      setForm(getDefaultForm(editData, isKids));
      setChapters(editData?.chapters || []);
      setUseChapters(!!editData?.chapters?.length);
    }
  }, [open, editData, isKids]);

  const addChapter = () => {
    setChapters([...chapters, { title: `Chapter ${chapters.length + 1}`, content: "" }]);
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
    if (!form.title) {
      toast.error("Title is required");
      return;
    }

    if (useChapters && chapters.length === 0) {
      toast.error("Add at least one chapter or disable multi-chapter mode");
      return;
    }

    if (!useChapters && !form.content) {
      toast.error("Lesson content is required");
      return;
    }

    setLoading(true);
    try {
      const chaptersData = useChapters && chapters.length > 0 
        ? chapters.map(c => ({ title: c.title, content: c.content })) as unknown as Json
        : null;

      const payload = {
        ...form,
        type: "lesson",
        duration_minutes: Number(form.duration_minutes),
        chapters: chaptersData,
        content: useChapters ? chapters.map(c => c.content).join("\n\n") : form.content,
      };

      if (editData?.id) {
        const { error } = await supabase.from("learning_content").update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Lesson updated");
      } else {
        const { error } = await supabase.from("learning_content").insert(payload);
        if (error) throw error;
        toast.success("Lesson created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const totalWordCount = useChapters 
    ? chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).filter(Boolean).length, 0)
    : form.content.split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit" : "Add"} Lesson</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Introduction to Budgeting"
            />
          </div>

          <div>
            <Label>Short Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief summary shown in listings"
            />
          </div>

          <div>
            <Label>Thumbnail URL</Label>
            <Input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty_level} onValueChange={(v) => setForm({ ...form, difficulty_level: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Multi-chapter toggle */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Multi-Chapter Lesson</Label>
                  <p className="text-sm text-muted-foreground">Split content into navigable chapters</p>
                </div>
                <Switch checked={useChapters} onCheckedChange={setUseChapters} />
              </div>
            </CardContent>
          </Card>

          {useChapters ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base">Chapters</Label>
                  <span className={`ml-2 text-xs ${totalWordCount >= 300 ? "text-emerald-600" : "text-amber-600"}`}>
                    {totalWordCount} total words
                  </span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addChapter}>
                  <Plus className="h-3 w-3 mr-1" /> Add Chapter
                </Button>
              </div>
              
              {chapters.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <p>No chapters yet. Click "Add Chapter" to create your first chapter.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {chapters.map((chapter, index) => (
                    <Card key={index}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Input
                            value={chapter.title}
                            onChange={(e) => updateChapter(index, "title", e.target.value)}
                            placeholder="Chapter title"
                            className="flex-1 font-medium"
                          />
                          <span className="text-xs text-muted-foreground">
                            {chapter.content.split(/\s+/).filter(Boolean).length} words
                          </span>
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
                        <Textarea
                          value={chapter.content}
                          onChange={(e) => updateChapter(index, "content", e.target.value)}
                          placeholder="Chapter content..."
                          className="min-h-[120px]"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Lesson Content *</Label>
                <span className={`text-xs ${totalWordCount >= 300 ? "text-emerald-600" : "text-amber-600"}`}>
                  {totalWordCount} words {totalWordCount >= 300 ? "✓" : "(aim for ~324)"}
                </span>
              </div>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="min-h-[300px]"
                placeholder="Write the full lesson content here (aim for ~324 words)..."
              />
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
              <Label>Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_premium}
                onCheckedChange={(v) => setForm({ ...form, is_premium: v })}
              />
              <Label>Premium Only</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editData ? "Update" : "Create"} Lesson
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
