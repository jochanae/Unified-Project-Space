import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, ChevronDown, ChevronRight, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CardGroup {
  id: string;
  name: string;
  color: string;
  isCollapsed: boolean;
  cardIds: string[];
}

interface CardGroupManagerProps {
  groups: CardGroup[];
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onToggleCollapse: (groupId: string) => void;
  onGroupClick: (groupId: string) => void;
  activeGroupId: string | null;
}

const GROUP_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function CardGroupManager({
  groups,
  onCreateGroup,
  onDeleteGroup,
  onRenameGroup,
  onToggleCollapse,
  onGroupClick,
  activeGroupId,
}: CardGroupManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setIsCreating(false);
    }
  };

  const handleRename = (groupId: string) => {
    if (editingName.trim()) {
      onRenameGroup(groupId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const startEditing = (group: CardGroup) => {
    setEditingId(group.id);
    setEditingName(group.name);
  };

  return (
    <div className="bg-background/80 backdrop-blur-md rounded-xl border border-border p-3 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Groups</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="h-7 w-7 p-0"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Create new group input */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex gap-1">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name..."
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleCreate}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsCreating(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups list */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No groups yet. Create one to organize your visions!
          </p>
        ) : (
          groups.map((group, index) => (
            <motion.div
              key={group.id}
              layout
              className={cn(
                "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                activeGroupId === group.id 
                  ? "bg-primary/10 border border-primary/30" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => onGroupClick(group.id)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(group.id);
                }}
              >
                {group.isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
              
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: group.color || GROUP_COLORS[index % GROUP_COLORS.length] }}
              />
              
              {editingId === group.id ? (
                <div className="flex-1 flex gap-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-6 text-xs"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(group.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleRename(group.id); }}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm truncate">{group.name}</span>
                  <span className="text-xs text-muted-foreground">{group.cardIds.length}</span>
                  
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(group);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGroup(group.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
