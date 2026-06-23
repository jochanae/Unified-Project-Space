import { useState } from 'react';
import { Contact, PIPELINE_STAGES, PipelineStage } from '@/features/contacts';
import { cn } from '@/lib/utils';
import { Mail, User, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LeadTemperatureBadge } from '@/components/shared/LeadTemperatureBadge';

interface PipelineViewProps {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  onMoveToStage: (id: string, stage: PipelineStage) => Promise<void>;
}

const STAGE_META: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: 'text-blue-400', bg: 'border-blue-500/30 bg-blue-500/5' },
  contacted: { label: 'Contacted', color: 'text-amber-400', bg: 'border-amber-500/30 bg-amber-500/5' },
  qualified: { label: 'Qualified', color: 'text-purple-400', bg: 'border-purple-500/30 bg-purple-500/5' },
  proposal: { label: 'Proposal', color: 'text-cyan-400', bg: 'border-cyan-500/30 bg-cyan-500/5' },
  won: { label: 'Won', color: 'text-emerald-400', bg: 'border-emerald-500/30 bg-emerald-500/5' },
  lost: { label: 'Lost', color: 'text-red-400', bg: 'border-red-500/30 bg-red-500/5' },
};

export function PipelineView({ contacts, onSelectContact, onMoveToStage }: PipelineViewProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = contacts.filter(c => c.pipeline_stage === stage);
    return acc;
  }, {} as Record<string, Contact[]>);

  const handleDrop = (stage: PipelineStage) => {
    if (draggedId) {
      onMoveToStage(draggedId, stage);
      setDraggedId(null);
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {PIPELINE_STAGES.map(stage => {
          const meta = STAGE_META[stage];
          const stageContacts = grouped[stage] || [];

          return (
            <div
              key={stage}
              className={cn(
                'w-52 rounded-xl border p-3 transition-colors min-h-[200px]',
                meta.bg,
                draggedId && 'ring-1 ring-primary/20'
              )}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(stage)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <h4 className={cn('text-xs font-semibold uppercase tracking-wider', meta.color)}>
                  {meta.label}
                </h4>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-card/30">
                  {stageContacts.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {stageContacts.map(contact => (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={() => setDraggedId(contact.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => onSelectContact(contact)}
                    className={cn(
                      'glass rounded-lg p-2.5 cursor-pointer border border-border/20',
                      'hover:border-primary/30 hover:bg-accent/10 transition-all',
                      draggedId === contact.id && 'opacity-50 scale-95'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <p className="text-sm font-medium truncate flex-1">
                        {contact.first_name || contact.email.split('@')[0]}
                      </p>
                      <LeadTemperatureBadge contact={contact} size="xs" />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />{contact.email}
                    </p>
                    {contact.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {contact.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{contact.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                    {contact.score > 0 && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <div className="flex-1 h-1 rounded-full bg-card/50 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(contact.score, 100)}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{contact.score}</span>
                      </div>
                    )}
                  </div>
                ))}

                {stageContacts.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground/40">Drop here</p>
                    <p className="text-[10px] text-muted-foreground/25 mt-1">Drag contacts to move them</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
