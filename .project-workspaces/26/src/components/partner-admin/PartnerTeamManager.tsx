import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Star, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Professional {
  id: string;
  name: string;
  title: string | null;
  specialty: string | null;
  bio: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  website_url: string | null;
  calendar_url: string | null;
  is_featured: boolean;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  review_count: number;
}

interface PartnerTeamManagerProps {
  partnerId: string;
}

export function PartnerTeamManager({ partnerId }: PartnerTeamManagerProps) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    specialty: "",
    bio: "",
    contact_email: "",
    website_url: "",
    calendar_url: "",
    is_featured: false,
    is_verified: false,
    is_active: true,
  });

  useEffect(() => {
    fetchProfessionals();
  }, [partnerId]);

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      if (editingProfessional) {
        const { error } = await supabase
          .from("professionals")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingProfessional.id);

        if (error) throw error;
        toast.success("Team member updated");
      } else {
        const { error } = await supabase
          .from("professionals")
          .insert({
            ...formData,
            partner_id: partnerId,
          });

        if (error) throw error;
        toast.success("Team member added");
      }

      setDialogOpen(false);
      resetForm();
      fetchProfessionals();
    } catch (error) {
      console.error("Error saving professional:", error);
      toast.error("Failed to save team member");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;

    try {
      const { error } = await supabase
        .from("professionals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Team member removed");
      fetchProfessionals();
    } catch (error) {
      console.error("Error deleting professional:", error);
      toast.error("Failed to remove team member");
    }
  };

  const openEditDialog = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      title: professional.title || "",
      specialty: professional.specialty || "",
      bio: professional.bio || "",
      contact_email: professional.contact_email || "",
      website_url: professional.website_url || "",
      calendar_url: professional.calendar_url || "",
      is_featured: professional.is_featured,
      is_verified: professional.is_verified,
      is_active: professional.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProfessional(null);
    setFormData({
      name: "",
      title: "",
      specialty: "",
      bio: "",
      contact_email: "",
      website_url: "",
      calendar_url: "",
      is_featured: false,
      is_verified: false,
      is_active: true,
    });
  };

  const filteredProfessionals = professionals.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="md" text="Loading team..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
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
                {editingProfessional ? "Edit Team Member" : "Add Team Member"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Financial Advisor"
                />
              </div>
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Input
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Retirement Planning"
                />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Calendar URL</Label>
                <Input
                  value={formData.calendar_url}
                  onChange={(e) => setFormData({ ...formData, calendar_url: e.target.value })}
                  placeholder="https://calendly.com/..."
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Verified</Label>
                <Switch
                  checked={formData.is_verified}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingProfessional ? "Update" : "Add"} Team Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team List */}
      {filteredProfessionals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No team members found. Add your first team member above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProfessionals.map((professional) => (
            <Card key={professional.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={professional.avatar_url || undefined} />
                    <AvatarFallback>
                      {professional.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{professional.name}</h3>
                      {professional.is_verified && (
                        <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                      {professional.is_featured && (
                        <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    {professional.title && (
                      <p className="text-sm text-muted-foreground">{professional.title}</p>
                    )}
                    {professional.specialty && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {professional.specialty}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(professional)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(professional.id)}
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
