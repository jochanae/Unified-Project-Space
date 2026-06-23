import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Search, Star, BadgeCheck, KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import AddProfessionalModal from "./modals/AddProfessionalModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Professional {
  id: string;
  name: string;
  title: string | null;
  specialty: string;
  bio: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  website_url: string | null;
  is_featured: boolean;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  user_id?: string | null;
  claimed_at?: string | null;
}

export default function ProfessionalsManager() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPro, setEditingPro] = useState<Professional | null>(null);
  const [claimLink, setClaimLink] = useState<{ url: string; expiresAt: string; name: string } | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setProfessionals(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this professional?")) return;

    const { error } = await supabase.from("professionals").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Professional deleted");
    fetchProfessionals();
  };

  const openEditDialog = (pro: Professional) => {
    setEditingPro(pro);
    setIsDialogOpen(true);
  };

  const handleIssueClaimLink = async (pro: Professional) => {
    setIssuingId(pro.id);
    try {
      const { data, error } = await supabase.rpc("issue_professional_claim_token", {
        p_professional_id: pro.id,
        p_expires_in_days: 14,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.claim_token) throw new Error("No token returned");
      const url = `${window.location.origin}/professionals/claim/${row.claim_token}`;
      setClaimLink({ url, expiresAt: row.expires_at, name: pro.name });
      setCopied(false);
      fetchProfessionals();
    } catch (err: any) {
      toast.error(err.message || "Failed to issue claim link");
    } finally {
      setIssuingId(null);
    }
  };

  const handleCopyLink = async () => {
    if (!claimLink) return;
    await navigator.clipboard.writeText(claimLink.url);
    setCopied(true);
    toast.success("Claim link copied");
  };

  const filteredProfessionals = professionals.filter(
    (pro) =>
      pro.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pro.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search professionals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2" onClick={() => { setEditingPro(null); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Professional
        </Button>
      </div>

      {/* Add/Edit Modal */}
      <AddProfessionalModal
        open={isDialogOpen}
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingPro(null); }}
        onSuccess={fetchProfessionals}
        editData={editingPro}
      />

      {/* Professionals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">No professionals found</div>
        ) : (
          filteredProfessionals.map((pro) => (
            <Card key={pro.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={pro.avatar_url || ""} />
                    <AvatarFallback className="bg-emerald-600 text-white">{pro.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{pro.name}</h3>
                      {pro.is_verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                    </div>
                    {pro.title && <p className="text-sm text-muted-foreground">{pro.title}</p>}
                    <div className="flex items-center flex-wrap gap-1 mt-1">
                      {pro.specialty.split(",").map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {s.trim()}
                        </Badge>
                      ))}
                      {pro.is_featured && (
                        <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Star className="h-3 w-3 mr-1" /> Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                  {!pro.user_id && !pro.claimed_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleIssueClaimLink(pro)}
                      disabled={issuingId === pro.id}
                      title="Issue claim link"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  )}
                  {pro.claimed_at && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Claimed
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(pro)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(pro.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!claimLink} onOpenChange={(o) => !o && setClaimLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim link for {claimLink?.name}</DialogTitle>
            <DialogDescription>
              Send this single-use link to the professional. It will not be shown again. Expires{" "}
              {claimLink ? new Date(claimLink.expiresAt).toLocaleString() : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={claimLink?.url || ""} className="font-mono text-xs" />
            <Button onClick={handleCopyLink} variant="outline" className="shrink-0">
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setClaimLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
