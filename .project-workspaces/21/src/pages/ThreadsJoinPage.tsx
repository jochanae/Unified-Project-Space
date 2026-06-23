import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BookOpen, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';

export default function ThreadsJoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [accepted, setAccepted] = useState(false);

  // Look up invite + inviter profile
  const { data, isLoading, error } = useQuery({
    queryKey: ['thread-invite', code],
    queryFn: async () => {
      if (!code) throw new Error('No code');
      const { data: invite, error: invErr } = await supabase
        .from('thread_connections')
        .select('*')
        .eq('invite_code', code)
        .single();
      if (invErr || !invite) throw new Error('not_found');
      if (invite.status !== 'pending') throw new Error('already_used');
      if (user && invite.inviter_id === user.id) throw new Error('own_invite');

      // Fetch inviter profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('user_name, companion_avatar_url')
        .eq('user_id', invite.inviter_id)
        .single();

      return { invite, inviterName: prof?.user_name || 'Someone', inviterAvatar: prof?.companion_avatar_url };
    },
    enabled: !!code,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async () => {
      if (!user?.id || !data?.invite) throw new Error('Not ready');
      const { error: upErr } = await supabase
        .from('thread_connections')
        .update({
          invitee_id: user.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', data.invite.id)
        .eq('status', 'pending');
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      setAccepted(true);
      toast.success("You're connected! 💛");
      setTimeout(() => navigate('/threads'), 1200);
    },
    onError: () => toast.error('Failed to accept invite'),
  });

  // Error states
  const errMsg = error instanceof Error ? error.message : null;
  const isFriendly = errMsg === 'not_found' || errMsg === 'already_used' || errMsg === 'own_invite';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-6 space-y-5 text-center">
        <BookOpen className="h-8 w-8 text-amber-400 mx-auto" />

        {isLoading && (
          <div className="space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Looking up invite…</p>
          </div>
        )}

        {isFriendly && (
          <div className="space-y-2">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium">
              {errMsg === 'not_found' && 'This invite link is invalid or has expired.'}
              {errMsg === 'already_used' && 'This invite has already been accepted.'}
              {errMsg === 'own_invite' && "You can't accept your own invite!"}
            </p>
            <button
              onClick={() => navigate('/threads')}
              className="mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              Go to Threads →
            </button>
          </div>
        )}

        {!isLoading && !isFriendly && data && !accepted && (
          <div className="space-y-4">
            {data.inviterAvatar ? (
              <img src={data.inviterAvatar} alt="" className="h-16 w-16 rounded-full mx-auto border-2 border-amber-500/30 object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full mx-auto bg-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
                {data.inviterName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-foreground font-semibold">{data.inviterName}</p>
              <p className="text-sm text-muted-foreground">invited you to connect on Threads</p>
            </div>
            {!user ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Sign in to accept this invite</p>
                <button
                  onClick={() => navigate(`/auth?redirect=/threads/join/${code}`)}
                  className="w-full rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-sm font-medium py-2.5 transition-colors"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <button
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-sm font-medium py-2.5 transition-colors disabled:opacity-50"
              >
                {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Accept & Connect
              </button>
            )}
          </div>
        )}

        {accepted && (
          <div className="space-y-2">
            <p className="text-foreground font-medium">Connected! 💛</p>
            <p className="text-xs text-muted-foreground">Redirecting to Threads…</p>
          </div>
        )}
      </div>
    </div>
  );
}
