import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SupportPageManager() {
  const [donationLinks, setDonationLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    platform: "other",
    description: "",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchDonationLinks();
  }, []);

  const fetchDonationLinks = async () => {
    const { data } = await supabase.from("donation_links").select("*").order("display_order", { ascending: true });
    if (data) setDonationLinks(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditData(null);
    setForm({ name: "", url: "", platform: "other", description: "", display_order: donationLinks.length, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (link: any) => {
    setEditData(link);
    setForm({
      name: link.name,
      url: link.url,
      platform: link.platform,
      description: link.description || "",
      display_order: link.display_order,
      is_active: link.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.url) {
      toast.error("Name and URL are required");
      return;
    }

    setSaving(true);
    try {
      if (editData?.id) {
        const { error } = await supabase.from("donation_links").update(form).eq("id", editData.id);
        if (error) throw error;
        toast.success("Link updated");
      } else {
        const { error } = await supabase.from("donation_links").insert(form);
        if (error) throw error;
        toast.success("Link created");
      }
      fetchDonationLinks();
      setModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this donation link?")) return;
    await supabase.from("donation_links").delete().eq("id", id);
    setDonationLinks(donationLinks.filter((l) => l.id !== id));
    toast.success("Link deleted");
  };

  const toggleActive = async (id: string, status: boolean) => {
    await supabase.from("donation_links").update({ is_active: !status }).eq("id", id);
    setDonationLinks(donationLinks.map((l) => (l.id === id ? { ...l, is_active: !status } : l)));
    toast.success("Updated");
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "stripe": return "💳";
      case "paypal": return "🅿️";
      case "cash_app": return "💵";
      case "venmo": return "💙";
      case "gofundme": return "💚";
      default: return "🔗";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-primary mb-2">📋 Support Page Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage donation links that appear on the Support page. Users will see these options when they want to contribute to CoinsBloom.
        </p>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Donation Links</h3>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Link
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-center py-8">Loading...</div>
      ) : donationLinks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No donation links yet. Add your first one!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {donationLinks.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-2xl">{getPlatformIcon(link.platform)}</span>
                <div className="flex-1">
                  <h3 className="font-medium">{link.name}</h3>
                  <p className="text-muted-foreground text-sm truncate">{link.url}</p>
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Switch checked={link.is_active} onCheckedChange={() => toggleActive(link.id, link.is_active)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(link)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(link.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editData ? "Edit" : "Add"} Donation Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Support via Stripe"
              />
            </div>

            <div>
              <Label>URL *</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="cash_app">Cash App</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="gofundme">GoFundMe</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editData ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
