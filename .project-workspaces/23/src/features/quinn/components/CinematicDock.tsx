import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Sparkles, Loader2, Brain, FolderKanban,
  Map, Download, X, ChevronDown,
  PenTool, Target, Lightbulb, FileText, RotateCcw, Users,
} from 'lucide-react';
import { QuinnMark } from '@/components/shared/QuinnMark';
import { generateExportBundle } from '@/lib/export-bundle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useFunnelHub } from '@/features/projects';
import { useCurrentUser } from '@/hooks/use-current-user';
import { BuildStreamResult } from '@/features/quinn';
import { toast } from 'sonner';
import { useSidebar } from '@/components/ui/sidebar';
import { useSubscription } from '@/features/billing';
import { PaywallModal } from '@/features/billing';
import { useContacts } from '@/features/contacts';

// --- Chat message type for local conversation history ---
interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --- Sub-components extracted for maintainability ---

interface ConversationHistoryProps {
  messages: LocalChatMessage[];
}

function ConversationHistory({ messages }: ConversationHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  // Show last 5 messages
  const visible = messages.slice(-5);

  return (
    <div ref={scrollRef} className="max-h-48 overflow-y-auto space-y-2 px-1 scrollbar-thin">
      {visible.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            'rounded-xl px-3 py-2 text-xs leading-relaxed',
            msg.role === 'user'
              ? 'ml-8 bg-primary/10 text-foreground'
              : 'mr-8 glass border border-primary/15 text-muted-foreground',
          )}
        >
          {msg.role === 'assistant' && (
            <Sparkles className="h-3 w-3 text-primary inline mr-1.5 -mt-0.5" />
          )}
          <span className="whitespace-pre-wrap">{msg.content}</span>
        </div>
      ))}
    </div>
  );
}

interface QuinnResponseProps {
  lastResponse: string | null;
  undoStack: BuildStreamResult[];
  onUndo: () => void;
}

function QuinnResponse({ lastResponse, undoStack, onUndo }: QuinnResponseProps) {
  if (!lastResponse) return null;
  return (
    <div className="max-w-lg mx-auto px-4 mb-2">
      <div className={cn(
        'glass rounded-xl px-4 py-3 border border-primary/20 text-sm',
        'shadow-[0_0_30px_hsl(var(--primary)/0.08)]',
      )}>
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-xs flex-1">{lastResponse}</p>
          {undoStack.length > 0 && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground shrink-0 transition-colors"
              title={`Undo (${undoStack.length} available)`}
            >
              <RotateCcw className="h-3 w-3" />
              <span>Undo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Types & constants ---

type AIAction = 'rewrite_headline' | 'rewrite_subheadline' | 'improve_cta' | 'improve_social_proof' | 'brainstorm';

const AI_ACTIONS: { action: AIAction; label: string; icon: typeof Sparkles; field: string }[] = [
  { action: 'rewrite_headline', label: 'Rewrite headline', icon: PenTool, field: 'headline' },
  { action: 'rewrite_subheadline', label: 'Rewrite subheadline', icon: FileText, field: 'subheadline' },
  { action: 'improve_cta', label: 'Improve CTA', icon: Target, field: 'cta_text' },
  { action: 'improve_social_proof', label: 'Improve social proof', icon: Lightbulb, field: 'social_proof' },
  { action: 'brainstorm', label: 'Brainstorm ideas', icon: Sparkles, field: '' },
];

function buildQuickPrompt(action: AIAction, result: BuildStreamResult): string {
  const lp = result.landing_page;
  const context = `Audience: ${result.strategy.audience}. Offer: ${result.strategy.offer}. Current headline: "${lp.headline}". Current subheadline: "${lp.subheadline}". Current CTA: "${lp.cta_text}". Social proof: "${lp.social_proof}".`;

  switch (action) {
    case 'rewrite_headline':
      return `Rewrite this landing page headline to be more compelling and conversion-focused. ${context}\n\nReturn ONLY the new headline text, nothing else. No quotes.`;
    case 'rewrite_subheadline':
      return `Rewrite this subheadline to better support the headline and drive action. ${context}\n\nReturn ONLY the new subheadline text, nothing else. No quotes.`;
    case 'improve_cta':
      return `Rewrite this CTA button text to be more urgent and action-oriented. Keep it under 5 words. ${context}\n\nReturn ONLY the new CTA text, nothing else. No quotes.`;
    case 'improve_social_proof':
      return `Rewrite this social proof statement to be more specific and credible. ${context}\n\nReturn ONLY the new social proof text, nothing else. No quotes.`;
    case 'brainstorm':
      return `Give 3 brief, actionable ideas to improve this landing page's conversion rate. ${context}\n\nReturn a short bulleted list.`;
  }
}

// --- Main component ---

interface CinematicDockProps {
  buildResult: BuildStreamResult | null;
  onUpdateResult: (updated: BuildStreamResult) => void;
}

const BAR_HEIGHT = 56;
const NOTCH_RADIUS = 38;

export function CinematicDock({ buildResult, onUpdateResult }: CinematicDockProps) {
  const navigate = useNavigate();
  const { activeProject } = useFunnelHub();
  const { user } = useCurrentUser();
  const { toggleSidebar } = useSidebar();
  const { isGrowth, startCheckout } = useSubscription();
  const { contacts } = useContacts(activeProject?.id || null);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [contextDirectives, setContextDirectives] = useState<string[]>([]);
  const [showExportPaywall, setShowExportPaywall] = useState(false);
  const [undoStack, setUndoStack] = useState<BuildStreamResult[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [chatHistory, setChatHistory] = useState<LocalChatMessage[]>([]);

  // Count new leads for badge
  const newLeadCount = contacts.filter(c => c.pipeline_stage === 'new').length;

  // Load persistent context directives
  useEffect(() => {
    if (!activeProject?.id || !user?.orgId) return;
    const loadContext = async () => {
      const { data } = await supabase
        .from('project_context')
        .select('directive')
        .eq('project_id', activeProject.id)
        .eq('org_id', user.orgId)
        .order('created_at', { ascending: true });
      if (data) setContextDirectives(data.map(d => d.directive));
    };
    loadContext();
  }, [activeProject?.id, user?.orgId]);

  // Focus on Cmd+J
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'j' || e.key === 'k') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus input when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [expanded]);

  // Sync lastResponse into chat history as assistant message
  useEffect(() => {
    if (lastResponse) {
      setChatHistory(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: lastResponse }]);
    }
  }, [lastResponse]);

  const saveDirective = async (directive: string) => {
    if (!activeProject?.id || !user?.orgId) return;
    await supabase.from('project_context').insert({
      project_id: activeProject.id,
      org_id: user.orgId,
      context_type: 'correction',
      directive,
    });
    setContextDirectives(prev => [...prev, directive]);
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading || !activeProject) return;
    const userInput = input.trim();
    setInput('');
    setLoading(true);
    setLastResponse(null);

    // Add user message to chat history
    const userMsg: LocalChatMessage = { id: crypto.randomUUID(), role: 'user', content: userInput };
    setChatHistory(prev => [...prev, userMsg]);

    try {
      const persistentContext = contextDirectives.length > 0
        ? `\n\nPERSISTENT DIRECTIVES (these are corrections the user has made before — NEVER violate them):\n${contextDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
        : '';

      const contextPrompt = buildResult
        ? `You are MarQ, the AI intelligence inside IntoIQ. The user is working on project "${activeProject.name}".
Current strategy: Audience: "${buildResult.strategy.audience}", Offer: "${buildResult.strategy.offer}", Positioning: "${buildResult.strategy.positioning}".
Current headline: "${buildResult.landing_page.headline}".
Current subheadline: "${buildResult.landing_page.subheadline}".
Current CTA: "${buildResult.landing_page.cta_text}".
Current funnel steps: ${buildResult.funnel_steps.map(s => `${s.title} (${s.step_type})`).join(' → ')}
${persistentContext}

The user says: "${userInput}"

You can respond with one of these JSON actions:
1. Update copy/strategy fields:
{"action":"update","fields":{"headline":"new value"},"message":"What I changed and why","save_directive":"Brief rule to remember (only if this is a correction about positioning/audience/identity)"}
2. Suggest architecture changes:
{"action":"architect","suggestions":[{"type":"add","title":"Tripwire Page","step_type":"sales","reason":"Reason"}],"message":"Architecture recommendation"}
3. Reply with information:
{"action":"reply","message":"Your response"}

CRITICAL: Always respect the user's intent. Return valid JSON only.`
        : `You are MarQ, the AI intelligence inside IntoIQ. The user says: "${userInput}". There is no active build yet. Respond helpfully. Return JSON: {"action":"reply","message":"your response"}`;

      const { data, error } = await supabase.functions.invoke('ai-ghost-text', {
        body: { input: contextPrompt },
      });
      if (error) throw error;

      const raw = data?.suggestion?.trim() || '';
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.action === 'update' && parsed.fields && buildResult) {
            const updatedLp = { ...buildResult.landing_page };
            const updatedStrategy = { ...buildResult.strategy };
            for (const [key, value] of Object.entries(parsed.fields)) {
              if (key in updatedLp) (updatedLp as any)[key] = value;
              if (key in updatedStrategy) (updatedStrategy as any)[key] = value;
            }
            onUpdateResult({ ...buildResult, landing_page: updatedLp, strategy: updatedStrategy });
            if (parsed.save_directive) await saveDirective(parsed.save_directive);
            setLastResponse(parsed.message || 'Updated.');
            toast.success('MarQ updated your funnel', { description: parsed.message });
          } else if (parsed.action === 'architect' && parsed.suggestions) {
            const sugText = parsed.suggestions
              .map((s: any) => `${s.type === 'add' ? '➕' : '➖'} ${s.title} (${s.step_type}) — ${s.reason}`)
              .join('\n');
            setLastResponse(`${parsed.message || 'Architecture suggestion:'}\n\n${sugText}`);
            toast.info('MarQ has architecture suggestions');
          } else {
            setLastResponse(parsed.message || raw);
          }
        } else {
          setLastResponse(raw);
        }
      } catch {
        setLastResponse(raw);
      }
    } catch {
      toast.error('MarQ encountered an error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: AIAction) => {
    if (loading || !buildResult) return;
    setLoading(true);
    setLastResponse(null);

    try {
      const prompt = buildQuickPrompt(action, buildResult);
      const { data, error } = await supabase.functions.invoke('ai-ghost-text', {
        body: { input: prompt },
      });
      if (error) throw error;

      const suggestion = data?.suggestion?.trim() || '';
      if (!suggestion) {
        toast.error('No suggestion generated');
        return;
      }

      if (action !== 'brainstorm') {
        const actionDef = AI_ACTIONS.find(a => a.action === action);
        if (actionDef?.field) {
          setUndoStack(s => [...s, { ...buildResult }]);
          onUpdateResult({
            ...buildResult,
            landing_page: { ...buildResult.landing_page, [actionDef.field]: suggestion },
          });
          setLastResponse(suggestion);
          toast.success(`${actionDef.label} updated`, { description: 'Press undo to revert.' });
        }
      } else {
        setLastResponse(suggestion);
        toast.success('Ideas ready');
      }
    } catch {
      toast.error('MarQ encountered an error');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    onUpdateResult(prev);
    setLastResponse(null);
    toast.success('Reverted');
  };

  const handleExport = () => {
    if (!isGrowth) {
      setShowExportPaywall(true);
      return;
    }
    if (!buildResult || !activeProject) {
      toast.info('Build a funnel first to export');
      return;
    }
    const html = generateExportBundle(buildResult, activeProject.name);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-funnel.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Code exported!', { description: 'Standalone HTML downloaded.' });
  };

  const handleLeads = () => {
    navigate('/leads');
  };

  return (
    <>
    <PaywallModal
      open={showExportPaywall}
      onClose={() => setShowExportPaywall(false)}
      trigger="export"
      onCheckout={startCheckout}
    />
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* MarQ expanded panel */}
      {expanded && (
        <div className="animate-fade-in">
          <QuinnResponse lastResponse={lastResponse} undoStack={undoStack} onUndo={handleUndo} />

          {/* Quick actions */}
          {buildResult && (
            <div className="max-w-lg mx-auto px-4 mb-2">
              <div className="flex flex-wrap gap-1.5">
                {AI_ACTIONS.map(({ action, label, icon: Icon }) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    disabled={loading}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
                      'glass border border-primary/10',
                      'text-muted-foreground hover:text-foreground',
                      'transition-all duration-200',
                      'hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.1)]',
                      'active:scale-95',
                      'disabled:opacity-40 disabled:pointer-events-none',
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat container + Input area */}
          <div className="max-w-lg mx-auto px-4 mb-16 sm:mb-28">
            <div className={cn(
              'glass rounded-2xl border border-primary/20 px-4 py-3',
              'shadow-[0_0_40px_hsl(var(--primary)/0.12)]',
              'backdrop-blur-2xl',
            )}>
              {/* Conversation history */}
              {chatHistory.length > 0 && (
                <div className="mb-3">
                  <ConversationHistory messages={chatHistory} />
                </div>
              )}

              {/* Input row */}
              <div className="flex items-end gap-3">
                {contextDirectives.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 shrink-0 mb-1" title={`${contextDirectives.length} remembered directive(s)`}>
                    <Brain className="h-3 w-3" />
                    <span>{contextDirectives.length}</span>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                    if (e.key === 'Escape') {
                      setExpanded(false);
                    }
                  }}
                  placeholder="Tell MarQ what to change…"
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/40 resize-none min-h-[36px] max-h-[100px]"
                  disabled={loading}
                  rows={1}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSubmit}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Send className="h-4 w-4 text-primary" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating MarQ orb — above the bar, Compani-style */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[51] flex flex-col items-center pointer-events-auto"
        style={{ bottom: BAR_HEIGHT - 28 }}
      >
        {/* Glow behind orb */}
        <div className={cn(
          'absolute inset-0 m-auto h-[60px] w-[60px] rounded-full',
          'bg-gradient-to-br from-primary/25 to-primary/5',
          'blur-lg opacity-50',
          loading && 'animate-pulse',
        )} />
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-full overflow-hidden',
            'active:scale-92',
            'transition-all duration-300',
            !expanded && !loading && 'animate-[quinnPulseRing_3s_ease-in-out_infinite]',
          )}
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            ...(expanded ? {
              boxShadow: '0 0 0 2.5px hsl(var(--primary) / 0.5), 0 0 30px hsl(var(--primary) / 0.3), 0 4px 16px -4px hsl(var(--primary) / 0.4)',
            } : {}),
          }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : expanded ? (
            <ChevronDown className="h-5 w-5 text-primary" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-0.5">
              <QuinnMark size={20} />
              <span className="text-[7px] font-bold uppercase tracking-[0.08em] leading-none text-primary">
                MarQ
              </span>
            </div>
          )}
        </button>
      </div>

      {/* The Dock bar with CSS mask notch */}
      <div className="relative safe-area-bottom">
        <div
          className={cn(
            'bg-background/60 backdrop-blur-2xl border-t border-border/20',
            'shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.12)]',
          )}
          style={{
            height: BAR_HEIGHT,
            WebkitMaskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, transparent ${NOTCH_RADIUS - 2}px, black ${NOTCH_RADIUS - 1}px)`,
            maskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, transparent ${NOTCH_RADIUS - 2}px, black ${NOTCH_RADIUS - 1}px)`,
          }}
        >
          <div className="flex items-center h-full px-4 max-w-lg mx-auto relative">
            {/* Left slots */}
            <div className="flex items-center justify-evenly flex-1">
              <button
                onClick={() => {
                  const el = document.querySelector('[data-build-stream]') || document.querySelector('h1');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
                  'text-muted-foreground/60 hover:text-foreground',
                  'transition-colors duration-200',
                )}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-[9px] font-medium tracking-wide">Build</span>
              </button>
              <button
                onClick={() => {
                  const el = document.querySelector('[data-funnel-flow]');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
                  'text-muted-foreground/60 hover:text-foreground',
                  'transition-colors duration-200',
                )}
              >
                <Map className="h-5 w-5" />
                <span className="text-[9px] font-medium tracking-wide">Funnel</span>
              </button>
            </div>

            {/* Center spacer for MarQ orb */}
            <div style={{ width: NOTCH_RADIUS * 2 + 8 }} className="shrink-0" />

            {/* Right slots */}
            <div className="flex items-center justify-evenly flex-1">
              <button
                onClick={handleLeads}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
                  'text-muted-foreground/60 hover:text-foreground',
                  'transition-colors duration-200',
                )}
              >
                <Users className="h-5 w-5" />
                <span className="text-[9px] font-medium tracking-wide">Leads</span>
                {newLeadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {newLeadCount > 99 ? '99+' : newLeadCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleExport}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
                  'text-muted-foreground/60 hover:text-foreground',
                  'transition-colors duration-200',
                )}
              >
                <Download className="h-5 w-5" />
                <span className="text-[9px] font-medium tracking-wide">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
