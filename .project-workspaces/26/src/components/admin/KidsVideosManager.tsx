import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Video, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AddVideoModal from "./modals/AddVideoModal";

export default function KidsVideosManager() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data } = await supabase.from("learning_content").select("*").eq("type", "video").in("age_group", ["5-8", "9-12", "13-17"]).order("created_at", { ascending: false });
    if (data) setVideos(data);
    setLoading(false);
  };

  const togglePublished = async (id: string, status: boolean) => {
    await supabase.from("learning_content").update({ is_published: !status }).eq("id", id);
    setVideos(videos.map((v) => (v.id === id ? { ...v, is_published: !status } : v)));
    toast.success("Updated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await supabase.from("learning_content").delete().eq("id", id);
    setVideos(videos.filter((v) => v.id !== id));
    toast.success("Video deleted");
  };

  const openEdit = (video: any) => {
    setEditData(video);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const filtered = videos.filter((v) => v.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search videos..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Video
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? (
          <div className="col-span-full text-muted-foreground text-center py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-muted-foreground text-center py-8">No videos found</div>
        ) : (
          filtered.map((video) => (
            <Card key={video.id} className="border overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {video.duration_minutes && (
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {video.duration_minutes}m
                  </span>
                )}
                <span className="absolute top-1 left-1 bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {video.age_group}
                </span>
              </div>
              <CardContent className="p-2">
                <h3 className="font-medium text-foreground text-xs truncate">{video.title}</h3>
                <div className="flex items-center justify-between mt-1.5">
                  <Switch 
                    checked={video.is_published} 
                    onCheckedChange={() => togglePublished(video.id, video.is_published)} 
                    className="scale-75 origin-left"
                  />
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(video)} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(video.id)} className="h-6 w-6 text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <AddVideoModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchVideos} editData={editData} isKids />
    </div>
  );
}
