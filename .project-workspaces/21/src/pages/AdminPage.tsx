import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, FileText, Crown, Search, Save, Eye, Trash2, Plus, ShieldCheck, Wrench, BookOpen, Activity, Combine, Sparkles, Bell, Send, Bug, Flag, FlaskConical, MessageSquare, UserPlus, DollarSign, ClipboardCheck, Rocket, BarChart3, Globe, Radio, StickyNote, Mail } from 'lucide-react';
import { toast } from 'sonner';
import LearnContentManager from '@/components/admin/LearnContentManager';
import DataIntegrityDashboard from '@/components/admin/DataIntegrityDashboard';
import ErrorLogDashboard from '@/components/admin/ErrorLogDashboard';
import UserDeletionTool from '@/components/admin/UserDeletionTool';
import UserBlockTool from '@/components/admin/UserBlockTool';
import EmailBlocklistTool from '@/components/admin/EmailBlocklistTool';
import LoginEventsViewer from '@/components/admin/LoginEventsViewer';
import IncomingCallTester from '@/components/admin/IncomingCallTester';

import FeatureFlagsDashboard from '@/components/admin/FeatureFlagsDashboard';
import AITester from '@/components/admin/AITester';
import RolePromptTester from '@/components/admin/RolePromptTester';
import HealthCheckRunner from '@/components/admin/HealthCheckRunner';
import ActivityHeatMap from '@/components/admin/ActivityHeatMap';
import CostsDashboard from '@/components/admin/CostsDashboard';
import WelcomeEmailSender from '@/components/admin/WelcomeEmailSender';
import FounderDashboard from '@/components/admin/FounderDashboard';
import BetaRecapView from '@/components/admin/BetaRecapView';
import TravelLog from '@/components/admin/TravelLog';
import CommunityPulseMap from '@/components/admin/CommunityPulseMap';
import DevNotes from '@/components/admin/DevNotes';
import EnvelopeLetterEditor from '@/components/admin/EnvelopeLetterEditor';
import AdminSnapshot from '@/components/admin/AdminSnapshot';
import FounderMilestoneToast from '@/components/admin/FounderMilestoneToast';

import HeartbeatIndicator from '@/components/admin/HeartbeatIndicator';
import TestAccountReset from '@/components/admin/TestAccountReset';
import { useGeoLocation } from '@/hooks/useGeoLocation';


interface UserRow {
  user_id: string;
  user_name: string;
  username: string | null;
  created_at: string;
  date_of_birth: string | null;
}

interface SubRow {
  user_id: string;
  plan: string;
  status: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  page_type?: 'blog' | 'story' | 'feature' | 'offer' | 'announcement';
  hero_image_url?: string | null;
  video_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
}

const REGRESSION_ITEMS = [
  { section: '🔐 Auth', items: ['New user signup completes', 'Terms/Privacy links tappable', 'Existing user lands on home', 'Sign out clears session', 'Password reset sends'] },
  { section: '🧭 Navigation', items: ['Refresh any page — no 404', 'Pull-to-refresh reloads', 'Navigate away/back keeps content', 'Background return shows current data'] },
  { section: '💬 Chat', items: ['Message gets a response', 'Chat history loads', 'Images generate in chat', 'No crash navigating back'] },
  { section: '🎨 Studio', items: ['Create companion works', 'Edit companion saves', 'Avatar visible on home + chat'] },
  { section: '📓 Wellness', items: ['Think Freely survives tab switch', 'Journal entry survives tab switch', 'Saving journal clears field'] },
  { section: '🔔 Core Data', items: ['Correct name + avatar on home', 'Notification badge accurate', 'Settings loads profile'] },
  { section: '📱 PWA', items: ['App icon has no Chrome badge', 'Correct screen after background', 'Offline banner on network drop'] },
];

function RegressionChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const total = REGRESSION_ITEMS.reduce((sum, s) => sum + s.items.length, 0);
  const done = checked.size;

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <Card className={cn('border-primary/30', done === total && 'border-green-500/50 bg-green-500/5')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Pre-Deploy Regression Checklist
          <Badge variant="outline" className="ml-auto text-xs">
            {done}/{total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Run through each item before deploying. ~5 min. Check them off as you go.
        </p>
        {REGRESSION_ITEMS.map(section => (
          <div key={section.section}>
            <p className="text-xs font-semibold text-foreground mb-1">{section.section}</p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const key = `${section.section}::${item}`;
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 px-1 rounded hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={checked.has(key)}
                      onChange={() => toggle(key)}
                      className="accent-primary h-3.5 w-3.5"
                    />
                    <span className={cn('text-xs', checked.has(key) ? 'text-muted-foreground line-through' : 'text-foreground')}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {done === total && (
          <p className="text-xs text-green-500 font-medium pt-1">✅ All checks passed — clear to deploy!</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user, profile } = useAppContext();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<(UserRow & { plan?: string; role?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [messageHeatData, setMessageHeatData] = useState<{ date: string; count: number }[]>([]);
  const [signupHeatData, setSignupHeatData] = useState<{ date: string; count: number }[]>([]);

  // Silent Operator: auto-detect location changes
  useGeoLocation(user?.id, undefined, {
    homeCity: profile?.homeCity,
    homeLat: profile?.homeLat,
    homeLon: profile?.homeLon,
    workCity: profile?.workHubCity,
    workLat: profile?.workLat,
    workLon: profile?.workLon,
  });

  // Check admin role
  useEffect(() => {
    if (!user) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  // Fetch users
  useEffect(() => {
    if (!isAdmin) return;
    const fetchUsers = async () => {
      const { data: profiles } = await supabase.from('profiles').select('user_id, user_name, username, created_at, date_of_birth');
      const { data: subs } = await supabase.from('subscriptions').select('user_id, plan, status');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');

      const subMap = new Map((subs || []).map((s: SubRow) => [s.user_id, s.plan]));
      const roleMap = new Map((roles || []).map((r: RoleRow) => [r.user_id, r.role]));

      setUsers((profiles || []).map((p: UserRow) => ({
        ...p,
        plan: subMap.get(p.user_id) || 'free',
        role: roleMap.get(p.user_id) || 'user',
      })));
    };
    fetchUsers();
  }, [isAdmin]);

  // Fetch heatmap data
  useEffect(() => {
    if (!isAdmin) return;
    const fetchHeatData = async () => {
      // Message counts from usage_tracking (aggregated across all users)
      const { data: usage } = await supabase
        .from('usage_tracking')
        .select('usage_date, messages_sent')
        .gte('usage_date', new Date(Date.now() - 84 * 86400000).toISOString().slice(0, 10));

      if (usage) {
        const dateMap = new Map<string, number>();
        for (const row of usage) {
          const d = row.usage_date;
          dateMap.set(d, (dateMap.get(d) || 0) + row.messages_sent);
        }
        setMessageHeatData(Array.from(dateMap, ([date, count]) => ({ date, count })));
      }

      // Signup counts from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 84 * 86400000).toISOString());

      if (profiles) {
        const dateMap = new Map<string, number>();
        for (const p of profiles) {
          const d = p.created_at.slice(0, 10);
          dateMap.set(d, (dateMap.get(d) || 0) + 1);
        }
        setSignupHeatData(Array.from(dateMap, ([date, count]) => ({ date, count })));
      }
    };
    fetchHeatData();
  }, [isAdmin]);


  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('blog_posts').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setPosts((data as BlogPost[]) || []);
    });
  }, [isAdmin]);

  const togglePremium = async (userId: string, currentPlan: string) => {
    const newPlan = currentPlan === 'premium' ? 'free' : 'premium';
    const newStatus = newPlan === 'premium' ? 'active' : 'canceled';

    // Try update first (existing row)
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('subscriptions')
        .update({ plan: newPlan, status: newStatus })
        .eq('user_id', userId));
    } else {
      ({ error } = await supabase
        .from('subscriptions')
        .insert({ user_id: userId, plan: newPlan, status: newStatus }));
    }

    if (error) {
      console.error('Toggle premium error:', error);
      toast.error(`Failed to update plan: ${error.message}`);
      return;
    }
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, plan: newPlan } : u));
    toast.success(`User set to ${newPlan}`);
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  const savePost = async () => {
    if (!editingPost?.title?.trim() || !user) return;
    setSaving(true);

    const slug = editingPost.slug || generateSlug(editingPost.title);
    const payload = {
      title: editingPost.title.trim(),
      slug,
      content: editingPost.content || '',
      excerpt: editingPost.excerpt || null,
      published: editingPost.published || false,
      published_at: editingPost.published ? (editingPost.published_at || new Date().toISOString()) : null,
      author_id: user.id,
      page_type: editingPost.page_type || 'blog',
      hero_image_url: editingPost.hero_image_url || null,
      video_url: editingPost.video_url || null,
      cta_text: editingPost.cta_text || null,
      cta_url: editingPost.cta_url || null,
      og_title: editingPost.og_title || null,
      og_description: editingPost.og_description || null,
      og_image_url: editingPost.og_image_url || null,
    };

    let result;
    if (editingPost.id) {
      result = await supabase.from('blog_posts').update(payload).eq('id', editingPost.id).select().single();
    } else {
      result = await supabase.from('blog_posts').insert(payload).select().single();
    }

    if (result.error) {
      toast.error('Failed to save post');
    } else {
      toast.success(editingPost.id ? 'Post updated' : 'Post created');
      const post = result.data as BlogPost;
      setPosts(prev => {
        const filtered = prev.filter(p => p.id !== post.id);
        return [post, ...filtered];
      });
      setEditingPost(null);
    }
    setSaving(false);
  };

  const deletePost = async (id: string) => {
    await supabase.from('blog_posts').delete().eq('id', id);
    setPosts(prev => prev.filter(p => p.id !== id));
    toast.success('Post deleted');
  };

  if (isAdmin === null) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background gap-4">
        <ShieldCheck className="h-12 w-12 text-destructive" />
        <p className="text-lg font-semibold text-foreground">Admin access required</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-lg px-4 py-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <HeartbeatIndicator />
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            <Crown className="h-3 w-3 mr-1" /> Admin
          </Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        <Tabs defaultValue="mission" className="space-y-4">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="mission" className="gap-1.5 text-xs"><Rocket className="h-3.5 w-3.5" /> Mission</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="blog" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Blog</TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" /> Learn</TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Health</TabsTrigger>
            <TabsTrigger value="errors" className="gap-1.5 text-xs"><Bug className="h-3.5 w-3.5" /> Errors</TabsTrigger>
            <TabsTrigger value="flags" className="gap-1.5 text-xs"><Flag className="h-3.5 w-3.5" /> Flags</TabsTrigger>
            <TabsTrigger value="ailab" className="gap-1.5 text-xs"><FlaskConical className="h-3.5 w-3.5" /> AI Lab</TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" /> Tools</TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" /> Costs</TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5 text-xs" onClick={() => navigate('/admin/feedback')}><MessageSquare className="h-3.5 w-3.5" /> Feedback</TabsTrigger>
            <TabsTrigger value="welcome" className="gap-1.5 text-xs"><UserPlus className="h-3.5 w-3.5" /> Welcome</TabsTrigger>
            <TabsTrigger value="recap" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Recap</TabsTrigger>
            <TabsTrigger value="circles" className="gap-1.5 text-xs" onClick={() => navigate('/circles')}><Combine className="h-3.5 w-3.5" /> Circles</TabsTrigger>
            <TabsTrigger value="travel" className="gap-1.5 text-xs"><Globe className="h-3.5 w-3.5" /> Travel</TabsTrigger>
            <TabsTrigger value="pulse" className="gap-1.5 text-xs"><Radio className="h-3.5 w-3.5" /> Pulse</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs"><StickyNote className="h-3.5 w-3.5" /> Notes</TabsTrigger>
            <TabsTrigger value="letters" className="gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> Letters</TabsTrigger>
          </TabsList>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">{filteredUsers.length} users</p>

            <div className="space-y-2">
              {filteredUsers.map(u => (
                <Card key={u.user_id} className="border-border/50">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{u.user_name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={u.plan === 'premium' ? 'default' : 'secondary'} className="text-xs">
                        {u.plan === 'premium' ? '💎 Premium' : 'Free'}
                      </Badge>
                      <Switch
                        checked={u.plan === 'premium'}
                        onCheckedChange={() => togglePremium(u.user_id, u.plan || 'free')}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Blog Tab ── */}
          <TabsContent value="blog" className="space-y-4">
            {editingPost ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{editingPost.id ? 'Edit Page' : 'New Page'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Page type */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Page Type</p>
                    <div className="flex flex-wrap gap-2">
                      {(['blog','story','feature','offer','announcement'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setEditingPost(prev => ({ ...prev, page_type: t }))}
                          className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all capitalize ${
                            (editingPost.page_type || 'blog') === t
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      Story = founder narrative · Feature = show a capability · Offer = drive signups · Announcement = news
                    </p>
                  </div>

                  <Input
                    placeholder="Page title"
                    value={editingPost.title || ''}
                    onChange={e => setEditingPost(prev => ({ ...prev, title: e.target.value, slug: prev?.slug || generateSlug(e.target.value) }))}
                  />
                  <Input
                    placeholder="slug-url (auto-generated from title)"
                    value={editingPost.slug || ''}
                    onChange={e => setEditingPost(prev => ({ ...prev, slug: e.target.value }))}
                    className="text-xs font-mono"
                  />
                  <Textarea
                    placeholder="Write your content (markdown: ## headings, **bold**, *italic*, [text](url))…"
                    value={editingPost.content || ''}
                    onChange={e => setEditingPost(prev => ({ ...prev, content: e.target.value }))}
                    rows={10}
                  />
                  <Input
                    placeholder="Short excerpt — shown on index page and in social previews"
                    value={editingPost.excerpt || ''}
                    onChange={e => setEditingPost(prev => ({ ...prev, excerpt: e.target.value }))}
                  />

                  {/* Rich media */}
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rich Media</p>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Hero image URL — shown at the top of the page</p>
                      <Input
                        placeholder="https://… (storage, Canva export, etc.)"
                        value={editingPost.hero_image_url || ''}
                        onChange={e => setEditingPost(prev => ({ ...prev, hero_image_url: e.target.value || null }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Video URL — YouTube, Vimeo, Loom, or TikTok</p>
                      <Input
                        placeholder="https://youtube.com/watch?v=… or https://loom.com/share/…"
                        value={editingPost.video_url || ''}
                        onChange={e => setEditingPost(prev => ({ ...prev, video_url: e.target.value || null }))}
                      />
                      <p className="text-[11px] text-muted-foreground/60">YouTube and Loom embed inline. TikTok shows a tap-to-open card.</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Call to Action Button</p>
                    <p className="text-[11px] text-muted-foreground/60">Appears at the bottom of the page. Leave blank to use the default for the page type.</p>
                    <Input
                      placeholder="Button text — e.g. 'Start for free →'"
                      value={editingPost.cta_text || ''}
                      onChange={e => setEditingPost(prev => ({ ...prev, cta_text: e.target.value || null }))}
                    />
                    <Input
                      placeholder="Button URL — e.g. /auth or https://mycompani.app"
                      value={editingPost.cta_url || ''}
                      onChange={e => setEditingPost(prev => ({ ...prev, cta_url: e.target.value || null }))}
                    />
                  </div>

                  {/* Social sharing / Open Graph */}
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Social Preview</p>
                    <p className="text-[11px] text-muted-foreground/60">Controls what people see when your link is shared on Instagram, Facebook, Twitter, iMessage, etc.</p>
                    <Input
                      placeholder="Social title — e.g. 'The friend you've been looking for'"
                      value={editingPost.og_title || ''}
                      onChange={e => setEditingPost(prev => ({ ...prev, og_title: e.target.value || null }))}
                    />
                    <Input
                      placeholder="Social description — 1-2 sentences that make someone want to tap"
                      value={editingPost.og_description || ''}
                      onChange={e => setEditingPost(prev => ({ ...prev, og_description: e.target.value || null }))}
                    />
                    <Input
                      placeholder="Social image URL — ideally 1200×630px"
                      value={editingPost.og_image_url || ''}
                      onChange={e => setEditingPost(prev => ({ ...prev, og_image_url: e.target.value || null }))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingPost.published || false}
                      onCheckedChange={v => setEditingPost(prev => ({ ...prev, published: v }))}
                    />
                    <span className="text-sm text-muted-foreground">Published (live to the public)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={savePost} disabled={saving} className="gap-1.5">
                      <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingPost(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Button onClick={() => setEditingPost({ title: '', content: '', published: false })} className="gap-1.5">
                  <Plus className="h-4 w-4" /> New Post
                </Button>
                <div className="space-y-2">
                  {posts.map(p => (
                    <Card key={p.id} className="border-border/50">
                      <CardContent className="flex items-center justify-between py-3 px-4">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">/{p.slug} · {p.published ? '🟢 Live' : '⚪ Draft'}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => setEditingPost(p)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          {p.published && (
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/blog/${p.slug}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deletePost(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {posts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No blog posts yet. Create your first one!</p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Content / Learn Tab ── */}
          <TabsContent value="content" className="space-y-4">
            {user && <LearnContentManager userId={user.id} />}
          </TabsContent>

          {/* ── Health Tab ── */}
          <TabsContent value="health" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ActivityHeatMap
                data={messageHeatData}
                title="Messages Sent"
                icon={<MessageSquare className="h-4 w-4 text-primary" />}
              />
              <ActivityHeatMap
                data={signupHeatData}
                title="User Signups"
                icon={<UserPlus className="h-4 w-4 text-primary" />}
              />
            </div>
            <HealthCheckRunner />
            {user && <DataIntegrityDashboard userId={user.id} />}
          </TabsContent>

          {/* ── Errors Tab ── */}
          <TabsContent value="errors" className="space-y-4">
            <ErrorLogDashboard />
          </TabsContent>

          {/* ── Flags Tab ── */}
          <TabsContent value="flags" className="space-y-4">
            <FeatureFlagsDashboard />
          </TabsContent>

          {/* ── AI Lab Tab ── */}
          <TabsContent value="ailab" className="space-y-4">
            <AITester />
            <RolePromptTester />
          </TabsContent>

          {/* ── Tools Tab ── */}
          <TabsContent value="tools" className="space-y-4">
            <IncomingCallTester />
            <TestAccountReset />
            <RegressionChecklist />
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Replay Presence Tour
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Clears the one-time gate and re-launches Cami's first-visit tour on the dashboard.
                </p>
                <Button
                  onClick={() => {
                    localStorage.removeItem('compani-presence-tour-done');
                    toast.success('Tour reset — launching…');
                    setTimeout(() => navigate('/my-world'), 400);
                  }}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" /> Replay Presence Tour
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" /> Repair Connections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Scan for orphaned companion data (chat history or milestones without an active connection) and restore them.
                </p>
                <Button
                  onClick={async () => {
                    if (!user) return;
                    toast.info('Scanning for orphaned data…');
                    const { data: msgs } = await supabase.from('chat_messages').select('member_id').eq('user_id', user.id);
                    const { data: conns } = await supabase.from('connections').select('member_id').eq('user_id', user.id);
                    const connIds = new Set((conns || []).map((c: any) => c.member_id));
                    const orphanIds = [...new Set((msgs || []).map((m: any) => m.member_id))].filter(id => !connIds.has(id));

                    if (orphanIds.length === 0) {
                      toast.success('No orphaned companions found — all connections healthy!');
                      return;
                    }

                    let restored = 0;
                    for (const memberId of orphanIds) {
                      const { data: latestMsg } = await supabase
                        .from('chat_messages')
                        .select('content')
                        .eq('user_id', user.id)
                        .eq('member_id', memberId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                      await supabase.from('connections').insert({
                        user_id: user.id,
                        member_id: memberId,
                        name: memberId.charAt(0).toUpperCase() + memberId.slice(1),
                        is_created: true,
                        last_message: latestMsg?.content || 'Restored connection',
                      });
                      restored++;
                    }
                    toast.success(`Restored ${restored} orphaned companion${restored !== 1 ? 's' : ''}!`);
                  }}
                  className="gap-1.5"
                >
                  <Wrench className="h-4 w-4" /> Scan & Repair
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Combine className="h-4 w-4 text-primary" /> De-Duplicate Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Find companions with the same name or avatar and merge their chat history into a single record.
                </p>
                <Button
                  onClick={async () => {
                    if (!user) return;
                    toast.info('Scanning for duplicates…');
                    try {
                      const { data: conns } = await supabase
                        .from('connections')
                        .select('member_id, name, avatar_url, connected_at')
                        .eq('user_id', user.id);

                      if (!conns || conns.length < 2) {
                        toast.success('No duplicates found — all companions are unique!');
                        return;
                      }

                      const nameGroups = new Map<string, typeof conns>();
                      for (const c of conns) {
                        const key = (c.name || '').trim().toLowerCase();
                        if (!key) continue;
                        const group = nameGroups.get(key) || [];
                        group.push(c);
                        nameGroups.set(key, group);
                      }

                      const avatarGroups = new Map<string, typeof conns>();
                      for (const c of conns) {
                        if (!c.avatar_url) continue;
                        const group = avatarGroups.get(c.avatar_url) || [];
                        group.push(c);
                        avatarGroups.set(c.avatar_url, group);
                      }

                      const mergeSets = new Map<string, Set<string>>();
                      const addMerge = (members: typeof conns) => {
                        if (members.length < 2) return;
                        const sorted = [...members].sort((a, b) => new Date(a.connected_at).getTime() - new Date(b.connected_at).getTime());
                        const primaryId = sorted[0].member_id;
                        const existing = mergeSets.get(primaryId) || new Set<string>();
                        for (const m of sorted.slice(1)) existing.add(m.member_id);
                        mergeSets.set(primaryId, existing);
                      };

                      for (const group of nameGroups.values()) addMerge(group);
                      for (const group of avatarGroups.values()) addMerge(group);

                      if (mergeSets.size === 0) {
                        toast.success('No duplicates found — all companions are unique!');
                        return;
                      }

                      let mergedCount = 0;
                      let messagesReassigned = 0;

                      for (const [primaryId, dupeIds] of mergeSets) {
                        for (const dupeId of dupeIds) {
                          const { data: dupeMessages } = await supabase
                            .from('chat_messages')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('member_id', dupeId);
                          const dupeCount = dupeMessages?.length ?? 0;
                          if (dupeCount > 0) {
                            await supabase
                              .from('chat_messages')
                              .update({ member_id: primaryId } as any)
                              .eq('user_id', user.id)
                              .eq('member_id', dupeId);
                          }
                          messagesReassigned += dupeCount;

                          await supabase
                            .from('companion_milestones')
                            .update({ member_id: primaryId } as any)
                            .eq('user_id', user.id)
                            .eq('member_id', dupeId);
                          await supabase
                            .from('companion_media')
                            .update({ member_id: primaryId } as any)
                            .eq('user_id', user.id)
                            .eq('member_id', dupeId);
                          await supabase
                            .from('companion_feed_posts')
                            .update({ member_id: primaryId } as any)
                            .eq('user_id', user.id)
                            .eq('member_id', dupeId);

                          await supabase
                            .from('connections')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('member_id', dupeId);

                          mergedCount++;
                        }
                      }

                      toast.success(`Merged ${mergedCount} duplicate${mergedCount !== 1 ? 's' : ''} · ${messagesReassigned} messages reassigned`);
                    } catch (e) {
                      console.error('De-duplicate failed:', e);
                      toast.error('De-duplication failed — check console');
                    }
                  }}
                  variant="outline"
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Combine className="h-4 w-4" /> De-Duplicate Database
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Database Sanitizer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Find companions sharing the same avatar image but with different IDs — "Split Personalities." Merge All consolidates them.
                </p>
                <Button
                  onClick={async () => {
                    if (!user) return;
                    toast.info('Scanning for split personalities…');
                    try {
                      const { data: conns } = await supabase
                        .from('connections')
                        .select('member_id, name, avatar_url, connected_at, bio, personality, age, gender, handle')
                        .eq('user_id', user.id);

                      if (!conns || conns.length < 2) {
                        toast.success('No split personalities found!');
                        return;
                      }

                      const avatarGroups = new Map<string, typeof conns>();
                      for (const c of conns) {
                        if (!c.avatar_url) continue;
                        const group = avatarGroups.get(c.avatar_url) || [];
                        group.push(c);
                        avatarGroups.set(c.avatar_url, group);
                      }

                      const splits = [...avatarGroups.values()].filter(g => g.length > 1);
                      if (splits.length === 0) {
                        toast.success('No split personalities found — all images are unique!');
                        return;
                      }

                      let mergedCount = 0;
                      let msgsReassigned = 0;
                      let namesFixed = 0;

                      for (const group of splits) {
                        const sorted = [...group].sort((a, b) => {
                          const aHasName = a.name && a.name !== 'Companion' ? 1 : 0;
                          const bHasName = b.name && b.name !== 'Companion' ? 1 : 0;
                          if (bHasName !== aHasName) return bHasName - aHasName;
                          return new Date(a.connected_at).getTime() - new Date(b.connected_at).getTime();
                        });

                        const primary = sorted[0];
                        const dupes = sorted.slice(1);

                        if (!primary.name || primary.name === 'Companion') {
                          const betterName = dupes.find(d => d.name && d.name !== 'Companion')?.name;
                          if (betterName) {
                            await supabase.from('connections')
                              .update({ name: betterName } as any)
                              .eq('user_id', user.id)
                              .eq('member_id', primary.member_id);
                            await supabase.from('profiles')
                              .update({ companion_name: betterName } as any)
                              .eq('user_id', user.id);
                            namesFixed++;
                          }
                        }

                        const patchFields: Record<string, string | null> = {};
                        for (const dupe of dupes) {
                          if (!primary.bio && dupe.bio) patchFields.bio = dupe.bio;
                          if (!primary.personality && dupe.personality) patchFields.personality = dupe.personality;
                          if (!primary.age && dupe.age) patchFields.age = dupe.age;
                          if (!primary.gender && dupe.gender) patchFields.gender = dupe.gender;
                          if (!primary.handle && dupe.handle) patchFields.handle = dupe.handle;
                        }
                        if (Object.keys(patchFields).length > 0) {
                          await supabase.from('connections')
                            .update(patchFields as any)
                            .eq('user_id', user.id)
                            .eq('member_id', primary.member_id);
                        }

                        for (const dupe of dupes) {
                          const { data: msgs } = await supabase.from('chat_messages')
                            .select('id').eq('user_id', user.id).eq('member_id', dupe.member_id);
                          const count = msgs?.length ?? 0;
                          if (count > 0) {
                            await supabase.from('chat_messages')
                              .update({ member_id: primary.member_id } as any)
                              .eq('user_id', user.id).eq('member_id', dupe.member_id);
                          }
                          msgsReassigned += count;

                          const { data: existingMilestones } = await supabase.from('companion_milestones')
                            .select('milestone_type').eq('user_id', user.id).eq('member_id', primary.member_id);
                          const existingTypes = new Set((existingMilestones || []).map(m => m.milestone_type));
                          const { data: dupeMilestones } = await supabase.from('companion_milestones')
                            .select('id, milestone_type').eq('user_id', user.id).eq('member_id', dupe.member_id);
                          for (const dm of (dupeMilestones || [])) {
                            if (existingTypes.has(dm.milestone_type)) {
                              await supabase.from('companion_milestones').delete().eq('id', dm.id);
                            } else {
                              await supabase.from('companion_milestones')
                                .update({ member_id: primary.member_id } as any).eq('id', dm.id);
                            }
                          }

                          await supabase.from('companion_media')
                            .update({ member_id: primary.member_id } as any)
                            .eq('user_id', user.id).eq('member_id', dupe.member_id);
                          await supabase.from('companion_feed_posts')
                            .update({ member_id: primary.member_id } as any)
                            .eq('user_id', user.id).eq('member_id', dupe.member_id);

                          await supabase.from('connections').delete()
                            .eq('user_id', user.id).eq('member_id', dupe.member_id);

                          mergedCount++;
                        }
                      }

                      const parts = [];
                      if (mergedCount > 0) parts.push(`${mergedCount} split${mergedCount !== 1 ? 's' : ''} merged`);
                      if (msgsReassigned > 0) parts.push(`${msgsReassigned} messages moved`);
                      if (namesFixed > 0) parts.push(`${namesFixed} name${namesFixed !== 1 ? 's' : ''} fixed`);
                      toast.success(parts.length > 0 ? parts.join(' · ') : 'All clean — no splits found!');
                    } catch (e) {
                      console.error('Sanitizer failed:', e);
                      toast.error('Sanitizer failed — check console');
                    }
                  }}
                  variant="outline"
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Sparkles className="h-4 w-4" /> Merge All Split Personalities
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> Push Notification Tester
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send a test push notification to yourself to verify VAPID keys and service worker are working.
                </p>
                <Button
                  onClick={async () => {
                    if (!user) return;
                    toast.info('Sending test push…');
                    try {
                      const { data, error } = await supabase.functions.invoke('send-push-notification', {
                        body: {
                          user_ids: [user.id],
                          title: '💛 Compani Test',
                          body: 'Push notifications are working! Your companion is always with you.',
                          icon: '/icon-192.png',
                          tag: 'test',
                          url: '/',
                        },
                      });
                      if (error) throw error;
                      toast.success(`Test sent! ${data?.sent || 0} delivered, ${data?.failed || 0} failed`);
                    } catch (e) {
                      console.error('Test push failed:', e);
                      toast.error('Push test failed — check console. Make sure VAPID keys are set.');
                    }
                  }}
                  variant="outline"
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Bell className="h-4 w-4" /> Send Test Notification
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" /> Broadcast to All Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send a custom push notification to every subscriber.
                </p>
                <Input
                  id="broadcast-title"
                  placeholder="Notification title (e.g. New Video!)"
                  className="bg-muted/40"
                />
                <Textarea
                  id="broadcast-body"
                  placeholder="Message body…"
                  rows={2}
                  className="bg-muted/40"
                />
                <Button
                  onClick={async () => {
                    const titleEl = document.getElementById('broadcast-title') as HTMLInputElement;
                    const bodyEl = document.getElementById('broadcast-body') as HTMLTextAreaElement;
                    const title = titleEl?.value?.trim();
                    const body = bodyEl?.value?.trim();
                    if (!title || !body) {
                      toast.error('Please enter both a title and message');
                      return;
                    }
                    toast.info('Broadcasting to all subscribers…');
                    try {
                      const { data, error } = await supabase.functions.invoke('send-push-notification', {
                        body: {
                          title,
                          body,
                          icon: '/icon-192.png',
                          tag: 'broadcast',
                          url: '/',
                        },
                      });
                      if (error) throw error;
                      toast.success(`Broadcast sent! ${data?.sent || 0} delivered, ${data?.failed || 0} failed`);
                      titleEl.value = '';
                      bodyEl.value = '';
                    } catch (e) {
                      console.error('Broadcast failed:', e);
                      toast.error('Broadcast failed — check console');
                    }
                  }}
                  variant="outline"
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Send className="h-4 w-4" /> Send to All Subscribers
                </Button>
              </CardContent>
            </Card>
            {/* ── User Deletion Tool ── */}
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>🚫</span> Block / Unblock Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Block a user to immediately suspend their access. They will see a suspension notice and cannot use the app until unblocked. Their data is preserved.
                </p>
                <UserBlockTool currentUserId={user?.id} />
              </CardContent>
            </Card>

            {/* ── Email Blocklist (silent-fail at signup) ── */}
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>📧</span> Email Blocklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmailBlocklistTool />
              </CardContent>
            </Card>

            {/* ── Login Audit Trail ── */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Recent Sign-Ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LoginEventsViewer />
              </CardContent>
            </Card>


            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" /> Delete Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Load all users, select the ones you want to remove, then delete. This permanently deletes all their data.
                </p>
                <UserDeletionTool currentUserId={user?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Costs Tab ── */}
          <TabsContent value="costs" className="space-y-4">
            <CostsDashboard />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            {/* Navigation handled by the tab trigger above */}
          </TabsContent>

          {/* ── Welcome Email Tab ── */}
          <TabsContent value="welcome" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" /> Send Beta Welcome Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send the luxury "Welcome to Your Space" email to individual beta testers. Each email includes the Flight Plan, Zero-Trace Promise, and a golden CTA button.
                </p>
                <WelcomeEmailSender />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Mission Control Tab ── */}
          <TabsContent value="mission">
            <FounderMilestoneToast />
            
            <FounderDashboard />
          </TabsContent>

          {/* ── Beta Recap Tab ── */}
          <TabsContent value="recap">
            <BetaRecapView />
          </TabsContent>

          {/* ── Travel Log Tab ── */}
          <TabsContent value="travel">
            {user && <TravelLog userId={user.id} />}
          </TabsContent>

          {/* ── Community Pulse Tab ── */}
          <TabsContent value="pulse" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-primary/50 font-semibold">Community Pulse</span>
              <AdminSnapshot />
            </div>
            <CommunityPulseMap />
          </TabsContent>

          {/* ── Dev Notes Tab ── */}
          <TabsContent value="notes">
            <DevNotes />
          </TabsContent>

          {/* ── Envelope Letters Tab ── */}
          <TabsContent value="letters">
            <EnvelopeLetterEditor />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
