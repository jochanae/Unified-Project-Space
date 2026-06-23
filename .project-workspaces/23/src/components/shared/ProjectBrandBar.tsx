import { useNavigate } from 'react-router-dom';
import { FolderKanban, Palette, ChevronDown, AlertTriangle, Check } from 'lucide-react';
import { useFunnelHub } from '@/features/projects';
import { useBrandKit } from '@/features/marketing-studio/hooks/use-brand-kit';
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
  /** Extra class on the outer wrapper, e.g. "mb-6" */
  className?: string;
}

/**
 * ProjectBrandBar — one-line context strip for creation pages.
 *
 * Shows:
 *   [⊞ Project name ∨]  ·  [🎨 Brand name · Voice]  or  [⚠ No brand kit]
 *
 * Left chip: tappable project switcher dropdown.
 * Right chip: tappable — goes to /settings/brand.
 *
 * Use on: VideoPage, PageBuilderTab (desktop), StudioPage (replaces the
 * existing brand strip there).
 */
export function ProjectBrandBar({ className }: Props) {
  const navigate = useNavigate();
  const { projects, activeProject, setActiveProject } = useFunnelHub();
  const { effective: brand } = useBrandKit(activeProject?.id ?? null);

  const hasBrand = !!(brand?.brand_name?.trim());
  const accentHex = brand?.accent_hex;

  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap',
        className,
      )}
    >
      {/* ── Project switcher chip ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'group flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition-all',
              'border-border/25 bg-muted/30 text-foreground/70',
              'hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
              'active:scale-95',
              !activeProject && 'border-amber-500/30 bg-amber-500/5 text-amber-500/80',
            )}
          >
            <FolderKanban className="h-3 w-3 shrink-0" />
            <span className="max-w-[140px] truncate">
              {activeProject?.name ?? 'No project selected'}
            </span>
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/50 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 border-border/20 bg-background/95 backdrop-blur-xl z-[100]"
        >
          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
            Switch project
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {projects.length === 0 && (
            <DropdownMenuItem
              className="text-xs text-muted-foreground/50 cursor-default"
              disabled
            >
              No projects yet
            </DropdownMenuItem>
          )}
          {projects.map(p => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setActiveProject(p.id)}
              className="text-xs gap-2"
            >
              {p.id === activeProject?.id
                ? <Check className="h-3 w-3 text-primary shrink-0" />
                : <span className="h-3 w-3 shrink-0" />
              }
              <span className="truncate">{p.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate('/projects')}
            className="text-xs text-primary gap-2"
          >
            <FolderKanban className="h-3 w-3 shrink-0" />
            Manage projects
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Separator dot ── */}
      <span className="text-border/40 text-[10px] hidden sm:inline">·</span>

      {/* ── Brand kit chip ── */}
      <button
        type="button"
        onClick={() => navigate('/settings/brand')}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition-all',
          'active:scale-95',
          hasBrand
            ? 'border-border/25 bg-muted/30 text-foreground/70 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
            : 'border-amber-500/25 bg-amber-500/5 text-amber-500/80 hover:border-amber-500/40 hover:bg-amber-500/10',
        )}
        title={hasBrand ? 'Edit brand kit' : 'Set up brand kit for personalized output'}
      >
        {hasBrand ? (
          <>
            {/* Accent colour swatch */}
            {accentHex && (
              <span
                className="h-2 w-2 rounded-full shrink-0 ring-1 ring-black/10"
                style={{ background: accentHex }}
              />
            )}
            {!accentHex && <Palette className="h-3 w-3 shrink-0 text-primary" />}
            <span className="max-w-[140px] truncate">
              {brand.brand_name}
            </span>
            {brand?.voice && (
              <span className="text-muted-foreground/40 hidden sm:inline truncate max-w-[80px]">
                · {brand.voice}
              </span>
            )}
          </>
        ) : (
          <>
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>No brand kit</span>
          </>
        )}
      </button>
    </div>
  );
}
