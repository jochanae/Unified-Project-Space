import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Radio, Sparkles, ChevronDown, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFunnelHub } from '@/features/projects';
import { SocialCalendar, StrategyMap, useSocialCampaigns, PLATFORM_META, ExportMenu, SocialToEmailDrawer, type SocialPlatform } from '@/features/social-lab';

const ALL_PLATFORMS: SocialPlatform[] = ['instagram', 'linkedin', 'tiktok', 'twitter', 'facebook'];



export default function SocialLabPage() {
  const { activeProject, projects, setActiveProject } = useFunnelHub();
  const projectId = activeProject?.id ?? null;
  const { campaigns, isLoading, generate, update, remove, reorderArc } = useSocialCampaigns(projectId);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    'instagram',
    'linkedin',
    'tiktok',
  ]);
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Honor ?handoff=email — opens the nurture drawer once campaigns load
  useEffect(() => {
    if (searchParams.get('handoff') === 'email' && campaigns.length > 0) {
      setEmailDrawerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('handoff');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, campaigns.length, setSearchParams]);

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleGenerate = () => {
    generate.mutate({ platforms: selectedPlatforms, daysOfContent: 7, mode: 'deep_dive' });
  };

  return (
    <>
      <Helmet>
        <title>Social Lab — IntoIQ</title>
        <meta name="description" content="Translate your Signal into platform-native social content. Instagram, LinkedIn, TikTok — distributed in your voice." />
      </Helmet>

      <main className="w-full max-w-7xl mx-auto px-4 pt-4 md:pt-12 pb-40 overflow-x-hidden">
        {/* Header */}
        <header className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Radio className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">Social Lab</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1">Distribute Your Signal</h1>
          <p className="text-muted-foreground text-xs md:text-base max-w-2xl">
            MarQ architects a 7-day Deep Dive — one Signal across Hook → Depth → Proof → Friction → Bridge, native to every platform.
          </p>
        </header>

        {/* Project + Generate Bar */}
        <div className="glass rounded-2xl p-4 md:p-5 mb-8 border border-border/50 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Project</p>
            {projects.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full md:w-auto justify-between">
                    {activeProject?.name ?? 'Select project'}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {projects.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => setActiveProject(p.id)}>
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <p className="text-sm text-muted-foreground">Create a project first to generate social content.</p>
            )}
          </div>

          <div className="flex-1 md:max-w-md">
            <p className="text-xs text-muted-foreground mb-1">Platforms</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PLATFORMS.map((p) => {
                const meta = PLATFORM_META[p];
                const active = selectedPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {meta.icon} {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!projectId || selectedPlatforms.length === 0 || generate.isPending}
            className="gap-2 md:self-end"
          >
            <Sparkles className="h-4 w-4" />
            {generate.isPending ? 'Architecting…' : 'Launch Deep Dive'}
          </Button>
        </div>

        {/* Strategy Map — Layer 2 visual storyboard */}
        <StrategyMap
          campaigns={campaigns}
          onReorder={(dayMap) => reorderArc.mutate(dayMap)}
          isReordering={reorderArc.isPending}
        />

        {/* Export + Email handoff toolbar */}
        {campaigns.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-xs text-muted-foreground">
              {campaigns.length} post{campaigns.length === 1 ? '' : 's'} ready for hand-off
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setEmailDrawerOpen(true)}
              >
                <Mail className="h-3.5 w-3.5" />
                Convert to Nurture Sequence
              </Button>
              <ExportMenu posts={campaigns} />
            </div>
          </div>
        )}

        {/* Calendar */}
        <SocialCalendar
          campaigns={campaigns}
          isLoading={isLoading}
          onUpdate={update}
          onDelete={remove}
        />
      </main>

      <SocialToEmailDrawer
        open={emailDrawerOpen}
        onOpenChange={setEmailDrawerOpen}
        projectId={projectId}
        projectName={activeProject?.name}
        campaigns={campaigns}
      />
    </>
  );
}
