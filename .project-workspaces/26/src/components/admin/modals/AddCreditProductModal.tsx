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
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

interface AddCreditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

export default function AddCreditProductModal({ open, onOpenChange, onSuccess, editData }: AddCreditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    issuer: "",
    product_type: "credit_card",
    category: "credit_cards",
    apr_range: "",
    annual_fee: 0,
    rewards_description: "",
    affiliate_url: "",
    image_url: "",
    rating: 4,
    is_active: true,
    is_featured: false,
  });

  // Reset form when editData changes or modal opens
  useEffect(() => {
    if (open) {
      setForm({
        name: editData?.name || "",
        issuer: editData?.issuer || "",
        product_type: editData?.product_type || "credit_card",
        category: editData?.category || "credit_cards",
        apr_range: editData?.apr_range || "",
        annual_fee: editData?.annual_fee || 0,
        rewards_description: editData?.rewards_description || "",
        affiliate_url: editData?.affiliate_url || "",
        image_url: editData?.image_url || "",
        rating: editData?.rating || 4,
        is_active: editData?.is_active ?? true,
        is_featured: editData?.is_featured ?? false,
      });
    }
  }, [open, editData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `credit-products/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setForm({ ...form, image_url: urlData.publicUrl });
      toast.success("Image uploaded");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.issuer) {
      toast.error("Name and issuer are required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        annual_fee: Number(form.annual_fee),
        rating: Number(form.rating),
      };

      if (editData?.id) {
        const { error } = await supabase.from("credit_products").update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("credit_products").insert(payload);
        if (error) throw error;
        toast.success("Product added");
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit" : "Add"} Credit Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Product Image / Thumbnail</Label>
            <div className="mt-2 flex items-start gap-4">
              {form.image_url ? (
                <div className="relative">
                  <img
                    src={form.image_url}
                    alt="Product"
                    className="h-24 w-36 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setForm({ ...form, image_url: "" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-24 w-36 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="product-image"
                />
                <Label
                  htmlFor="product-image"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Upload Image"}
                </Label>
                <p className="text-xs text-muted-foreground mt-2">Or paste image URL:</p>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Chase Sapphire Preferred"
              />
            </div>
            <div>
              <Label>Issuer *</Label>
              <Input
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                placeholder="e.g., Chase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product Type</Label>
              <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="personal_loan">Personal Loan</SelectItem>
                  <SelectItem value="secured_card">Secured Card</SelectItem>
                  <SelectItem value="business_card">Business Card</SelectItem>
                  <SelectItem value="banking_account">Banking Account</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="kids_product">Kids Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_cards">Credit Cards</SelectItem>
                  <SelectItem value="loans">Loans</SelectItem>
                  <SelectItem value="banking">Banking</SelectItem>
                  <SelectItem value="kids">Kids Products</SelectItem>
                  <SelectItem value="investments">Investments</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>APR Range</Label>
              <Input
                value={form.apr_range}
                onChange={(e) => setForm({ ...form, apr_range: e.target.value })}
                placeholder="e.g., 18.99% - 25.99%"
              />
            </div>
            <div>
              <Label>Annual Fee ($)</Label>
              <Input
                type="number"
                value={form.annual_fee}
                onChange={(e) => setForm({ ...form, annual_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rating (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label>Rewards Description</Label>
            <Textarea
              value={form.rewards_description}
              onChange={(e) => setForm({ ...form, rewards_description: e.target.value })}
              placeholder="e.g., 2x points on travel and dining"
            />
          </div>

          <div>
            <Label>Application/Affiliate URL</Label>
            <Input
              value={form.affiliate_url}
              onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground mt-1">Where users go when they click "Apply Now"</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <Label>Featured</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editData ? "Update" : "Add"} Product
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}