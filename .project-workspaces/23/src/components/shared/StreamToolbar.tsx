import { useState } from 'react';
import { StickyNote, GitBranch, Link2, Layers, ChevronDown, ChevronUp, Image, Palette, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotesTab } from '@/features/notes';
import { FunnelStepsTab } from '@/features/funnel-steps';
import { LinksTab } from '@/features/links';
import { PageBuilderTab } from '@/features/pages';
import { ProjectAssetUploader } from '@/features/assets';
import { BrandColorPicker } from '@/features/assets';
import { ShareLinkGenerator } from '@/features/deploy';
import { useFunnelHub } from '@/features/projects';
import { cn } from '@/lib/utils';

type ToolPanel = 'notes' | 'funnel' | 'links' | 'pages' | 'assets' | 'colors' | 'share' | null;

const panels = [
  { key: 'share' as const, label: 'Share', icon: Share2 },
  { key: 'notes' as const, label: 'Notes', icon: StickyNote },
  { key: 'funnel' as const, label: 'Funnel', icon: GitBranch },
  { key: 'links' as const, label: 'Links', icon: Link2 },
  { key: 'pages' as const, label: 'Pages', icon: Layers },
  { key: 'assets' as const, label: 'Assets', icon: Image },
  { key: 'colors' as const, label: 'Brand', icon: Palette },
];

export function StreamToolbar() {
  const [activePanel, setActivePanel] = useState<ToolPanel>(null);
  const { activeProject } = useFunnelHub();

  const toggle = (panel: ToolPanel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const projectSlug = activeProject?.name.toLowerCase().replace(/\s+/g, '-') || '';

  return (
    <div className="mt-8 mb-20">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-1 mb-4 flex-wrap">
        {panels.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            onClick={() => toggle(key)}
            className={cn(
              'gap-1.5 text-xs',
              activePanel === key
                ? 'text-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.2)]'
                : 'text-muted-foreground hover:text-foreground',
              key === 'share' && activePanel !== key && 'text-primary border border-primary/20'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {activePanel === key ? (
              <ChevronUp className="h-3 w-3 ml-0.5" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-0.5" />
            )}
          </Button>
        ))}
      </div>

      {/* Expandable Panel */}
      {activePanel && (
        <div className="glass rounded-2xl border border-border/50 p-4 animate-fade-in">
          {activePanel === 'share' && activeProject && (
            <ShareLinkGenerator
              projectId={activeProject.id}
              projectName={activeProject.name}
              projectSlug={projectSlug}
            />
          )}
          {activePanel === 'notes' && <NotesTab />}
          {activePanel === 'funnel' && <FunnelStepsTab />}
          {activePanel === 'links' && <LinksTab />}
          {activePanel === 'pages' && <PageBuilderTab />}
          {activePanel === 'assets' && activeProject && <ProjectAssetUploader projectId={activeProject.id} />}
          {activePanel === 'colors' && activeProject && <BrandColorPicker projectId={activeProject.id} />}
        </div>
      )}
    </div>
  );
}
