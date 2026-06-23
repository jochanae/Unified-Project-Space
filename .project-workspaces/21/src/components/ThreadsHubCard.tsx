import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, UserPlus, Users, Plus, ChevronRight, Clock, Copy, X, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ThreadsHubCardProps {
  userId: string;
  userName?: string;
}

interface ThreadFriend {
  id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  invite_code: string;
  accepted_at: string | null;
  invite_label: string | null;
}

interface LatestMoment {
  content: string;
  user_name: string;
  created_at: string;
  avatar_url: string | null;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ThreadsHubCard({ userId, userName }: ThreadsHubCardProps) {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ThreadFriend[]>([]);
  const [latestMoment, setLatestMoment] = useState<LatestMoment | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [inviteLabel, setInviteLabel] = useState('');

  const acceptedCount = connections.filter(c => c.status === 'accepted').length;
  const pendingInvites = connections.filter(
    c => c.status === 'pending' && c.inviter_id === userId
  );
  const receivedInvites = connections.filter(
    c => c.status === 'pending' && c.invitee_id === userId
  );

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      const [connectionsRes, momentsRes] = await Promise.all([
        supabase
          .from('thread_connections')
          .select('id, inviter_id, invitee_id, status, invite_code, accepted_at, invite_label')
          .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`),
        supabase
          .from('user_posts')
          .select('content, user_name, created_at, avatar_url')
          .eq('visibility', 'thread')
          .or(`user_id.eq.${userId},thread_friend_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (connectionsRes.data) setConnections(connectionsRes.data);
      if (momentsRes.data) setLatestMoment(momentsRes.data);
      setLoading(false);
    };

    loadData();
  }, [userId]);

  const shareInviteLink = async (link: string, label: string | null) => {
    // Use the sender's actual name in the message — not the label.
    // The label is just the sender's internal note for who they're inviting.
    const senderName = userName || 'Someone';
    const recipientHint = label ? ` (for ${label})` : '';
    const shareText = `${senderName} invited you to connect on Compani 💛${recipientHint}`;

    // Try native share sheet first (works on Android/iOS PWA & Chrome)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Compani',
          text: shareText,
          url: link,
        });
        return; // Share sheet handled it
      } catch (err: any) {
        // User cancelled share — don't fall through to clipboard
        if (err?.name === 'AbortError') return;
        // Other error — fall through to clipboard fallback
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied!', {
        description: 'Paste it into a text, DM, or email to send to your friend',
      });
    } catch {
      toast.error('Could not copy link — try again');
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingCode(true);
    try {
      const label = inviteLabel.trim() || null;
      const { data, error } = await supabase
        .from('thread_connections')
        .insert({ inviter_id: userId, invite_label: label } as any)
        .select('invite_code')
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/threads/join/${data.invite_code}`;

      // Reset input first so UI feels responsive
      setInviteLabel('');
      setShowNameInput(false);

      // Refresh connections list
      const { data: refreshed } = await supabase
        .from('thread_connections')
        .select('id, inviter_id, invitee_id, status, invite_code, accepted_at, invite_label')
        .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`);
      if (refreshed) setConnections(refreshed as any);

      // Open share sheet (or clipboard fallback)
      await shareInviteLink(link, label);
    } catch (e: any) {
      toast.error('Could not create invite — try again');
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyInviteLink = async (code: string) => {
    const link = `${window.location.origin}/threads/join/${code}`;
    await shareInviteLink(link, null);
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('thread_connections')
        .delete()
        .eq('id', inviteId);
      if (error) throw error;
      setConnections((prev) => prev.filter((c) => c.id !== inviteId));
      toast.success('Invite cancelled');
    } catch {
      toast.error('Could not cancel invite');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/30 bg-white/5 backdrop-blur-xl p-4 animate-pulse">
        <div className="h-4 w-24 bg-muted/40 rounded mb-3" />
        <div className="h-12 bg-muted/20 rounded-xl" />
      </div>
    );
  }

  return (
    <section>
      <div className="mb-2.5 px-1 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Your Threads
        </p>
        <button
          onClick={() => navigate('/threads')}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]"
      >
        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{acceptedCount}</span>
            <span>friend{acceptedCount !== 1 ? 's' : ''}</span>
          </div>
          {pendingInvites.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{pendingInvites.length} pending</span>
            </div>
          )}
          {receivedInvites.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <UserPlus className="h-3.5 w-3.5" />
              <span>{receivedInvites.length} invite{receivedInvites.length > 1 ? 's' : ''} received</span>
            </div>
          )}
        </div>

        {/* Latest moment preview */}
        {latestMoment ? (
          <button
            onClick={() => navigate('/threads')}
            className="w-full flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 p-3 mb-3 text-left transition-all hover:bg-white/10 active:scale-[0.98]"
          >
            {latestMoment.avatar_url ? (
              <img
                src={latestMoment.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{latestMoment.user_name}</span>
                {' · '}
                {formatTimeAgo(latestMoment.created_at)}
              </p>
              <p className="truncate text-sm text-foreground/80 mt-0.5">
                {latestMoment.content}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 p-3 mb-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No moments yet — share one or invite a friend
            </p>
          </div>
        )}

        {/* Pending invite codes (expandable) */}
        {pendingInvites.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {pendingInvites.slice(0, 2).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{inv.invite_label ? `For ${inv.invite_label} — waiting` : 'Invite link — waiting for friend'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyInviteLink(inv.invite_code)}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    className="flex items-center gap-1 text-[11px] font-medium text-destructive/70 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Name input for invite */}
        {showNameInput && (
          <div className="mb-3 space-y-2">
            <p className="text-xs text-muted-foreground px-0.5">
              Add a label so you know who this invite is for — then share the link via text, WhatsApp, or email.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviteLabel}
                onChange={(e) => setInviteLabel(e.target.value)}
                placeholder="e.g. Jayden, Mom, Sarah…"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateInvite(); }}
              />
              <button
                onClick={handleGenerateInvite}
                disabled={generatingCode}
                className="rounded-lg bg-primary/20 border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Share2 className="h-3 w-3" />
                {generatingCode ? '…' : 'Share'}
              </button>
              <button
                onClick={() => { setShowNameInput(false); setInviteLabel(''); }}
                className="rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-xs text-muted-foreground hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/threads')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]"
          >
            <Plus className="h-3.5 w-3.5" />
            Post a Moment
          </button>
          {!showNameInput && (
            <button
              onClick={() => setShowNameInput(true)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-white/10 transition-colors active:scale-[0.97]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite Friend
            </button>
          )}
        </div>
      </motion.div>
    </section>
  );
}
