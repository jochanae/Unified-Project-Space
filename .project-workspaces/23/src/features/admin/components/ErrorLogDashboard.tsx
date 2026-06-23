import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, RefreshCw, Trash2, Copy, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface ClientError {
  id: string;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  component_name: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function ErrorLogDashboard({ onCount }: { onCount?: (n: number) => void }) {
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_errors' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    const rows = (data || []) as unknown as ClientError[];
    setErrors(rows);
    setLoading(false);

    // count errors from last 24h
    const cutoff = Date.now() - 86400000;
    const recent = rows.filter(e => new Date(e.created_at).getTime() > cutoff).length;
    onCount?.(recent);
  }, [onCount]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  const clearAll = async () => {
    await supabase.from('client_errors' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    toast.success('All errors cleared');
    fetchErrors();
  };

  const copyError = (e: ClientError) => {
    const text = `${e.error_message}\n\n${e.error_stack || '(no stack)'}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />;

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{errors.length} errors loaded</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchErrors} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" variant="destructive" onClick={clearAll} className="gap-1.5" disabled={errors.length === 0}>
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {errors.map(e => (
          <Collapsible key={e.id}>
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <CollapsibleTrigger className="flex items-start gap-2 text-left min-w-0 flex-1 group">
                    <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-destructive truncate">{e.error_message}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {e.component_name && (
                          <Badge variant="outline" className="text-[10px]">{e.component_name}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyError(e)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CollapsibleContent>
                  {e.error_stack && (
                    <pre className="mt-3 text-xs text-muted-foreground bg-background/60 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                      {e.error_stack}
                    </pre>
                  )}
                  {e.url && <p className="text-xs text-muted-foreground mt-2">URL: {e.url}</p>}
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        ))}
        {errors.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No errors logged 🎉</p>
        )}
      </div>
    </>
  );
}
