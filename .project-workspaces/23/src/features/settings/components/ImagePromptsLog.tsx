import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type LogRow = {
  id: string;
  created_at: string;
  function_name: string;
  raw_prompt: string;
  final_prompt: string;
  strict_mode: boolean;
  injected_additions: string | null;
};

export function ImagePromptsLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('image_generation_logs')
        .select('id, created_at, function_name, raw_prompt, final_prompt, strict_mode, injected_additions')
        .order('created_at', { ascending: false })
        .limit(20);
      if (active) {
        setRows((data as LogRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <section className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-medium mb-1 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-primary" /> Recent Image Prompts
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Last 20 image generations. Compare what you typed (raw) vs what was actually sent (final).
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No image generations logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => {
            const isOpen = openId === r.id;
            const modified = r.raw_prompt !== r.final_prompt;
            return (
              <li key={r.id} className="rounded-lg border border-border/40 bg-muted/10">
                <button
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  className="w-full flex items-start gap-2 p-3 text-left hover:bg-muted/20 rounded-lg"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{r.function_name}</span>
                      {r.strict_mode && <Badge variant="outline" className="text-[10px]">strict</Badge>}
                      {modified && !r.strict_mode && <Badge variant="secondary" className="text-[10px]">modified</Badge>}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm truncate">{r.raw_prompt}</p>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-3 text-xs">
                    <div>
                      <div className="uppercase tracking-wide text-muted-foreground mb-1">Raw (your prompt)</div>
                      <pre className="whitespace-pre-wrap bg-background/50 rounded p-2 border border-border/30">{r.raw_prompt}</pre>
                    </div>
                    <div>
                      <div className="uppercase tracking-wide text-muted-foreground mb-1">Final (sent to Gemini)</div>
                      <pre className="whitespace-pre-wrap bg-background/50 rounded p-2 border border-border/30">{r.final_prompt}</pre>
                    </div>
                    {r.injected_additions && (
                      <div>
                        <div className="uppercase tracking-wide text-muted-foreground mb-1">Injected additions</div>
                        <pre className="whitespace-pre-wrap bg-background/50 rounded p-2 border border-border/30">{r.injected_additions}</pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
