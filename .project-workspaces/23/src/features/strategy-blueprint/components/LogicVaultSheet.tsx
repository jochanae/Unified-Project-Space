import { useMemo, useState } from 'react';
import { Code2, Copy, Check, Database, Sparkles, Layers, Target, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useLogicVault } from '../hooks/use-logic-vault';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
}

export function LogicVaultSheet({ open, onOpenChange, projectId, projectName }: Props) {
  const [copied, setCopied] = useState(false);
  const { data, isLoading } = useLogicVault(open ? projectId : null);

  const fullJson = useMemo(() => {
    if (!data) return null;
    return {
      project: { id: projectId, name: projectName },
      generated_at: new Date().toISOString(),
      strategy_blueprint: data.blueprint,
      directives: data.directives.map(d => ({
        type: d.context_type,
        directive: d.directive,
        created_at: d.created_at,
      })),
      active_hook: data.activeHook,
      latest_page_title: data.pageTitle,
      social_narrative_arc: data.socialArc,
    };
  }, [data, projectId, projectName]);

  const handleCopy = async () => {
    if (!fullJson) return;
    await navigator.clipboard.writeText(JSON.stringify(fullJson, null, 2));
    setCopied(true);
    toast.success('Logic Vault copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const directiveCount = data?.directives.length ?? 0;
  const arcCount = data?.socialArc.length ?? 0;
  const hasBlueprint = !!data?.blueprint;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col bg-background border-l border-border/50"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Database className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest">Logic Vault</span>
          </div>
          <SheetTitle className="text-xl font-serif tracking-tight">Everything MarQ knows</SheetTitle>
          <SheetDescription className="text-xs">
            Read-only x-ray of <span className="text-foreground font-medium">{projectName}</span>. Strategy, directives, hooks, narrative arc — fully transparent.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Loading vault...</span>
              </div>
            ) : (
              <>
                {/* Summary */}
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Knowledge Summary</h3>
                  </div>
                  <div className="glass rounded-xl p-4 border border-border/40 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {hasBlueprint ? 'Blueprint ✓' : 'No blueprint'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{directiveCount} directives</Badge>
                    <Badge variant="outline" className="text-[10px]">{arcCount} arc posts</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {data?.activeHook ? 'Active hook ✓' : 'No active hook'}
                    </Badge>
                  </div>
                </section>

                {/* Directives */}
                {directiveCount > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Identity Directives</h3>
                    </div>
                    <div className="space-y-2">
                      {data!.directives.map(d => (
                        <div key={d.id} className="glass rounded-xl p-3 border border-border/40">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                              {d.context_type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(d.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{d.directive}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Active Hook */}
                {data?.activeHook && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Active Page Hook</h3>
                    </div>
                    <div className="glass rounded-xl p-4 border border-border/40">
                      <p className="text-sm font-medium text-foreground">{data.activeHook}</p>
                      {data.pageTitle && (
                        <p className="text-[10px] text-muted-foreground mt-1">on "{data.pageTitle}"</p>
                      )}
                    </div>
                  </section>
                )}

                {/* Social Arc */}
                {arcCount > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                        Latest Narrative Arc ({arcCount})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {data!.socialArc.slice(0, 7).map(p => (
                        <div key={p.id} className="glass rounded-xl p-3 border border-border/40 flex items-center gap-3">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground w-12 shrink-0">
                            {p.narrative_day != null ? `Day ${p.narrative_day}` : '—'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className="text-[10px]">{p.platform}</Badge>
                              {p.narrative_role && (
                                <Badge variant="outline" className="text-[10px] text-primary border-primary/40">
                                  {p.narrative_role}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{p.hook}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Raw JSON */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-3.5 w-3.5 text-primary" />
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Full Vault JSON</h3>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 h-7 text-xs">
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="glass rounded-xl p-4 border border-border/40 text-[11px] leading-relaxed text-muted-foreground overflow-x-auto font-mono whitespace-pre">
                    {JSON.stringify(fullJson, null, 2)}
                  </pre>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
