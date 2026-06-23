import { useState } from "react";
import { Search } from "lucide-react";
import { useDeepDiveHistory } from "@/hooks/useDeepDiveHistory";
import {
  buildDeepDiveCustomPrompt,
  buildDeepDiveLink,
  type DeepDiveContext,
  type DeepDiveProvider,
} from "@/lib/deepDive";
import { openDeepDiveLink } from "@/lib/openDeepDiveLink";
import { toast } from "sonner";

/**
 * Reusable "Seek Wisdom" composer that lets a user attach a free-form question
 * to the current passage context and hand it off to ChatGPT or Perplexity.
 *
 * Used in:
 *  - ReaderQuantumMenu (verse-level Deep Dive)
 *  - ReaderSanctuaryTray (header / chapter-level Deep Dive)
 */
export function DeepDiveCustomInquiry({
  reference,
  verseText,
  passageContext,
  onAfterSubmit,
}: {
  reference: string;
  /** Optional verse text to quote alongside the question. Empty string is fine. */
  verseText?: string;
  passageContext: DeepDiveContext;
  /** Optional callback fired after a provider window is opened (e.g. close the tray). */
  onAfterSubmit?: () => void;
}) {
  const [question, setQuestion] = useState("");
  const deepDiveHistory = useDeepDiveHistory();

  const open = (provider: DeepDiveProvider) => {
    const trimmed = question.trim();
    if (!trimmed) {
      toast.message("Type a question first", {
        description: "Add what you want to ask before sending it to a research tool.",
      });
      return;
    }
    const prompt = buildDeepDiveCustomPrompt({
      reference,
      verseText,
      context: passageContext,
      question: trimmed,
    });
    const link = buildDeepDiveLink(provider, prompt);
    void deepDiveHistory.log({
      book: passageContext.book,
      chapter: passageContext.chapter,
      verse_start: passageContext.verseStart,
      verse_end: passageContext.verseEnd,
      reference_label: reference,
      provider: `${provider} (custom)`,
      prompt,
      url: link.href,
    });
    void openDeepDiveLink(link, { reference });
    onAfterSubmit?.();
  };

  return (
    <div>
      <label
        htmlFor="deep-dive-custom-inquiry"
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-gold/70"
      >
        <Search className="h-3 w-3" strokeWidth={1.5} />
        Seek Wisdom
      </label>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Ask your own question — we'll attach this passage as context.
      </p>
      <textarea
        id="deep-dive-custom-inquiry"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="e.g. What is the Hebrew word for 'love' here, and how is it used elsewhere?"
        rows={2}
        maxLength={500}
        className="mt-2 w-full resize-none rounded-md border border-gold/18 bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
      />
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => open("ChatGPT")}
          disabled={!question.trim()}
          className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-md border border-gold/18 bg-background/24 px-4 text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ask ChatGPT
        </button>
        <button
          type="button"
          onClick={() => open("Perplexity")}
          disabled={!question.trim()}
          className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-md border border-gold/18 bg-background/24 px-4 text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ask Perplexity
        </button>
      </div>
    </div>
  );
}
