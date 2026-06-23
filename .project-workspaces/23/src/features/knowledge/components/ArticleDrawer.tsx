import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { KnowledgeItem, KnowledgeSkillLevel } from '@/features/knowledge/types';

const LEVEL_STYLES: Record<KnowledgeSkillLevel, string> = {
  beginner: 'text-green-400 bg-green-500/10 border-green-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-primary bg-primary/10 border-primary/20',
};

interface ArticleDrawerProps {
  article: KnowledgeItem | null;
  onClose: () => void;
}

export function ArticleDrawer({ article, onClose }: ArticleDrawerProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Smart-scroll: when a new article opens, glide its title into focus.
  useEffect(() => {
    if (!article) return;
    const t = setTimeout(() => {
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
    return () => clearTimeout(t);
  }, [article?.id]);

  async function copyBody() {
    if (!article) return;
    try {
      const text = `# ${article.title}\n\n${article.subtitle ? article.subtitle + '\n\n' : ''}${article.body}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed — your browser blocked clipboard access');
    }
  }

  return (
    <Sheet open={!!article} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto bg-background/95 backdrop-blur-xl pb-20"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 4.5rem)' }}
      >
        {article && (
          <article className="pt-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="border border-border/30 bg-muted/30">
                  {article.topic}
                </Badge>
                <Badge className={cn('border text-[11px] capitalize', LEVEL_STYLES[article.skill_level])}>
                  {article.skill_level}
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {article.read_minutes} min read
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyBody}
                className="gap-1.5 shrink-0 border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <h2 ref={titleRef} className="mt-3 text-2xl font-serif tracking-tight sm:text-3xl scroll-mt-20">{article.title}</h2>
            {article.subtitle && (
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">{article.subtitle}</p>
            )}

            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none mt-6">
              <ReactMarkdown>{article.body}</ReactMarkdown>
            </div>

            {article.feature_link && (
              <button
                onClick={() => {
                  navigate(article.feature_link!);
                  onClose();
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {article.feature_link_label || 'Open feature'}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </article>
        )}
      </SheetContent>
    </Sheet>
  );
}
