import { Plus, Briefcase, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description: string;
}

interface Props {
  projects: Project[];
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => void;
}

export default function ProjectSelector({ projects, onSelect, onCreate }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setCreating(false);
  };

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="text-center">
        <p
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Which project are we sharpening?
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Select a project to anchor your Signal, or start a new identity.
        </p>
      </div>

      {/* Existing projects */}
      <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              'group flex items-center gap-3 rounded-2xl border border-border/20 bg-card/30 p-4 backdrop-blur-sm text-left',
              'hover:border-primary/30 hover:bg-primary/5 transition-all duration-300',
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
              {p.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>

      {/* Create new */}
      {creating ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New project name..."
            className="bg-card/50 border-border/30"
            autoFocus
          />
          <Button onClick={handleCreate} disabled={!newName.trim()} size="sm">
            Create
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className={cn(
            'flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed border-primary/20 p-4',
            'text-sm font-medium text-primary/70 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-300',
          )}
        >
          <Plus className="h-4 w-4" />
          Start New Identity
        </button>
      )}
    </div>
  );
}
