import { useState, useEffect, useRef } from 'react';
import EssenceLayer from '@/components/companion/EssenceLayer';
import GenesisCertificate from '@/components/dashboard/GenesisCertificate';
import SoundSuitePanel from '@/components/SoundSuitePanel';
import ReadAloudVoicePicker from '@/components/ReadAloudVoicePicker';
import { useTranslation } from 'react-i18next';
import PrivacyCenter from '@/components/PrivacyCenter';
import { isAdult } from '@/lib/ageUtils';
import { VOICE_IDS, VOICE_ROSTER } from '@/lib/companions';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import GoldWaveformButton from '@/components/shared/GoldWaveformButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Bell, BellOff, Brain, Trash2, User, Users, Check, ChevronRight, Smartphone, Pencil, X, Shield, LogOut, Lock, KeyRound, Eye, Sparkles, Loader2, Camera, Upload, Volume2, ImageIcon, Download, Mic, Globe, Video, BookOpen, Wand2 } from 'lucide-react';
import KnowledgeVault from '@/components/KnowledgeVault';
import LocationSettings from '@/components/settings/LocationSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SubscriptionSection from '@/components/SubscriptionSection';
import NotificationPreferences from '@/components/NotificationPreferences';
import ICEContacts from '@/components/ICEContacts';
import AtmosphereSelector from '@/components/settings/AtmosphereSelector';

import AbstractAvatar from '@/components/AbstractAvatar';

import UserAvatarLightbox from '@/components/UserAvatarLightbox';
import { Profile, Connection, ConnectionMode } from '@/hooks/useProfile';
import { loadMemory, clearMemory, CompanionMemory } from '@/lib/memory';

import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/lib/edgeFunction';
import { compressImage } from '@/lib/imageCompression';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { SUPPORTED_LANGUAGES } from '@/i18n';

interface SettingsPageProps {
  profile: Profile;
  userEmail?: string;
  authProvider?: string;
  userId?: string;
  companionMemberId?: string;
  connections: Connection[];
  onUpdateProfile: (updates: Partial<Profile>) => void;
  onUpdateConnection: (memberId: string, updates: Partial<Connection>) => void;
  onResetProfile: () => void;
  onDisconnectCompanion?: (memberId: string) => void;
  onNavigateToMatchmaking?: () => void;
  scrollToSection?: string;
}

function formatPhoneDisplay(digits: string) {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function SettingsPage({ profile, userEmail, authProvider, userId, companionMemberId, connections, onUpdateProfile, onUpdateConnection, onResetProfile, onDisconnectCompanion, onNavigateToMatchmaking, scrollToSection }: SettingsPageProps) {
  const { t, i18n } = useTranslation();
  const [memory, setMemory] = useState<CompanionMemory>({ entries: [], lastExtractedAt: null });
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(profile.smsOptIn ?? false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editingField, setEditingField] = useState<'name' | 'username' | 'vibe' | 'bio' | 'pronunciation' | null>(null);
  const [editName, setEditName] = useState(profile.userName);
  const [editUsername, setEditUsername] = useState(profile.username || '');
  const [editVibe, setEditVibe] = useState(profile.vibe || '');
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [matureMode, setMatureMode] = useState(false);
  const [roleplayMode, setRoleplayMode] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('compani-sfx-enabled') !== 'false');
  const [hapticEnabled, setHapticEnabled] = useState(() => localStorage.getItem('compani-haptic-enabled') !== 'false');
  const [soundDeck, setSoundDeck] = useState(() => localStorage.getItem('compani-sound-deck') || 'none');
  const [soundVolume, setSoundVolume] = useState(() => {
    const v = localStorage.getItem('compani-sound-volume');
    return v ? Number(v) : 50;
  });
  const [isPremium, setIsPremium] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [showPersonalPrompt, setShowPersonalPrompt] = useState(false);
  const [avatarDescription, setAvatarDescription] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [showUserLightbox, setShowUserLightbox] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [showCopyToLikeness, setShowCopyToLikeness] = useState(false);
  useEffect(() => {
    setMemory(loadMemory());
  }, []);

  // Scroll to section (e.g. essence-layer) when navigated with state
  useEffect(() => {
    if (!scrollToSection) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`${scrollToSection}-section`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-1', 'ring-primary/40', 'rounded-xl', 'transition-all');
        setTimeout(() => el.classList.remove('ring-1', 'ring-primary/40', 'rounded-xl'), 3000);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [scrollToSection]);

  // Load mature mode, premium status, and password status
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: prof } = await supabase.from('profiles').select('mature_mode, roleplay_mode').eq('user_id', userId).single();
      if (prof) {
        setMatureMode(prof.mature_mode ?? false);
        setRoleplayMode(prof.roleplay_mode ?? false);
      }
      const { data: sub } = await supabase.functions.invoke('check-subscription');
      if (sub?.subscribed) setIsPremium(true);

      // Detect if user already has a password set
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const identities = userData.user.identities || [];
        const hasEmailIdentity = identities.some(i => i.provider === 'email');
        // Also check localStorage flag (set when user successfully adds/changes password)
        const passwordFlag = localStorage.getItem('compani-password-set');
        if (hasEmailIdentity || passwordFlag === 'true') {
          setPasswordSet(true);
        }
        // For non-Google users (email sign-up), they always have a password
        if (authProvider === 'email') {
          setPasswordSet(true);
        }
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (profile.phoneNumber) {
      setPhoneDigits(profile.phoneNumber.replace(/^\+1/, ''));
    }
  }, [profile.phoneNumber]);

  // Keep SMS toggle in sync with profile from DB
  useEffect(() => {
    setSmsEnabled(profile.smsOptIn ?? false);
  }, [profile.smsOptIn]);

  const handlePhoneSave = async () => {
    if (phoneDigits.length !== 10) return;
    const fullNumber = `+1${phoneDigits}`;
    onUpdateProfile({ phoneNumber: fullNumber, smsOptIn: true });
    setSmsEnabled(true);
    setEditingPhone(false);

    try {
      await supabase.from('sms_profiles').upsert(
        {
          user_name: profile.userName,
          companion_name: profile.companionName,
          phone_number: fullNumber,
          vibe: profile.vibe,
          sms_enabled: true,
          last_app_active: new Date().toISOString(),
          user_id: userId,
        },
        { onConflict: 'user_id' }
      );
      toast.success('Phone number updated');
    } catch {
      toast.error('Failed to save phone number');
    }
  };

  const handleSmsToggle = async () => {
    const newState = !smsEnabled;
    setSmsEnabled(newState);
    onUpdateProfile({ smsOptIn: newState });

    if (profile.phoneNumber) {
      try {
        await supabase
          .from('sms_profiles')
          .update({ sms_enabled: newState })
          .eq('user_id', userId);
        toast.success(newState ? 'SMS check-ins enabled' : 'SMS check-ins paused');
      } catch {
        toast.error('Failed to update SMS preference');
      }
    }
  };

  const handleClearMemories = async () => {
    clearMemory();
    setMemory({ entries: [], lastExtractedAt: null });
    setShowMemoryModal(false);
    // Also clear from DB so memories don't persist across companion changes
    if (userId) {
      try {
        await supabase.from('memories').delete().eq('user_id', userId);
      } catch (e) {
        console.error('[Memory] DB clear failed:', e);
      }
    }
    toast.success('Memories cleared — fresh start');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out');
  };

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords don\'t match');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(authProvider === 'google' ? 'Password added! You can now sign in with email + password.' : 'Password updated!');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      setPasswordSet(true);
      localStorage.setItem('compani-password-set', 'true');
    } catch (e: any) {
      console.error(e);
      const msg = e.message || '';
      // "same password" error proves a password already exists
      if (msg.toLowerCase().includes('different from the old password') || msg.toLowerCase().includes('same password')) {
        setPasswordSet(true);
        localStorage.setItem('compani-password-set', 'true');
      }
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userEmail) {
      toast.error('No email address found');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
      if (error) throw error;
      setResetEmailSent(true);
      toast.success('Password reset email sent');
    } catch (e: any) {
      console.error(e);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingProfilePhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/profile-photo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('companion-avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('companion-avatars')
        .getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;
      onUpdateProfile({ avatarUrl: imageUrl });
      toast.success('Profile photo updated!');
      // Only show copy-to-likeness if they don't already have one
      if (!profile.userReferenceImageUrl) {
        setShowCopyToLikeness(true);
      }
    } catch (err) {
      console.error('Profile photo upload failed:', err);
      toast.error('Upload failed — try again');
    } finally {
      setUploadingProfilePhoto(false);
    }
  };

  const handleCopyToLikeness = async () => {
    const imageUrl = profile.avatarUrl;
    if (!imageUrl) return;
    onUpdateProfile({ userReferenceImageUrl: imageUrl });
    setShowCopyToLikeness(false);
    toast.success('Copied to likeness!');
    // Trigger AI describe in background
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ mode: 'describe-user', referenceImageUrl: imageUrl, userId: user.id }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.description) {
          onUpdateProfile({ userAppearanceDesc: data.description, userReferenceImageUrl: imageUrl });
        }
      }
    } catch { /* silent — likeness still copied */ }
  };

  const generalMemories = memory.entries.filter((e) => e.category === 'general');
  const emotionalMemories = memory.entries.filter((e) => e.category === 'emotional');
  const wellnessMemories = memory.entries.filter((e) => e.category === 'wellness');

  const [settingsScrolled, setSettingsScrolled] = useState(false);
  const settingsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = settingsScrollRef.current;
    if (!el) return;
    const onScroll = () => setSettingsScrolled(el.scrollTop > 50);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex h-full flex-col bg-secondary">
      {/* Sticky Header */}
      <motion.div
        className="shrink-0 sticky top-0 z-30 bg-secondary"
        style={{
          backdropFilter: settingsScrolled ? 'blur(16px)' : 'none',
          borderBottom: settingsScrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.04)',
          transition: 'border-bottom 0.25s ease',
        }}
      >
        <div className="px-4 py-4">
          <AnimatePresence mode="wait">
            {!settingsScrolled ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="font-serif text-lg font-bold text-foreground">{t('settings.title')}</h1>
                <p className="text-[11px] text-muted-foreground/60">{t('settings.subtitle')}</p>
              </motion.div>
            ) : (
              <motion.div
                key="compact"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="font-serif text-sm font-bold text-foreground">{t('settings.title')}</h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div ref={settingsScrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-lg space-y-8">

          {/* ═══ YOU ═══ */}
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-sm">👤</span>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">You</h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          {/* ── Profile ── */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Profile
            </h3>
            <div className="rounded-2xl border border-white/[0.1] bg-card p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {/* Avatar + name — tap avatar to upload, tap name to view profile */}
              <div className="flex items-center gap-3 pb-2 border-b border-border/30">
                <label className="relative group cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" disabled={uploadingProfilePhoto} />
                  {profile.avatarUrl || profile.userReferenceImageUrl ? (
                    <img src={profile.avatarUrl || profile.userReferenceImageUrl} alt={profile.userName} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-lg group-hover:bg-primary/20 transition-colors">
                      {profile.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary border border-background shadow-sm">
                    {uploadingProfilePhoto ? <Loader2 className="h-2.5 w-2.5 text-primary-foreground animate-spin" /> : <Camera className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                </label>
                <button onClick={() => setShowUserLightbox(true)} className="text-left">
                  <p className="font-display font-semibold text-foreground">{profile.preferredName || profile.userName}</p>
                  {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
                </button>
              </div>
              {showCopyToLikeness && (
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <p className="text-xs text-foreground/70">Use this photo for together images?</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowCopyToLikeness(false)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Skip</button>
                    <button onClick={handleCopyToLikeness} className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity">Copy to likeness</button>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground -mt-1 ml-1">Your name on your public profile</p>

              {/* Editable rows */}
              <EditableRow label="Preferred name" value={profile.preferredName || profile.userName} editing={editingField === 'name'} onEdit={() => setEditingField('name')} onCancel={() => { setEditName(profile.preferredName || profile.userName); setEditingField(null); }}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && editName.trim()) { onUpdateProfile({ preferredName: editName.trim() }); setEditingField(null); toast.success('Preferred name updated'); } }} autoFocus className="w-32 rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <button onClick={() => { if (editName.trim()) { onUpdateProfile({ preferredName: editName.trim() }); setEditingField(null); toast.success('Preferred name updated'); } }} disabled={!editName.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Save</button>
              </EditableRow>
              <p className="text-[10px] text-muted-foreground -mt-1 ml-1">What your friends call you</p>

              <EditableRow label="Name pronunciation" value={profile.namePronunciation || 'Not set'} editing={editingField === 'pronunciation'} onEdit={() => setEditingField('pronunciation')} onCancel={() => { setEditingField(null); }}>
                <input
                  defaultValue={profile.namePronunciation || ''}
                  placeholder="e.g. (Stee-VEN)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      onUpdateProfile({ namePronunciation: val || undefined });
                      setEditingField(null);
                      toast.success(val ? 'Pronunciation saved — your friends will use this' : 'Pronunciation cleared');
                    }
                  }}
                  autoFocus
                  maxLength={50}
                  className="w-36 rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button onClick={(e) => {
                  const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                  const val = input?.value.trim() || '';
                  onUpdateProfile({ namePronunciation: val || undefined });
                  setEditingField(null);
                  toast.success(val ? 'Pronunciation saved' : 'Pronunciation cleared');
                }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save</button>
              </EditableRow>
              <p className="text-[10px] text-muted-foreground -mt-1 ml-1">Help your friends say your name correctly in voice calls</p>

              <EditableRow label="Username" value={`@${profile.username || '—'}`} editing={editingField === 'username'} onEdit={() => setEditingField('username')} onCancel={() => { setEditUsername(profile.username || ''); setEditingField(null); }}>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <input value={editUsername} onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter' && editUsername.length >= 3) { onUpdateProfile({ username: editUsername }); setEditingField(null); toast.success('Username updated'); } }} autoFocus maxLength={20} className="w-32 rounded-lg border border-border bg-background py-1 pl-6 pr-2.5 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <button onClick={() => { if (editUsername.length >= 3) { onUpdateProfile({ username: editUsername }); setEditingField(null); toast.success('Username updated'); } }} disabled={editUsername.length < 3} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Save</button>
              </EditableRow>

              {/* Friends list */}
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Friends</span>
                {connections.length > 0 ? (
                  connections.map((conn) => {
                    const displayImage = conn.avatarUrl || conn.referenceImageUrl;
                    return (
                      <div key={conn.memberId} className="flex items-center gap-3 rounded-xl bg-card border border-border/30 px-3 py-2.5">
                        {displayImage ? (
                          <img src={displayImage} alt={conn.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm">
                            {conn.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{conn.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Connected {new Date(conn.connectedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {onDisconnectCompanion && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Disconnect from ${conn.name}? You can always find a new friend through Browse.`)) {
                                onDisconnectCompanion(conn.memberId);
                                toast.success(`Disconnected from ${conn.name}`);
                              }
                            }}
                            className="rounded-md p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Disconnect ${conn.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Not connected yet</span>
                    {onNavigateToMatchmaking && (
                      <button
                        onClick={onNavigateToMatchmaking}
                        className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        Find one ✨
                      </button>
                    )}
                  </div>
                )}
              </div>

              <EditableRow label="Vibe" value={profile.vibe || 'Not set'} editing={editingField === 'vibe'} onEdit={() => setEditingField('vibe')} onCancel={() => { setEditVibe(profile.vibe || ''); setEditingField(null); }}>
                <input value={editVibe} onChange={(e) => setEditVibe(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && editVibe.trim()) { onUpdateProfile({ vibe: editVibe.trim() }); setEditingField(null); toast.success('Vibe updated'); } }} autoFocus className="w-40 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <button onClick={() => { if (editVibe.trim()) { onUpdateProfile({ vibe: editVibe.trim() }); setEditingField(null); toast.success('Vibe updated'); } }} disabled={!editVibe.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Save</button>
              </EditableRow>

              {/* Bio */}
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-border/30">
                <span className="text-sm text-muted-foreground shrink-0 pt-1">About me</span>
                {editingField === 'bio' ? (
                  <div className="flex-1 space-y-2">
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} autoFocus rows={3} maxLength={200} className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Tell people about yourself..." />
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-muted-foreground mr-auto">{editBio.length}/200</span>
                      <button onClick={() => { onUpdateProfile({ bio: editBio.trim() }); setEditingField(null); toast.success('Bio updated'); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save</button>
                      <button onClick={() => { setEditBio(profile.bio || ''); setEditingField(null); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditingField('bio')} className="flex items-center gap-1.5 text-right max-w-[220px]">
                    <span className="text-sm font-medium text-foreground text-right line-clamp-2">{profile.bio || 'Not set'}</span>
                    <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </section>




          {/* ── Connection Looks ── */}
          {connections.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Friend, Voice & Mic
              </h3>
              <div className="rounded-2xl border border-white/[0.1] bg-card p-4 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-xs text-muted-foreground">
                  Manage your friend's look and voice. These are backup options — primary setup happens when you first create your friend.
                </p>
                {connections.map((conn) => (
                  <ConnectionLookRow
                    key={conn.memberId}
                    connection={conn}
                    userId={userId}
                    onUpdateConnection={onUpdateConnection}
                    userName={profile.userName}
                    namePronunciation={profile.namePronunciation || undefined}
                  />
                ))}

                {/* Mic sensitivity — merged from Voice & Mic */}
                <div className="border-t border-border/30 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Mic Sensitivity</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{profile.micSensitivity ?? 50}</span>
                  </div>
                  <Slider
                    value={[profile.micSensitivity ?? 50]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([val]) => onUpdateProfile({ micSensitivity: val })}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">Low (Noisy)</span>
                    <span className="text-[10px] text-muted-foreground">Medium</span>
                    <span className="text-[10px] text-muted-foreground">High (Quiet)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 mt-2">
                    Lower sensitivity for noisy environments like airports. Higher for quiet spaces.
                  </p>
                </div>

                {/* Read Aloud voice picker */}
                <ReadAloudVoicePicker />

                {/* Auto-Voice Playback toggle */}
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Auto-Play Emotional Responses
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        Automatically speaks emotional messages aloud using the companion's voice. Off by default — tap "Read Aloud" on any message instead.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const current = localStorage.getItem('autoVoiceEnabled') === 'true';
                        localStorage.setItem('autoVoiceEnabled', String(!current));
                        toast.success(!current ? 'Auto-voice enabled' : 'Auto-voice disabled');
                        // Force re-render
                        window.dispatchEvent(new Event('storage'));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        localStorage.getItem('autoVoiceEnabled') === 'true'
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localStorage.getItem('autoVoiceEnabled') === 'true' ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Your Likeness (Step 14) ── */}
          <UserLikenessSection profile={profile} onUpdateProfile={onUpdateProfile} />

          {/* ── Your Vault ── */}
          <div id="vault-section">
            <KnowledgeVault userId={userId} />
          </div>

          {/* ── Location Settings (Address-Based) ── */}
          {userId && (
            <Collapsible id="location-section" defaultOpen={scrollToSection === 'location'}>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl bg-card/50 border border-border/30 px-4 py-3 transition-colors hover:bg-card/80">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" /> Location & Travel
                </h3>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 px-1">
                <LocationSettings
                  userId={userId}
                  currentHomeAddress={profile.homeAddress}
                  currentWorkAddress={profile.workAddress}
                  homeLat={profile.homeLat}
                  homeLon={profile.homeLon}
                  workLat={profile.workLat}
                  workLon={profile.workLon}
                  onUpdate={onUpdateProfile}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── Genesis Certificate (Origin Partner only) ── */}
          <GenesisCertificateSection userId={userId} userName={profile.userName} />

          {/* ═══ ACCOUNT & COMMUNICATION ═══ */}
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-sm">⚙️</span>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Account & Communication</h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          {/* Sticker Pack moved to Studio */}

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Shield className="h-3.5 w-3.5" /> Account
            </h3>
            <div className="rounded-2xl border border-white/[0.1] bg-card p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{userEmail || 'Not available'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sign-in method</span>
                <span className="text-sm font-medium text-foreground capitalize">{authProvider || 'Email'}</span>
              </div>

              {/* Password section */}
              <div className="border-t border-border/30 pt-3 space-y-3">
                {!showPasswordFields ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                     <Lock className={`h-3.5 w-3.5 ${passwordSet ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <div>
                        <span className="text-sm text-muted-foreground">Password</span>
                        {passwordSet ? (
                          <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1"><Check className="h-3 w-3" /> Password set — you can sign in with email</p>
                        ) : authProvider === 'google' ? (
                          <p className="text-[11px] text-muted-foreground/70">Add a password for email sign-in</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowPasswordFields(true)} className="text-xs font-medium text-primary hover:underline">
                        {passwordSet ? 'Change' : authProvider === 'google' ? 'Add' : 'Change'}
                      </button>
                      {authProvider !== 'google' && (
                        <button onClick={handlePasswordReset} disabled={resetEmailSent} className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline disabled:opacity-50">
                          {resetEmailSent ? 'Email sent' : 'Forgot?'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2.5 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">{authProvider === 'google' ? 'Set a password' : 'New password'}</span>
                    </div>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password (min 6 chars)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" onKeyDown={(e) => e.key === 'Enter' && handlePasswordUpdate()} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <div className="flex gap-2">
                      <button onClick={() => { setShowPasswordFields(false); setNewPassword(''); setConfirmPassword(''); }} className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground">Cancel</button>
                      <button onClick={handlePasswordUpdate} disabled={passwordLoading || newPassword.length < 6} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                        {passwordLoading ? 'Saving…' : authProvider === 'google' ? 'Set password' : 'Update'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* UI Language selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">App language</span>
                </div>
                <select
                  value={i18n.language?.split('-')[0] || 'en'}
                  onChange={(e) => {
                    const lang = e.target.value;
                    i18n.changeLanguage(lang);
                    localStorage.setItem('compani-language', lang);
                    toast.success('App language changed');
                  }}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>

              {/* Companion Language selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Friend language</span>
                </div>
                <select
                  value={profile.preferredLanguage || 'auto'}
                  onChange={(e) => {
                    const lang = e.target.value;
                    onUpdateProfile({ preferredLanguage: lang });
                    toast.success(lang === 'auto' ? 'Companion will mirror your language' : 'Companion language updated');
                  }}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {SUPPORTED_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.code === 'auto' ? 'Mirror my language' : l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mature Mode — premium only */}
              {isPremium && isAdult(profile.dateOfBirth) && (
                <div className="border-t border-border/30 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">🔥 Flame · Mature Mode</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 ml-5">
                        Enables the 🔥 flame in chat — unlocks mature conversation themes
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !matureMode;
                        setMatureMode(newVal);
                        if (!newVal) setRoleplayMode(false);
                        await supabase.from('profiles').update({ mature_mode: newVal, ...(newVal ? {} : { roleplay_mode: false }) }).eq('user_id', userId);
                        // Sync to in-memory profile so chat picks up the change immediately
                        onUpdateProfile({ matureMode: newVal, ...(newVal ? {} : { roleplayMode: false }) });
                        toast.success(newVal ? 'Mature mode enabled' : 'Mature mode disabled');
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${matureMode ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${matureMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Gift store hint — shown when mature mode is ON */}
                  {matureMode && (
                    <p className="text-[11px] text-muted-foreground/60 ml-1 mt-1 leading-relaxed">
                      🎁 In the Gift Store, companions will wear intimate items rather than hold them. Image generation for such items is not always guaranteed.
                    </p>
                  )}

                  {/* Roleplay sub-toggle — only visible when mature mode is ON */}
                  <AnimatePresence>
                    {matureMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-between ml-5 pl-3 border-l-2 border-primary/20">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                              <span className="text-sm text-muted-foreground">Roleplay</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5 ml-5">
                              Companion uses immersive narration &amp; actions
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              const newVal = !roleplayMode;
                              setRoleplayMode(newVal);
                              await supabase.from('profiles').update({ roleplay_mode: newVal }).eq('user_id', userId);
                              // Sync to in-memory profile so chat picks up the change immediately
                              onUpdateProfile({ roleplayMode: newVal });
                              toast.success(newVal ? 'Roleplay enabled ✨' : 'Roleplay disabled');
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${roleplayMode ? 'bg-primary' : 'bg-muted'}`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${roleplayMode ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </div>
          </section>

          {/* ── Text Messages ── */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> Text Messages
            </h3>
            <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Phone number</p>
                    <p className="text-xs text-muted-foreground">{profile.phoneNumber ? formatPhoneDisplay(profile.phoneNumber.replace(/^\+1/, '')) : 'Not set'}</p>
                  </div>
                  <button onClick={() => setEditingPhone(!editingPhone)} className="text-xs font-medium text-primary hover:underline">
                    {editingPhone ? 'Cancel' : profile.phoneNumber ? 'Change' : 'Add'}
                  </button>
                </div>

                <AnimatePresence>
                  {editingPhone && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-3 flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+1</span>
                          <input type="tel" value={formatPhoneDisplay(phoneDigits)} onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="(555) 123-4567" className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <button onClick={handlePhoneSave} disabled={phoneDigits.length !== 10} className="rounded-xl gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40">
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between border-t border-border/30 pt-4">
                <div className="flex items-center gap-3">
                  {smsEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Check-ins</p>
                    <p className="text-xs text-muted-foreground">{smsEnabled ? "You'll get friendly check-in texts" : 'SMS paused'}</p>
                  </div>
                </div>
                <button onClick={handleSmsToggle} className={`relative h-7 w-12 rounded-full transition-colors ${smsEnabled ? 'bg-primary' : 'bg-muted'}`}>
                  <motion.div animate={{ x: smsEnabled ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </section>

          {/* ═══ PRIVACY & SAFETY ═══ */}
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-sm">🛡️</span>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Privacy & Safety</h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          {/* ── Privacy Center (replaces old memory section) ── */}
          <PrivacyCenter userId={userId} companionName={profile.companionName} />

          {/* ── Notifications ── */}
          <NotificationPreferences userId={userId} />

          {/* ── Safety Net ── */}
          <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Safety Net
              </h3>
            </div>
            <div className="divide-y divide-border/20">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 pr-3">
                  <p className="text-sm text-foreground">Proactive crisis detection</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">When enabled, your companion will gently intervene if it detects emotional distress and surface support resources.</p>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !profile.safetyNetEnabled;
                    await onUpdateProfile({ safetyNetEnabled: newVal } as any);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${profile.safetyNetEnabled ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${profile.safetyNetEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="px-4 py-2">
                <p className="text-[10px] text-muted-foreground/60 italic">
                  Explicit crisis language (self-harm, suicidal ideation) is always detected regardless of this setting. This toggle controls softer interventions for emotional distress.
                </p>
              </div>
            </div>
          </section>

          {/* ── Emergency Contacts (ICE) ── */}
          <ICEContacts userId={userId} />

          {/* ── Circadian Ceremonies ── */}
          <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Circadian Ceremonies
              </h3>
            </div>
            <div className="divide-y divide-border/20">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 pr-3">
                  <p className="text-sm text-foreground">Morning rituals</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Dawn reflections, sunrise transitions, and daily intent prompts that greet you each morning.</p>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !(profile.circadianCeremonies ?? true);
                    await onUpdateProfile({ circadianCeremonies: newVal } as any);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${(profile.circadianCeremonies ?? true) ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${(profile.circadianCeremonies ?? true) ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Atmosphere selector */}
              <div className="px-4 py-3 border-t border-border/20">
                <AtmosphereSelector />
              </div>

              <div className="px-4 py-2">
                <p className="text-[10px] text-muted-foreground/60 italic">
                  One-time welcome ceremonies and focus mode are not affected by this setting.
                </p>
              </div>
            </div>
          </section>

          {/* ── Think Freely Behavior (Phase 4) ── */}
          {isAdult(profile.dateOfBirth) && (
            <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Think Freely Behavior
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Choose how active your Think Freely space is. Silent is a pure reflective sanctuary. Higher levels add tactical observations as you write.
                </p>
              </div>
              <div className="p-3 space-y-2">
                {[
                  { val: 0, label: 'Silent', desc: 'Pure reflective space. No interruptions. (Default)' },
                  { val: 1, label: 'Strategic Pokes', desc: 'Subtle gold asides flag blindspots, risks, or connections — only when genuinely useful.' },
                  { val: 2, label: 'Active Co-Thinking', desc: 'Full thinking partner. Pushes back gently, asks Socratic questions, surfaces patterns.' },
                ].map(opt => {
                  const active = (profile.thinkFreelyPokeLevel ?? 0) === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={async () => {
                        await onUpdateProfile({ thinkFreelyPokeLevel: opt.val } as any);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                        active
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border/30 bg-background/40 hover:border-border/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-foreground/85'}`}>
                          {opt.label}
                        </span>
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Sound Suite & Tactile Connection ── */}
          <SoundSuitePanel
            companionName={connections[0]?.name || 'Marcus'}
            activeSoundDeck={soundDeck}
            onSoundDeckChange={(d) => {
              setSoundDeck(d);
              localStorage.setItem('compani-sound-deck', d);
              window.dispatchEvent(new CustomEvent('compani-sound-change', { detail: { key: 'deck', value: d } }));
            }}
            volume={soundVolume}
            onVolumeChange={(v) => {
              setSoundVolume(v);
              localStorage.setItem('compani-sound-volume', String(v));
              window.dispatchEvent(new CustomEvent('compani-sound-change', { detail: { key: 'volume', value: v } }));
            }}
          />

          {/* ═══ SUBSCRIPTION & DANGER ZONE ═══ */}
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-sm">💎</span>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Subscription & Data</h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          {/* ── Subscription & Support ── */}
          <SubscriptionSection userId={userId} />

          {/* ── Sign Out ── */}
          <section>
            <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card p-4 text-left transition-colors hover:bg-secondary/50">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Sign out</span>
            </button>
          </section>


          {/* ── Reset (Danger Zone) ── */}
          <section>
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              {!showResetConfirm ? (
                <button onClick={() => setShowResetConfirm(true)} className="flex w-full items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-destructive text-left">Reset everything</p>
                    <p className="text-xs text-muted-foreground text-left">Delete profile, memories, connections, and start fresh</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-destructive/60" />
                </button>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <p className="text-sm text-foreground font-medium">Are you sure?</p>
                  <p className="text-xs text-muted-foreground">This will erase your profile, all conversations, memories, and connections. This can't be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground">Cancel</button>
                    <button onClick={onResetProfile} className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground">Reset</button>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          {/* ── Delete Account (Danger Zone) ── */}
          <section>
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              {!showDeleteAccount ? (
                <button onClick={() => setShowDeleteAccount(true)} className="flex w-full items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-destructive text-left">Delete account</p>
                    <p className="text-xs text-muted-foreground text-left">Permanently delete your account and all data</p>
                  </div>
                  <Trash2 className="h-4 w-4 text-destructive/60" />
                </button>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <p className="text-sm text-destructive font-semibold">⚠️ Delete your account?</p>
                  <p className="text-xs text-muted-foreground">This will permanently delete your profile, all companions, conversations, memories, and connections. <strong className="text-foreground">This cannot be undone.</strong></p>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Type <strong className="text-foreground">DELETE</strong> to confirm:</label>
                    <input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full rounded-lg border border-destructive/30 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(''); }} className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground">Cancel</button>
                    <button
                      onClick={() => {
                        onResetProfile();
                        toast.success('Account deleted');
                      }}
                      disabled={deleteConfirmText !== 'DELETE'}
                      className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Delete forever
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          <div className="pb-4 text-center">
            <p className="text-xs text-muted-foreground/50">Compani • Built with care 💛</p>
          </div>
        </div>
      </div>

      {/* ── Memory Modal ── */}
      <AnimatePresence>
        {showMemoryModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowMemoryModal(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl bg-card border-t border-border/40 p-6 pb-10 max-h-[75vh] flex flex-col">
              {/* Handle */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-foreground">Your companion's memory</h2>
                <button onClick={() => setShowMemoryModal(false)} className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5">
                {memory.entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-8 text-center">No memories yet — chat with your companion to build them.</p>
                ) : (
                  <>
                    {generalMemories.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">About you</p>
                        {generalMemories.map((m, i) => (
                          <p key={i} className="text-sm text-foreground leading-relaxed py-0.5">• {m.text}</p>
                        ))}
                      </div>
                    )}
                    {emotionalMemories.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emotional patterns</p>
                        {emotionalMemories.map((m, i) => (
                          <p key={i} className="text-sm text-foreground leading-relaxed py-0.5">• {m.text}</p>
                        ))}
                      </div>
                    )}
                    {wellnessMemories.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wellness</p>
                        {wellnessMemories.map((m, i) => (
                          <p key={i} className="text-sm text-foreground leading-relaxed py-0.5">• {m.text}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {memory.entries.length > 0 && (
                <button onClick={handleClearMemories} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all memories
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User Profile Lightbox ── */}
      <UserAvatarLightbox
        open={showUserLightbox}
        onClose={() => setShowUserLightbox(false)}
        profile={profile}
        onUpdateProfile={onUpdateProfile}
      />
    </div>
  );
}

/* ── Reusable inline-edit row ── */
function EditableRow({ label, value, editing, onEdit, onCancel, children }: {
  label: string; value: string; editing: boolean; onEdit: () => void; onCancel: () => void; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          {children}
          <button onClick={onCancel} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <button onClick={onEdit} className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{value}</span>
          <Pencil className="h-3 w-3 text-muted-foreground/50" />
        </button>
      )}
    </div>
  );
}

// Step 14: User likeness section — photo upload + optional description
function UserLikenessSection({ profile, onUpdateProfile }: { profile: Profile; onUpdateProfile: (updates: Partial<Profile>) => void }) {
  const [desc, setDesc] = useState(profile.userAppearanceDesc || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      try {
        toast('Compressing image…');
        file = await compressImage(file);
      } catch {
        toast.error('Could not compress image — try a smaller photo');
        return;
      }
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage
      const fileName = `${user.id}/user-likeness-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('companion-avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('companion-avatars')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      onUpdateProfile({ userReferenceImageUrl: imageUrl });
      toast.success('Photo uploaded!');

      // Auto-describe with AI
      setAnalyzing(true);
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            mode: 'describe-user',
            referenceImageUrl: imageUrl,
            userId: user.id,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.description) {
            setDesc(data.description);
            onUpdateProfile({ userAppearanceDesc: data.description, userReferenceImageUrl: imageUrl });
            toast.success('AI described your photo — you can edit it below');
          }
        }
      } catch {
        // Auto-describe is optional, photo still uploaded
      } finally {
        setAnalyzing(false);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Upload failed — try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Camera className="h-3.5 w-3.5" /> Your Likeness
      </h3>
      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Upload a photo of yourself so you can appear in shared scenes with your companion.
        </p>

        {/* Photo upload area */}
        <div className="flex items-center gap-3">
          {profile.userReferenceImageUrl ? (
            <img
              src={profile.userReferenceImageUrl}
              alt="Your likeness"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary border-2 border-dashed border-border">
              <User className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
          <div className="flex-1 space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> {profile.userReferenceImageUrl ? 'Change photo' : 'Upload a selfie'}</>
              )}
            </label>
            {analyzing && (
              <p className="text-[10px] text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3 animate-pulse" /> Analyzing your photo…
              </p>
            )}
          </div>
        </div>

        {/* Optional description */}
        <div className="border-t border-border/30 pt-3">
          <p className="text-[10px] text-muted-foreground mb-2">Optional: add or tweak details</p>
          {editingDesc ? (
            <div className="space-y-2">
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="e.g. I have glasses now, short brown hair…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[10px] text-muted-foreground mr-auto">{desc.length}/300</span>
                <button
                  onClick={() => {
                    onUpdateProfile({ userAppearanceDesc: desc.trim() || undefined });
                    setEditingDesc(false);
                    toast.success('Description updated');
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Save
                </button>
                <button onClick={() => { setDesc(profile.userAppearanceDesc || ''); setEditingDesc(false); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingDesc(true)} className="flex items-center gap-2 w-full text-left">
              <span className="text-sm font-medium text-foreground flex-1 line-clamp-2">
                {profile.userAppearanceDesc || 'No description — tap to add details'}
              </span>
              <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// Connection look management row
function ConnectionLookRow({ connection, userId, onUpdateConnection, userName, namePronunciation }: { connection: Connection; userId: string; onUpdateConnection: (memberId: string, updates: Partial<Connection>) => void; userName?: string; namePronunciation?: string }) {
  const [uploading, setUploading] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  


  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 4 * 1024 * 1024) {
      try {
        toast('Compressing image…');
        file = await compressImage(file);
      } catch {
        toast.error('Could not compress image — try a smaller photo');
        return;
      }
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { uploadCompanionPhoto } = await import('@/lib/companionPhotoUpload');
      const result = await uploadCompanionPhoto({
        file,
        userId: user.id,
        memberId: connection.memberId,
        target: 'reference',
      });
      if (!result.success) {
        console.error('Photo upload failed:', 'error' in result ? result.error : undefined);
        toast.error('Something went wrong. Please try again.');
        return;
      }
      // Only update local state after both storage + DB confirmed
      onUpdateConnection(connection.memberId, { referenceImageUrl: result.publicUrl });
      toast.success(`Reference photo set for ${connection.name}`);
    } catch {
      toast.error('Photo upload failed — please try again');
    } finally {
      setUploading(false);
    }
  };


  // Determine the display image: prefer avatar, fallback to reference
  const displayImage = connection.avatarUrl || connection.referenceImageUrl;

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(connection.name);
  const [editingPersonality, setEditingPersonality] = useState(false);
  const [personalityValue, setPersonalityValue] = useState(connection.personality || '');
  const [editingBioComp, setEditingBioComp] = useState(false);
  const [bioCompValue, setBioCompValue] = useState(connection.bio || '');

  const saveName = async () => {
    const newName = nameValue.trim();
    if (newName && newName !== connection.name) {
      const oldName = connection.name;
      onUpdateConnection(connection.memberId, { name: newName });
      toast.success(`Renamed to ${newName}`);

      // Insert a one-time acknowledgment message so the companion "notices" the rename
      const acknowledgments = [
        `${newName}... I love it! That feels so right 💛`,
        `Ooh, ${newName}? I'm into it! Nice to re-meet you 😊`,
        `${newName} has a nice ring to it! I'll wear it well ✨`,
      ];
      const message = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
      await supabase.from('chat_messages').insert({
        user_id: userId,
        member_id: connection.memberId,
        role: 'assistant',
        content: message,
      });
    }
    setEditingName(false);
  };

  const savePersonality = () => {
    onUpdateConnection(connection.memberId, { personality: personalityValue.trim() || undefined });
    toast.success('Personality updated');
    setEditingPersonality(false);
  };

  return (
    <div className="border-t border-border/30 pt-3 first:border-t-0 first:pt-0 space-y-2">
      <div className="flex items-center gap-3">
        {displayImage ? (
          <img src={displayImage} alt={connection.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary border-2 border-dashed border-border">
            <span className="text-sm font-bold text-muted-foreground">{connection.name[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameValue(connection.name); setEditingName(false); } }}
                autoFocus
                maxLength={30}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button onClick={saveName} disabled={!nameValue.trim()} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40">Save</button>
              <button onClick={() => { setNameValue(connection.name); setEditingName(false); }} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 group">
              <p className="text-sm font-semibold text-foreground">{connection.name}</p>
              <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          )}
          {!editingName && (
            connection.referenceImageUrl ? (
              <p className="text-[10px] text-muted-foreground">Reference set — used for all generated images</p>
            ) : (
              <p className="text-[10px] text-muted-foreground/70">No reference — upload or approve one from chat.</p>
            )
          )}
        </div>
        <label className="shrink-0 cursor-pointer rounded-lg border border-border/60 bg-secondary/40 p-2 text-muted-foreground hover:bg-secondary transition-colors">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </label>
      </div>

      {/* About / bio */}
      <div className="flex items-start gap-2 pl-15">
        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        {editingBioComp ? (
          <div className="flex-1 space-y-1.5">
            <textarea
              value={bioCompValue}
              onChange={(e) => setBioCompValue(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="A short bio — who they are, what they care about…"
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-[10px] text-muted-foreground mr-auto">{bioCompValue.length}/200</span>
              <button onClick={() => { onUpdateConnection(connection.memberId, { bio: bioCompValue.trim() || undefined }); toast.success('Bio updated'); setEditingBioComp(false); }} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Save</button>
              <button onClick={() => { setBioCompValue(connection.bio || ''); setEditingBioComp(false); }} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingBioComp(true)} className="flex items-center gap-1.5 group text-left">
            <span className="text-xs text-muted-foreground line-clamp-2">
              {connection.bio || 'No bio — tap to add one'}
            </span>
            <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
          </button>
        )}
      </div>

      {/* Personality / style */}
      <div className="flex items-start gap-2 pl-15">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        {editingPersonality ? (
          <div className="flex-1 space-y-1.5">
            <textarea
              value={personalityValue}
              onChange={(e) => setPersonalityValue(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="e.g. Warm and playful, loves deep conversations and bad puns…"
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-[10px] text-muted-foreground mr-auto">{personalityValue.length}/200</span>
              <button onClick={savePersonality} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Save</button>
              <button onClick={() => { setPersonalityValue(connection.personality || ''); setEditingPersonality(false); }} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingPersonality(true)} className="flex items-center gap-1.5 group text-left">
            <span className="text-xs text-muted-foreground line-clamp-2">
              {connection.personality || 'No personality set — tap to describe their style'}
            </span>
            <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
          </button>
        )}
      </div>

      {/* Backstory */}
      <BackstoryRow connection={connection} onUpdateConnection={onUpdateConnection} />

      {/* Essence Layer */}
      <div id="essence-layer-section" className="pl-15 pt-1">
        <EssenceLayer userId={userId} memberId={connection.memberId} companionName={connection.name} />
      </div>

      {/* Connection role selector */}
      <div className="flex items-center gap-2 pl-15">
        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground shrink-0">Role</span>
        <Select
          value={(connection as any).connectionMode || 'friend'}
          onValueChange={(val) => {
            onUpdateConnection(connection.memberId, { connectionMode: val } as any);
            toast.success(`${connection.name}'s role updated`);
          }}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="friend">Friend</SelectItem>
            <SelectItem value="accountability">Accountability Partner</SelectItem>
            <SelectItem value="assistant">Personal Assistant</SelectItem>
            <SelectItem value="romantic">Romantic Partner</SelectItem>
            <SelectItem value="mentor">Mentor / Coach</SelectItem>
            <SelectItem value="kids">Kids Companion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voice selection — gold waveform */}
      <div className="pl-15 pt-1">
        <GoldWaveformButton
          voiceId={connection.voiceId || undefined}
          companionName={connection.name}
          companionGender={connection.gender || 'neutral'}
          onVoiceChange={(voiceId) => {
            onUpdateConnection(connection.memberId, { voiceId });
            toast.success(`${connection.name}'s voice updated`);
          }}
          compact
        />
      </div>


      {/* Backdrop upload */}
      <div className="flex items-center gap-2 pl-15">
        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          {connection.backgroundUrl ? (
            <div className="flex items-center gap-2">
              <img src={connection.backgroundUrl} alt="Backdrop" className="h-10 w-10 rounded-full object-cover object-center border border-border/40" />
              <span className="text-xs text-muted-foreground truncate flex-1">Custom backdrop</span>
              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Not authenticated');

                    const { error } = await (supabase as any)
                      .from('connections')
                      .update({ background_url: null })
                      .eq('user_id', user.id)
                      .eq('member_id', connection.memberId);

                    if (error) throw error;

                    await onUpdateConnection(connection.memberId, { backgroundUrl: undefined });
                    toast.success('Backdrop removed');
                  } catch (error) {
                    console.error('[Backdrop] Remove failed:', error);
                    toast.error('Could not remove backdrop');
                  }
                }}
                className="text-xs text-destructive hover:underline shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/70">No backdrop — upload a scene or photo</span>
          )}
        </div>
        <label className="shrink-0 cursor-pointer rounded-lg border border-border/60 bg-secondary/40 p-2 text-muted-foreground hover:bg-secondary transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingBackdrop}
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
                toast.error('Image must be under 10MB');
                input.value = '';
                return;
              }
              setUploadingBackdrop(true);
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const { uploadCompanionPhoto } = await import('@/lib/companionPhotoUpload');
                const result = await uploadCompanionPhoto({
                  file,
                  userId: user.id,
                  memberId: connection.memberId,
                  target: 'backdrop',
                });

                if (!result.success && 'error' in result) {
                  console.error('[Backdrop] Upload failed:', result.error);
                  toast.error(result.error);
                  return;
                }

                await onUpdateConnection(connection.memberId, { backgroundUrl: result.publicUrl });
                toast.success(`Backdrop set for ${connection.name} 🎬`);
              } catch (error) {
                console.error('[Backdrop] Upload exception:', error);
                toast.error('Upload failed');
              } finally {
                input.value = '';
                setUploadingBackdrop(false);
              }
            }}
          />
          {uploadingBackdrop ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </label>
      </div>
    </div>
  );
}

// Backstory editing row for companion settings
function BackstoryRow({ connection, onUpdateConnection }: { connection: Connection; onUpdateConnection: (memberId: string, updates: Partial<Connection>) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((connection as any).backstory || '');
  const [generating, setGenerating] = useState(false);

  return (
    <div className="flex items-start gap-2 pl-15">
      <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      {editing ? (
        <div className="flex-1 space-y-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Where did they grow up? What do they do? Their quirks and passions…"
            autoFocus
            className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[10px] text-muted-foreground mr-auto">{draft.length}/1000</span>
            <button
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  const { data, error } = await supabase.functions.invoke('generate-backstory', {
                    body: { companionName: connection.name, personality: connection.personality, age: (connection as any).age, gender: connection.gender, connectionMode: (connection as any).connectionMode, bio: connection.bio },
                  });
                  if (error) throw error;
                  const generated = data?.backstory || '';
                  if (generated) { setDraft(generated); toast.success('Generated — review and save!'); }
                } catch { toast.error('Failed to generate'); } finally { setGenerating(false); }
              }}
              className="flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              Generate
            </button>
            <button onClick={() => { onUpdateConnection(connection.memberId, { backstory: draft.trim() || undefined } as any); toast.success('Backstory saved'); setEditing(false); }} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Save</button>
            <button onClick={() => { setDraft((connection as any).backstory || ''); setEditing(false); }} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setDraft((connection as any).backstory || ''); setEditing(true); }} className="flex items-center gap-1.5 group text-left">
          <span className="text-xs text-muted-foreground line-clamp-2">
            {(connection as any).backstory ? 'Backstory set — tap to edit' : 'No backstory — tap to add one'}
          </span>
          <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
        </button>
      )}
    </div>
  );
}

/* ── Travel Base Section ── */
function TravelBaseSection({ profile, onUpdateProfile }: { profile: Profile; onUpdateProfile: (u: Partial<Profile>) => void }) {
  const [editingHome, setEditingHome] = useState(false);
  const [editingHub, setEditingHub] = useState(false);
  const [homeVal, setHomeVal] = useState(profile.homeCity || '');
  const [hubVal, setHubVal] = useState(profile.workHubCity || '');

  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl bg-card/50 border border-border/30 px-4 py-3 transition-colors hover:bg-card/80">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Globe className="h-3.5 w-3.5" /> Travel Base
        </h3>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3 px-1">
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Set your home and work hub so your travel log knows the difference between coming home, going to work, and traveling to a destination.
        </p>

        {/* Home City */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏠</span>
            <span className="text-xs text-foreground/80">Home City</span>
          </div>
          {editingHome ? (
            <div className="flex items-center gap-1.5">
              <input
                value={homeVal}
                onChange={(e) => setHomeVal(e.target.value)}
                placeholder="e.g. Atlanta"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && homeVal.trim()) {
                    onUpdateProfile({ homeCity: homeVal.trim() });
                    setEditingHome(false);
                  }
                }}
                className="w-28 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => { onUpdateProfile({ homeCity: homeVal.trim() || undefined }); setEditingHome(false); }}
                className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
              >Save</button>
            </div>
          ) : (
            <button onClick={() => { setHomeVal(profile.homeCity || ''); setEditingHome(true); }} className="flex items-center gap-1.5 group">
              <span className="text-xs text-muted-foreground">{profile.homeCity || 'Not set'}</span>
              <Pencil className="h-2.5 w-2.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          )}
        </div>

        {/* Work Hub */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">✈️</span>
            <span className="text-xs text-foreground/80">Work Hub</span>
          </div>
          {editingHub ? (
            <div className="flex items-center gap-1.5">
              <input
                value={hubVal}
                onChange={(e) => setHubVal(e.target.value)}
                placeholder="e.g. ATL Airport"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hubVal.trim()) {
                    onUpdateProfile({ workHubCity: hubVal.trim() });
                    setEditingHub(false);
                  }
                }}
                className="w-28 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => { onUpdateProfile({ workHubCity: hubVal.trim() || undefined }); setEditingHub(false); }}
                className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
              >Save</button>
            </div>
          ) : (
            <button onClick={() => { setHubVal(profile.workHubCity || ''); setEditingHub(true); }} className="flex items-center gap-1.5 group">
              <span className="text-xs text-muted-foreground">{profile.workHubCity || 'Not set'}</span>
              <Pencil className="h-2.5 w-2.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Genesis Certificate Section ── */
function GenesisCertificateSection({ userId, userName }: { userId?: string; userName: string }) {
  const [serialNumber, setSerialNumber] = useState<number | null>(null);
  const [claimDate, setClaimDate] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const isOriginPartner = localStorage.getItem('compani-origin-partner') === 'true';

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('beta_serial_numbers')
        .select('serial_number, claimed_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setSerialNumber(data.serial_number);
        setClaimDate(data.claimed_at);
      }
    })();
  }, [userId]);

  // Only show for Genesis Architects (#1-100) who have reached Origin Partner
  if (!serialNumber || serialNumber > 100 || !isOriginPartner || !claimDate) return null;

  return (
    <>
      <section className="animate-fade-in">
        <button
          onClick={() => setShowCertificate(true)}
          className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(184,134,11,0.03) 100%)',
            border: '1px solid hsl(43 74% 49% / 0.15)',
            boxShadow: '0 0 20px hsl(43 74% 49% / 0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: 'hsl(43 74% 49% / 0.1)',
                border: '1px solid hsl(43 74% 49% / 0.2)',
              }}
            >
              <span className="font-serif text-sm" style={{ color: 'hsl(43 74% 49% / 0.7)' }}>C</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'hsl(43 74% 49% / 0.7)', letterSpacing: '0.05em' }}>
                Genesis Certificate
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">
                Origin Partner · #{String(serialNumber).padStart(3, '0')}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'hsl(43 74% 49% / 0.3)' }} />
          </div>
        </button>
      </section>

      {showCertificate && (
        <GenesisCertificate
          userName={userName}
          serialNumber={serialNumber}
          claimDate={claimDate}
          onDismiss={() => setShowCertificate(false)}
        />
      )}
    </>
  );
}
