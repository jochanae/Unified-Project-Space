import { useMemo, useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, X, Brain, TrendingUp, TestTube, ChevronDown, Check, Copy, CheckCheck, FileText, Image as ImageIcon, MapPin, ListChecks, BarChart3, MoreHorizontal, MessageSquarePlus, Plus, User, Lightbulb, Clock3, Search, Trash2, Rocket } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useFunnelHub } from '@/features/projects';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { useQuinnChat } from '@/features/quinn/hooks/use-quinn-chat';
import { useNavigate } from 'react-router-dom';
import { processFile, type Attachment } from '@/features/quinn/lib/attachments';
import { toast } from 'sonner';
import { useQuinnGeoContext, describeGeoContext } from '@/features/quinn/lib/quinn-context';

interface IntelligenceCard {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  type: 'tactical' | 'personality' | 'experiment';
  href: string;
  cta: string;
}

function useIntelligenceCards(projectId: string | null, orgId: string | null): IntelligenceCard[] {
  const [cards, setCards] = useState<IntelligenceCard[]>([]);

  useEffect(() => {
    if (!projectId || !orgId) {
      setCards([]);
      return;
    }

    const load = async () => {
      const result: IntelligenceCard[] = [];

      // Check for recent page views (tactical insight)
      const { count } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      if (count && count > 0) {
        result.push({
          icon: TrendingUp,
          label: 'Signal Strength',
          detail: `${count} total impression${count === 1 ? '' : 's'} tracked across your funnels.`,
          type: 'tactical',
          href: '/analytics',
          cta: 'View analytics',
        });
      }

      // Check for active A/B tests
      const { data: tests } = await supabase
        .from('ab_tests')
        .select('field_name')
        .eq('is_active', true)
        .limit(1);

      if (tests && tests.length > 0) {
        result.push({
          icon: TestTube,
          label: 'Active Experiment',
          detail: `A/B test running on "${tests[0].field_name}".`,
          type: 'experiment',
          href: '/analytics?tab=experiments',
          cta: 'Open experiments',
        });
      }

      // Check for context directives (personality note)
      const { count: directiveCount } = await supabase
        .from('project_context')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('org_id', orgId);

      if (directiveCount && directiveCount > 0) {
        result.push({
          icon: Brain,
          label: 'Context Locked',
          detail: `${directiveCount} directive${directiveCount > 1 ? 's' : ''} guiding my intelligence for this project.`,
          type: 'personality',
          href: '/signal-lab',
          cta: 'Tune in Signal Lab',
        });
      }

      setCards(result);
    };

    load();
  }, [projectId, orgId]);

  return cards;
}

interface QuinnHUDProps {
  open: boolean;
  onClose: () => void;
  prefillPrompt?: string;
}

export function QuinnHUD({ open, onClose, prefillPrompt }: QuinnHUDProps) {
  const { activeProject, projects, setActiveProject } = useFunnelHub();
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const geoContext = useQuinnGeoContext();

  // MarQ always respects the active project selection — wherever the user is.
  const scopedProject = activeProject;
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use the SAME chat backend as the main MarQ workspace —
  // full context, directives, Signal Lab, Identity Lock, persistent history.
  const { messages: chatHistory, streaming: loading, send, clearHistory } = useQuinnChat(scopedProject?.id ?? null);

  const cards = useIntelligenceCards(
    scopedProject?.id ?? null,
    user?.orgId ?? null
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Apply external prefill prompt when HUD opens
  useEffect(() => {
    if (open && prefillPrompt) {
      setInput(prefillPrompt);
    }
  }, [open, prefillPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const sendMessage = (text: string) => {
    if ((!text.trim() && attachments.length === 0) || loading) return;
    const toSend = attachments;
    setInput('');
    setAttachments([]);
    // Prepend geo context if active so MarQ answers scoped to the segment.
    const geoNote = geoContext
      ? `[Active geo filter — ${describeGeoContext(geoContext)}]\n\n`
      : '';
    send(geoNote + text.trim(), toSend);
  };

  const handleSubmit = () => sendMessage(input);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttaching(true);
    try {
      const processed = await Promise.all(
        Array.from(files).slice(0, 4).map(f => processFile(f)),
      );
      setAttachments(prev => [...prev, ...processed].slice(0, 4));
    } catch {
      toast.error('Could not read that file. Try a PDF, image, or text file.');
    } finally {
      setAttaching(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  const firstName = user?.email?.split('@')[0]?.split(/[._-]/)[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : undefined;
  const hour = new Date().getHours();
  const daypart = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greeting = displayName ? `${daypart}, ${displayName}` : daypart;
  const priorityCount = cards.length;
  const historyResults = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    if (!query) return chatHistory.slice(-4).reverse();
    return chatHistory
      .filter(msg => msg.content.toLowerCase().includes(query))
      .slice(-6)
      .reverse();
  }, [chatHistory, historyQuery]);
  const subtext = priorityCount > 0
    ? `You have ${priorityCount === 1 ? 'one priority item' : `${priorityCount} priority items`} waiting in your plan.`
    : scopedProject
      ? `${scopedProject.name} is loaded. What are we sharpening today?`
      : 'Your focus space is clear. What are we optimizing today?';

  if (!open) return null;

  const typeColorMap = {
    tactical: 'border-primary/40 bg-primary/10',
    personality: 'border-accent/40 bg-accent/10',
    experiment: 'border-yellow-500/40 bg-yellow-500/10',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-background/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* HUD Panel — Smart Money Mentor MarQ surface */}
      <div
        className="fixed inset-x-0 bottom-0 z-[81] h-[100dvh] animate-in fade-in-0 slide-in-from-bottom-4 duration-300 lg:bottom-16 lg:left-1/2 lg:h-[500px] lg:max-h-[70vh] lg:w-[400px] lg:max-w-[calc(100vw-2rem)] lg:-translate-x-1/2"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          className="relative flex h-full min-w-0 flex-col overflow-hidden border-border/50 bg-background shadow-2xl lg:rounded-2xl lg:border"
          style={{
            background: 'radial-gradient(ellipse at top, hsl(var(--primary) / 0.08), transparent 52%), radial-gradient(ellipse at bottom, hsl(var(--gold) / 0.05), transparent 58%), hsl(var(--background))',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background)/0.4)_50%,transparent_100%)]" />

          {/* Minimal Header — same structure as Smart Money Mentor */}
          <div className="relative z-10 flex items-center justify-between gap-3 px-5 py-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              <span className="font-medium text-foreground">MarQ</span>
              {scopedProject && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-1 inline-flex min-w-0 max-w-[150px] items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:max-w-[190px]">
                      <span className="truncate">{scopedProject.name}</span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-[100] w-64 rounded-2xl border-primary/20 bg-background/95 p-2 shadow-2xl shadow-primary/10 backdrop-blur-xl">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                      Switch project · {projects.length}
                    </DropdownMenuLabel>
                    {projects.map(p => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => setActiveProject(p.id)}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                      >
                        <span className="truncate">{p.name}</span>
                        {p.id === scopedProject?.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-2 bg-border/30" />
                    <DropdownMenuItem onSelect={() => navigate('/projects')} className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-primary">
                      <Plus className="h-4 w-4" />
                      <span>New project</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {geoContext && (
                <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline-flex">
                  <MapPin className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{describeGeoContext(geoContext)}</span>
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Strategic sparks"
                    className="relative h-8 w-8 text-gold/90 hover:bg-gold/10 hover:text-gold"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100] w-64 rounded-2xl border-gold/20 bg-background/95 p-2 shadow-2xl shadow-gold/10 backdrop-blur-xl">
                  <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/90">
                    Strategic sparks
                  </DropdownMenuLabel>
                  {[
                    ['Find hidden friction', `Look at ${scopedProject?.name ?? 'this project'} and identify the hidden friction that could slow conversion.`],
                    ['Sharpen the offer', `Turn the current context for ${scopedProject?.name ?? 'this project'} into one sharper offer angle.`],
                    ['Create a campaign angle', `Give me one campaign angle for ${scopedProject?.name ?? 'this project'} that connects Signal Lab, Social, and Email.`],
                    ['Spot the next unlock', `Based on my current project context, what is the next high-leverage unlock?`],
                  ].map(([label, prompt]) => (
                    <DropdownMenuItem key={label} onSelect={() => sendMessage(prompt)} className="cursor-pointer gap-3 rounded-xl px-3 py-2.5">
                      <Lightbulb className="h-4 w-4 text-gold" />
                      <span>{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => sendMessage('Review my current launch plan and identify the next three actions.')}
                title={priorityCount > 0 ? `${priorityCount} priority item${priorityCount > 1 ? 's' : ''} waiting` : 'Review plan'}
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <ListChecks className="h-4 w-4" />
                {priorityCount > 0 && (
                  <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_2px_hsl(var(--gold)/0.55)]" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/analytics')}
                title="Open analytics"
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close MarQ"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={scrollRef}
            className="relative z-10 min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-5 pt-6 pb-[calc(15rem+env(safe-area-inset-bottom,0px))] sm:px-8"
          >
            {chatHistory.length === 0 && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center px-1 py-12 text-center sm:py-16">
                <h1 className="max-w-2xl font-serif text-3xl font-light leading-[1.1] tracking-normal text-foreground sm:text-5xl">
                  {greeting}
                </h1>
                <p className="mt-5 mb-10 max-w-md text-sm font-light leading-relaxed text-muted-foreground/60 sm:text-base">
                  {subtext}
                </p>

                {cards.length > 0 && (
                  <div className="mb-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-3">
                    {cards.slice(0, 3).map((card, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(card.href);
                        }}
                        className={cn(
                          'group min-w-0 rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5',
                          typeColorMap[card.type],
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <card.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/70">
                            {card.label}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {card.detail}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Smart Money Mentor-style topic grid */}
                <div className="grid w-full max-w-lg grid-cols-2 gap-3 px-1">
                  {(scopedProject
                    ? [
                        { emoji: '🎯', label: 'Sharpen Signal', prompt: `Review the positioning for ${scopedProject.name} and sharpen the core signal.` },
                        { emoji: '🧭', label: 'Review Plan', prompt: `Review the current launch plan for ${scopedProject.name} and prioritize the next three actions.` },
                        { emoji: '✍️', label: 'Generate Copy', prompt: `Generate compelling conversion copy for ${scopedProject.name}.` },
                        { emoji: '📈', label: 'Read Analytics', prompt: `Analyze the current performance signals for ${scopedProject.name} and tell me what needs attention.` },
                      ]
                    : [
                        { emoji: '🚀', label: 'Start Funnel', prompt: "I have a business idea. Help me turn it into a funnel strategy." },
                        { emoji: '🎯', label: 'Define Signal', prompt: "Help me define my brand signal — tone, positioning, and visual identity." },
                        { emoji: '✍️', label: 'Build Page', prompt: "I want to build a landing page. Walk me through it." },
                        { emoji: '🧭', label: 'Explore IntoIQ', prompt: "What can you help me with? Show me what IntoIQ can do." },
                      ]
                  ).map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => sendMessage(chip.prompt)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm',
                        'border border-border/50 bg-muted/50 hover:bg-muted hover:border-border',
                        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
                      )}
                    >
                      <span className="text-base">{chip.emoji}</span>
                      <span className="font-medium text-foreground">{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-3', msg.role === 'user' ? 'justify-end pr-2 sm:pr-6' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'group relative min-w-0 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'max-w-[80%] rounded-2xl rounded-br-md bg-primary/90 px-4 py-3 text-primary-foreground sm:max-w-[65%]'
                      : 'flex-1'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden break-words leading-relaxed
                      [&_p]:mb-2 [&_p:last-child]:mb-0
                      [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5
                      [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1.5
                      [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5
                      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
                      [&_strong]:text-foreground [&_strong]:font-semibold
                      [&_code]:whitespace-pre-wrap [&_code]:break-words [&_code]:text-[12px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-background/60
                      [&_pre]:overflow-x-hidden [&_pre]:whitespace-pre-wrap [&_pre]:break-words
                      [&_hr]:my-3 [&_hr]:border-border/30">
                      <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                      </div>
                      {msg.content && !loading && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="mt-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-60 transition-opacity hover:bg-muted/40 hover:text-foreground hover:opacity-100"
                          aria-label="Copy reply"
                        >
                          {copiedId === msg.id ? (
                            <CheckCheck className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 pl-1">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl border border-border/20" style={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite] [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite] [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite]" />
                </div>
              </div>
            )}
          </div>

          {/* Grounded edge-to-edge input dock — arched top, flush bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <div className="h-10 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background)/0.7)_100%)]" />

            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.txt,.md,.csv,.json"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            <div className="pointer-events-auto relative rounded-t-3xl bg-[linear-gradient(180deg,hsl(var(--background)/0.92)_0%,hsl(var(--primary)/0.06)_60%,hsl(var(--background))_100%)] px-4 pb-[calc(2.75rem+env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-12px_40px_-12px_hsl(var(--primary)/0.18)] backdrop-blur-xl sm:px-8">
              <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.5),hsl(var(--gold)/0.35),hsl(var(--primary)/0.4),transparent)]" />

              <div className="mx-auto max-w-3xl space-y-3">
                {attachments.length > 0 && (
                  <div className="-mx-1 px-1">
                    <div className="flex touch-pan-x flex-nowrap items-center gap-2 overflow-x-auto py-1">
                      {attachments.map((a, i) => (
                        <div
                          key={i}
                          className="relative flex h-12 w-12 flex-none items-center justify-center rounded-lg border border-border/30 bg-muted/30 text-foreground/80"
                          title={a.name}
                        >
                          {a.kind === 'image' ? (
                            <ImageIcon className="h-5 w-5 text-primary" />
                          ) : (
                            <FileText className="h-5 w-5 text-primary" />
                          )}
                          <button
                            onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                            aria-label="Remove attachment"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative rounded-3xl border border-border/40 bg-[linear-gradient(180deg,hsl(var(--muted)/0.25),hsl(var(--muted)/0.08))] px-2.5 pb-2.5 pt-3 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04),0_8px_28px_-12px_hsl(var(--primary)/0.25)] transition-all duration-300 focus-within:border-primary/40 focus-within:shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.06),0_10px_32px_-10px_hsl(var(--primary)/0.4)]">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') onClose();
                    }}
                    placeholder="Ask MarQ anything…"
                    className="max-h-[200px] min-h-[46px] w-full resize-none overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:font-light placeholder:text-muted-foreground/60 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    disabled={loading}
                    rows={1}
                  />

                  <div className="mt-1 flex items-center gap-1.5 border-t border-border/30 pt-2 sm:gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 rounded-full text-muted-foreground/80 transition-all duration-300 hover:bg-muted/40 hover:text-foreground"
                      onClick={() => fileRef.current?.click()}
                      disabled={attaching || loading || attachments.length >= 4}
                      aria-label="Attach file"
                      title="Add attachment"
                    >
                      {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Conversation memory"
                          className="h-9 w-9 shrink-0 rounded-full bg-gold/10 text-gold ring-1 ring-gold/20 transition-all duration-300 hover:bg-gold/15 hover:text-gold"
                        >
                          <Clock3 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="top" className="z-[100] w-72 rounded-2xl border-gold/20 bg-background/95 p-2 shadow-2xl shadow-gold/10 backdrop-blur-xl">
                        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/90">
                          Conversation memory
                        </DropdownMenuLabel>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setHistorySearchOpen(v => !v); }} className="cursor-pointer gap-3 rounded-xl px-3 py-2.5">
                          <Search className="h-4 w-4 text-gold" />
                          <span>Search this project</span>
                        </DropdownMenuItem>
                        {historySearchOpen && (
                          <div className="px-2 pb-2" onKeyDown={(e) => e.stopPropagation()}>
                            <input
                              value={historyQuery}
                              onChange={(e) => setHistoryQuery(e.target.value)}
                              placeholder="Search MarQ history…"
                              className="h-9 w-full rounded-xl border border-border/40 bg-muted/25 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-gold/40"
                            />
                            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                              {historyResults.length > 0 ? historyResults.map(msg => (
                                <button
                                  key={msg.id}
                                  type="button"
                                  onClick={() => setInput(msg.content)}
                                  className="w-full rounded-lg px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                                >
                                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-gold/80">{msg.role === 'user' ? 'You' : 'MarQ'}</span>
                                  <span className="line-clamp-2">{msg.content}</span>
                                </button>
                              )) : (
                                <p className="px-2 py-3 text-xs text-muted-foreground/70">No matching history in this project.</p>
                              )}
                            </div>
                          </div>
                        )}
                        <DropdownMenuSeparator className="my-2 bg-border/30" />
                        <DropdownMenuItem onSelect={() => clearHistory()} disabled={loading || chatHistory.length === 0} className="cursor-pointer gap-3 rounded-xl px-3 py-2.5">
                          <MessageSquarePlus className="h-4 w-4 text-gold" />
                          <span>Start fresh</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => clearHistory()} disabled={loading || chatHistory.length === 0} className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span>Clear current memory</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="More actions"
                          className="h-9 w-9 shrink-0 rounded-full text-muted-foreground/80 transition-all duration-300 hover:bg-muted/40 hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="top" className="w-56">
                        <DropdownMenuItem onSelect={() => sendMessage('What should I focus on next for this project?')} className="gap-3">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span>Find next priority</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            const idea = input.trim();
                            onClose();
                            navigate('/launch', idea ? { state: { prefillIdea: idea } } : undefined);
                          }}
                          className="gap-3"
                        >
                          <Rocket className="h-4 w-4 text-primary" />
                          <span>Turn this into a launch</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate('/signal-lab')} className="gap-3">
                          <Brain className="h-4 w-4 text-primary" />
                          <span>Open Signal Lab</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex-1" />

                    <Button
                      type="button"
                      size="icon"
                      className="h-10 w-10 flex-none shrink-0 rounded-full border-0 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.8))] text-primary-foreground shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.6),inset_0_1px_0_0_hsl(0_0%_100%/0.15)] transition-all duration-300 hover:shadow-[0_6px_28px_-4px_hsl(var(--primary)/0.7),inset_0_1px_0_0_hsl(0_0%_100%/0.2)] disabled:opacity-40 disabled:shadow-none"
                      onClick={handleSubmit}
                      disabled={loading || (!input.trim() && attachments.length === 0)}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <p className="pt-1 text-center text-[11px] font-light tracking-wide text-muted-foreground/50">
                  Signal clarity, not noise
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
