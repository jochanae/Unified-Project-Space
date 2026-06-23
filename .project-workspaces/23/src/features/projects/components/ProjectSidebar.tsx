import { useState } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { useFunnelHub } from '@/features/projects';
import { FolderKanban, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { restoreProject } from '@/services/supabase-data';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/use-current-user';

export function ProjectSidebar() {
  const { projects, activeProjectId, setActiveProject, deleteProject } = useFunnelHub();
  const { isMobile, setOpenMobile } = useSidebar();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const qc = useQueryClient();
  const { user } = useCurrentUser();

  const handleSelectProject = (id: string) => {
    setActiveProject(id);
    if (isMobile) setOpenMobile(false);
  };

  const confirmDelete = () => {
    if (!target) return;
    const { id, name } = target;
    deleteProject(id);
    setTarget(null);
    toast.success(`Moved "${name}" to Trash`, {
      description: 'Recoverable for 30 days.',
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            await restoreProject(id);
            qc.invalidateQueries({ queryKey: ['projects', user?.orgId] });
            toast.success(`Restored "${name}"`);
          } catch {
            toast.error('Could not restore project');
          }
        },
      },
      duration: 8000,
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="overflow-y-auto overscroll-contain">
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map(p => (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton
                    onClick={() => handleSelectProject(p.id)}
                    isActive={p.id === activeProjectId}
                    className="group justify-between"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FolderKanban className="h-4 w-4 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </span>
                    {projects.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => { e.stopPropagation(); setTarget({ id: p.id, name: p.name }); }}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move "{target?.name}" to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              The project will be hidden and recoverable for 30 days from Projects → Trash.
              After 30 days it will be permanently deleted along with all its funnels, pages and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Undo2 className="h-3 w-3 mr-1.5" /> Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
