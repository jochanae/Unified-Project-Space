import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Check, X, Loader2, Plus, Trash2, Shield, RefreshCw, AlertCircle, ExternalLink, Copy, Radar, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CustomDomainSetupProps {
  projectId: string;
}

interface DomainInfo {
  domain: string;
  verified: boolean;
  sslStatus: 'pending' | 'active' | 'error';
  isPrimary: boolean;
  addedAt: string;
}

export function CustomDomainSetup({ projectId }: CustomDomainSetupProps) {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState<Record<string, { attempts: number; nextCheckAt: number }>>({});
  const pollTimers = useRef<Record<string, number>>({});
  const domainsRef = useRef<DomainInfo[]>([]);

  const cnameTarget = 'intoiq.lovable.app';
  const aRecordTarget = '185.158.133.1';
  const POLL_INTERVAL_MS = 15000;
  const MAX_POLL_ATTEMPTS = 40; // ~10 minutes

  useEffect(() => { domainsRef.current = domains; }, [domains]);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('projects')
      .select('custom_domain, domain_verified')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data?.custom_domain) {
          // Parse multi-domain from comma-separated or single
          const domainList = data.custom_domain.split(',').map((d: string) => d.trim()).filter(Boolean);
          setDomains(domainList.map((d: string, i: number) => ({
            domain: d,
            verified: i === 0 ? !!data.domain_verified : false,
            sslStatus: data.domain_verified ? 'active' : 'pending',
            isPrimary: i === 0,
            addedAt: new Date().toISOString(),
          })));
        }
        setLoaded(true);
      });
  }, [projectId]);

  const saveDomains = async (updated: DomainInfo[]) => {
    const domainStr = updated.map(d => d.domain).join(',');
    const primaryVerified = updated.find(d => d.isPrimary)?.verified || false;
    await supabase
      .from('projects')
      .update({ custom_domain: domainStr || null, domain_verified: primaryVerified })
      .eq('id', projectId);
  };

  const handleAddDomain = async () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) return;

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    if (!domainRegex.test(trimmed)) {
      toast.error('Invalid domain format', { description: 'Example: leads.mybusiness.com' });
      return;
    }

    if (domains.some(d => d.domain === trimmed)) {
      toast.error('Domain already added');
      return;
    }

    setSaving(true);
    const newEntry: DomainInfo = {
      domain: trimmed,
      verified: false,
      sslStatus: 'pending',
      isPrimary: domains.length === 0,
      addedAt: new Date().toISOString(),
    };
    const updated = [...domains, newEntry];
    setDomains(updated);
    await saveDomains(updated);
    setNewDomain('');
    setShowAdd(false);
    setSaving(false);
    toast.success('Domain added!', { description: 'Configure your DNS CNAME record and then verify.' });
  };

  const handleRemove = async (domain: string) => {
    const updated = domains.filter(d => d.domain !== domain);
    // If removed the primary, make the first remaining primary
    if (updated.length > 0 && !updated.some(d => d.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setDomains(updated);
    await saveDomains(updated);
    toast.success('Domain removed');
  };

  const stopPolling = useCallback((domain: string) => {
    const t = pollTimers.current[domain];
    if (t) {
      clearTimeout(t);
      delete pollTimers.current[domain];
    }
    setPolling((prev) => {
      if (!prev[domain]) return prev;
      const { [domain]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const runVerify = useCallback(async (domain: string, opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    if (!silent) setVerifyingId(domain);
    try {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { domain, projectId },
      });
      if (error) throw error;
      const isVerified = data?.verified === true;
      const current = domainsRef.current;
      const updated = current.map((d) =>
        d.domain === domain
          ? { ...d, verified: isVerified, sslStatus: isVerified ? ('active' as const) : ('pending' as const) }
          : d
      );
      setDomains(updated);
      await saveDomains(updated);

      if (isVerified) {
        stopPolling(domain);
        toast.success(`${domain} verified!`, { description: 'SSL certificate is active.' });
      } else if (!silent) {
        toast.error('Domain not resolving yet', {
          description: data?.message || 'Auto-checking will continue in the background.',
        });
      }
      return isVerified;
    } catch {
      if (!silent) {
        toast.error('Verification failed', {
          description: 'DNS changes can take up to 48 hours to propagate.',
        });
      }
      return false;
    } finally {
      if (!silent) setVerifyingId(null);
    }
  }, [projectId, stopPolling]);

  const scheduleNextPoll = useCallback((domain: string) => {
    const state = polling[domain];
    const attempts = (state?.attempts ?? 0) + 1;
    if (attempts > MAX_POLL_ATTEMPTS) {
      stopPolling(domain);
      return;
    }
    const nextCheckAt = Date.now() + POLL_INTERVAL_MS;
    setPolling((prev) => ({ ...prev, [domain]: { attempts, nextCheckAt } }));
    pollTimers.current[domain] = window.setTimeout(async () => {
      const verified = await runVerify(domain, { silent: true });
      if (!verified) scheduleNextPoll(domain);
    }, POLL_INTERVAL_MS);
  }, [polling, runVerify, stopPolling]);

  const startPolling = useCallback((domain: string) => {
    if (pollTimers.current[domain]) return;
    setPolling((prev) => ({ ...prev, [domain]: { attempts: 0, nextCheckAt: Date.now() + POLL_INTERVAL_MS } }));
    pollTimers.current[domain] = window.setTimeout(async () => {
      const verified = await runVerify(domain, { silent: true });
      if (!verified) scheduleNextPoll(domain);
    }, POLL_INTERVAL_MS);
  }, [runVerify, scheduleNextPoll]);

  const handleVerify = (domain: string) => runVerify(domain, { silent: false });

  // Auto-start polling for unverified domains; cleanup on unmount
  useEffect(() => {
    if (!loaded) return;
    domains.forEach((d) => {
      if (!d.verified && !pollTimers.current[d.domain]) startPolling(d.domain);
      if (d.verified && pollTimers.current[d.domain]) stopPolling(d.domain);
    });
  }, [loaded, domains, startPolling, stopPolling]);

  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach((t) => clearTimeout(t));
      pollTimers.current = {};
    };
  }, []);

  const handleSetPrimary = async (domain: string) => {
    const updated = domains.map(d => ({ ...d, isPrimary: d.domain === domain }));
    setDomains(updated);
    await saveDomains(updated);
    toast.success(`${domain} set as primary`);
  };

  const handleCopyCname = () => {
    navigator.clipboard.writeText(cnameTarget);
    setCopied(true);
    toast.success('CNAME target copied');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!loaded) return null;

  return (
    <section className="glass rounded-2xl p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Custom Domains
        </h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Domain</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Custom Domain</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Domain</Label>
                <Input
                  placeholder="leads.mybusiness.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a subdomain (e.g., leads.yourdomain.com) — not a root domain.
                </p>
              </div>

              <div className="rounded-xl p-4 space-y-3 bg-muted/20 border border-border/30">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  DNS Setup Instructions
                </p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>1. Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</p>
                  <p>2. Navigate to DNS settings for your domain</p>
                  <p>3. Add <strong className="text-foreground">ONE</strong> of the following records:</p>
                </div>

                {/* Subdomain (CNAME) — recommended */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Option A · Subdomain (recommended)
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground font-medium">Type</span>
                    <code className="bg-muted/30 rounded px-2 py-0.5 font-mono">CNAME</code>
                    <span className="text-muted-foreground font-medium">Name</span>
                    <code className="bg-muted/30 rounded px-2 py-0.5 font-mono">{newDomain.split('.')[0] || 'leads'}</code>
                    <span className="text-muted-foreground font-medium">Target</span>
                    <button
                      onClick={handleCopyCname}
                      className="bg-muted/30 rounded px-2 py-0.5 font-mono text-primary text-left flex items-center gap-1"
                    >
                      {cnameTarget}
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-50" />}
                    </button>
                  </div>
                </div>

                {/* Root (A record) */}
                <div className="rounded-lg border border-border/30 p-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Option B · Root domain
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground font-medium">Type</span>
                    <code className="bg-muted/30 rounded px-2 py-0.5 font-mono">A</code>
                    <span className="text-muted-foreground font-medium">Name</span>
                    <code className="bg-muted/30 rounded px-2 py-0.5 font-mono">@</code>
                    <span className="text-muted-foreground font-medium">Target</span>
                    <code className="bg-muted/30 rounded px-2 py-0.5 font-mono text-primary">{aRecordTarget}</code>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t border-border/20">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>
                    DNS propagation can take 5 minutes to 48 hours. SSL is automatically provisioned by our hosting layer (Let's Encrypt) once DNS resolves and verification succeeds.{' '}
                    <a
                      href="https://dnschecker.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      Check propagation <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={handleAddDomain} disabled={saving || !newDomain.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Domain
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Domain List */}
      {domains.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No custom domains configured. Add one to brand your funnel URLs.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => (
            <Card key={d.domain} className={cn(
              'card-hover-glow',
              d.verified && 'border-green-500/20'
            )}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                      d.verified ? 'bg-green-500/10' : 'bg-muted'
                    )}>
                      {d.verified ? (
                        <Shield className="h-4 w-4 text-green-400" />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium font-mono truncate">{d.domain}</p>
                        {d.isPrimary && (
                          <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="outline"
                          title={
                            d.sslStatus === 'active'
                              ? 'SSL certificate issued by Let\'s Encrypt via our hosting layer. Auto-renews.'
                              : d.sslStatus === 'error'
                              ? 'Certificate issuance failed. Check that DNS is correct and CAA records (if any) allow Let\'s Encrypt.'
                              : 'Waiting for DNS to resolve so a Let\'s Encrypt certificate can be issued.'
                          }
                          className={cn('text-[10px] cursor-help',
                            d.sslStatus === 'active' ? 'text-green-400 border-green-500/30' :
                            d.sslStatus === 'error' ? 'text-red-400 border-red-500/30' :
                            'text-yellow-400 border-yellow-500/30'
                          )}
                        >
                          {d.sslStatus === 'active' ? '🔒 SSL Active · Let\'s Encrypt' :
                           d.sslStatus === 'error' ? '⚠️ SSL Error' :
                           '⏳ SSL Pending'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]',
                            d.verified ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'
                          )}
                        >
                          {d.verified ? '✓ DNS Verified' : '○ DNS Pending'}
                        </Badge>
                        {!d.verified && polling[d.domain] && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-primary border-primary/30 gap-1"
                          >
                            <Radar className="h-3 w-3 animate-pulse" />
                            Auto-checking · {polling[d.domain].attempts}/{MAX_POLL_ATTEMPTS}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); stopPolling(d.domain); }}
                              className="ml-1 opacity-70 hover:opacity-100"
                              aria-label="Pause auto-check"
                            >
                              <PauseCircle className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {!d.verified && !polling[d.domain] && (
                          <button
                            type="button"
                            onClick={() => startPolling(d.domain)}
                            className="text-[10px] text-primary hover:underline"
                          >
                            Resume auto-check
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs flex-1 sm:flex-initial"
                      onClick={() => handleVerify(d.domain)}
                      disabled={verifyingId === d.domain}
                    >
                      {verifyingId === d.domain ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">Verify</span>
                    </Button>
                    {!d.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs flex-1 sm:flex-initial"
                        onClick={() => handleSetPrimary(d.domain)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemove(d.domain)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DNS Quick Reference */}
      {domains.length > 0 && (
        <div className="mt-4 rounded-xl p-3 bg-muted/10 border border-border/20 space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            All domains should have a CNAME record pointing to{' '}
            <button onClick={handleCopyCname} className="font-mono text-primary hover:underline">
              {cnameTarget}
            </button>
          </p>
          <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 flex-wrap pl-5">
            SSL is auto-issued and renewed by our hosting layer (Let's Encrypt). Stuck on pending?{' '}
            <a
              href="https://dnschecker.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Check DNS propagation <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      )}
    </section>
  );
}
