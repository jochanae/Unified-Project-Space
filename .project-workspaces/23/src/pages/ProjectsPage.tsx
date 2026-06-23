import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFunnelHub } from '@/features/projects';
import { useFunnels, FUNNEL_TYPES, FunnelFlowEditor, type Funnel } from '@/features/funnels';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ParticleMeshBackground } from '@/components/shared/ParticleMeshBackground';
import { supabase } from '@/integrations/supabase/client';
import {
  Layers, ArrowRight, Loader2, Trash2, ExternalLink, Pencil, Globe,
  FileText, ChevronRight, Plus, Workflow, GitBranch, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProjectsTrashSection } from '@/features/projects/components/ProjectsTrashSection';
import { TemplateMarketplace } from '@/features/agency';
import { WidgetErrorBoundary } from '@/components/ErrorBoundary';


export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, isLoading, theme, setActiveProject, deleteProject } = useFunnelHub();
  const { user } = useCurrentUser();
  const { funnels, addFunnel, removeFunnel } = useFunnels(user?.orgId || null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFunnelTarget, setDeleteFunnelTarget] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [flowOpen, setFlowOpen] = useState<Record<string, boolean>>({});
  const [newFunnelFor, setNewFunnelFor] = useState<string | null>(null);
  const [newFunnelForm, setNewFunnelForm] = useState({ name: '', funnel_type: 'lead_gen' });
  

  // Pages with funnel_id for grouping
  const { data: pages } = useQuery({
    queryKey: ['funnel-pages-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, project_id, funnel_id, title, slug, is_published, published_url');
      if (error) throw error;
      return data || [];
    },
  });

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    navigate('/workspace');
  };

  const toggle = (id: string) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  const handleCreateFunnel = () => {
    if (!newFunnelFor || !newFunnelForm.name.trim()) return;
    addFunnel.mutate(
      { project_id: newFunnelFor, name: newFunnelForm.name.trim(), funnel_type: newFunnelForm.funnel_type },
      {
        onSuccess: () => {
          setExpanded(s => ({ ...s, [newFunnelFor]: true }));
          setNewFunnelFor(null);
          setNewFunnelForm({ name: '', funnel_type: 'lead_gen' });
        },
      }
    );
  };

  const projectFunnels = (projectId: string) => funnels.filter(f => f.project_id === projectId);
  const funnelPages = (funnelId: string) => (pages || []).filter(p => p.funnel_id === funnelId);
  const unassignedPages = (projectId: string) =>
    (pages || []).filter(p => p.project_id === projectId && !p.funnel_id);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground relative flex flex-col overflow-x-hidden">
      <ParticleMeshBackground theme={theme} />

      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <Layers className="h-5 w-5 text-primary" />
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Marketing OS</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">Projects & Funnels</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Each project is a business offer. Funnels are the campaigns that feed it.
          </p>
        </div>

        <div>
        <ProjectsTrashSection />
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (

          <div className="glass rounded-2xl p-8 sm:p-12 text-center border border-border/30">
            <Layers className="h-12 w-12 text-primary/40 mx-auto mb-4" />
            <h3 className="text-lg font-serif mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first project to get started.</p>
            <p className="text-muted-foreground text-xs">Use the <strong>+</strong> button in the header above.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(p => {
              const pFunnels = projectFunnels(p.id);
              const orphans = unassignedPages(p.id);
              const totalPages = (pages || []).filter(pg => pg.project_id === p.id).length;
              const liveCount = (pages || []).filter(pg => pg.project_id === p.id && pg.is_published).length;
              const isOpen = !!expanded[p.id];

              return (
                <div
                  key={p.id}
                  className="glass rounded-2xl border border-border/30 overflow-hidden group hover:border-primary/30 transition-all duration-300"
                >
                  {/* Project header row */}
                  <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                    <button
                      onClick={() => toggle(p.id)}
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                      className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors"
                    >
                      <ChevronRight className={cn('h-5 w-5 text-primary transition-transform', isOpen && 'rotate-90')} />
                    </button>

                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => toggle(p.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm sm:text-base truncate">{p.name}</h3>
                        {liveCount > 0 ? (
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] px-2 py-0">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse" />
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground/70 border-border/40">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Workflow className="h-3 w-3" />
                          {pFunnels.length} funnel{pFunnels.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {totalPages} page{totalPages !== 1 ? 's' : ''}
                        </span>
                        {liveCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-green-400" />
                            {liveCount} live
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      onClick={() => handleOpenProject(p.id)}
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>

                  {/* Expanded funnel tree */}
                  {isOpen && (
                    <div className="border-t border-border/15 bg-muted/5 px-4 sm:px-5 py-3">
                      {pFunnels.length === 0 && orphans.length === 0 && (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          No funnels yet in this project.
                        </p>
                      )}

                      {pFunnels.map(f => {
                        const fPages = funnelPages(f.id);
                        const fLive = fPages.filter(pg => pg.is_published).length;
                        return (
                          <div key={f.id} className="mb-2 last:mb-0">
                            <div className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-background/40 transition-colors">
                              <Workflow className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">{f.name}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/40 text-muted-foreground">
                                    {FUNNEL_TYPES.find(t => t.value === f.funnel_type)?.label || f.funnel_type}
                                  </Badge>
                                  {fLive > 0 && (
                                    <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                                      {fLive} live
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {fPages.length} page{fPages.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1 text-primary/80 hover:text-primary hover:bg-primary/10"
                                onClick={() => setFlowOpen(s => ({ ...s, [f.id]: !s[f.id] }))}
                                aria-label={flowOpen[f.id] ? 'Hide flow' : 'Show flow'}
                              >
                                <GitBranch className="h-3 w-3" />
                                {flowOpen[f.id] ? 'Hide flow' : 'Flow'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteFunnelTarget({ id: f.id, name: f.name })}
                                aria-label={`Delete ${f.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Flow editor */}
                            {flowOpen[f.id] && (
                              <div className="ml-6 my-2 pl-3 border-l border-primary/20">
                                <FunnelFlowEditor funnelId={f.id} funnelName={f.name} />
                              </div>
                            )}

                            {/* Pages under funnel */}
                            {fPages.length > 0 && (
                              <div className="ml-6 border-l border-border/20 pl-3 py-1 space-y-1">
                                {fPages.map(pg => (
                                  <div
                                    key={pg.id}
                                    className="flex items-center gap-2 text-xs text-muted-foreground py-1"
                                  >
                                    <FileText className="h-3 w-3 shrink-0" />
                                    <span className="truncate flex-1">{pg.title || pg.slug}</span>
                                    {pg.is_published && pg.published_url && (
                                      <>
                                        <button
                                          onClick={() => {
                                            const u = new URL(pg.published_url!, window.location.origin);
                                            u.searchParams.set('utm_source', 'sms');
                                            u.searchParams.set('utm_medium', 'text');
                                            u.searchParams.set('utm_campaign', pg.slug || pg.title || 'page');
                                            navigator.clipboard.writeText(u.toString());
                                            toast.success('SMS link copied — tracked as utm_source=sms');
                                          }}
                                          className="text-primary hover:text-primary/80"
                                          title="Copy a text-message-ready link with SMS tracking baked in"
                                          aria-label="Copy SMS link"
                                        >
                                          <MessageSquare className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => window.open(pg.published_url!, '_blank')}
                                          className="text-green-400 hover:text-green-300"
                                          aria-label="View live"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {orphans.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/10">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mb-1 px-2">
                            Unassigned pages
                          </p>
                          <div className="ml-2 space-y-1">
                            {orphans.map(pg => (
                              <div key={pg.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1 px-2">
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate flex-1">{pg.title || pg.slug}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-3 h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => {
                          setNewFunnelFor(p.id);
                          setNewFunnelForm({ name: '', funnel_type: 'lead_gen' });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        New funnel
                      </Button>
                    </div>
                  )}

                  {/* Project action bar */}
                  <div className="border-t border-border/15 px-4 py-2 flex items-center justify-between bg-muted/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      onClick={() => handleOpenProject(p.id)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit project
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Template Marketplace — start a new project from a vetted template */}
        <div className="mt-10">
          <WidgetErrorBoundary><TemplateMarketplace /></WidgetErrorBoundary>
        </div>
      </div>


      {/* New funnel dialog */}
      <Dialog open={!!newFunnelFor} onOpenChange={(open) => !open && setNewFunnelFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New funnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Funnel name (e.g. Webinar Funnel)"
              value={newFunnelForm.name}
              onChange={(e) => setNewFunnelForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <Select
              value={newFunnelForm.funnel_type}
              onValueChange={(v) => setNewFunnelForm(f => ({ ...f, funnel_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNNEL_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFunnelFor(null)}>Cancel</Button>
            <Button onClick={handleCreateFunnel} disabled={!newFunnelForm.name.trim() || addFunnel.isPending}>
              {addFunnel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create funnel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete project */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. All funnels, pages, steps, and notes in this
              project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteProject(deleteTarget.id);
                toast.success('Project deleted');
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete funnel */}
      <AlertDialog open={!!deleteFunnelTarget} onOpenChange={(open) => !open && setDeleteFunnelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteFunnelTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The funnel will be removed. Pages inside will become unassigned (you can reattach them later).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteFunnelTarget) return;
                removeFunnel.mutate(deleteFunnelTarget.id);
                setDeleteFunnelTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete funnel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
