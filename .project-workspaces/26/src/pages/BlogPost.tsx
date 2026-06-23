import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { format } from "date-fns";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow container py-12 max-w-3xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const metaTitle = post.meta_title || post.title;
  const metaDescription = post.meta_description || post.excerpt || `Read "${post.title}" on the CoinsBloom blog.`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{metaTitle} | CoinsBloom Blog</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://coinsbloom.com/blog/${post.slug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": metaDescription,
          "author": { "@type": "Person", "name": post.author_name },
          "datePublished": post.published_at,
          "dateModified": post.updated_at,
          "publisher": { "@type": "Organization", "name": "CoinsBloom", "url": "https://coinsbloom.com" },
          ...(post.cover_image_url && { "image": post.cover_image_url }),
        })}</script>
      </Helmet>
      <Navbar />
      <main className="flex-grow container py-12 max-w-3xl">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
        </Link>

        <article>
          <div className="mb-6">
            <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 capitalize">
              {post.category}
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {post.author_name}</span>
            {post.published_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {format(new Date(post.published_at), "MMMM d, yyyy")}
              </span>
            )}
          </div>

          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full rounded-xl mb-8 max-h-96 object-cover"
            />
          )}

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t">
              {post.tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
