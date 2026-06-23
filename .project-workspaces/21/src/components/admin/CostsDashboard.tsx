import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ActivityHeatMap from './ActivityHeatMap';
import { DollarSign, MessageSquare, Image, Zap, Key, TrendingUp, Users, ExternalLink } from 'lucide-react';

const SERVICES = [
  { name: 'Anthropic (Claude)', use: 'Core chat, companion gen, community replies', model: 'Per-token', secretKey: 'ANTHROPIC_API_KEY', url: 'https://console.anthropic.com/settings/billing' },
  { name: 'Gemini', use: 'Push notifs, memory, moderation, reminders, journal, transcription +10 functions', model: 'Per-token', secretKey: 'GEMINI_API_KEY', url: 'https://aistudio.google.com/apikey' },
  { name: 'Lovable AI Gateway', use: 'Image generation (selfies, avatars, gifts)', model: 'Per-request', secretKey: 'LOVABLE_API_KEY', url: null },
  { name: 'Perplexity', use: 'Web search answers', model: 'Per-request', secretKey: 'PERPLEXITY_API_KEY', url: 'https://www.perplexity.ai/settings/api' },
  { name: 'ElevenLabs', use: 'Voice generation, transcription', model: 'Per-char / per-min', secretKey: 'ELEVENLABS_API_KEY', url: 'https://elevenlabs.io/app/subscription' },
  { name: 'Twilio', use: 'SMS check-ins, TURN credentials', model: 'Per-SMS / per-min', secretKey: 'TWILIO_ACCOUNT_SID', url: 'https://console.twilio.com/us1/billing/manage-billing' },
  { name: 'Stripe', use: 'Payment processing', model: 'Per-txn %', secretKey: 'STRIPE_SECRET_KEY', url: 'https://dashboard.stripe.com' },
  { name: 'Resend', use: 'Transactional emails', model: 'Per-email', secretKey: 'RESEND_API_KEY', url: 'https://resend.com/settings/billing' },
  { name: 'HeyGen', use: 'Video avatar features', model: 'Per-minute', secretKey: 'HEYGEN_API_KEY', url: 'https://app.heygen.com/settings/billing' },
  { name: 'Together AI', use: 'Additional AI models', model: 'Per-token', secretKey: 'TOGETHER_AI_API_KEY', url: 'https://api.together.ai/settings/billing' },
  { name: 'Lovable Cloud', use: 'Database, auth, storage, edge functions', model: 'Included', secretKey: null, url: null },
];

interface UsageRow {
  usage_date: string;
  messages_sent: number;
  images_generated: number;
  ai_calls: number;
  user_id: string;
}

export default function CostsDashboard() {
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [costPerMsg, setCostPerMsg] = useState('0.003');
  const [costPerImg, setCostPerImg] = useState('0.04');
  const [costPerAI, setCostPerAI] = useState('0.001');

  useEffect(() => {
    const load = async () => {
      const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const { data } = await supabase
        .from('usage_tracking')
        .select('usage_date, messages_sent, images_generated, user_id')
        .gte('usage_date', thirtyAgo) as { data: UsageRow[] | null };

      // ai_calls may not be in the type yet, so add default
      const rows = (data || []).map(r => ({ ...r, ai_calls: (r as any).ai_calls ?? 0 }));
      setUsage(rows);

      const uniqueUsers = new Set(rows.map(r => r.user_id));
      setActiveUsers(uniqueUsers.size);

      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setTotalUsers(count || 0);
    };
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const todayData = useMemo(() => {
    const t = usage.filter(r => r.usage_date === today);
    return {
      messages: t.reduce((s, r) => s + r.messages_sent, 0),
      images: t.reduce((s, r) => s + r.images_generated, 0),
      aiCalls: t.reduce((s, r) => s + r.ai_calls, 0),
    };
  }, [usage, today]);

  const thirtyDayData = useMemo(() => ({
    messages: usage.reduce((s, r) => s + r.messages_sent, 0),
    images: usage.reduce((s, r) => s + r.images_generated, 0),
    aiCalls: usage.reduce((s, r) => s + r.ai_calls, 0),
  }), [usage]);

  const heatData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of usage) {
      map.set(r.usage_date, (map.get(r.usage_date) || 0) + r.messages_sent + r.images_generated + r.ai_calls);
    }
    return Array.from(map, ([date, count]) => ({ date, count }));
  }, [usage]);

  const cMsg = parseFloat(costPerMsg) || 0;
  const cImg = parseFloat(costPerImg) || 0;
  const cAI = parseFloat(costPerAI) || 0;

  const estToday = todayData.messages * cMsg + todayData.images * cImg + todayData.aiCalls * cAI;
  const est30 = thirtyDayData.messages * cMsg + thirtyDayData.images * cImg + thirtyDayData.aiCalls * cAI;
  const perUserDay = activeUsers > 0 ? est30 / (activeUsers * 30) : 0;

  return (
    <div className="space-y-4">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <MessageSquare className="h-3.5 w-3.5" /> Messages Today
            </div>
            <p className="text-2xl font-bold text-foreground">{todayData.messages.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">30d: {thirtyDayData.messages.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Image className="h-3.5 w-3.5" /> Images Today
            </div>
            <p className="text-2xl font-bold text-foreground">{todayData.images.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">30d: {thirtyDayData.images.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Zap className="h-3.5 w-3.5" /> AI Calls Today
            </div>
            <p className="text-2xl font-bold text-foreground">{todayData.aiCalls.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">30d: {thirtyDayData.aiCalls.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" /> Active Users (30d)
            </div>
            <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total: {totalUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Usage Heatmap ── */}
      <ActivityHeatMap
        data={heatData}
        title="AI Usage (Messages + Images + Calls)"
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
      />

      {/* ── Cost Estimator ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Cost Estimator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">$/message</Label>
              <Input value={costPerMsg} onChange={e => setCostPerMsg(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">$/image</Label>
              <Input value={costPerImg} onChange={e => setCostPerImg(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">$/AI call</Label>
              <Input value={costPerAI} onChange={e => setCostPerAI(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">Est. Today</p>
              <p className="text-sm font-bold text-foreground">${estToday.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">Est. 30-Day</p>
              <p className="text-sm font-bold text-foreground">${est30.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">$/User/Day</p>
              <p className="text-sm font-bold text-foreground">${perUserDay.toFixed(4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Service Inventory ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> API Keys & Services
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Service</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Used For</TableHead>
                <TableHead className="text-xs">Cost</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SERVICES.map(s => (
                <TableRow key={s.name}>
                  <TableCell className="py-2 text-xs font-medium">{s.name}</TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground hidden sm:table-cell">{s.use}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={s.model === 'Included' ? 'default' : 'secondary'} className="text-[10px]">
                      {s.model}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors" title={`Manage ${s.name}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
