import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, X, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ArticleDrawer } from '@/features/knowledge/components/ArticleDrawer';
import type { KnowledgeItem as FullKnowledgeItem } from '@/features/knowledge/types';

interface HintItem {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  tags: string[];
  read_minutes: number;
}

/**
 * Maps the current route to relevant knowledge tags/topics.
 * Returns up to 3 keywords used for matching against published knowledge_items.
 */
function getRouteContext(pathname: string): { keywords: string[]; label: string } | null {
  if (pathname.startsWith('/analytics')) return { keywords: ['analytics', 'conversion', 'metrics'], label: 'Analytics tips' };
  if (pathname.startsWith('/signal-lab')) return { keywords: ['signal', 'positioning', 'hook'], label: 'Signal craft' };
  if (pathname.startsWith('/workspace')) return { keywords: ['build', 'funnel', 'page'], label: 'Build tips' };
  if (pathname.startsWith('/projects')) return { keywords: ['funnel', 'project', 'launch'], label: 'Funnel playbooks' };
  if (pathname.startsWith('/social')) return { keywords: ['social', 'campaign', 'content'], label: 'Social marketing' };
  if (pathname.startsWith('/studio')) return { keywords: ['video', 'studio', 'asset'], label: 'Studio tips' };
  if (pathname.startsWith('/launch')) return { keywords: ['launch', 'deploy', 'quick'], label: 'Launch guides' };
  if (pathname.startsWith('/dashboard')) return { keywords: ['dashboard', 'getting started', 'overview'], label: 'Getting started' };
  return null;
}

const DISMISS_KEY = 'intoiq_knowledge_hint_dismissals';

function isRouteDismissed(routeKey: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, number>;
    const ts = map[routeKey];
    if (!ts) return false;
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markRouteDismissed(routeKey: string) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[routeKey] = Date.now();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function KnowledgeHint() {
  const location = useLocation();
  const [item, setItem] = useState<HintItem | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [drawerArticle, setDrawerArticle] = useState<FullKnowledgeItem | null>(null);
  const [loading, setLoading] = useState(false);

  const ctx = useMemo(() => getRouteContext(location.pathname), [location.pathname]);
  const routeKey = ctx ? location.pathname.split('/')[1] || 'root' : '';

  // Reset on route change
  useEffect(() => {
    setItem(null);
    setDismissed(ctx ? isRouteDismissed(routeKey) : true);
  }, [location.pathname, ctx, routeKey]);

  useEffect(() => {
    if (!ctx || dismissed) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('knowledge_items')
        .select('id, title, subtitle, topic, tags, read_minutes')
        .eq('is_published', true)
        .overlaps('tags', ctx.keywords)
        .order('is_featured', { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (data && data.length > 0) {
        setItem(data[0] as HintItem);
      } else {
        const { data: fallback } = await supabase
          .from('knowledge_items')
          .select('id, title, subtitle, topic, tags, read_minutes')
          .eq('is_published', true)
          .ilike('search_keywords', `%${ctx.keywords[0]}%`)
          .limit(1);
        if (!cancelled && fallback && fallback.length > 0) {
          setItem(fallback[0] as HintItem);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ctx, dismissed]);

  // Fetch a full article record and open the drawer
  const openArticle = async (itemId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('knowledge_items')
        .select('*')
        .eq('id', itemId)
        .eq('is_published', true)
        .maybeSingle();
      if (data) setDrawerArticle(data as FullKnowledgeItem);
    } finally {
      setLoading(false);
    }
  };

  // Global event: allow other surfaces (e.g. global search) to open an article
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { itemId?: string };
      if (detail?.itemId) openArticle(detail.itemId);
    };
    window.addEventListener('knowledge:open', handler);
    return () => window.removeEventListener('knowledge:open', handler);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    markRouteDismissed(routeKey);
    setDismissed(true);
  };

  const handleOpen = () => {
    if (!item) return;
    markRouteDismissed(routeKey);
    openArticle(item.id);
  };

  const showToast = ctx && !dismissed && item;

  return (
    <>
      {showToast && (
        <button
          onClick={handleOpen}
          className={cn(
            'fixed bottom-24 left-4 z-[55] max-w-[280px] sm:max-w-[320px]',
            'glass rounded-2xl border border-primary/25 px-3 py-2.5',
            'flex items-start gap-2.5 text-left',
            'shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl',
            'animate-in fade-in slide-in-from-left-3 duration-500',
            'hover:border-primary/40 hover:shadow-[0_10px_32px_rgba(0,0,0,0.45)] transition-all'
          )}
          aria-label={`Learn: ${item.title}`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 mt-0.5">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.18em] text-primary/70 font-medium mb-0.5">
              {ctx.label}
            </p>
            <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{item.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              {item.read_minutes} min read
              <ArrowRight className="h-2.5 w-2.5" />
            </p>
          </div>
          <span
            onClick={handleDismiss}
            className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Dismiss"
            role="button"
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      )}
      <ArticleDrawer article={drawerArticle} onClose={() => setDrawerArticle(null)} />
    </>
  );
}
