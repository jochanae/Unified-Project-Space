import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Info, Sparkles, AlertCircle, Gift, Star, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Highlight {
  id: string;
  partner_id: string | null;
  title: string;
  content: string;
  icon: string | null;
  color_variant: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

const iconOptions = [
  { value: "info", label: "Info", icon: Info },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "alert", label: "Alert", icon: AlertCircle },
  { value: "gift", label: "Gift", icon: Gift },
  { value: "star", label: "Star", icon: Star },
];

const colorOptions = [
  { value: "default", label: "Default (Gray)" },
  { value: "primary", label: "Primary (Brand)" },
  { value: "success", label: "Success (Green)" },
  { value: "warning", label: "Warning (Amber)" },
  { value: "info", label: "Info (Blue)" },
];

interface DashboardHighlightsManagerProps {
  partnerId?: string | null; // null = global (CoinsBloom admin)
}

export default function DashboardHighlightsManager({ partnerId }: DashboardHighlightsManagerProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    icon: "info",
    color_variant: "default",
    is_active: true,
    starts_at: "",
    ends_at: "",
  });

  useEffect(() => {
    fetchHighlights();
  }, [partnerId]);

  const fetchHighlights = async () => {
    let query = supabase
      .from("dashboard_highlights")
      .select("*")
      .order("display_order", { ascending: true });

    if (partnerId) {
      query = query.eq("partner_id", partnerId);
    } else {
      query = query.is("partner_id", null);
    }

    const { data, error } = await query;

    if (data) setHighlights(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    const highlightData = {
      title: formData.title,
      content: formData.content,
      icon: formData.icon,
      color_variant: formData.color_variant,
      is_active: formData.is_active,
      starts_at: formData.starts_at || null,
      ends_at: formData.ends_at || null,
      partner_id: partnerId || null,
      display_order: editingHighlight ? editingHighlight.display_order : highlights.length,
    };

    if (editingHighlight) {
      const { error } = await supabase
        .from("dashboard_highlights")
        .update(highlightData)
        .eq("id", editingHighlight.id);

      if (error) {
        toast.error("Failed to update highlight");
        return;
      }
      toast.success("Highlight updated!");
    } else {
      const { error } = await supabase.from("dashboard_highlights").insert(highlightData);

      if (error) {
        toast.error("Failed to create highlight");
        return;
      }
      toast.success("Highlight created!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchHighlights();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this highlight?")) return;

    const { error } = await supabase.from("dashboard_highlights").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete highlight");
      return;
    }

    toast.success("Highlight deleted");
    fetchHighlights();
  };

  const handleToggleActive = async (highlight: Highlight) => {
    const { error } = await supabase
      .from("dashboard_highlights")
      .update({ is_active: !highlight.is_active })
      .eq("id", highlight.id);

    if (error) {
      toast.error("Failed to update highlight");
      return;
    }

    fetchHighlights();
  };

  const openEditDialog = (highlight: Highlight) => {
    setEditingHighlight(highlight);
    setFormData({
      title: highlight.title,
      content: highlight.content,
      icon: highlight.icon || "info",
      color_variant: highlight.color_variant || "default",
      is_active: highlight.is_active,
      starts_at: highlight.starts_at ? format(new Date(highlight.starts_at), "yyyy-MM-dd'T'HH:mm") : "",
      ends_at: highlight.ends_at ? format(new Date(highlight.ends_at), "yyyy-MM-dd'T'HH:mm") : "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingHighlight(null);
    setFormData({
      title: "",
      content: "",
      icon: "info",
      color_variant: "default",
      is_active: true,
      starts_at: "",
      ends_at: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Dashboard Highlights</h3>
          <p className="text-sm text-muted-foreground">
            {partnerId ? "Highlights shown to your customers on their dashboard" : "Global highlights shown to all users"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Highlight
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingHighlight ? "Edit Highlight" : "Add New Highlight"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., New Feature Available!"
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Brief description of the highlight..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon</Label>
                  <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <Select value={formData.color_variant} onValueChange={(v) => setFormData({ ...formData, color_variant: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingHighlight ? "Update Highlight" : "Create Highlight"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Highlights List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : highlights.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No highlights yet. Add one to show important info on user dashboards.
            </CardContent>
          </Card>
        ) : (
          highlights.map((highlight) => {
            const IconComponent = iconOptions.find(i => i.value === highlight.icon)?.icon || Info;
            return (
              <Card key={highlight.id} className={highlight.is_active ? "" : "opacity-50"}>
                <CardContent className="p-4 flex items-center gap-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <IconComponent className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{highlight.title}</h4>
                      <Badge variant={highlight.is_active ? "default" : "secondary"} className="text-xs">
                        {highlight.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{highlight.content}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={highlight.is_active}
                      onCheckedChange={() => handleToggleActive(highlight)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(highlight)} className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(highlight.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
