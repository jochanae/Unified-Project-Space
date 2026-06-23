import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Trash2, Bug, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ClientError {
  id: string;
  user_id: string;
  error_message: string;
  error_stack: string | null;
  component_name: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function ErrorLogDashboard() {
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_errors' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100) as any;
    setErrors((data as ClientError[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  const clearAll = async () => {
    await supabase.from('client_errors' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setErrors([]);
    toast.success('Error log cleared');
  };

  const clearOne = async (id: string) => {
    await supabase.from('client_errors' as any).delete().eq('id', id);
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  // Group by error message for trend view
  const grouped = errors.reduce<Record<string, { count: number; latest: string; component: string | null; errors: ClientError[] }>>((acc, e) => {
    const key = e.error_message.slice(0, 100);
    if (!acc[key]) acc[key] = { count: 0, latest: e.created_at, component: e.component_name, errors: [] };
    acc[key].count++;
    acc[key].errors.push(e);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-foreground">{errors.length} error{errors.length !== 1 ? 's' : ''} logged</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchErrors} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {errors.length > 0 && (
            <Button size="sm" variant="destructive" onClick={clearAll} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {errors.length === 0 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">🎉 No errors logged — your app is running clean!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedGroups.map(([msg, group]) => (
            <Card key={msg} className="border-border/50">
              <CardContent className="py-3 px-4">
                <button
                  onClick={() => setExpanded(expanded === msg ? null : msg)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{msg}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{group.count}×</Badge>
                        {group.component && <Badge variant="outline" className="text-[10px]">{group.component}</Badge>}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(group.latest).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        const text = `Error: ${msg}\nComponent: ${group.component || 'N/A'}\nCount: ${group.count}\nLatest: ${new Date(group.latest).toLocaleString()}`;
                        navigator.clipboard.writeText(text).then(() => toast.success('Error summary copied'));
                      }}
                      className="shrink-0 p-1 rounded hover:bg-secondary transition-colors"
                      aria-label="Copy error summary"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </button>
                {expanded === msg && (
                  <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                    {group.errors.slice(0, 5).map(e => (
                      <div key={e.id} className="text-xs space-y-1 bg-muted/30 rounded-lg p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const full = `Error: ${e.error_message}\nRoute: ${e.url || 'N/A'}\nComponent: ${e.component_name || 'N/A'}\nTime: ${new Date(e.created_at).toLocaleString()}\n\nStack:\n${e.error_stack || 'N/A'}`;
                                navigator.clipboard.writeText(full).then(() => toast.success('Error details copied'));
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Copy error details"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button onClick={() => clearOne(e.id)} className="text-destructive hover:text-destructive/80">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-muted-foreground">Route: {e.url || '—'}</p>
                        {e.error_stack && (
                          <pre className="text-[10px] text-muted-foreground/70 overflow-x-auto max-h-24 whitespace-pre-wrap">
                            {e.error_stack.slice(0, 500)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
