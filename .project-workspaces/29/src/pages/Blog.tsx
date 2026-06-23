import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen } from "lucide-react";
import { format } from "date-fns";

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, author_name, category, published_at, tags")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">IntoIQ</Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 sm:py-16 max-w-4xl">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <Badge variant="secondary">Blog</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">IntoIQ Blog</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg">
            Financial tips, trading insights, and investing education for everyone.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full mb-4 rounded-lg" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="block group">
                <Card className="overflow-hidden hover:border-primary/40 transition-colors">
                  {post.cover_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  )}
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{post.category}</Badge>
                      {post.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.published_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                    {post.excerpt && <p className="text-muted-foreground text-sm mb-3">{post.excerpt}</p>}
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-1">Coming soon!</h3>
            <p className="text-sm">We're working on great content for you.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © 2026 IntoIQ. All rights reserved.
      </footer>
    </div>
  );
};

export default Blog;
