import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, FolderKanban, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ParticleMeshBackground } from '@/components/shared/ParticleMeshBackground';
import { Button } from '@/components/ui/button';
import { useFunnelHub } from '@/features/projects';
import { StrategyBlueprintPanel } from '@/features/strategy-blueprint/components/StrategyBlueprintPanel';
import { LogicVaultSheet } from '@/features/strategy-blueprint/components/LogicVaultSheet';
import { useStrategyBlueprint } from '@/features/strategy-blueprint/hooks/use-strategy-blueprint';
import type { BlueprintData } from '@/features/strategy-blueprint/types';

export default function StrategyBlueprintPage() {
  const navigate = useNavigate();
  const { activeProject, theme } = useFunnelHub();
  const { blueprint, isLoading, saveBlueprint } = useStrategyBlueprint(activeProject?.id ?? '');
  const [vaultOpen, setVaultOpen] = useState(false);

  const handleSaved = useCallback(
    async (data: BlueprintData) => {
      try {
        await saveBlueprint(data);
        toast.success('Strategy blueprint saved');
      } catch (err: any) {
        toast.error('Failed to save strategy blueprint', {
          description: err?.message || 'Please try again.',
        });
      }
    },
    [saveBlueprint],
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground relative overflow-x-hidden">
      <ParticleMeshBackground theme={theme} />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Strategy Blueprint
            </div>
            <h1 className="mt-3 truncate text-2xl font-serif tracking-tight sm:text-3xl">
              {activeProject?.name || 'No active project selected'}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeProject && (
              <Button
                variant="outline"
                onClick={() => setVaultOpen(true)}
                className="gap-2"
                title="View everything MarQ knows about this project"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Logic Vault</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>

        <LogicVaultSheet
          open={vaultOpen}
          onOpenChange={setVaultOpen}
          projectId={activeProject?.id ?? null}
          projectName={activeProject?.name ?? 'Untitled'}
        />

        {!activeProject ? (
          <div className="glass rounded-2xl border border-border/30 p-8 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-primary/40" />
            <p className="mt-4 text-sm font-medium text-foreground">Select a project to continue</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a project from your workspace to generate a Strategy Blueprint.
            </p>
            <Button className="mt-5 gap-2" onClick={() => navigate('/projects')}>
              <FolderKanban className="h-4 w-4" />
              Go to Projects
            </Button>
          </div>
        ) : isLoading ? (
          <div className="glass rounded-2xl border border-border/30 p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading saved blueprint...</p>
          </div>
        ) : (
          <StrategyBlueprintPanel
            projectId={activeProject.id}
            projectName={activeProject.name}
            existingBlueprint={blueprint}
            onSaved={handleSaved}
          />
        )}
      </div>
    </div>
  );
}
