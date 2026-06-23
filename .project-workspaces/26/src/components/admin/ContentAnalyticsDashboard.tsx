import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Eye, Users, TrendingUp, BookOpen } from "lucide-react";

interface ContentStats {
  totalViews: number;
  totalContent: number;
  publishedContent: number;
  contentByType: { name: string; value: number; color: string }[];
  viewsByCategory: { name: string; views: number }[];
}

export default function ContentAnalyticsDashboard() {
  const [stats, setStats] = useState<ContentStats>({
    totalViews: 0,
    totalContent: 0,
    publishedContent: 0,
    contentByType: [],
    viewsByCategory: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    // Fetch learning content stats
    const { data: content } = await supabase
      .from("learning_content")
      .select("type, category, view_count, is_published");

    // Fetch tutorials stats
    const { data: tutorials } = await supabase
      .from("tutorials")
      .select("category, view_count, is_published");

    // Fetch tips
    const { data: tips } = await supabase
      .from("financial_tips")
      .select("category, is_published");

    if (content) {
      const totalViews = content.reduce((acc, c) => acc + (c.view_count || 0), 0);
      const tutorialViews = tutorials?.reduce((acc, t) => acc + (t.view_count || 0), 0) || 0;

      // Count by type
      const typeCounts: Record<string, number> = {};
      content.forEach((c) => {
        typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
      });

      const contentByType = [
        { name: "Videos", value: typeCounts["video"] || 0, color: "#ef4444" },
        { name: "Lessons", value: typeCounts["lesson"] || 0, color: "#3b82f6" },
        { name: "Games", value: typeCounts["game"] || 0, color: "#ec4899" },
        { name: "Stories", value: typeCounts["story"] || 0, color: "#f59e0b" },
      ];

      // Views by category
      const categoryViews: Record<string, number> = {};
      content.forEach((c) => {
        categoryViews[c.category] = (categoryViews[c.category] || 0) + (c.view_count || 0);
      });

      const viewsByCategory = Object.entries(categoryViews)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 6);

      setStats({
        totalViews: totalViews + tutorialViews,
        totalContent: content.length + (tutorials?.length || 0) + (tips?.length || 0),
        publishedContent:
          content.filter((c) => c.is_published).length +
          (tutorials?.filter((t) => t.is_published).length || 0) +
          (tips?.filter((t) => t.is_published).length || 0),
        contentByType,
        viewsByCategory,
      });
    }

    setLoading(false);
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <BookOpen className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Content</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalContent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <TrendingUp className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-foreground">{stats.publishedContent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engagement</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalContent > 0 ? Math.round((stats.totalViews / stats.totalContent) * 10) / 10 : 0}x
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content by Type */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Content by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.contentByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.contentByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {stats.contentByType.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Views by Category */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Views by Category</CardTitle>
            <p className="text-xs text-muted-foreground">Categories of your educational content</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.viewsByCategory} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={80} fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="views" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
