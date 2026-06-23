import { useFunnelHub } from '@/features/projects';
import { ChevronDown, FolderKanban, Check, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Props {
  onCreateNew?: () => void;
}

/**
 * Compact project switcher pinned to the top header (next to the IntoIQ logo).
 * Hides itself entirely when the user has 0 projects (nothing to switch).
 * Collapses to an icon-only pill on small screens to preserve header space.
 */
export function HeaderProjectSwitcher({ onCreateNew }: Props) {
  const { projects, activeProject, setActiveProject } = useFunnelHub();

  if (projects.length === 0) return null;

  const label = activeProject?.name ?? 'Select project';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2 sm:px-2.5',
            'text-xs font-medium text-foreground transition-all',
            'hover:border-primary/40 hover:bg-primary/10 active:scale-95 shrink-0',
            'shadow-[0_0_12px_hsl(var(--primary)/0.08)]',
          )}
          aria-label="Switch project"
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <FolderKanban className="h-3.5 w-3.5 text-primary sm:hidden" />
          <span className="hidden sm:inline max-w-[100px] md:max-w-[160px] truncate">
            {label}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 border-primary/20 bg-background/95 backdrop-blur-xl z-[100]"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.22em] text-primary/80">
          Switch Project
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((p) => {
          const isActive = p.id === activeProject?.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setActiveProject(p.id)}
              className={cn('gap-2.5 py-2', isActive && 'bg-primary/10 text-foreground')}
            >
              <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="flex-1 truncate text-sm">{p.name}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        {onCreateNew && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateNew} className="gap-2.5 py-2 text-primary">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">New project</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
