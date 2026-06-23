import { useState, useRef, useEffect } from 'react';
import { useQuinnChat } from '../hooks/use-quinn-chat';
import { useProjectContext } from '../hooks/use-project-context';
import { useFunnelHub } from '@/features/projects';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, StopCircle, Trash2, MessageSquare, ChevronDown, ChevronUp, UserCog, X, Check, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StrategicBlueprintCard, splitBlueprintSegments } from '@/components/shared/StrategicBlueprintCard';

const CONTEXT_TYPES = [
  { value: 'identity', label: '🧑 Identity', placeholder: "e.g. I'm a flight attendant building guides for coworkers" },
  { value: 'audience', label: '🎯 Audience', placeholder: 'e.g. Busy professionals aged 30-45 who want passive income' },
  { value: 'constraint', label: '🚧 Constraint', placeholder: 'e.g. Budget under $500, must launch within 2 weeks' },
  { value: 'tone', label: '🎨 Tone', placeholder: 'e.g. Warm but authoritative, no slang, premium feel' },
] as const;

type ContextType = typeof CONTEXT_TYPES[number]['value'];

export function QuinnChat() {
  const { activeProject } = useFunnelHub();
  const { user } = useCurrentUser();
  const { messages, streaming, send, clearHistory, cancel } = useQuinnChat(activeProject?.id ?? null);
  const { directives, addDirective, removeDirective, updateDirective } = useProjectContext(activeProject?.id ?? null, user?.orgId ?? null);
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [newDirective, setNewDirective] = useState('');
  const [selectedType, setSelectedType] = useState<ContextType>('identity');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  if (!activeProject) return (
    <div className="glass rounded-2xl border border-border/50 p-6 text-center">
      <MessageSquare className="h-8 w-8 text-primary/40 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">
        MarQ is ready
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Select a project to start building with MarQ.
      </p>
    </div>
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || streaming) return;
    send(input.trim());
    setInput('');
  };

  const handleAddDirective = () => {
    if (!newDirective.trim()) return;
    addDirective(newDirective.trim(), selectedType);
    setNewDirective('');
  };

  const getTypeConfig = (type: string) => CONTEXT_TYPES.find(t => t.value === type) || CONTEXT_TYPES[0];

  return (
    <div className="glass rounded-2xl border border-border/50 overflow-hidden card-hover-glow">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">MarQ</h3>
            <p className="text-[11px] text-muted-foreground">Refine your ideas — MarQ remembers context</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{messages.length} msgs</span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <>
          {/* Context Panel */}
          {showContext && (
            <div className="px-4 py-3 border-t border-border/20 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCog className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Professional Context</span>
                </div>
                <button onClick={() => setShowContext(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                Tell MarQ who you are and what matters. These persist across all conversations for this project.
              </p>

              {/* Existing directives */}
              {directives.length > 0 && (
                <div className="space-y-1.5">
                  {directives.map((d) => {
                    const cfg = getTypeConfig(d.context_type);
                    const isEditing = editingId === d.id;
                    return (
                      <div key={d.id} className="flex items-start gap-2 group">
                        <span className="mt-1.5 text-[10px] shrink-0 select-none">{cfg.label.split(' ')[0]}</span>
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                if (editingText.trim()) updateDirective(d.id, editingText.trim());
                                setEditingId(null);
                              }
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onBlur={() => {
                              if (editingText.trim() && editingText.trim() !== d.directive) updateDirective(d.id, editingText.trim());
                              setEditingId(null);
                            }}
                            className="flex-1 rounded-lg bg-background/50 border border-primary/40 px-3 py-2 text-xs text-foreground outline-none"
                          />
                        ) : (
                          <div
                            onClick={() => { setEditingId(d.id); setEditingText(d.directive); }}
                            className="flex-1 rounded-lg bg-background/50 border border-border/30 px-3 py-2 text-xs text-foreground/80 cursor-text hover:border-primary/30 transition-colors"
                            title="Click to edit"
                          >
                            {d.directive}
                          </div>
                        )}
                        <button
                          onClick={() => removeDirective(d.id)}
                          className="mt-1.5 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category selector */}
              <div className="flex flex-wrap gap-1.5">
                {CONTEXT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all',
                      selectedType === type.value
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/30 text-muted-foreground/60 hover:text-foreground hover:border-border/50'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Add new */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDirective}
                  onChange={e => setNewDirective(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddDirective()}
                  placeholder={CONTEXT_TYPES.find(t => t.value === selectedType)?.placeholder}
                  className="flex-1 bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/30"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleAddDirective}
                  disabled={!newDirective.trim()}
                >
                  <Check className="h-3.5 w-3.5 text-primary" />
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-80 overflow-y-auto px-4 py-3 space-y-3 border-t border-border/20"
          >
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-6">
                Ask MarQ anything about this project — refine copy, pivot strategy, explore ideas.
              </p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn('max-w-[85%]', msg.role === 'user' ? 'ml-auto' : 'mr-auto')}>
                <div
                  className={cn(
                    'rounded-xl px-3.5 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 border border-border/30'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_img]:rounded-lg [&_img]:border [&_img]:border-border/30 [&_img]:max-w-full [&_img]:w-[min(512px,100%)] [&_img]:my-2">
                      {splitBlueprintSegments(msg.content || '...').map((seg, i) =>
                        seg.kind === 'blueprint' ? (
                          <StrategicBlueprintCard key={i} {...seg.data} />
                        ) : (
                          <ReactMarkdown key={i}>{seg.text}</ReactMarkdown>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'assistant' && msg.directives && msg.directives.length > 0 && (
                  <DirectiveTrace directives={msg.directives} />
                )}
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 pl-1">
                <span className="animate-pulse">●</span> MarQ is thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-border/20">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 shrink-0", showContext && "text-primary")}
              onClick={() => setShowContext(s => !s)}
              title="Set professional context"
            >
              <UserCog className="h-4 w-4" />
            </Button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Refine, pivot, ask anything…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
              disabled={streaming}
            />
            <div className="flex items-center gap-1">
              {streaming ? (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={cancel}>
                  <StopCircle className="h-4 w-4 text-destructive" />
                </Button>
              ) : (
                <Button type="submit" variant="ghost" size="icon" className="h-8 w-8" disabled={!input.trim()}>
                  <Send className="h-4 w-4 text-primary" />
                </Button>
              )}
              {messages.length > 0 && !streaming && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={clearHistory} title="Clear history">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function DirectiveTrace({ directives }: { directives: { type: string; directive: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
        title="Show context MarQ used"
      >
        <Eye className="h-3 w-3" />
        <span>Used {directives.length} {directives.length === 1 ? 'directive' : 'directives'}</span>
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1 rounded-lg border border-border/20 bg-background/40 px-2.5 py-2">
          {directives.map((d, i) => (
            <li key={i} className="text-[11px] text-foreground/70 leading-snug">
              <span className="text-primary/70 font-medium uppercase tracking-wider text-[9px] mr-1.5">{d.type}</span>
              {d.directive}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
