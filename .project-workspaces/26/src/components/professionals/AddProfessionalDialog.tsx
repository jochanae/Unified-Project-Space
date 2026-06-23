import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddProfessionalDialogProps {
  partnerId: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

const specialties = [
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "tax_professional", label: "Tax Professional" },
  { value: "credit_counselor", label: "Credit Counselor" },
  { value: "debt_specialist", label: "Debt Specialist" },
  { value: "investment_advisor", label: "Investment Advisor" },
  { value: "insurance_agent", label: "Insurance Agent" },
  { value: "real_estate", label: "Real Estate Agent" },
  { value: "estate_planning", label: "Estate Planning" },
  { value: "mortgage_loan_officer", label: "Mortgage Loan Officer" },
  { value: "other", label: "Other" },
];

export function AddProfessionalDialog({ partnerId, onSuccess, trigger }: AddProfessionalDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [otherSpecialty, setOtherSpecialty] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    contact_email: "",
    bio: "",
    website_url: "",
    calendar_url: "",
  });

  const toggleSpecialty = (value: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(value) 
        ? prev.filter(s => s !== value) 
        : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasOther = selectedSpecialties.includes("other");
    const effectiveSpecialties = selectedSpecialties.filter(s => s !== "other");

    if (!formData.name || (effectiveSpecialties.length === 0 && (!hasOther || !otherSpecialty.trim()))) {
      toast.error("Name and at least one specialty are required");
      return;
    }
    
    if (hasOther && !otherSpecialty.trim()) {
      toast.error("Please specify your other specialty");
      return;
    }

    setSaving(true);
    try {
      // Build specialty string: known specialties + other custom ones
      const allSpecialties = [...effectiveSpecialties];
      if (hasOther && otherSpecialty.trim()) {
        allSpecialties.push(otherSpecialty.trim());
      }
      
      const { error } = await supabase.from("professionals").insert({
        partner_id: partnerId,
        name: formData.name,
        title: formData.title || null,
        specialty: allSpecialties.join(", "),
        contact_email: formData.contact_email || null,
        bio: formData.bio || null,
        website_url: formData.website_url || null,
        calendar_url: formData.calendar_url || null,
        is_active: true,
        is_verified: false,
        is_featured: false,
      });

      if (error) throw error;

      toast.success("Professional added successfully!");
      setFormData({
        name: "",
        title: "",
        contact_email: "",
        bio: "",
        website_url: "",
        calendar_url: "",
      });
      setSelectedSpecialties([]);
      setOtherSpecialty("");
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding professional:", error);
      toast.error("Failed to add professional");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Professional
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/10 text-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Add New Professional</DialogTitle>
            <DialogDescription className="text-white/60">
              Add a team member to your partner profile. They'll get a shareable profile page with QR code.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white/80">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title" className="text-white/80">
                Job Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Senior Financial Advisor"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-white/80">
                Specialties <span className="text-red-400">*</span> (select one or more)
              </Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-white/5 border border-white/10 rounded-md">
                {specialties.map((s) => (
                  <div key={s.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={s.value}
                      checked={selectedSpecialties.includes(s.value)}
                      onCheckedChange={() => toggleSpecialty(s.value)}
                      className="border-white/30 data-[state=checked]:bg-emerald-600"
                    />
                    <label
                      htmlFor={s.value}
                      className="text-sm text-white/80 cursor-pointer"
                    >
                      {s.label}
                    </label>
                  </div>
                ))}
              </div>
              {selectedSpecialties.includes("other") && (
                <Input
                  value={otherSpecialty}
                  onChange={(e) => setOtherSpecialty(e.target.value)}
                  placeholder="Enter your specialty (e.g., Mortgage Loan Officer)"
                  className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              )}
              {selectedSpecialties.length > 0 && (
                <p className="text-xs text-white/50">
                  Selected: {selectedSpecialties
                    .filter(v => v !== "other")
                    .map(v => specialties.find(s => s.value === v)?.label)
                    .filter(Boolean)
                    .join(", ")}
                  {selectedSpecialties.includes("other") && otherSpecialty && (
                    <>, {otherSpecialty}</>
                  )}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-white/80">
                Contact Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="john@company.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio" className="text-white/80">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description of experience and expertise..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="website" className="text-white/80">
                  Website URL
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calendar" className="text-white/80">
                  Calendar URL
                </Label>
                <Input
                  id="calendar"
                  type="url"
                  value={formData.calendar_url}
                  onChange={(e) => setFormData({ ...formData, calendar_url: e.target.value })}
                  placeholder="Calendly, etc."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Professional
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
