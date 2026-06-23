import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Lightbulb, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface FinancialTip {
  id: string;
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  publish_date: string | null;
  created_at: string;
}

const categories = ["general", "budgeting", "saving", "investing", "credit", "debt", "taxes", "retirement"];

export default function FinancialTipsManager() {
  const { user } = useAuth();
  const [tips, setTips] = useState<FinancialTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<FinancialTip | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    is_published: false,
    publish_date: "",
  });

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    const { data, error } = await supabase
      .from("financial_tips")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setTips(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    const tipData = {
      title: formData.title,
      content: formData.content,
      category: formData.category,
      is_published: formData.is_published,
      publish_date: formData.publish_date || null,
      created_by: user?.id,
    };

    if (editingTip) {
      const { error } = await supabase
        .from("financial_tips")
        .update(tipData)
        .eq("id", editingTip.id);

      if (error) {
        toast.error("Failed to update tip");
        return;
      }
      toast.success("Tip updated!");
    } else {
      const { error } = await supabase.from("financial_tips").insert(tipData);

      if (error) {
        toast.error("Failed to create tip");
        return;
      }
      toast.success("Tip created!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchTips();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tip?")) return;

    const { error } = await supabase.from("financial_tips").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete tip");
      return;
    }

    toast.success("Tip deleted");
    fetchTips();
  };

  const openEditDialog = (tip: FinancialTip) => {
    setEditingTip(tip);
    setFormData({
      title: tip.title,
      content: tip.content,
      category: tip.category,
      is_published: tip.is_published,
      publish_date: tip.publish_date || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTip(null);
    setFormData({
      title: "",
      content: "",
      category: "general",
      is_published: false,
      publish_date: "",
    });
  };

  const filteredTips = tips.filter(
    (tip) =>
      tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tip.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Tip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTip ? "Edit Tip" : "Add New Tip"}</DialogTitle>
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
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Published</Label>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTip ? "Update Tip" : "Create Tip"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{tips.length}</div>
            <div className="text-xs text-muted-foreground">Total Tips</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{tips.filter((t) => t.is_published).length}</div>
            <div className="text-xs text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{tips.filter((t) => !t.is_published).length}</div>
            <div className="text-xs text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{new Set(tips.map((t) => t.category)).size}</div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Tips List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredTips.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No tips found" : "No tips yet. Create your first one!"}
            </CardContent>
          </Card>
        ) : (
          filteredTips.map((tip) => (
            <Card key={tip.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{tip.title}</h3>
                      <Badge variant={tip.is_published ? "default" : "secondary"}>
                        {tip.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{tip.content}</p>
                    <div className="text-xs text-muted-foreground mt-2">Category: {tip.category}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(tip)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tip.id)} className="text-destructive">
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
