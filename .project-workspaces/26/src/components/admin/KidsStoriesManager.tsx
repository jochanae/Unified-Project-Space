import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, BookHeart, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AddStoryModal from "./modals/AddStoryModal";

export default function KidsStoriesManager() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data } = await supabase.from("learning_content").select("*").eq("type", "story").order("created_at", { ascending: false });
    if (data) setStories(data);
    setLoading(false);
  };

  const togglePublished = async (id: string, status: boolean) => {
    await supabase.from("learning_content").update({ is_published: !status }).eq("id", id);
    setStories(stories.map((s) => (s.id === id ? { ...s, is_published: !status } : s)));
    toast.success("Updated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    await supabase.from("learning_content").delete().eq("id", id);
    setStories(stories.filter((s) => s.id !== id));
    toast.success("Story deleted");
  };

  const openEdit = (story: any) => {
    setEditData(story);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const filtered = stories.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search stories..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Story
        </Button>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-muted-foreground text-center py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">No stories found</div>
        ) : (
          filtered.map((story) => (
            <Card key={story.id} className="border">
              <CardContent className="p-4 flex items-center gap-4">
                <BookHeart className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{story.title}</h3>
                  <p className="text-muted-foreground text-sm">{story.age_group}</p>
                </div>
                <Switch checked={story.is_published} onCheckedChange={() => togglePublished(story.id, story.is_published)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(story)} className="text-muted-foreground hover:text-foreground">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(story.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <AddStoryModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchStories} editData={editData} />
    </div>
  );
}
