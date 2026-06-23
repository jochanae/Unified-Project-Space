import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Heart, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function DonationLinksManager() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    const { data } = await supabase.from("donation_links").select("*").order("display_order");
    if (data) setLinks(data);
    setLoading(false);
  };

  const toggleActive = async (id: string, status: boolean) => {
    await supabase.from("donation_links").update({ is_active: !status }).eq("id", id);
    setLinks(links.map((l) => (l.id === id ? { ...l, is_active: !status } : l)));
    toast.success("Updated");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium text-white">Donation Links</h3>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Link</Button>
      </div>
      <div className="space-y-2">
        {loading ? <div className="text-white/60 text-center py-8">Loading...</div> : links.length === 0 ? <div className="text-white/60 text-center py-8">No donation links</div> : links.map((link) => (
          <Card key={link.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-4">
              <Heart className="h-5 w-5 text-pink-400" />
              <div className="flex-1">
                <h3 className="text-white font-medium">{link.name}</h3>
                <p className="text-white/60 text-sm">{link.platform}</p>
              </div>
              <Switch checked={link.is_active} onCheckedChange={() => toggleActive(link.id, link.is_active)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
