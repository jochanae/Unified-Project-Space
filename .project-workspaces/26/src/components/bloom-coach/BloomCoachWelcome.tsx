import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface BloomCoachWelcomeProps {
  userName: string;
  onSendMessage: (text: string) => void;
  /** Optional active project for a contextual pickup line. */
  projectName?: string | null;
}

/**
 * Conversation-first empty state — "Clean Slate" greeting.
 *
 * The financial snapshot now lives in the Insight Bar at the top of the
 * screen, so this bubble stays uncluttered and focused on the *current*
 * conversation. Bloom opens with a contextual hello anchored to the
 * active project (if any), inviting the user to pick up or pivot.
 */
export function BloomCoachWelcome({
  userName,
  onSendMessage,
  projectName,
}: BloomCoachWelcomeProps) {
  const greeting = `${getTimeGreeting()}, ${userName}.`;
  const body = projectName
    ? `We're currently focused on **${projectName}**. Want to pick up where we left off, or start something new?`
    : "What's on your mind today? I'm ready when you are.";

  const ctaLabel = projectName ? `Continue ${projectName}` : "Review my snapshot";
  const ctaPrompt = projectName
    ? `Let's continue working on ${projectName}. What's our next move?`
    : "Give me a quick briefing on where my finances stand right now.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex justify-start pt-2"
    >
      <div className="w-7 h-7 rounded-full bg-emerald-grad flex items-center justify-center mr-2 flex-shrink-0 mt-1 ring-emerald-glow">
        <Sparkles className="h-3.5 w-3.5 text-[hsl(160,30%,8%)]" strokeWidth={2.5} />
      </div>
      <div className="max-w-[80%]">
        <div className="quinn-glass text-foreground px-3.5 py-2.5 rounded-2xl">
          <p className="text-sm font-medium text-champagne mb-1">{greeting}</p>
          <p className="text-sm leading-relaxed text-foreground/95">
            {/* Render simple **bold** for the project name */}
            {body.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
              chunk.startsWith("**") && chunk.endsWith("**") ? (
                <strong key={i} className="text-champagne font-semibold">
                  {chunk.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{chunk}</span>
              )
            )}
          </p>
          <button
            onClick={() => onSendMessage(ctaPrompt)}
            className="mt-2.5 text-xs font-medium text-emerald hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {ctaLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
