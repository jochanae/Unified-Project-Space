import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import CommunityFeed from '@/components/CommunityFeed';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus, Copy, Share2, X } from 'lucide-react';
import RolePickerDialog from '@/components/RolePickerDialog';
import { treatAsMinor } from '@/lib/ageUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import type { CommunityMember } from '@/lib/communityPersonas';
import ThreadComposeCard from '@/components/ThreadComposeCard';
import LibraryOfYou from '@/components/LibraryOfYou';

interface ThreadFriend {
  odId: string; // the other user's id
  displayName: string;
}

export default function FeedPage() {
  const {
    profile, user, connections,
    isFavorited, toggleFavorite, handleConnectMember, updateConnection,
    activeConnection, setActiveConnectionIndex,
  } = useAppContext();
  const navigate = useNavigate();
  const [pendingMember, setPendingMember] = useState<CommunityMember | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [threadFriends, setThreadFriends] = useState<ThreadFriend[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadThreadFriends = async () => {
      const { data } = await supabase
        .from('thread_connections')
        .select('*')
        .eq('status', 'accepted');
      if (!data) return;

      const friendIds: string[] = [];
      for (const tc of data as any[]) {
        if (tc.inviter_id === user.id) friendIds.push(tc.invitee_id);
        else if (tc.invitee_id === user.id) friendIds.push(tc.inviter_id);
      }
      if (friendIds.length === 0) { setThreadFriends([]); return; }

      // Fetch display names from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, user_name')
        .in('user_id', friendIds);
      const nameMap: Record<string, string> = {};
      for (const p of profiles || []) {
        nameMap[p.user_id] = p.user_name;
      }
      setThreadFriends(friendIds.map((id) => ({ odId: id, displayName: nameMap[id] || 'Friend' })));
    };
    loadThreadFriends();
  }, [user]);

  if (!profile || !user) return null;

  const handleConnect = (member: CommunityMember) => {
    setPendingMember(member);
    setShowRolePicker(true);
  };

  const handleCreateInvite = async () => {
    if (creatingInvite) return;
    setCreatingInvite(true);
    try {
      const { data, error } = await supabase
        .from('thread_connections')
        .insert({ inviter_id: user.id, status: 'pending' })
        .select('invite_code')
        .single();
      if (error) throw error;
      setInviteCode(data.invite_code);
      setShowInvite(true);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setCreatingInvite(false);
    }
  };

  const inviteLink = inviteCode ? `${window.location.origin}/threads/join/${inviteCode}` : ''; // route already unified under /threads

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my Threads', text: 'Connect with me on Compani!', url: inviteLink });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  // Build a name map for thread friend IDs so CommunityFeed can label them
  const threadFriendNames: Record<string, string> = {};
  for (const f of threadFriends) {
    threadFriendNames[f.odId] = f.displayName;
  }

  return (
    <>
      <div className="px-4 pt-4 max-w-lg mx-auto flex items-center justify-between">
        <button onClick={() => navigate('/')} className="mb-2 flex items-center gap-1 text-sm text-white/70 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={handleCreateInvite}
          disabled={creatingInvite}
          className="mb-2 flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite
        </button>
      </div>

      {/* Thread friend compose cards */}
      {threadFriends.length > 0 && (
        <div className="px-4 max-w-lg mx-auto flex flex-col gap-2 mb-2">
          {threadFriends.map((f) => (
            <ThreadComposeCard
              key={f.odId}
              currentUserId={user.id}
              currentUserName={profile.userName}
              currentUsername={profile.username}
              currentAvatarUrl={profile.avatarUrl}
              friend={{ userId: f.odId, displayName: f.displayName }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showInvite && inviteCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowInvite(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-amber-500/20 bg-card/95 backdrop-blur-xl p-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-foreground">Your Invite Link</h3>
                <button onClick={() => setShowInvite(false)} className="rounded-full p-1 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <button
                onClick={() => { navigator.clipboard.writeText(inviteCode || ''); toast.success('Code copied!'); }}
                className="w-full rounded-xl border border-border bg-background/50 p-3 mb-4 text-left hover:bg-background/70 active:scale-[0.98] transition-all"
              >
                <p className="text-xs text-muted-foreground mb-1">Invite code · tap to copy</p>
                <p className="font-mono text-lg font-bold text-amber-300 tracking-wider">{inviteCode}</p>
              </button>

              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied!'); }}
                className="w-full rounded-xl border border-border bg-background/50 p-3 mb-4 text-left hover:bg-background/70 active:scale-[0.98] transition-all"
              >
                <p className="text-xs text-muted-foreground mb-1">Shareable link · tap to copy</p>
                <p className="text-xs text-foreground/80 break-all">{inviteLink}</p>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/30 transition-all"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RolePickerDialog
        open={showRolePicker}
        onOpenChange={setShowRolePicker}
        companionName={pendingMember?.name || 'this companion'}
        isMinor={treatAsMinor(profile?.dateOfBirth)}
        onSelectRole={async (role, _nameOverride, voiceId) => {
          if (!pendingMember) return;
          const member = pendingMember;
          setPendingMember(null);
          await handleConnectMember(member);
          await updateConnection(member.id, { connectionMode: role, ...(voiceId ? { voiceId } : {}) });
          toast.success(`${member.name} is now in your Messages 💛`, { duration: 3000 });
        }}
      />
      <LibraryOfYou userId={user.id} companionName={profile.companionName || 'Your companion'} />
      <CommunityFeed
        companionName={profile.companionName || null}
        userName={profile.userName}
        username={profile.username}
        userId={user.id}
        avatarUrl={profile.avatarUrl}
        vibe={profile.vibe}
        connectedMemberIds={connections.map((c) => c.memberId)}
        connectionNames={Object.fromEntries(connections.map((c) => [c.memberId, c.name]))}
        connectionAvatars={Object.fromEntries(connections.filter(c => c.avatarUrl).map((c) => [c.memberId, c.avatarUrl!]))}
        connectionRoles={Object.fromEntries(connections.filter(c => c.connectionMode).map((c) => [c.memberId, c.connectionMode!]))}
        activeCompanionId={activeConnection?.memberId}
        onConnectMember={handleConnect}
        onSwitchToMessages={() => navigate('/messages')}
        onSwitchCompanion={(memberId) => {
          const idx = connections.findIndex(c => c.memberId === memberId);
          if (idx >= 0) setActiveConnectionIndex(idx);
        }}
        isFavorited={isFavorited}
        onToggleFavorite={toggleFavorite}
        threadFriendNames={threadFriendNames}
      />
    </>
  );
}
