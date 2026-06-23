import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Gamepad2, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AddGameModal from "./modals/AddGameModal";

export default function KidsGamesManager() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    const { data } = await supabase.from("learning_content").select("*").eq("type", "game").order("created_at", { ascending: false });
    if (data) setGames(data);
    setLoading(false);
  };

  const togglePublished = async (id: string, status: boolean) => {
    await supabase.from("learning_content").update({ is_published: !status }).eq("id", id);
    setGames(games.map((g) => (g.id === id ? { ...g, is_published: !status } : g)));
    toast.success("Updated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this game?")) return;
    await supabase.from("learning_content").delete().eq("id", id);
    setGames(games.filter((g) => g.id !== id));
    toast.success("Game deleted");
  };

  const openEdit = (game: any) => {
    setEditData(game);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const filtered = games.filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search games..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Game
        </Button>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-muted-foreground text-center py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">No games found</div>
        ) : (
          filtered.map((game) => (
            <Card key={game.id} className="border">
              <CardContent className="p-4 flex items-center gap-4">
                <Gamepad2 className="h-5 w-5 text-pink-500" />
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{game.title}</h3>
                  <p className="text-muted-foreground text-sm">{game.age_group}</p>
                </div>
                <Switch checked={game.is_published} onCheckedChange={() => togglePublished(game.id, game.is_published)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(game)} className="text-muted-foreground hover:text-foreground">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(game.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <AddGameModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchGames} editData={editData} />
    </div>
  );
}
