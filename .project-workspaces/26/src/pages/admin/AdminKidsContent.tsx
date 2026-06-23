import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Gamepad2, Video, BookHeart, Home, GraduationCap } from "lucide-react";
import KidsLessonsManager from "@/components/admin/KidsLessonsManager";
import KidsGamesManager from "@/components/admin/KidsGamesManager";
import KidsVideosManager from "@/components/admin/KidsVideosManager";
import KidsStoriesManager from "@/components/admin/KidsStoriesManager";

// Tab configuration
const tabs = [
  { id: "lessons", label: "Lessons", icon: BookOpen, color: "bg-violet-600", description: "Educational lessons for kids" },
  { id: "games", label: "Games", icon: Gamepad2, color: "bg-pink-600", description: "Interactive learning games" },
  { id: "videos", label: "Videos", icon: Video, color: "bg-blue-600", description: "Kid-friendly video content" },
  { id: "stories", label: "Stories", icon: BookHeart, color: "bg-amber-600", description: "Money stories & fables" },
];

export default function AdminKidsContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lessons");

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const activeTabConfig = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>KidsBloom Content | CoinsBloom Admin</title>
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500 px-4 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/20"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌸</span>
          <div>
            <h1 className="text-2xl font-bold text-white">KidsBloom Content</h1>
            <p className="text-white/80 text-sm">Learning content for children</p>
          </div>
        </div>

        {/* Quick Link to Adult Content */}
        <Card 
          className="mt-4 bg-white/10 border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
          onClick={() => navigate("/admin/content")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-white" />
              <div>
                <p className="text-white font-medium text-sm">Looking for Adult Content?</p>
                <p className="text-white/70 text-xs">Manage Money Academy & main app content</p>
              </div>
            </div>
            <Badge className="bg-emerald-500 text-white">Go →</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="px-4 -mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <TabsList className="w-full grid grid-cols-4 gap-1 bg-card border rounded-xl p-1.5 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`flex flex-col items-center gap-1 px-2 py-2 text-xs font-medium rounded-lg transition-all
                    data-[state=active]:text-white data-[state=active]:shadow-sm
                    ${activeTab === tab.id ? tab.color : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Current Tab Indicator */}
          {activeTabConfig && (
            <div className="flex items-center gap-2 my-4 px-1">
              <div className={`p-1.5 rounded-md ${activeTabConfig.color}`}>
                <activeTabConfig.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{activeTabConfig.label}</h2>
                <p className="text-xs text-muted-foreground">{activeTabConfig.description}</p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <TabsContent value="lessons" className="mt-0">
              <KidsLessonsManager />
            </TabsContent>
            <TabsContent value="games" className="mt-0">
              <KidsGamesManager />
            </TabsContent>
            <TabsContent value="videos" className="mt-0">
              <KidsVideosManager />
            </TabsContent>
            <TabsContent value="stories" className="mt-0">
              <KidsStoriesManager />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
