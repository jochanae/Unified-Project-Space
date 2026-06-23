import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Tag, X, Plus, Save, Trash2, Activity, Mail as MailIcon, MousePointerClick, Eye, FileText, UserPlus } from 'lucide-react';
import { Contact, PIPELINE_STAGES, PipelineStage } from '@/features/contacts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LeadTemperatureBadge } from '@/components/shared/LeadTemperatureBadge';
import { useContactActivity, ActivityKind } from '@/features/contacts/hooks/use-contact-activity';

const ACTIVITY_ICON: Record<ActivityKind, typeof Activity> = {
  lead: UserPlus,
  submission: FileText,
  followup: MailIcon,
  open: Eye,
  click: MousePointerClick,
};

interface ContactDetailSheetProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Contact>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddTag: (id: string, tag: string) => Promise<void>;
  onRemoveTag: (id: string, tag: string) => Promise<void>;
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contacted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  qualified: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  proposal: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lost: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function ContactDetailSheet({
  contact, open, onClose, onUpdate, onDelete, onAddTag, onRemoveTag
}: ContactDetailSheetProps) {
  const [newTag, setNewTag] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', notes: '' });
  const { events, loading: activityLoading } = useContactActivity(
    open && contact ? contact.id : null,
    open && contact ? contact.email : null,
  );

  const startEdit = () => {
    if (!contact) return;
    setForm({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      phone: contact.phone || '',
      notes: contact.notes || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!contact) return;
    try {
      await onUpdate(contact.id, form as any);
      setEditing(false);
      toast.success('Contact updated');
    } catch { toast.error('Failed to update'); }
  };

  const handleAddTag = async () => {
    if (!contact || !newTag.trim()) return;
    await onAddTag(contact.id, newTag.trim().toLowerCase());
    setNewTag('');
  };

  const handleDelete = async () => {
    if (!contact) return;
    await onDelete(contact.id);
    onClose();
    toast.success('Contact deleted');
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="glass border-border/30 w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-semibold truncate">
                  {contact.first_name || contact.email.split('@')[0]}
                  {contact.last_name ? ` ${contact.last_name}` : ''}
                </p>
                <LeadTemperatureBadge contact={contact} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground font-normal truncate">{contact.email}</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Pipeline Stage */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Pipeline Stage</label>
            <Select
              value={contact.pipeline_stage}
              onValueChange={(v) => onUpdate(contact.id, { pipeline_stage: v } as any)}
            >
              <SelectTrigger className="bg-card/30 border-border/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Score */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Lead Score</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={contact.score}
                onChange={e => onUpdate(contact.id, { score: parseInt(e.target.value) || 0 } as any)}
                className="w-24 bg-card/30 border-border/20"
              />
              <div className="flex-1 h-2 rounded-full bg-card/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(contact.score, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(contact.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1 bg-primary/5 border-primary/10">
                  {tag}
                  <button onClick={() => onRemoveTag(contact.id, tag)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add tag…"
                className="bg-card/30 border-border/20 h-8 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              />
              <Button size="sm" variant="ghost" onClick={handleAddTag} className="h-8 px-2">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Details</label>
              {!editing && (
                <Button size="sm" variant="ghost" onClick={startEdit} className="h-6 text-xs">Edit</Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" className="bg-card/30 border-border/20 h-8 text-sm" />
                  <Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" className="bg-card/30 border-border/20 h-8 text-sm" />
                </div>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="bg-card/30 border-border/20 h-8 text-sm" />
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes…" className="bg-card/30 border-border/20 text-sm min-h-[80px]" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="gap-1"><Save className="h-3.5 w-3.5" />Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />{contact.email}
                </div>
                {contact.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />{contact.phone}
                  </div>
                )}
                {contact.notes && (
                  <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{contact.notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Activity */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Recent Activity
            </label>
            {activityLoading ? (
              <p className="text-xs text-muted-foreground/60">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No activity yet.</p>
            ) : (
              <ol className="relative space-y-2.5 pl-4 border-l border-border/30">
                {events.map(ev => {
                  const Icon = ACTIVITY_ICON[ev.kind] || Activity;
                  return (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[1.05rem] top-1 h-2 w-2 rounded-full bg-primary/60 ring-2 ring-background" />
                      <div className="flex items-start gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-tight">{ev.label}</p>
                          {ev.detail && <p className="text-[11px] text-muted-foreground truncate">{ev.detail}</p>}
                          <p className="text-[10px] text-muted-foreground/60">{new Date(ev.at).toLocaleString()}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Meta */}
          <div className="text-xs text-muted-foreground/60 space-y-1 pt-4 border-t border-border/20">
            <p>Created: {contact.created_at ? new Date(contact.created_at).toLocaleString() : '—'}</p>
            <p>ID: {contact.id}</p>
          </div>

          {/* Danger zone */}
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1 w-full" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete Contact
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
