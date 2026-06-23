import { useFunnelFlow, type FlowPage } from '../hooks/use-funnel-flow';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, FileText, Loader2, Workflow, ExternalLink, MoveRight } from 'lucide-react';

interface Props {
  funnelId: string;
  funnelName: string;
}

export function FunnelFlowEditor({ funnelId, funnelName }: Props) {
  const { pages, isLoading, setNext, reorder } = useFunnelFlow(funnelId);

  const move = (idx: number, dir: -1 | 1) => {
    const ids = pages.map(p => p.id);
    const ni = idx + dir;
    if (ni < 0 || ni >= ids.length) return;
    [ids[idx], ids[ni]] = [ids[ni], ids[idx]];
    reorder.mutate(ids);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="glass rounded-xl border border-border/30 p-8 text-center">
        <Workflow className="h-10 w-10 text-primary/40 mx-auto mb-3" />
        <h4 className="text-sm font-medium mb-1">No pages in this funnel yet</h4>
        <p className="text-xs text-muted-foreground">
          Add pages to <span className="font-medium">{funnelName}</span> from the Pages tab,
          then return here to wire up the flow.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Workflow className="h-3.5 w-3.5 text-primary" />
        <span>Each page sends visitors to the next step after a form submit or CTA click.</span>
      </div>

      {pages.map((p, i) => {
        const nextOptions = pages.filter(x => x.id !== p.id);
        const isLast = i === pages.length - 1;

        return (
          <div key={p.id} className="relative">
            <div className="glass rounded-xl border border-border/30 p-3 sm:p-4 flex items-start gap-3">
              {/* Reorder */}
              <div className="flex flex-col gap-1 pt-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || reorder.isPending}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => move(i, 1)}
                  disabled={isLast || reorder.isPending}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Step badge */}
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                {i + 1}
              </div>

              {/* Page info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{p.title || p.slug}</span>
                  {p.is_published ? (
                    <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/70 border-border/40">
                      Draft
                    </Badge>
                  )}
                  {p.is_published && p.published_url && (
                    <button
                      onClick={() => window.open(p.published_url!, '_blank')}
                      className="text-green-400 hover:text-green-300"
                      aria-label="View live"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Next step picker */}
                <div className="mt-2 flex items-center gap-2">
                  <MoveRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">Next:</span>
                  <Select
                    value={p.next_page_id || '__none__'}
                    onValueChange={(v) =>
                      setNext.mutate({ pageId: p.id, nextPageId: v === '__none__' ? null : v })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs flex-1 max-w-[260px]">
                      <SelectValue placeholder="End of funnel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— End of funnel —</SelectItem>
                      {nextOptions.map(np => (
                        <SelectItem key={np.id} value={np.id}>
                          {np.title || np.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Connector line */}
            {!isLast && p.next_page_id && (
              <div className="flex items-center gap-2 pl-[60px] py-1 text-[10px] text-primary/60">
                <div className="h-3 w-px bg-primary/30" />
                <span className="uppercase tracking-wide">routes to step {
                  (pages.findIndex(pp => pp.id === p.next_page_id) + 1) || '?'
                }</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
