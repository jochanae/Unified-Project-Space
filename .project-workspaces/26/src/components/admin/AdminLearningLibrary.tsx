import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Video, BookOpen, Gamepad2, BookHeart, Eye, Trash2, Edit2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importLessonSections } from "@/lib/importLessonSections";

interface LearningContent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  age_group: string | null;
  is_published: boolean;
  is_premium: boolean;
  view_count: number;
  created_at: string;
}

export default function AdminLearningLibrary() {
  const [content, setContent] = useState<LearningContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [sectionCount, setSectionCount] = useState(0);

  useEffect(() => {
    fetchContent();
    fetchSectionCount();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from("learning_content")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setContent(data);
    setLoading(false);
  };

  const fetchSectionCount = async () => {
    const { count } = await supabase
      .from("lesson_sections")
      .select("*", { count: "exact", head: true });
    setSectionCount(count || 0);
  };

  const handleImportSections = async () => {
    setImporting(true);
    setImportProgress({ current: 0, total: 0 });
    
    try {
      const result = await importLessonSections((current, total) => {
        setImportProgress({ current, total });
      });
      
      toast.success(`Imported ${result.imported} lesson sections (${result.errors} errors)`);
      fetchSectionCount();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import lesson sections");
    } finally {
      setImporting(false);
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("learning_content")
      .update({ is_published: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    setContent(content.map((c) => (c.id === id ? { ...c, is_published: !currentStatus } : c)));
    toast.success(`Content ${!currentStatus ? "published" : "unpublished"}`);
  };

  const deleteContent = async (id: string) => {
    if (!confirm("Delete this content?")) return;

    const { error } = await supabase.from("learning_content").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete");
      return;
    }

    setContent(content.filter((c) => c.id !== id));
    toast.success("Content deleted");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "lesson":
        return <BookOpen className="h-4 w-4" />;
      case "game":
        return <Gamepad2 className="h-4 w-4" />;
      case "story":
        return <BookHeart className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "lesson":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "game":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
      case "story":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredContent = content.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || c.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: content.length,
    published: content.filter((c) => c.is_published).length,
    videos: content.filter((c) => c.type === "video").length,
    lessons: content.filter((c) => c.type === "lesson").length,
    games: content.filter((c) => c.type === "game").length,
    stories: content.filter((c) => c.type === "story").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-emerald-600">{stats.published}</div>
            <div className="text-xs text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-red-600">{stats.videos}</div>
            <div className="text-xs text-muted-foreground">Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{stats.lessons}</div>
            <div className="text-xs text-muted-foreground">Lessons</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-pink-600">{stats.games}</div>
            <div className="text-xs text-muted-foreground">Games</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{stats.stories}</div>
            <div className="text-xs text-muted-foreground">Stories</div>
          </CardContent>
        </Card>
      </div>

      {/* Import Lesson Sections */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">Lesson Sections</h3>
              <p className="text-sm text-muted-foreground">
                {sectionCount} sections in database • Import from JSON to enable multi-page lessons
              </p>
            </div>
            <Button
              onClick={handleImportSections}
              disabled={importing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Sections
                </>
              )}
            </Button>
          </div>
          {importing && importProgress.total > 0 && (
            <div className="mt-3">
              <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {importProgress.current} / {importProgress.total} sections
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1">
            <Video className="h-3 w-3" /> Videos
          </TabsTrigger>
          <TabsTrigger value="lesson" className="gap-1">
            <BookOpen className="h-3 w-3" /> Lessons
          </TabsTrigger>
          <TabsTrigger value="game" className="gap-1">
            <Gamepad2 className="h-3 w-3" /> Games
          </TabsTrigger>
          <TabsTrigger value="story" className="gap-1">
            <BookHeart className="h-3 w-3" /> Stories
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredContent.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">No content found</CardContent>
          </Card>
        ) : (
          filteredContent.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>{getTypeIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                    {item.age_group && (
                      <Badge variant="outline" className="text-xs">
                        {item.age_group}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {item.view_count}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={item.is_published}
                  onCheckedChange={() => togglePublished(item.id, item.is_published)}
                />
                <Button variant="ghost" size="icon" onClick={() => deleteContent(item.id)} className="text-destructive h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
