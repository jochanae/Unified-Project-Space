import { useState } from 'react';
import {
  Users, UserPlus, Search, Filter, Flame, Snowflake, UserX,
  MoreVertical, Trash2, Tag, ChevronDown, ChevronUp, Mail,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSubscribers, Subscriber } from '../hooks/use-subscribers';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';

interface SubscriberDashboardProps {
  projectId?: string;
}

type StatusFilter = 'all' | 'active' | 'cold' | 'unsubscribed';

function EngagementIndicator({ score }: { score: number }) {
  if (score >= 70) return <Flame className="h-3.5 w-3.5 text-orange-400" />;
  if (score >= 40) return <Minus className="h-3.5 w-3.5 text-yellow-400" />;
  return <Snowflake className="h-3.5 w-3.5 text-blue-400" />;
}

function EngagementBadge({ score }: { score: number }) {
  const label = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';
  const variant = score >= 70 ? 'text-orange-400 border-orange-400/30 bg-orange-400/10'
    : score >= 40 ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
    : 'text-blue-400 border-blue-400/30 bg-blue-400/10';
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border', variant)}>
      <EngagementIndicator score={score} />
      {label}
    </span>
  );
}

export function SubscriberDashboard({ projectId }: SubscriberDashboardProps) {
  const { user } = useCurrentUser();
  const { subscribers, isLoading, stats, addSubscriber, updateSubscriber, deleteSubscriber } = useSubscribers(user?.orgId, projectId);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [addingNew, setAddingNew] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  const filtered = subscribers.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.email.toLowerCase().includes(q)
        || (s.firstName?.toLowerCase().includes(q))
        || (s.lastName?.toLowerCase().includes(q));
    }
    return true;
  });

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    try {
      await addSubscriber.mutateAsync({
        email: newEmail.trim(),
        firstName: newName.trim() || undefined,
        source: 'manual',
        projectId: projectId,
      });
      setNewEmail('');
      setNewName('');
      setAddingNew(false);
      toast.success('Subscriber added');
    } catch {
      toast.error('Failed to add subscriber');
    }
  };

  const handleStatusChange = async (sub: Subscriber, newStatus: string) => {
    try {
      await updateSubscriber.mutateAsync({ id: sub.id, status: newStatus });
      toast.success(`Marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (sub: Subscriber) => {
    try {
      await deleteSubscriber.mutateAsync(sub.id);
      toast.success('Subscriber removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="glass rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Subscriber Intelligence</p>
            <p className="text-xs text-muted-foreground">
              {stats.total} subscribers • {stats.active} active • Avg engagement: {stats.avgEngagement}%
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/30 animate-fade-in">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 pb-2">
            {[
              { label: 'Total', value: stats.total, icon: Users, color: 'text-primary' },
              { label: 'Active', value: stats.active, icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Cold', value: stats.cold, icon: TrendingDown, color: 'text-blue-400' },
              { label: 'Unsub', value: stats.unsubscribed, icon: UserX, color: 'text-muted-foreground' },
            ].map(stat => (
              <div key={stat.label} className="glass rounded-xl border border-border/30 p-3 text-center">
                <stat.icon className={cn('h-4 w-4 mx-auto mb-1', stat.color)} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-4 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search subscribers…"
                className="pl-8 h-8 text-xs bg-card/30 border-border/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                    <Filter className="h-3 w-3" />
                    {statusFilter === 'all' ? 'All' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(['all', 'active', 'cold', 'unsubscribed'] as StatusFilter[]).map(s => (
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-xs capitalize">
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="default" className="h-8 text-xs gap-1.5" onClick={() => setAddingNew(true)}>
                <UserPlus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>

          {/* Add New */}
          {addingNew && (
            <div className="px-4 py-2">
              <div className="glass rounded-xl border border-primary/30 p-3 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 h-8 text-xs bg-card/30"
                    type="email"
                  />
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Name (optional)"
                    className="flex-1 h-8 text-xs bg-card/30"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingNew(false)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={addSubscriber.isPending}>Add Subscriber</Button>
                </div>
              </div>
            </div>
          )}

          {/* Subscriber List */}
          <div className="px-4 pb-4 space-y-1 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8"><LoadingSpinner size="md" text="Loading subscribers…" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {search || statusFilter !== 'all' ? 'No matching subscribers' : 'No subscribers yet'}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Subscribers are captured from opt-in forms automatically
                </p>
              </div>
            ) : (
              filtered.map(sub => (
                <div
                  key={sub.id}
                  className="glass rounded-xl border border-border/30 hover:border-primary/20 p-3 flex items-center gap-3 transition-colors"
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary uppercase">
                      {(sub.firstName?.[0] || sub.email[0])}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {sub.firstName ? `${sub.firstName} ${sub.lastName || ''}`.trim() : sub.email}
                      </p>
                      <EngagementBadge score={sub.engagementScore} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground truncate">{sub.email}</p>
                      {sub.source !== 'manual' && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{sub.source}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {sub.status !== 'active' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(sub, 'active')} className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-2" /> Mark Active
                        </DropdownMenuItem>
                      )}
                      {sub.status !== 'cold' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(sub, 'cold')} className="text-xs">
                          <Snowflake className="h-3 w-3 mr-2" /> Mark Cold
                        </DropdownMenuItem>
                      )}
                      {sub.status !== 'unsubscribed' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(sub, 'unsubscribed')} className="text-xs">
                          <UserX className="h-3 w-3 mr-2" /> Unsubscribe
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(sub)} className="text-xs text-destructive">
                        <Trash2 className="h-3 w-3 mr-2" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
