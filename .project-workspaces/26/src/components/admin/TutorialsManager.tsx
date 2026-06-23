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
import { Plus, Edit2, Trash2, BookOpen, Search, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  category: string;
  difficulty_level: string;
  duration_minutes: number | null;
  is_published: boolean;
  display_order: number;
  view_count: number;
  created_at: string;
}

const categories = ["getting-started", "budgeting", "saving", "investing", "credit", "advanced"];
const difficulties = ["beginner", "intermediate", "advanced"];

export default function TutorialsManager() {
  const { user } = useAuth();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    video_url: "",
    thumbnail_url: "",
    category: "getting-started",
    difficulty_level: "beginner",
    duration_minutes: "",
    is_published: false,
    display_order: 0,
  });

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    const { data, error } = await supabase
      .from("tutorials")
      .select("*")
      .order("display_order", { ascending: true });

    if (data) setTutorials(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    const tutorialData = {
      title: formData.title,
      description: formData.description || null,
      content: formData.content || null,
      video_url: formData.video_url || null,
      thumbnail_url: formData.thumbnail_url || null,
      category: formData.category,
      difficulty_level: formData.difficulty_level,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      is_published: formData.is_published,
      display_order: formData.display_order,
      created_by: user?.id,
    };

    if (editingTutorial) {
      const { error } = await supabase
        .from("tutorials")
        .update(tutorialData)
        .eq("id", editingTutorial.id);

      if (error) {
        toast.error("Failed to update tutorial");
        return;
      }
      toast.success("Tutorial updated!");
    } else {
      const { error } = await supabase.from("tutorials").insert(tutorialData);

      if (error) {
        toast.error("Failed to create tutorial");
        return;
      }
      toast.success("Tutorial created!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchTutorials();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tutorial?")) return;

    const { error } = await supabase.from("tutorials").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete tutorial");
      return;
    }

    toast.success("Tutorial deleted");
    fetchTutorials();
  };

  const openEditDialog = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title: tutorial.title,
      description: tutorial.description || "",
      content: tutorial.content || "",
      video_url: tutorial.video_url || "",
      thumbnail_url: tutorial.thumbnail_url || "",
      category: tutorial.category,
      difficulty_level: tutorial.difficulty_level,
      duration_minutes: tutorial.duration_minutes?.toString() || "",
      is_published: tutorial.is_published,
      display_order: tutorial.display_order,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTutorial(null);
    setFormData({
      title: "",
      description: "",
      content: "",
      video_url: "",
      thumbnail_url: "",
      category: "getting-started",
      difficulty_level: "beginner",
      duration_minutes: "",
      is_published: false,
      display_order: tutorials.length,
    });
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "intermediate":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "advanced":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredTutorials = tutorials.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Tutorial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTutorial ? "Edit Tutorial" : "Add New Tutorial"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
                <Label>Content (Markdown)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
              <div>
                <Label>Video URL (optional)</Label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
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
                          {cat.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({ ...formData, difficulty_level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map((diff) => (
                        <SelectItem key={diff} value={diff}>
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {editingTutorial ? "Update Tutorial" : "Create Tutorial"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tutorial List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredTutorials.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No tutorials found" : "No tutorials yet"}
            </CardContent>
          </Card>
        ) : (
          filteredTutorials.map((tutorial, index) => (
            <Card key={tutorial.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="text-muted-foreground cursor-move">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{tutorial.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(tutorial.difficulty_level)}`}>
                      {tutorial.difficulty_level}
                    </span>
                    {!tutorial.is_published && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Draft</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{tutorial.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(tutorial)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(tutorial.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
