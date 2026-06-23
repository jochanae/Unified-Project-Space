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
import { Loader2, Gamepad2, ExternalLink, Image } from "lucide-react";

interface AddGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

const getDefaultForm = (editData: any) => ({
  title: editData?.title || "",
  description: editData?.description || "",
  content_url: editData?.content_url || "",
  thumbnail_url: editData?.thumbnail_url || "",
  category: editData?.category || "budgeting",
  age_group: editData?.age_group || "kids",
  difficulty_level: editData?.difficulty_level || "beginner",
  duration_minutes: editData?.duration_minutes || 5,
  is_published: editData?.is_published ?? false,
  is_premium: editData?.is_premium ?? false,
});

export default function AddGameModal({ open, onOpenChange, onSuccess, editData }: AddGameModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => getDefaultForm(editData));

  useEffect(() => {
    if (open) {
      setForm(getDefaultForm(editData));
    }
  }, [open, editData]);

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        type: "game",
        duration_minutes: Number(form.duration_minutes),
      };

      if (editData?.id) {
        const { error } = await supabase.from("learning_content").update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Game updated");
      } else {
        const { error } = await supabase.from("learning_content").insert(payload);
        if (error) throw error;
        toast.success("Game added");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-pink-500" />
            {editData ? "Edit" : "Add"} Game
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Game Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Budget Builder"
            />
          </div>

          <div>
            <Label>Game URL (embed or link)</Label>
            <Input
              value={form.content_url}
              onChange={(e) => setForm({ ...form, content_url: e.target.value })}
              placeholder="https://..."
            />
            {form.content_url && isValidUrl(form.content_url) && (
              <a 
                href={form.content_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" /> Test game link
              </a>
            )}
          </div>

          <div>
            <Label>Thumbnail URL</Label>
            <Input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="https://..."
            />
            {form.thumbnail_url ? (
              <div className="mt-2">
                <img 
                  src={form.thumbnail_url} 
                  alt="Thumbnail preview" 
                  className="h-24 w-auto rounded-lg object-cover border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            ) : (
              <Card className="mt-2 border-dashed">
                <CardContent className="py-4 text-center text-muted-foreground">
                  <Image className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">Add a thumbnail URL to preview</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="A fun game that teaches kids about..."
              className="min-h-[80px]"
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
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
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
                  <SelectItem value="teens">Teens</SelectItem>
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
                  <SelectItem value="beginner">Easy</SelectItem>
                  <SelectItem value="intermediate">Medium</SelectItem>
                  <SelectItem value="advanced">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Play Time (min)</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
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
              {editData ? "Update" : "Add"} Game
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
