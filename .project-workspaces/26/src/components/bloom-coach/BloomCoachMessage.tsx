import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RotateCcw, Copy, Check, Loader2, Pin, Trash2, Volume2, VolumeX, Download, Share2, FileText, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import { QuinnCard } from "@/components/quinn-cards/QuinnCard";
import { parseCardSegments } from "@/lib/quinn-cards";
import { transformChildrenWithSourceTags } from "@/components/bloom-coach/SourceTag";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;       // legacy single image
  imageUrls?: string[];    // multi-image bento
}

interface BloomCoachMessageProps {
  message: Message;
  index: number;
  isLastAssistant: boolean;
  isLoading: boolean;
  onRegenerate?: () => void;
  /** Context forwarded to inline QuinnCards for richer pin persistence. */
  projectId?: string | null;
  conversationId?: string | null;
  modeLens?: "focus" | "brainstorm" | "planner" | "audit" | "strategic" | "market" | null;
}

export function BloomCoachMessage({
  message,
  index,
  isLastAssistant,
  isLoading,
  onRegenerate,
  projectId = null,
  conversationId = null,
  modeLens = null,
}: BloomCoachMessageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Detect :::letter blocks in content
  const parseLetterContent = useCallback((content: string) => {
    const letterRegex = /:::letter\s*\n([\s\S]*?)\n:::/;
    const match = content.match(letterRegex);
    if (match) {
      const letterText = match[1].trim();
      const beforeLetter = content.substring(0, match.index).trim();
      const afterLetter = content.substring((match.index || 0) + match[0].length).trim();
      return { hasLetter: true, letterText, beforeLetter, afterLetter };
    }
    return { hasLetter: false, letterText: "", beforeLetter: content, afterLetter: "" };
  }, []);

  // Split message into ordered card / text segments
  const cardSegments = useMemo(() => parseCardSegments(message.content), [message.content]);

  const { hasLetter, letterText, beforeLetter, afterLetter } = parseLetterContent(message.content);

  // Handle internal app links via React Router
  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handlePin = async () => {
    if (!user) { toast.error("Sign in to pin"); return; }
    if (pinned || pinning) return;
    setPinning(true);
    try {
      const { error } = await supabase.from("quinn_cards").insert({
        user_id: user.id,
        card_type: "manual_pin",
        title: message.content.slice(0, 80),
        sections: [{ heading: "Note", body: message.content }] as any,
        source: "quinn",
        source_message_excerpt: message.content.slice(0, 200),
        pinned: true,
      });
      if (error) throw error;
      setPinned(true);
      toast.success("Saved to your shelf");
    } catch {
      toast.error("Could not pin");
    } finally {
      setPinning(false);
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!window.speechSynthesis) {
      toast.error("Text-to-speech not supported");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleLetterDownloadPDF = useCallback(() => {
    if (!letterText) return;
    try {
      const doc = new jsPDF();
      const margin = 20;
      const lineHeight = 6;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - margin * 2;
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(letterText, maxWidth);
      let y = margin;
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
      doc.save("letter.pdf");
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }, [letterText]);

  const handleLetterShare = useCallback(async () => {
    if (!letterText) return;
    try {
      // Try sharing as PDF file first
      const doc = new jsPDF();
      const margin = 20;
      const lineHeight = 6;
      const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(letterText, maxWidth);
      let y = margin;
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], "letter.pdf", { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Letter", text: "Here's the letter I drafted." });
        toast.success("Shared successfully");
      } else if (navigator.share) {
        await navigator.share({ title: "Letter", text: letterText });
        toast.success("Shared successfully");
      } else {
        await navigator.clipboard.writeText(letterText);
        toast.success("Copied to clipboard");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        await navigator.clipboard.writeText(letterText);
        toast.success("Copied to clipboard");
      }
    }
  }, [letterText]);

  const isUser = message.role === "user";

  return (
    <div className={`quinn-message-row flex min-w-0 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-grad flex items-center justify-center mr-2 flex-shrink-0 mt-1 ring-emerald-glow">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(160,30%,8%)]" strokeWidth={2.5} />
        </div>
      )}
      <div className="quinn-message-stack min-w-0 max-w-[85%] sm:max-w-[80%] overflow-hidden">
        <div
          className={`px-3.5 py-2.5 rounded-3xl ${
            isUser
              ? "bg-champagne-grad text-[hsl(160,30%,8%)] font-medium rounded-br-[4px] shadow-[0_4px_18px_-6px_hsl(40_55%_55%/0.45)]"
              : "quinn-glass text-foreground rounded-bl-[4px]"
          }`}
        >
          {isUser ? (
            <>
              {(() => {
                const urls = [
                  ...(message.imageUrls ?? []),
                  ...(message.imageUrl ? [message.imageUrl] : []),
                ];
                if (urls.length === 0) return null;
                if (urls.length === 1) {
                  return (
                    <img
                      src={urls[0]}
                      alt="Attached"
                      className="rounded-lg max-h-48 w-auto mb-1.5"
                      loading="lazy"
                    />
                  );
                }
                // Bento grid for 2–10 images
                return (
                  <div className={`grid gap-1 mb-1.5 ${urls.length === 2 ? "grid-cols-2" : urls.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {urls.map((u, i) => (
                      <img
                        key={i}
                        src={u}
                        alt={`Attached ${i + 1}`}
                        className="rounded-md aspect-square object-cover w-full"
                        loading="lazy"
                      />
                    ))}
                  </div>
                );
              })()}
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            </>
          ) : cardSegments.some((s) => s.type === "card") ? (
            // When the assistant emitted one or more :::card blocks, render
            // text + cards in their original order. Letter blocks are not
            // expected to coexist with cards in the same message.
            <div className="quinn-prose prose prose-sm dark:prose-invert max-w-none text-sm break-words [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mb-1.5 [&>ol]:mb-1.5">
              {cardSegments.map((seg, i) =>
                seg.type === "text" ? (
                  <ReactMarkdown
                    key={i}
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={href || "#"}
                          onClick={(e) => href && handleLinkClick(e, href)}
                          className="text-primary underline hover:text-primary/80 cursor-pointer"
                        >
                          {transformChildrenWithSourceTags(children)}
                        </a>
                      ),
                      p: ({ children }) => <p>{transformChildrenWithSourceTags(children)}</p>,
                      li: ({ children }) => <li>{transformChildrenWithSourceTags(children)}</li>,
                      strong: ({ children }) => <strong>{transformChildrenWithSourceTags(children)}</strong>,
                    }}
                  >
                    {seg.text || ""}
                  </ReactMarkdown>
                ) : (
                  <QuinnCard
                    key={i}
                    data={seg.card!}
                    sourceExcerpt={message.content.slice(0, 200)}
                    projectId={projectId}
                    conversationId={conversationId}
                    modeLens={modeLens}
                  />
                )
              )}
            </div>
          ) : (
            <div className="quinn-prose prose prose-sm dark:prose-invert max-w-none text-sm break-words [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mb-1.5 [&>ol]:mb-1.5">
              {/* Render text before letter */}
              {beforeLetter && (
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href || '#'}
                        onClick={(e) => href && handleLinkClick(e, href)}
                        className="text-primary underline hover:text-primary/80 cursor-pointer"
                      >
                        {transformChildrenWithSourceTags(children)}
                      </a>
                    ),
                    p: ({ children }) => <p>{transformChildrenWithSourceTags(children)}</p>,
                    li: ({ children }) => <li>{transformChildrenWithSourceTags(children)}</li>,
                    strong: ({ children }) => <strong>{transformChildrenWithSourceTags(children)}</strong>,
                  }}
                >
                  {beforeLetter}
                </ReactMarkdown>
              )}

              {/* Letter block with actions */}
              {hasLetter && (
                <div className="my-3 border border-primary/30 dark:border-cyan-500/30 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 dark:bg-cyan-500/10 border-b border-primary/20 dark:border-cyan-500/20">
                    <FileText className="h-4 w-4 text-primary dark:text-cyan-400" />
                    <span className="text-xs font-medium text-primary dark:text-cyan-400">Generated Letter</span>
                  </div>
                  <div className="p-3 bg-background/50 max-h-64 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono text-foreground leading-relaxed">{letterText}</pre>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-primary/20 dark:border-cyan-500/20 bg-muted/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLetterDownloadPDF}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLetterShare}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(letterText);
                        toast.success("Letter copied");
                      }}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {/* Render text after letter */}
              {afterLetter && (
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href || '#'}
                        onClick={(e) => href && handleLinkClick(e, href)}
                        className="text-primary underline hover:text-primary/80 cursor-pointer"
                      >
                        {transformChildrenWithSourceTags(children)}
                      </a>
                    ),
                    p: ({ children }) => <p>{transformChildrenWithSourceTags(children)}</p>,
                    li: ({ children }) => <li>{transformChildrenWithSourceTags(children)}</li>,
                    strong: ({ children }) => <strong>{transformChildrenWithSourceTags(children)}</strong>,
                  }}
                >
                  {afterLetter}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {/* Actions — icon + micro-label row. Regenerate lives in the More menu to protect credits. */}
        {!isUser && isLastAssistant && !isLoading && message.content && (
          <div className="flex items-center gap-3 sm:gap-5 md:gap-7 mt-2 ml-1">
            <button
              type="button"
              onClick={handleSpeak}
              className={`flex flex-col items-center gap-0.5 transition-colors ${
                isSpeaking ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={isSpeaking ? "Stop speaking" : "Listen"}
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span className="text-[9px] font-semibold tracking-wider uppercase">
                {isSpeaking ? "Stop" : "Listen"}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePin}
              disabled={pinning}
              className={`flex flex-col items-center gap-0.5 transition-colors disabled:opacity-50 ${
                pinned ? "text-champagne" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={pinned ? "Pinned to shelf" : "Save to shelf"}
            >
              <Pin className={`h-4 w-4 ${pinned ? "fill-current" : ""}`} />
              <span className="text-[9px] font-semibold tracking-wider uppercase">
                {pinned ? "Saved" : "Save"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Copy"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              <span className="text-[9px] font-semibold tracking-wider uppercase">
                {copied ? "Copied" : "Copy"}
              </span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="text-[9px] font-semibold tracking-wider uppercase">More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={onRegenerate} className="gap-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Regenerate reply</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

export function BloomCoachTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="w-7 h-7 rounded-full bg-emerald-grad flex items-center justify-center mr-2 ring-emerald-glow">
        <Loader2 className="h-3.5 w-3.5 text-[hsl(160,30%,8%)] animate-spin" />
      </div>
      <div className="quinn-glass px-3.5 py-2.5 rounded-2xl">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--quinn-emerald))] animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--quinn-emerald))] animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--quinn-champagne))] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
