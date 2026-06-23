/**
 * InlineSketchOffer — small "✨ Sketch this" affordance that appears under
 * assistant messages when:
 *   1. Strategist Mode is active (universal high-stakes radar), AND
 *   2. visualIntentDetection finds spatial/aesthetic cues in the reply.
 *
 * Tapping the pill reveals 4 style preset chips (Concept, Wireframe, Mood
 * board, Photoreal). Picking one generates a work-image via useWorkImage
 * with that preset, then appends a NEW assistant message carrying the
 * sketch metadata (including the chosen preset) + [IMG:url] so it renders
 * inline in the conversation and persists across reloads.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { detectVisualIntent } from '@/lib/visualIntentDetection';
import { useWorkImage } from '@/hooks/useWorkImage';
import { encodeSketchPrefix } from '@/lib/sketchEncoding';
import {
  SKETCH_STYLE_PRESETS,
  SKETCH_STYLE_LABEL,
  presetToVisualKind,
  type SketchStylePreset,
} from '@/lib/sketchStylePresets';
import type { ChatMessage } from '@/hooks/useChatHistory';

interface InlineSketchOfferProps {
  message: ChatMessage;
  strategistActive: boolean;
  userId: string;
  memberId: string;
  conversationContext?: string;
  addMessage: (msg: ChatMessage) => void;
  onPersistMessage?: (content: string, role: 'user' | 'assistant', imageUrl?: string) => void;
}

export default function InlineSketchOffer({
  message,
  strategistActive,
  userId,
  memberId,
  conversationContext,
  addMessage,
  onPersistMessage,
}: InlineSketchOfferProps) {
  const { generate, loading } = useWorkImage();
  const [dismissed, setDismissed] = useState(false);
  const [used, setUsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<SketchStylePreset | null>(null);

  const intent = useMemo(() => detectVisualIntent(message.content || ''), [message.content]);

  if (
    !strategistActive ||
    !intent.shouldOffer ||
    used ||
    dismissed ||
    message.isUser ||
    !userId ||
    !memberId
  ) {
    return null;
  }

  const handleSketch = async (preset: SketchStylePreset) => {
    setActivePreset(preset);
    const promptText = (message.content || '').slice(0, 1000);
    const result = await generate({
      prompt: promptText,
      visualKind: presetToVisualKind(preset),
      stylePreset: preset,
      memberId,
      messageId: message.id,
      conversationContext,
    });
    if (!result) {
      setActivePreset(null);
      return;
    }
    setUsed(true);

    const caption = result.title || SKETCH_STYLE_LABEL[preset];
    // body has no [IMG:url] — imageUrl is the separate message field so the
    // bubble renders once. Persistence appends [IMG:url] via encodeImageContent.
    const body = caption;
    const content = result.artifactId
      ? encodeSketchPrefix(
          {
            artifactId: result.artifactId,
            visualKind: result.visualKind,
            title: caption,
            prompt: promptText,
            stylePreset: result.stylePreset ?? preset,
          },
          body,
        )
      : body;

    const newMsg: ChatMessage = {
      id: `sketch-${Date.now()}`,
      content,
      isUser: false,
      timestamp: new Date(),
      imageUrl: result.imageUrl,
    };
    addMessage(newMsg);
    onPersistMessage?.(content, 'assistant', result.imageUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-1.5 ml-3 flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[rgba(212,175,55,0.95)] bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.14)] hover:border-[rgba(212,175,55,0.4)] transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Sketching{activePreset ? ` · ${SKETCH_STYLE_LABEL[activePreset]}` : '…'}
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              {expanded ? 'Pick a style' : 'Sketch this'}
            </>
          )}
        </button>
        {!loading && !expanded && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[10px] uppercase tracking-[0.1em] font-light text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Not now
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap gap-1.5 overflow-hidden"
          >
            {SKETCH_STYLE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSketch(p)}
                className="rounded-full px-3 py-1 text-[11px] font-light text-foreground/80 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
              >
                {SKETCH_STYLE_LABEL[p]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
