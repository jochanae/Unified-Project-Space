import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShieldCheck, AlertTriangle, ImageOff, RefreshCw, CheckCircle2,
  Users, MessageSquare, Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface UserOption {
  user_id: string;
  user_name: string;
  companion_count: number;
  sub_status: 'premium' | 'canceled' | 'none';
}

interface UserStats {
  total_connections: number;
  missing_avatars: number;
  with_avatar: number;
  total_messages: number;
  total_milestones: number;
  orphaned_chat: number;
  orphaned_milestones: number;
}

interface UserIntegrityViewProps {
  currentUserId: string;
}

export default function UserIntegrityView({ currentUserId }: UserIntegrityViewProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);

  // Load user list + subscription status
  useEffect(() => {
    (async () => {
      const [{ data: userData, error }, { data: subsData }] = await Promise.all([
        supabase.rpc('admin_list_users'),
        supabase.from('subscriptions').select('user_id, plan, status'),
      ]);
      if (!error && userData) {
        const subMap = new Map<string, 'premium' | 'canceled' | 'none'>();
        for (const s of (subsData || []) as any[]) {
          if (s.status === 'active' && (s.plan === 'premium' || s.plan === 'admin')) {
            subMap.set(s.user_id, 'premium');
          } else if (s.status === 'canceled' && !subMap.has(s.user_id)) {
            subMap.set(s.user_id, 'canceled');
          }
        }
        setUsers((userData as any[]).map(u => ({
          user_id: u.user_id,
          user_name: u.user_name,
          companion_count: Number(u.companion_count),
          sub_status: subMap.get(u.user_id) || 'none',
        })));
      }
    })();
  }, []);

  const runScan = useCallback(async () => {
    if (!selectedUserId) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.rpc('admin_user_integrity', {
        p_target_user_id: selectedUserId,
      });
      if (error) throw error;
      setStats(data as unknown as UserStats);
    } catch (e) {
      console.error('User scan failed:', e);
      toast.error('User scan failed');
    }
    setScanning(false);
  }, [selectedUserId]);

  useEffect(() => { runScan(); }, [runScan]);

  const runRepair = async () => {
    setRepairing(true);
    try {
      const [
        { data: chatMembers },
        { data: milestoneMembers },
        { data: connections },
        { data: feedPosts },
        { data: mediaItems },
      ] = await Promise.all([
        supabase.from('chat_messages').select('member_id').eq('user_id', selectedUserId),
        supabase.from('companion_milestones').select('member_id').eq('user_id', selectedUserId),
        supabase.from('connections').select('member_id, avatar_url').eq('user_id', selectedUserId),
        supabase.from('companion_feed_posts')
          .select('member_id, member_name, member_handle, member_personality, member_bio, member_age, member_gender, member_avatar_url')
          .eq('user_id', selectedUserId),
        supabase.from('companion_media')
          .select('member_id, image_url')
          .eq('user_id', selectedUserId)
          .eq('media_type', 'avatar')
          .order('created_at', { ascending: false }),
      ]);

      const connIds = new Set((connections || []).map(c => c.member_id));
      const orphanIds = new Set<string>();
      for (const m of (chatMembers || [])) if (!connIds.has(m.member_id)) orphanIds.add(m.member_id);
      for (const m of (milestoneMembers || [])) if (!connIds.has(m.member_id)) orphanIds.add(m.member_id);

      const feedLookup = new Map<string, any>();
      for (const p of (feedPosts || [])) if (!feedLookup.has(p.member_id)) feedLookup.set(p.member_id, p);

      const avatarLookup = new Map<string, string>();
      for (const m of (mediaItems || [])) if (!avatarLookup.has(m.member_id)) avatarLookup.set(m.member_id, m.image_url);

      let restored = 0;
      for (const memberId of orphanIds) {
        const post = feedLookup.get(memberId);
        const avatarUrl = post?.member_avatar_url || avatarLookup.get(memberId) || null;
        await supabase.from('connections').insert({
          user_id: selectedUserId,
          member_id: memberId,
          name: post?.member_name || 'Friend',
          is_created: true,
          last_message: 'Restored 💛',
          handle: post?.member_handle || null,
          personality: post?.member_personality || null,
          bio: post?.member_bio || null,
          age: post?.member_age || null,
          gender: post?.member_gender || null,
          avatar_url: avatarUrl,
        });
        restored++;
      }

      let patched = 0;
      for (const conn of (connections || [])) {
        if (conn.avatar_url) continue;
        const mediaAvatar = avatarLookup.get(conn.member_id);
        const feedPost = feedLookup.get(conn.member_id);
        const recoveredAvatar = mediaAvatar || feedPost?.member_avatar_url;
        if (recoveredAvatar) {
          await supabase.from('connections').update({ avatar_url: recoveredAvatar }).eq('user_id', selectedUserId).eq('member_id', conn.member_id);
          await supabase.from('companion_feed_posts').update({ member_avatar_url: recoveredAvatar } as any).eq('user_id', selectedUserId).eq('member_id', conn.member_id);
          patched++;
        }
      }

      if (restored > 0 || patched > 0) {
        toast.success(`Repaired: ${restored} restored, ${patched} avatars patched`);
      } else {
        toast.success('Everything looks healthy — no repairs needed!');
      }
      await runScan();
    } catch (e) {
      console.error('Repair failed:', e);
      toast.error('Repair failed');
    }
    setRepairing(false);
  };

  const isHealthy = stats && stats.orphaned_chat === 0 && stats.orphaned_milestones === 0 && stats.missing_avatars === 0;
  const selectedUser = users.find(u => u.user_id === selectedUserId);

  return (
    <div className="space-y-4">
      {/* User Picker */}
      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a user…" />
        </SelectTrigger>
        <SelectContent>
          {users.map(u => (
            <SelectItem key={u.user_id} value={u.user_id}>
              {u.sub_status === 'premium' ? '💎 ' : u.sub_status === 'canceled' ? '⊘ ' : ''}
              {u.user_name} ({u.companion_count} companion{u.companion_count !== 1 ? 's' : ''})
              {u.user_id === currentUserId ? ' — you' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Health Banner */}
      {stats && (
        <Card className={isHealthy ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}>
          <CardContent className="flex items-center gap-3 py-4">
            {isHealthy ? (
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm flex items-center gap-2 flex-wrap">
                {selectedUser?.user_name || 'User'}
                {selectedUser?.sub_status === 'premium' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">💎 Premium</span>
                )}
                {selectedUser?.sub_status === 'canceled' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Canceled</span>
                )}
                <span className="text-muted-foreground font-normal">— {isHealthy ? 'all synced' : 'issues found'}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.total_connections} companion{stats.total_connections !== 1 ? 's' : ''} connected
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={runScan} disabled={scanning} className="gap-1.5 shrink-0">
              <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} /> Scan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.total_connections}</p>
                <p className="text-[10px] text-muted-foreground">Total Companions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.with_avatar}</p>
                <p className="text-[10px] text-muted-foreground">With Avatar</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.total_messages}</p>
                <p className="text-[10px] text-muted-foreground">Chat Messages</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.total_milestones}</p>
                <p className="text-[10px] text-muted-foreground">Milestones</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues */}
      {stats && !isHealthy && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Issues Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.orphaned_chat > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{stats.orphaned_chat} orphaned chat companion{stats.orphaned_chat !== 1 ? 's' : ''}</span>
              </div>
            )}
            {stats.orphaned_milestones > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{stats.orphaned_milestones} orphaned milestone companion{stats.orphaned_milestones !== 1 ? 's' : ''}</span>
              </div>
            )}
            {stats.missing_avatars > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ImageOff className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{stats.missing_avatars} companion{stats.missing_avatars !== 1 ? 's' : ''} missing avatar</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Repair Button */}
      <Button
        onClick={runRepair}
        disabled={repairing || scanning}
        className="w-full gap-1.5"
        variant={isHealthy ? 'outline' : 'default'}
      >
        <RefreshCw className={`h-4 w-4 ${repairing ? 'animate-spin' : ''}`} />
        {repairing ? 'Repairing…' : isHealthy ? 'Re-run Full Repair' : 'Repair All Issues'}
      </Button>
    </div>
  );
}
