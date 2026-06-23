import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck, AlertTriangle, ImageOff, RefreshCw, CheckCircle2,
  Users, MessageSquare, Heart, Globe, UserX
} from 'lucide-react';
import { toast } from 'sonner';

interface PlatformStats {
  total_users: number;
  total_connections: number;
  total_messages: number;
  total_milestones: number;
  connections_missing_avatar: number;
  total_with_avatar: number;
  orphaned_chat_members: number;
  orphaned_milestone_members: number;
  users_with_issues: number;
}

export default function PlatformHealthView() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [scanning, setScanning] = useState(false);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.rpc('admin_platform_stats');
      if (error) throw error;
      setStats(data as unknown as PlatformStats);
    } catch (e) {
      console.error('Platform scan failed:', e);
      toast.error('Platform scan failed');
    }
    setScanning(false);
  }, []);

  useEffect(() => { runScan(); }, [runScan]);

  const isHealthy = stats &&
    stats.orphaned_chat_members === 0 &&
    stats.orphaned_milestone_members === 0 &&
    stats.connections_missing_avatar === 0;

  return (
    <div className="space-y-4">
      {/* Health Banner */}
      <Card className={isHealthy ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}>
        <CardContent className="flex items-center gap-3 py-4">
          {isHealthy ? (
            <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm">
              {isHealthy ? 'Platform healthy — no issues detected' : 'Platform issues detected'}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.total_users} user${stats.total_users !== 1 ? 's' : ''} · ${stats.total_connections} companion${stats.total_connections !== 1 ? 's' : ''} across platform` : 'Scanning…'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanning} className="gap-1.5 shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} /> Scan
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.total_users}</p>
                <p className="text-[10px] text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
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
                <p className="text-lg font-bold text-foreground">{stats.total_with_avatar}</p>
                <p className="text-[10px] text-muted-foreground">With Avatar</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <ImageOff className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.connections_missing_avatar}</p>
                <p className="text-[10px] text-muted-foreground">Missing Avatar</p>
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

      {/* Issues List */}
      {stats && !isHealthy && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Platform Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.orphaned_chat_members > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{stats.orphaned_chat_members} orphaned chat companion{stats.orphaned_chat_members !== 1 ? 's' : ''}</span>
              </div>
            )}
            {stats.orphaned_milestone_members > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{stats.orphaned_milestone_members} orphaned milestone companion{stats.orphaned_milestone_members !== 1 ? 's' : ''}</span>
              </div>
            )}
            {stats.connections_missing_avatar > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ImageOff className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{stats.connections_missing_avatar} companion{stats.connections_missing_avatar !== 1 ? 's' : ''} missing avatar</span>
              </div>
            )}
            {stats.users_with_issues > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <UserX className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{stats.users_with_issues} user{stats.users_with_issues !== 1 ? 's' : ''} affected</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
