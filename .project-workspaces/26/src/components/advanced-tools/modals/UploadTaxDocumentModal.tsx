import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }
const DOC_TYPES = ["w2", "1099", "1098", "receipt", "statement", "other"];

export const UploadTaxDocumentModal = ({ open, onOpenChange, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", document_type: "other" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast({ title: "Error", description: "Select a file", variant: "destructive" }); return; }
    setLoading(true);
    const path = `${user!.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("tax-documents").upload(path, file);
    if (uploadError) { setLoading(false); toast({ title: "Error", description: uploadError.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("tax-documents").getPublicUrl(path);
    const { error } = await supabase.from("tax_documents").insert({ user_id: user!.id, tax_year: new Date().getFullYear(), name: form.name || file.name, document_type: form.document_type, file_url: urlData.publicUrl });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Uploaded", description: "Document saved" });
    setFile(null); setForm({ name: "", document_type: "other" });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>Upload Tax Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Document Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Optional" /></div>
          <div><Label>Type</Label><Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="bg-background">{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Uploading..." : "Upload"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
