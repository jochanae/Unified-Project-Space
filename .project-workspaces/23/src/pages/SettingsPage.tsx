import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, User, Mail, Shield, HelpCircle, AlertTriangle, Loader2, Crown, ShieldCheck, Download, Smartphone, Sliders, Users, Check, Copy } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ExpressionLab } from '@/features/quinn';
import { TeamCollaboration } from '@/features/team/components/TeamCollaboration';
import { AgencyBranding, AgencyBrandingLocked, ClientReportDashboard } from '@/features/agency';
import { PushNotificationsCard } from '@/components/shared/PushNotificationsCard';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { PwaInstallGuideDialog, type InstallGuideMode } from '@/components/shared/PwaInstallGuideDialog';
import { OrgDefaultBusinessSection } from '@/features/pages/components/OrgDefaultBusinessSection';
import { SocialConnectionsCard } from '@/components/shared/SocialConnectionsCard';
import { WebhookSettings } from '@/features/settings/components/WebhookSettings';
import { ImagePromptsLog } from '@/features/settings/components/ImagePromptsLog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email || '';

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [timezone, setTimezone] = useState<string>('');
  const [originalTimezone, setOriginalTimezone] = useState<string>('');
  const [savingTz, setSavingTz] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installGuideMode, setInstallGuideMode] = useState<InstallGuideMode>('manual');
  const [referralData, setReferralData] = useState<{
    code: string | null;
    completedCount: number;
    rewardExpiresAt: string | null;
  }>({ code: null, completedCount: 0, rewardExpiresAt: null });
  const [copiedRef, setCopiedRef] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canInstall, isInstalled, install, isIOS, isAndroid } = usePwaInstall();
  const { tier } = useSubscription();
  const hasInnovation = tier === 'growth' || isAdmin;

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('users')
      .select('avatar_url, display_name, timezone')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.display_name) {
          setDisplayName(data.display_name);
          setOriginalDisplayName(data.display_name);
        }
        const tz = (data as any)?.timezone ?? '';
        setTimezone(tz);
        setOriginalTimezone(tz);
      });

    // Check admin + premium
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle().then(({ data }) => setIsAdmin(!!data));
    supabase.from('subscriptions').select('status').eq('user_id', userId).eq('status', 'active').maybeSingle().then(({ data }) => setIsPremium(!!data));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('users')
      .select('referral_code, referral_reward_expires_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_user_id', userId)
          .eq('status', 'completed')
          .then(({ count }) => {
            setReferralData({
              code: data.referral_code,
              completedCount: count ?? 0,
              rewardExpiresAt: data.referral_reward_expires_at,
            });
          });
      });
  }, [userId]);

  useEffect(() => {
    setInstallGuideMode(isIOS ? 'ios' : isAndroid ? 'android' : 'manual');
  }, [isAndroid, isIOS]);

  const openInstallGuide = useCallback((mode: InstallGuideMode) => {
    setInstallGuideMode(mode);
    setShowInstallGuide(true);
  }, []);

  const handleInstallIntoIQ = useCallback(async () => {
    const result = await install();

    if (result === 'accepted') {
      toast.success('Install prompt opened', {
        description: 'Finish the browser prompt to add IntoIQ to your home screen.',
      });
      return;
    }

    if (result === 'dismissed') {
      toast('Install dismissed', {
        description: 'You can try again any time from Settings or the footer.',
      });
      return;
    }

    if (result === 'preview') {
      openInstallGuide('preview');
      return;
    }

    openInstallGuide(isIOS ? 'ios' : isAndroid ? 'android' : 'manual');
  }, [install, isAndroid, isIOS, openInstallGuide]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', userId);
      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      toast.success('Profile photo updated!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [userId]);

  const handleSaveDisplayName = async () => {
    if (!userId || displayName.trim() === originalDisplayName) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName.trim() || null })
        .eq('id', userId);
      if (error) throw error;
      setOriginalDisplayName(displayName.trim());
      toast.success('Display name updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSavingName(false);
    }
  };

  const tzList = (() => {
    try {
      // @ts-ignore - supportedValuesOf is widely supported in modern browsers
      const all: string[] = Intl.supportedValuesOf?.('timeZone') ?? [];
      return all.length ? all : ['UTC'];
    } catch { return ['UTC']; }
  })();
  const browserTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })();
  const tzChanged = timezone !== originalTimezone;

  const handleSaveTimezone = async () => {
    if (!userId || !tzChanged) return;
    setSavingTz(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ timezone: timezone || null } as any)
        .eq('id', userId);
      if (error) throw error;
      setOriginalTimezone(timezone);
      const { setUserTimezone } = await import('@/lib/user-timezone');
      setUserTimezone(timezone || null);
      toast.success('Timezone updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSavingTz(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      // Delete user data (org, projects, etc. cascade from org)
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', userId)
        .single();

      if (userData?.org_id) {
        await supabase.from('organizations').delete().eq('id', userData.org_id);
      }

      // Sign out
      await supabase.auth.signOut();
      toast.success('Your account has been scheduled for deletion.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const referralLink = referralData.code
    ? `${window.location.origin}/login?ref=${referralData.code}`
    : null;
  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';
  const nameChanged = displayName.trim() !== originalDisplayName;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-serif mb-8">Settings</h1>

      {/* Access Level */}
      {(isAdmin || isPremium) && (
        <section className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Access Level
          </h2>
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <div
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                style={{
                  color: 'rgb(212,175,55)',
                  background: 'rgba(212,175,80,0.08)',
                  border: '1px solid rgba(212,175,55,0.25)',
                }}
              >
                <ShieldCheck className="h-4 w-4" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,80,0.5))' }} />
                <span>Super Admin</span>
                <Badge
                  className="ml-1 text-[10px] font-bold uppercase"
                  style={{
                    color: 'rgb(212,175,55)',
                    background: 'rgba(212,175,55,0.15)',
                    border: '0.5px solid rgba(212,175,55,0.4)',
                    letterSpacing: '0.12em',
                  }}
                >
                  Full Access
                </Badge>
              </div>
            )}
            {isPremium && (
              <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold bg-primary/5 border border-primary/20 text-primary">
                <Crown className="h-4 w-4" />
                <span>Premium Plan</span>
                <Badge variant="default" className="ml-1 text-[10px]">Active</Badge>
              </div>
            )}
          </div>
          {isAdmin && (
            <p className="text-xs text-muted-foreground mt-3">
              You have full platform access: user management, subscription control, project oversight, and system administration.
            </p>
          )}
        </section>
      )}


      {/* Profile Section */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-medium mb-5 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" /> Profile
        </h2>

        <div className="flex items-center gap-5 mb-6">
          <div className="relative group shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative flex h-20 w-20 items-center justify-center rounded-full overflow-hidden transition-all hover:opacity-80"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {userInitial}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{userEmail}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {uploading ? 'Uploading…' : 'Click photo to change'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="displayName" className="text-muted-foreground text-xs uppercase tracking-wide">Display Name</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                id="displayName"
                placeholder="Enter your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && nameChanged && handleSaveDisplayName()}
                className="max-w-xs"
              />
              {nameChanged && (
                <Button
                  size="sm"
                  onClick={handleSaveDisplayName}
                  disabled={savingName}
                >
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{userEmail}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="timezone" className="text-muted-foreground text-xs uppercase tracking-wide">Timezone</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Used for greetings and time-of-day signals. Leave on Auto to follow this device.
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <select
                id="timezone"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="max-w-xs h-9 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Auto — {browserTz}</option>
                {tzList.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              {tzChanged && (
                <Button size="sm" onClick={handleSaveTimezone} disabled={savingTz}>
                  {savingTz ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Social Connections — LinkedIn, etc. */}
      <SocialConnectionsCard />

      {/* Lead Pings — push notifications */}
      <PushNotificationsCard />

      {/* Webhooks — outbound integrations (Zapier/Make) */}
      <WebhookSettings />

      {/* Recent image prompts — raw vs final */}
      <ImagePromptsLog />

      {/* White-Label Branding — Innovation tier only */}
      {hasInnovation ? <AgencyBranding /> : <AgencyBrandingLocked />}

      {/* Client Reports — Innovation tier only */}
      {hasInnovation && <ClientReportDashboard />}

      {/* Org-level default LocalBusiness profile */}
      <OrgDefaultBusinessSection />

      {/* Team Collaboration */}
      <TeamCollaboration />

      {/* Account Section */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-medium mb-5 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Account
        </h2>

        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pricing')}
          >
            Manage Billing
          </Button>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reset-password')}
            >
              Change Password
            </Button>
          </div>
        </div>
      </section>

      {/* MarQ Expression Lab */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-medium mb-5 flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" /> MarQ Intelligence
        </h2>
        <ExpressionLab />
      </section>


      {/* Install App */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" /> Mobile App
        </h2>
        {isInstalled ? (
          <p className="text-sm text-muted-foreground">✓ IntoIQ is installed on this device.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {canInstall
                ? 'Install IntoIQ to your home screen for a full-screen, native-feeling mobile experience.'
                : 'If your browser skips the native prompt, IntoIQ will walk you through the manual install steps instead.'}
            </p>
            <Button size="sm" onClick={handleInstallIntoIQ}>
              <Download className="h-4 w-4 mr-1" /> Install IntoIQ
            </Button>
          </div>
        )}
      </section>

      <PwaInstallGuideDialog mode={installGuideMode} open={showInstallGuide} onOpenChange={setShowInstallGuide} />

      {/* Help Section */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-medium mb-5 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Help & Support
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/help')}>
            Visit Help Center
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/privacy')}>
            Privacy Policy
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/terms')}>
            Terms of Service
          </Button>
        </div>
      </section>

      <div className="glass rounded-2xl border border-border/30 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Refer & earn</h3>
            <p className="text-xs text-muted-foreground">
              Invite 3 people — get 30 days of Operator free
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-colors',
                i < referralData.completedCount
                  ? 'bg-primary'
                  : 'bg-muted/40'
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {referralData.completedCount >= 3
            ? referralData.rewardExpiresAt
              ? `Operator access active until ${new Date(referralData.rewardExpiresAt).toLocaleDateString()}`
              : 'Reward unlocked!'
            : `${referralData.completedCount} of 3 friends joined`}
        </p>

        {/* Link */}
        {referralLink && (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-border/30 bg-muted/20 px-3 py-2 text-xs text-muted-foreground truncate font-mono">
              {referralLink}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={copyReferralLink}
            >
              {copiedRef
                ? <><Check className="h-3.5 w-3.5" /> Copied</>
                : <><Copy className="h-3.5 w-3.5" /> Copy</>
              }
            </Button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-medium mb-2 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" /> Danger Zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account, all projects, and data. This action cannot be undone.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account, all your projects, contacts, funnels, and data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
