import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Flag { key: string; value: any; updated_at: string; }

export default function FeatureFlagsDashboard() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_settings' as any).select('*').order('key', { ascending: true });
    const rows = (data || []) as unknown as Flag[];
    setFlags(rows);
    const edits: Record<string, string> = {};
    rows.forEach(f => { if (typeof f.value !== 'boolean') edits[f.key] = JSON.stringify(f.value); });
    setEditValues(edits);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggleFlag = async (key: string, current: boolean) => {
    await supabase.from('admin_settings' as any).update({ value: !current, updated_at: new Date().toISOString() } as any).eq('key', key);
    toast.success(`${key} → ${!current}`);
    fetchFlags();
  };

  const saveFlag = async (key: string) => {
    let parsed: any;
    try { parsed = JSON.parse(editValues[key]); } catch { parsed = editValues[key]; }
    await supabase.from('admin_settings' as any).update({ value: parsed, updated_at: new Date().toISOString() } as any).eq('key', key);
    toast.success(`${key} saved`);
    fetchFlags();
  };

  const addFlag = async () => {
    const k = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!k) return;
    const { error } = await supabase.from('admin_settings' as any).insert({ key: k, value: false } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Flag "${k}" created`);
    setNewKey('');
    fetchFlags();
  };

  const deleteFlag = async (key: string) => {
    await supabase.from('admin_settings' as any).delete().eq('key', key);
    toast.success(`${key} deleted`);
    fetchFlags();
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />;

  return (
    <>
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardContent className="flex items-center gap-2 py-3 px-4">
          <Input placeholder="new_flag_name" value={newKey} onChange={e => setNewKey(e.target.value)} className="flex-1 h-8 text-sm" onKeyDown={e => e.key === 'Enter' && addFlag()} />
          <Button size="sm" onClick={addFlag} className="gap-1.5" disabled={!newKey.trim()}>
            <Plus className="h-3.5 w-3.5" /> Add Flag
          </Button>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">Feature flags</p>
        <Badge variant="outline" className="text-[10px]">{flags.length}</Badge>
      </div>
      <div className="space-y-2">
        {flags.map(f => (
          <Card key={f.key} className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <p className="text-sm font-medium text-foreground font-mono flex-1 min-w-0 truncate">{f.key}</p>
              {typeof f.value === 'boolean' ? (
                <Switch checked={f.value} onCheckedChange={() => toggleFlag(f.key, f.value)} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input value={editValues[f.key] ?? ''} onChange={e => setEditValues(prev => ({ ...prev, [f.key]: e.target.value }))} className="h-7 text-xs w-32" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveFlag(f.key)}><Save className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFlag(f.key)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
