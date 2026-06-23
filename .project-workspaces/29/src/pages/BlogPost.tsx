import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const metaTitle = post.meta_title || post.title;
  const metaDescription = post.meta_description || post.excerpt || `Read "${post.title}" on the IntoIQ blog.`;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO head tags would go here with react-helmet if needed */}
      <header className="border-b border-border/40 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">IntoIQ</Link>
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Blog</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 sm:py-14 max-w-3xl">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="h-3 w-3" /> Back to Blog
        </Link>

        <article>
          <div className="mb-2">
            <Badge variant="outline">{post.category}</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {post.author_name}
            </span>
            {post.published_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {format(new Date(post.published_at), "MMMM d, yyyy")}
              </span>
            )}
          </div>

          {post.cover_image_url && (
            <img src={post.cover_image_url} alt={post.title} className="w-full rounded-xl mb-8 aspect-video object-cover" loading="lazy" />
          )}

          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border/40">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
              ))}
            </div>
          )}
        </article>

        {/* JSON-LD for SEO */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": metaDescription,
            "author": { "@type": "Person", "name": post.author_name },
            "datePublished": post.published_at,
            "dateModified": post.updated_at,
            "publisher": { "@type": "Organization", "name": "IntoIQ", "url": "https://www.mymoneymypower.com" },
            ...(post.cover_image_url && { "image": post.cover_image_url }),
          })
        }} />
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © 2026 IntoIQ. All rights reserved.
      </footer>
    </div>
  );
};

export default BlogPost;
