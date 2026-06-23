import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, BookOpen, Search } from "lucide-react";
import { toast } from "sonner";
import AddLessonModal from "./modals/AddLessonModal";

export default function KidsLessonsManager() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    const { data } = await supabase
      .from("learning_content")
      .select("*")
      .eq("type", "lesson")
      .in("age_group", ["kids", "teens"])
      .order("created_at", { ascending: false });
    if (data) setLessons(data);
    setLoading(false);
  };

  const togglePublished = async (id: string, status: boolean) => {
    await supabase.from("learning_content").update({ is_published: !status }).eq("id", id);
    setLessons(lessons.map((l) => (l.id === id ? { ...l, is_published: !status } : l)));
    toast.success("Updated");
  };

  const deleteLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    await supabase.from("learning_content").delete().eq("id", id);
    setLessons(lessons.filter((l) => l.id !== id));
    toast.success("Deleted");
  };

  const openEdit = (lesson: any) => {
    setEditData(lesson);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditData(null);
    setShowModal(true);
  };

  const filtered = lessons.filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search lessons..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Lesson
        </Button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-muted-foreground text-center py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">No lessons found</div>
        ) : (
          filtered.map((lesson) => (
            <Card key={lesson.id} className="border">
              <CardContent className="p-4 flex items-center gap-4">
                <BookOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground truncate">{lesson.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {lesson.category}
                    </Badge>
                    {lesson.content && (
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                        {lesson.content.split(/\s+/).length} words
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm truncate">{lesson.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEdit(lesson)}
                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Switch 
                    checked={lesson.is_published} 
                    onCheckedChange={() => togglePublished(lesson.id, lesson.is_published)} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteLesson(lesson.id)}
                    className="text-destructive hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddLessonModal
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={fetchLessons}
        editData={editData}
        isKids={true}
      />
    </div>
  );
}
