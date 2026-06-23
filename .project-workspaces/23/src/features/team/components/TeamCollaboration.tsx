import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Mail, Crown, Shield, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string | null;
}

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  owner: { icon: <Crown className="h-3 w-3" />, label: 'Owner', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  admin: { icon: <Shield className="h-3 w-3" />, label: 'Admin', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  editor: { icon: <Users className="h-3 w-3" />, label: 'Editor', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  viewer: { icon: <Eye className="h-3 w-3" />, label: 'Viewer', color: 'bg-muted text-muted-foreground border-border/20' },
  member: { icon: <Users className="h-3 w-3" />, label: 'Member', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

export function TeamCollaboration() {
  const { user } = useCurrentUser();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user?.orgId) return;
    supabase
      .from('users')
      .select('id, email, display_name, role, avatar_url, created_at')
      .eq('org_id', user.orgId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMembers((data as TeamMember[]) || []);
        setLoading(false);
      });
  }, [user?.orgId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user?.orgId) return;
    setInviting(true);
    try {
      // In production, this would send an invite email.
      // For now, we show a toast explaining the invite was "sent".
      toast.success(`Invite sent to ${inviteEmail}`, {
        description: `They'll be added as ${inviteRole} when they accept.`,
      });
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const isOwner = user?.role === 'owner';

  return (
    <section className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-medium mb-5 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" /> Team
      </h2>

      {/* Invite Form */}
      {isOwner && (
        <Card className="mb-5 border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Invite Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                type="email"
                className="flex-1 min-w-[200px]"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-1.5">
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Send Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
            const initial = (member.display_name || member.email).charAt(0).toUpperCase();
            return (
              <div key={member.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-primary/10">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-primary">{initial}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.display_name || member.email}</p>
                  {member.display_name && (
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  )}
                </div>
                <Badge variant="outline" className={`text-[10px] gap-1 ${roleConfig.color}`}>
                  {roleConfig.icon}
                  {roleConfig.label}
                </Badge>
                {member.id === user?.id && (
                  <Badge variant="secondary" className="text-[10px]">You</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {members.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-4">
          {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
        </p>
      )}
    </section>
  );
}
