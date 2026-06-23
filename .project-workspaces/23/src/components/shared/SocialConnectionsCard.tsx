import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Linkedin, Loader2, Unlink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Connection {
  id: string;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  token_expires_at: string | null;
  created_at: string;
}

export function SocialConnectionsCard() {
  const [conn, setConn] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('connected_social_accounts')
      .select('id, platform_display_name, platform_avatar_url, token_expires_at, created_at')
      .eq('platform', 'linkedin')
      .maybeSingle();
    setConn(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle redirect-back from LinkedIn callback
  useEffect(() => {
    const status = searchParams.get('linkedin');
    if (!status) return;
    if (status === 'connected') {
      toast.success('LinkedIn connected');
      load();
    } else if (status === 'error') {
      toast.error(`LinkedIn connection failed: ${searchParams.get('reason') ?? 'unknown'}`);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('linkedin');
    next.delete('reason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, load]);

  const connect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-oauth-init', {
        body: {},
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error('No auth URL returned');

      // Open LinkedIn OAuth in a popup, poll for connection
      const popup = window.open(data.authUrl, 'linkedin-oauth', 'width=600,height=720');
      if (!popup) {
        // Popup blocked — fall back to full redirect
        window.location.href = data.authUrl;
        return;
      }

      setPolling(true);
      const start = Date.now();
      const interval = setInterval(async () => {
        if (Date.now() - start > 120_000 || popup.closed) {
          clearInterval(interval);
          setPolling(false);
          setConnecting(false);
          await load();
          return;
        }
        const { data: row } = await supabase
          .from('connected_social_accounts')
          .select('id, platform_display_name, platform_avatar_url, token_expires_at, created_at')
          .eq('platform', 'linkedin')
          .maybeSingle();
        if (row) {
          clearInterval(interval);
          setPolling(false);
          setConnecting(false);
          setConn(row);
          toast.success('LinkedIn connected');
          try { popup.close(); } catch { /* noop */ }
        }
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start LinkedIn connection');
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!conn) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('connected_social_accounts')
        .delete()
        .eq('id', conn.id);
      if (error) throw error;
      setConn(null);
      toast.success('LinkedIn disconnected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-medium mb-5 flex items-center gap-2">
        <Linkedin className="h-5 w-5 text-primary" /> Social Connections
      </h2>

      <div className="rounded-xl border border-border/40 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#0a66c2]/10 flex items-center justify-center shrink-0">
          <Linkedin className="h-5 w-5 text-[#0a66c2]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">LinkedIn</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Checking…</p>
          ) : conn ? (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Connected
              </Badge>
              {conn.platform_display_name && (
                <span className="text-xs text-muted-foreground truncate">
                  as {conn.platform_display_name}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Connect once to publish posts directly from IntoIQ.
            </p>
          )}
        </div>
        {conn ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            disabled={disconnecting}
            className="gap-1.5 text-xs"
          >
            {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={connect} disabled={connecting} className="gap-1.5">
            {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Linkedin className="h-3.5 w-3.5" />}
            {polling ? 'Waiting…' : 'Connect'}
          </Button>
        )}
      </div>
    </section>
  );
}
