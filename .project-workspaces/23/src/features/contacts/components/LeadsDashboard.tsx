import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Mail, Calendar, TrendingUp, ExternalLink, Search, Rocket, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Contact } from '@/features/contacts';
import { EmptyState } from '@/components/shared/EmptyState';
import { LeadTemperatureBadge } from '@/components/shared/LeadTemperatureBadge';
import { WinCardDialog } from '@/components/shared/WinCardDialog';
import type { WinCardInput } from '@/lib/win-card';

interface LeadsDashboardProps {
  projectId: string;
}

export function LeadsDashboard({ projectId }: LeadsDashboardProps) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [winCard, setWinCard] = useState<WinCardInput | null>(null);
  const celebratedRef = useRef<Set<number>>(new Set());

  const projectName = user?.orgId ? undefined : undefined; // resolved below

  useEffect(() => {
    if (!user?.orgId) return;

    const fetchContacts = async () => {
      setLoading(true);
      const { data, count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('org_id', user.orgId)
        .eq('source_project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      setContacts(data || []);
      setTotalCount(count || 0);
      setLoading(false);
    };

    fetchContacts();

    // Realtime subscription
    const channel = supabase
      .channel(`leads-dashboard-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'contacts',
        filter: `source_project_id=eq.${projectId}`,
      }, (payload) => {
        setContacts(prev => [payload.new as Contact, ...prev]);
        setTotalCount(prev => {
          const next = prev + 1;
          // Milestone celebration: 1, 10, 50, 100, 500, 1000
          const MILESTONES = [1, 10, 50, 100, 500, 1000];
          if (MILESTONES.includes(next) && !celebratedRef.current.has(next)) {
            celebratedRef.current.add(next);
            setWinCard({
              milestone: next === 1 ? 'first_lead' : 'lead_milestone',
              headline: next === 1 ? 'First lead captured' : `${next} leads captured`,
              metric: next === 1 ? '1' : String(next),
              subtitle: 'Your funnel is converting.',
            });
          }
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, user?.orgId]);

  const filtered = search
    ? contacts.filter(c =>
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.first_name?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  const todayCount = contacts.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="glass rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Leads</h3>
              <p className="text-xs text-muted-foreground">Contacts captured from your funnel</p>
            </div>
          </div>
          {totalCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              onClick={() => setWinCard({
                milestone: 'lead_milestone',
                headline: `${totalCount} ${totalCount === 1 ? 'lead' : 'leads'} captured`,
                metric: String(totalCount),
                subtitle: 'Your funnel is converting.',
              })}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share win
            </Button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-card/30 border border-border/20 p-3 text-center">
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
          </div>
          <div className="rounded-lg bg-card/30 border border-border/20 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{todayCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
          </div>
          <div className="rounded-lg bg-card/30 border border-border/20 p-3 text-center">
            <p className="text-2xl font-bold">
              {totalCount > 0 ? `${Math.round((todayCount / Math.max(totalCount, 1)) * 100)}%` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Growth</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-border/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="pl-9 h-8 text-sm bg-card/20 border-border/20"
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
            Loading contacts…
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            <div className="p-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No matching contacts</p>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                variant="compact"
                icon={Rocket}
                title="No leads yet"
                description="Deploy a funnel to start capturing contacts here."
                ctaLabel="Quick Launch"
                onCta={() => navigate('/launch')}
              />
            </div>
          )
        ) : (
          <div className="divide-y divide-border/10">
            {filtered.map(contact => (
              <div key={contact.id} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/20 transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-3.5 w-3.5 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">
                      {contact.first_name || contact.email.split('@')[0]}
                    </p>
                    <LeadTemperatureBadge contact={contact} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">
                    {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}
                  </p>
                  {contact.tags?.length > 0 && (
                    <span className="text-[9px] text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded-full">
                      {contact.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalCount > 50 && (
        <div className="px-5 py-2 border-t border-border/20 text-center">
          <p className="text-[10px] text-muted-foreground">Showing 50 of {totalCount} contacts</p>
        </div>
      )}

      {winCard && (
        <WinCardDialog
          open={!!winCard}
          onOpenChange={(o) => !o && setWinCard(null)}
          input={winCard}
        />
      )}
    </div>
  );
}
