import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Flag, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface FlagRow {
  key: string;
  value: any;
  updated_at: string;
}

export default function FeatureFlagsDashboard() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [editingText, setEditingText] = useState<Record<string, string>>({});

  const fetchFlags = useCallback(async () => {
    const { data } = await supabase.from('admin_settings').select('*').order('key');
    setFlags((data as FlagRow[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggleFlag = async (key: string, currentValue: any) => {
    const newVal = currentValue === true ? false : true;
    await supabase.from('admin_settings').update({ value: newVal, updated_at: new Date().toISOString() }).eq('key', key);
    setFlags(prev => prev.map(f => f.key === key ? { ...f, value: newVal } : f));
    toast.success(`${key} → ${newVal ? 'ON' : 'OFF'}`);
  };

  const saveTextFlag = async (key: string) => {
    const val = editingText[key];
    if (val === undefined) return;
    await supabase.from('admin_settings').update({ value: val, updated_at: new Date().toISOString() }).eq('key', key);
    setFlags(prev => prev.map(f => f.key === key ? { ...f, value: val } : f));
    setEditingText(prev => { const n = { ...prev }; delete n[key]; return n; });
    toast.success(`${key} saved`);
  };

  const addFlag = async () => {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) return;
    if (flags.some(f => f.key === key)) { toast.error('Key already exists'); return; }
    await supabase.from('admin_settings').insert({ key, value: false });
    setNewKey('');
    fetchFlags();
    toast.success(`Flag "${key}" created`);
  };

  const deleteFlag = async (key: string) => {
    // admin_settings has no DELETE RLS — use with caution
    // We'll just set value to null as a soft-delete indicator
    await supabase.from('admin_settings').update({ value: null as any, updated_at: new Date().toISOString() }).eq('key', key);
    setFlags(prev => prev.filter(f => f.key !== key));
    toast.success(`${key} removed`);
  };

  const isBoolean = (v: any) => v === true || v === false;

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse">Loading flags…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" /> Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map(f => (
            <div key={f.key} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground font-mono">{f.key}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(f.updated_at).toLocaleDateString()}
                </p>
              </div>
              {isBoolean(f.value) ? (
                <div className="flex items-center gap-2">
                  <Badge variant={f.value ? 'default' : 'secondary'} className="text-xs">
                    {f.value ? 'ON' : 'OFF'}
                  </Badge>
                  <Switch checked={!!f.value} onCheckedChange={() => toggleFlag(f.key, f.value)} />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-8 w-48 text-xs"
                    defaultValue={typeof f.value === 'string' ? f.value : JSON.stringify(f.value)}
                    onChange={e => setEditingText(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveTextFlag(f.key)}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => deleteFlag(f.key)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {flags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No flags yet</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Input
          placeholder="new_flag_key"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          className="font-mono text-sm"
          onKeyDown={e => e.key === 'Enter' && addFlag()}
        />
        <Button onClick={addFlag} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add Flag
        </Button>
      </div>
    </div>
  );
}
