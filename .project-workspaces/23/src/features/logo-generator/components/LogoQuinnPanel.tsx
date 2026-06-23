import { useState, useRef, useEffect, useCallback } from 'react';
import { LogoChatMessage } from '../hooks/use-quinn-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, StopCircle, Trash2, ChevronDown, ChevronUp, Sparkles, ImagePlus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LogoQuinnPanelProps {
  messages: LogoChatMessage[];
  streaming: boolean;
  onSend: (content: string, imageData?: string) => void;
  onCancel: () => void;
  onClear: () => void;
}

const QUICK_PROMPTS = [
  'Make the text bigger',
  'Suggest a color palette',
  'Center everything',
  'Add a tagline',
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function LogoQuinnPanel({ messages, streaming, onSend, onCancel, onClear }: LogoQuinnPanelProps) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit for base64
      return;
    }
    const base64 = await fileToBase64(file);
    setAttachedImage(base64);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  }, [handleImageFile]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim() || (attachedImage ? 'Edit this image' : '');
    if (!text || streaming) return;
    onSend(text, attachedImage || undefined);
    setInput('');
    setAttachedImage(null);
  };

  return (
    <div
      className={cn(
        'glass rounded-2xl border overflow-hidden transition-colors',
        dragOver ? 'border-primary/60 bg-primary/5' : 'border-border/50'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-semibold">MarQ · Logo Assist</h3>
            <p className="text-[10px] text-muted-foreground">Suggest & control canvas</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-64 overflow-y-auto px-3 py-2 space-y-2 border-t border-border/20"
          >
            {messages.length === 0 && (
              <div className="py-4 space-y-3">
                <p className="text-[11px] text-muted-foreground/50 text-center">
                  Ask MarQ to adjust your logo — colors, fonts, sizes, positioning.
                  <br />
                  <span className="text-primary/40">Drop an image here to ask for edits.</span>
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => onSend(p)}
                      className="text-[10px] px-2.5 py-1 rounded-full border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[90%] rounded-xl px-3 py-2 text-xs',
                  msg.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted/50 border border-border/30'
                )}
              >
                {msg.imageData && (
                  <img
                    src={msg.imageData}
                    alt="Attached"
                    className="rounded-lg mb-1.5 max-h-24 object-contain"
                  />
                )}
                {msg.role === 'assistant' ? (
                  <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0 text-xs">
                    <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 pl-1">
                <span className="animate-pulse">●</span> MarQ is thinking…
              </div>
            )}
          </div>

          {/* Drag overlay hint */}
          {dragOver && (
            <div className="px-3 py-2 text-center text-[11px] text-primary font-medium animate-pulse">
              Drop image here
            </div>
          )}

          {/* Attached image preview */}
          {attachedImage && (
            <div className="px-3 py-1.5 border-t border-border/20 flex items-center gap-2">
              <img src={attachedImage} alt="Attached" className="h-10 w-10 rounded-md object-cover" />
              <span className="text-[10px] text-muted-foreground flex-1">Image attached</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setAttachedImage(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-t border-border/20">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              title="Attach image"
            >
              <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder={attachedImage ? 'Describe what to change…' : 'e.g. make the IQ text gold…'}
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
              disabled={streaming}
            />
            <div className="flex items-center gap-1">
              {streaming ? (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
                  <StopCircle className="h-3.5 w-3.5 text-destructive" />
                </Button>
              ) : (
                <Button type="submit" variant="ghost" size="icon" className="h-7 w-7" disabled={!input.trim() && !attachedImage}>
                  <Send className="h-3.5 w-3.5 text-primary" />
                </Button>
              )}
              {messages.length > 0 && !streaming && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClear} title="Clear">
                  <Trash2 className="h-3 w-3 text-muted-foreground/50" />
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
