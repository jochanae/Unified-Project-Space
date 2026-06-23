import { useState } from 'react';
import { ChevronDown, FolderKanban, Plus, Check } from 'lucide-react';
import { Drawer } from 'vaul';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ProjectLite {
  id: string;
  name: string;
}

interface WorkspaceHeaderProps {
  projects: ProjectLite[];
  activeProject: ProjectLite | null;
  onSwitch: (id: string) => void;
  onCreateNew?: () => void;
}

export function WorkspaceHeader({ projects, activeProject, onSwitch, onCreateNew }: WorkspaceHeaderProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handlePick = (id: string) => {
    onSwitch(id);
    setSheetOpen(false);
  };

  const Trigger = (
    <button
      type="button"
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-background/40 px-4 py-3 text-left',
        'backdrop-blur-md transition-all',
        'shadow-[0_0_20px_hsl(var(--primary)/0.08)] hover:border-primary/40 hover:shadow-[0_0_28px_hsl(var(--primary)/0.14)]',
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FolderKanban className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/70 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_hsl(var(--gold)/0.6)]" />
          </span>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary/80">
            Active Workspace
          </p>
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">
          {activeProject?.name ?? 'No project selected'}
        </p>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform group-data-[state=open]:rotate-180" />
    </button>
  );

  // Mobile: bottom sheet via Vaul
  if (isMobile) {
    return (
      <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Drawer.Trigger asChild>{Trigger}</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto max-h-[80vh] flex-col rounded-t-3xl border border-primary/20 bg-background/95 backdrop-blur-xl outline-none">
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
            <div className="px-6 pt-4 pb-2">
              <Drawer.Title className="text-base font-serif tracking-tight">
                Switch Workspace
              </Drawer.Title>
              <p className="text-xs text-muted-foreground">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 overflow-y-auto px-4 pb-6">
              {projects.map((p) => {
                const isActive = p.id === activeProject?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePick(p.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99]',
                      isActive
                        ? 'border-primary/40 bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.12)]'
                        : 'border-border/30 bg-muted/10 hover:bg-muted/20',
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FolderKanban className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                      {p.name}
                    </span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
              {onCreateNew && (
                <button
                  onClick={() => {
                    setSheetOpen(false);
                    onCreateNew();
                  }}
                  className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-primary/30 px-4 py-3 text-left text-primary transition-colors hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">New project</span>
                </button>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{Trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 border-primary/20 bg-background/95 backdrop-blur-xl">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.22em] text-primary/80">
          Switch Workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((p) => {
          const isActive = p.id === activeProject?.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onSwitch(p.id)}
              className={cn('gap-3 py-2.5', isActive && 'bg-primary/10 text-foreground')}
            >
              <FolderKanban className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate text-sm">{p.name}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {onCreateNew && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateNew} className="gap-3 py-2.5 text-primary">
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">New project</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
