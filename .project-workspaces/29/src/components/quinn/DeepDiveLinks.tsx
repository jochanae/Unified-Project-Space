import { ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DeepDiveLinksProps {
  messageContent: string;
  userQuestion?: string;
}

/**
 * Builds a search-friendly prompt for deep-diving on a topic.
 * Prefers the user's original question; falls back to extracting from Quinn's response.
 */
function buildPrompt(userQuestion?: string, assistantContent?: string): string {
  if (userQuestion && userQuestion.trim().length > 10) {
    return userQuestion.trim();
  }

  // Fallback: extract a topic from Quinn's response
  const clean = (assistantContent || '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // Take the first couple of sentences
  const sentences = clean.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 15);
  const excerpt = sentences.slice(0, 2).join('. ');
  return excerpt.slice(0, 200) || clean.slice(0, 200);
}

/**
 * Determines if a Quinn response is a good candidate for external deep-dive.
 */
export function isDeepDiveCandidate(content: string): boolean {
  if (content.length < 150) return false;
  const appActionPatterns = /(?:I'(?:ve|ll) (?:added|updated|created|removed|deleted|marked)|has been (?:added|updated|saved|removed)|successfully (?:added|created|updated)|added to your (?:plan|net worth|bills|savings)|here(?:'s| is) your (?:updated|new))/i;
  if (appActionPatterns.test(content) && content.length < 300) return false;
  return true;
}

async function copyThenOpen(prompt: string, url: string, name: string) {
  try {
    await navigator.clipboard.writeText(prompt);
    toast.success(`Your question was copied! Paste it into ${name}.`, { duration: 4000 });
  } catch {
    toast.info(`Open ${name} and type your question there.`, { duration: 4000 });
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function DeepDiveLinks({ messageContent, userQuestion }: DeepDiveLinksProps) {
  const prompt = buildPrompt(userQuestion, messageContent);
  const encodedPrompt = encodeURIComponent(prompt);

  // ChatGPT supports ?q=
  const chatGptUrl = `https://chatgpt.com/?q=${encodedPrompt}`;
  // Gemini has no URL pre-fill support — copy to clipboard + open
  const geminiUrl = 'https://gemini.google.com/';

  return (
    <div className="mt-2 pt-2 border-t border-border/30">
      <p className="text-[10px] text-muted-foreground mb-1.5">
        Research this topic further — your Quinn conversation will be right here when you return.
      </p>
      <div className="flex flex-wrap gap-2">
        {/* Gemini: no URL pre-fill — copy question then open */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-border/50 hover:bg-muted/50"
          onClick={() => copyThenOpen(prompt, geminiUrl, 'Gemini')}
        >
          <Copy className="h-3 w-3" />
          Deep dive with Gemini
        </Button>
        {/* ChatGPT: pre-fills via ?q= */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-border/50 hover:bg-muted/50"
          onClick={() => window.open(chatGptUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-3 w-3" />
          Deep dive with ChatGPT
        </Button>
        {/* Perplexity: pre-fills via ?q= */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-border/50 hover:bg-muted/50"
          onClick={() => window.open(`https://www.perplexity.ai/search?q=${encodedPrompt}`, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-3 w-3" />
          Deep dive with Perplexity
        </Button>
      </div>
    </div>
  );
}
