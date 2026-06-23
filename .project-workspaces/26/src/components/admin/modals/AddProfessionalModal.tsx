import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ImageUploader from "../ImageUploader";

const SPECIALTIES = [
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "tax_professional", label: "Tax Professional" },
  { value: "credit_counselor", label: "Credit Counselor" },
  { value: "debt_specialist", label: "Debt Specialist" },
  { value: "investment_advisor", label: "Investment Advisor" },
  { value: "insurance_agent", label: "Insurance Agent" },
  { value: "real_estate", label: "Real Estate" },
  { value: "estate_planning", label: "Estate Planning" },
  { value: "mortgage_loan_officer", label: "Mortgage Loan Officer" },
  { value: "other", label: "Other" },
];

interface AddProfessionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

export default function AddProfessionalModal({ open, onOpenChange, onSuccess, editData }: AddProfessionalModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Parse existing specialties (could be comma-separated or single value)
  const parseSpecialties = (specialty: string | undefined): { specialties: string[], otherText: string } => {
    if (!specialty) return { specialties: ["financial_advisor"], otherText: "" };
    const parts = specialty.split(",").map(s => s.trim()).filter(Boolean);
    const knownValues = SPECIALTIES.map(s => s.value);
    const known: string[] = [];
    const unknown: string[] = [];
    
    parts.forEach(part => {
      if (knownValues.includes(part)) {
        known.push(part);
      } else {
        unknown.push(part);
      }
    });
    
    // If there are unknown specialties, mark "other" as selected
    if (unknown.length > 0) {
      known.push("other");
    }
    
    return { specialties: known, otherText: unknown.join(", ") };
  };
  
  const parsed = parseSpecialties(editData?.specialty);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(parsed.specialties);
  const [otherSpecialty, setOtherSpecialty] = useState(parsed.otherText);
  
  const [form, setForm] = useState({
    name: editData?.name || "",
    title: editData?.title || "",
    bio: editData?.bio || "",
    avatar_url: editData?.avatar_url || "",
    contact_email: editData?.contact_email || "",
    website_url: editData?.website_url || "",
    calendar_url: editData?.calendar_url || "",
    rating: editData?.rating || 5,
    is_active: editData?.is_active ?? true,
    is_featured: editData?.is_featured ?? false,
    is_verified: editData?.is_verified ?? false,
  });

  // Reset form when editData changes (important for edit mode)
  useEffect(() => {
    if (open) {
      const newParsed = parseSpecialties(editData?.specialty);
      setSelectedSpecialties(newParsed.specialties);
      setOtherSpecialty(newParsed.otherText);
      setForm({
        name: editData?.name || "",
        title: editData?.title || "",
        bio: editData?.bio || "",
        avatar_url: editData?.avatar_url || "",
        contact_email: editData?.contact_email || "",
        website_url: editData?.website_url || "",
        calendar_url: editData?.calendar_url || "",
        rating: editData?.rating || 5,
        is_active: editData?.is_active ?? true,
        is_featured: editData?.is_featured ?? false,
        is_verified: editData?.is_verified ?? false,
      });
    }
  }, [open, editData]);

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const handleSubmit = async () => {
    const hasOther = selectedSpecialties.includes("other");
    const effectiveSpecialties = selectedSpecialties.filter(s => s !== "other");
    
    if (!form.name || (effectiveSpecialties.length === 0 && (!hasOther || !otherSpecialty.trim()))) {
      toast.error("Name and at least one specialty are required");
      return;
    }
    
    if (hasOther && !otherSpecialty.trim()) {
      toast.error("Please specify your other specialty");
      return;
    }

    setLoading(true);
    try {
      // Build specialty string: known specialties + other custom ones
      const allSpecialties = [...effectiveSpecialties];
      if (hasOther && otherSpecialty.trim()) {
        allSpecialties.push(otherSpecialty.trim());
      }
      
      const payload = {
        ...form,
        specialty: allSpecialties.join(", "),
        rating: Number(form.rating),
        calendar_url: form.calendar_url || null,
      };

      if (editData?.id) {
        const { error } = await supabase.from("professionals").update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Professional updated");
      } else {
        const { error } = await supabase.from("professionals").insert(payload);
        if (error) throw error;
        toast.success("Professional added");
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
          <DialogTitle>{editData ? "Edit" : "Add"} Professional</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., CFP, CPA"
              />
            </div>
          </div>

          <div>
            <Label>Specialties * (select one or more)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md bg-muted/30">
              {SPECIALTIES.map((specialty) => (
                <div key={specialty.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={specialty.value}
                    checked={selectedSpecialties.includes(specialty.value)}
                    onCheckedChange={() => toggleSpecialty(specialty.value)}
                  />
                  <label
                    htmlFor={specialty.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {specialty.label}
                  </label>
                </div>
              ))}
            </div>
            {selectedSpecialties.includes("other") && (
              <div className="mt-2">
                <Input
                  value={otherSpecialty}
                  onChange={(e) => setOtherSpecialty(e.target.value)}
                  placeholder="Enter your specialty (e.g., Mortgage Loan Officer)"
                  className="mt-1"
                />
              </div>
            )}
            {selectedSpecialties.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {selectedSpecialties
                  .filter(s => s !== "other")
                  .map(s => SPECIALTIES.find(sp => sp.value === s)?.label)
                  .filter(Boolean)
                  .join(", ")}
                {selectedSpecialties.includes("other") && otherSpecialty && (
                  <>, {otherSpecialty}</>
                )}
              </p>
            )}
          </div>

          <div>
            <Label>Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Professional background and expertise..."
            />
          </div>

          <ImageUploader
            value={form.avatar_url}
            onChange={(url) => setForm({ ...form, avatar_url: url })}
            bucket="avatars"
            folder="professionals"
            label="Profile Photo"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Calendar/Scheduling URL</Label>
            <Input
              value={form.calendar_url}
              onChange={(e) => setForm({ ...form, calendar_url: e.target.value })}
              placeholder="e.g., https://calendly.com/yourname"
            />
          </div>

          <div>
            <Label>Rating (1-5)</Label>
            <Input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })}
              className="w-24"
            />
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <Label>Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_verified} onCheckedChange={(v) => setForm({ ...form, is_verified: v })} />
              <Label>Verified</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editData ? "Update" : "Add"} Professional
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
