import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  // Marketing fields
  page_type?: 'blog' | 'story' | 'feature' | 'offer' | 'announcement';
  hero_image_url?: string | null;
  video_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
}

/** Convert a YouTube/TikTok/Loom/Vimeo URL into an embeddable iframe src */
function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}?dnt=1`;
    }
    // Loom
    if (u.hostname.includes('loom.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://www.loom.com/embed/${id}`;
    }
    // TikTok — no iframe embed, show link fallback
    return null;
  } catch {
    return null;
  }
}

function VideoEmbed({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);

  if (embedUrl) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
           style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      </div>
    );
  }

  // Fallback for TikTok or unsupported platforms — show a tap-to-open card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 transition hover:bg-primary/20 group"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 group-hover:bg-primary/30 transition">
        <Play className="h-5 w-5 text-primary fill-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Watch video</p>
        <p className="text-xs text-muted-foreground truncate max-w-[220px]">{url}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
    </a>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-foreground">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-foreground">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed text-muted-foreground">')
    .replace(/\n/g, '<br/>');

  const sanitized = DOMPurify.sanitize(`<p class="mb-4 leading-relaxed text-muted-foreground">${html}</p>`, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
  });

  return (
    <div className="prose-custom" dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  story: 'Story',
  feature: 'Feature',
  offer: 'Special Offer',
  announcement: 'Announcement',
  blog: 'Post',
};

const DEFAULT_CTA: Record<string, { text: string; url: string }> = {
  story:        { text: 'Start your story free →', url: '/auth' },
  feature:      { text: 'Try it yourself — free →', url: '/auth' },
  offer:        { text: 'Claim your spot →', url: '/auth' },
  announcement: { text: 'Get started →', url: '/auth' },
  blog:         { text: 'Try Compani free →', url: '/auth' },
};

// Blog index
function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, published_at, created_at, page_type, hero_image_url')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setPosts((data as BlogPost[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Compani</h1>
        <p className="text-muted-foreground mb-8">Stories, features, and updates.</p>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-5">
            {posts.map(p => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="block group">
                <article className="rounded-2xl border border-border/50 overflow-hidden transition hover:border-primary/30">
                  {p.hero_image_url && (
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        src={p.hero_image_url}
                        alt={p.title}
                        className="h-full w-full object-cover transition group-hover:scale-105 duration-500"
                      />
                      {p.page_type && p.page_type !== 'blog' && (
                        <span className="absolute top-3 left-3 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase tracking-wide">
                          {PAGE_TYPE_LABELS[p.page_type] || p.page_type}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition">{p.title}</h2>
                    {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {p.published_at ? format(new Date(p.published_at), 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Single marketing / blog post page
function BlogPostView({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
      .then(({ data }) => {
        setPost(data as BlogPost | null);
        setLoading(false);
      });
  }, [slug]);

  // Inject Open Graph meta tags dynamically
  useEffect(() => {
    if (!post) return;
    const ogTitle = post.og_title || post.title;
    const ogDesc = post.og_description || post.excerpt || 'Your AI companion — built by someone who walked many paths and still needed a friend.';
    const ogImage = post.og_image_url || post.hero_image_url || 'https://mycompani.app/og-image.png';

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    document.title = `${ogTitle} — Compani`;
    setMeta('og:title', ogTitle);
    setMeta('og:description', ogDesc);
    setMeta('og:image', ogImage);
    setMeta('og:url', window.location.href);
    setMeta('og:type', 'article');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', ogTitle);
    setMeta('twitter:description', ogDesc);
    setMeta('twitter:image', ogImage);

    return () => { document.title = 'Compani — Your AI Companion'; };
  }, [post]);

  if (loading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-muted-foreground">Loading…</div>
  );
  if (!post) return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-4">
      <p className="text-lg text-foreground">Post not found</p>
      <Button variant="outline" onClick={() => navigate('/blog')}>Back</Button>
    </div>
  );

  const pageType = post.page_type || 'blog';
  const ctaText = post.cta_text || DEFAULT_CTA[pageType]?.text || 'Try Compani free →';
  const ctaUrl  = post.cta_url  || DEFAULT_CTA[pageType]?.url  || '/auth';

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero image */}
      {post.hero_image_url && (
        <div className="relative w-full overflow-hidden" style={{ maxHeight: '420px' }}>
          <img
            src={post.hero_image_url}
            alt={post.title}
            className="w-full object-cover"
            style={{ maxHeight: '420px' }}
          />
          {/* Gradient fade into background */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Back */}
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Page type badge */}
        {pageType !== 'blog' && (
          <span className="inline-block rounded-full bg-primary/15 px-3 py-0.5 text-xs font-bold text-primary uppercase tracking-wide mb-3">
            {PAGE_TYPE_LABELS[pageType]}
          </span>
        )}

        <article>
          <h1 className="text-3xl font-bold text-foreground mb-2 leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="text-base text-muted-foreground mb-4 leading-relaxed">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
            <Calendar className="h-3 w-3" />
            {post.published_at ? format(new Date(post.published_at), 'MMMM d, yyyy') : '—'}
          </div>

          {/* Video embed — shown before body content so it catches attention first */}
          {post.video_url && (
            <div className="mb-8">
              <VideoEmbed url={post.video_url} />
            </div>
          )}

          {/* Body content */}
          {post.content && <MarkdownContent content={post.content} />}

          {/* CTA — the conversion moment */}
          <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center">
            <a
              href={ctaUrl}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              {ctaText}
            </a>
            <p className="mt-3 text-xs text-muted-foreground">Free to join · No credit card required</p>
          </div>
        </article>
      </div>
    </div>
  );
}

export default function BlogPage() {
  const { slug } = useParams<{ slug?: string }>();
  if (slug) return <BlogPostView slug={slug} />;
  return <BlogIndex />;
}