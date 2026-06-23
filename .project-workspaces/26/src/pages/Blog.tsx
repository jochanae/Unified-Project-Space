import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { format } from "date-fns";
import { ArrowRight, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Blog - CoinsBloom | Financial Tips & Insights</title>
        <meta name="description" content="Expert tips on budgeting, saving, family finance, and building healthy money habits. Read the CoinsBloom blog." />
        <link rel="canonical" href="https://coinsbloom.com/blog" />
      </Helmet>
      <Navbar />
      <main className="flex-grow container py-12 max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <BookOpen className="h-4 w-4" />
            CoinsBloom Blog
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Financial Tips & Insights</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Practical advice on budgeting, saving, and building healthy money habits for individuals and families.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {post.cover_image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 capitalize">
                      {post.category}
                    </span>
                    {post.published_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.published_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
                  )}
                  <span className="text-sm font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Coming soon!</p>
            <p className="text-sm mt-1">We're working on great content for you.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
