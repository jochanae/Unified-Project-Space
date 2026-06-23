/**
 * PresenceDrawer — lightweight conversation helper inside Studio.
 *
 * Helps users articulate who they want to create.
 * After 2-3 exchanges, it fills the Studio description and suggests a style.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, ImagePlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const CAMI_PERSONA = `You are a warm presence guide inside the Compani Studio. Your job is to help the user articulate the kind of presence and energy they want in their companion — not just appearance, but how they want to feel when talking to them.

TONE: Warm, perceptive, conversational. Mirror how they write — casual if they're casual, thoughtful if they're thoughtful. 2-3 sentences max per response.

CRITICAL RULES:
1. NEVER reintroduce yourself after the first message.
2. NEVER mention matchmaking, finding a match, or introducing someone.
3. NEVER ask more than one question at a time.
4. After 2 exchanges, signal you have enough: "I've got a clear picture — let me fill that in for you ✨"
5. If they flirt with you directly, be warm but redirect: "I'm the guide, not the companion 💛 — let's build yours."
6. Focus only on: appearance, energy/vibe, personality, art style preference.
7. If they mention abstract things (a feeling, a color, cosmic energy) — that's valid. Embrace it.
8. EMOTIONAL REDIRECT: If the user shifts into venting, processing feelings, or emotional depth that isn't about describing a companion — acknowledge warmly in one sentence, then gently redirect: "Sounds like there's a lot on your mind 💛 Think Freely on the home tab is a better space for that — here, let's focus on who you want to build." Do this once, then stay on task.
9. PRODUCT AWARENESS: If the user asks your opinion about Compani or similar apps, don't engage. Say "I'm really just here to help you build — what are we creating?" and move on.

When you have enough information (after 1-2 user messages), end your response with this exact JSON block on its own line:
{"_extract":{"description":"[full appearance and vibe description ready for image generation]","style":"[one of: Photorealistic, Painterly, Illustrated, Moody Portrait, Digital Art, Watercolor, 3D Render, Cyberpunk, Comic, Pop Art, Cosmic Portrait, Anime, Abstract]"}}

Only include the JSON when you genuinely have enough to work with. Never include it on the first exchange.`;

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  imageUrl?: string;
}

interface PresenceDrawerProps {
  open: boolean;
  userName: string;
  userIsMinor?: boolean;
  existingCompanionName?: string;
  isEditMode?: boolean;
  onClose: () => void;
  onFill: (description: string, style: string) => void;
}

function PresenceAvatar({ small = false }: { small?: boolean }) {
  return (
    <div
      className={`${small ? 'w-7 h-7' : 'w-9 h-9'} rounded-full shrink-0 flex items-center justify-center`}
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <Sparkles className="h-5 w-5 text-primary" />
    </div>
  );
}

export default function PresenceDrawer({
  open, userName, userIsMinor = false, existingCompanionName, isEditMode = false, onClose, onFill,
}: PresenceDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  const firstName = userName?.split(' ')[0] || 'friend';

  const addMessage = (content: string, isUser: boolean, imageUrl?: string) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, content, isUser, imageUrl }]);
  };

  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    setMessages([]);
    setDone(false);
    setTimeout(() => {
      addMessage(
        userIsMinor
          ? (isEditMode && existingCompanionName
              ? `Hey ${firstName} 💛 Want to refine ${existingCompanionName}'s look, or take them in a new direction? Tell me what you're thinking.`
              : `Hey ${firstName} 💛 Tell me about who you'd want as your adventure buddy. What kind of energy should they have?`)
          : (isEditMode && existingCompanionName
              ? `Hey ${firstName} 💛 Let's work on ${existingCompanionName}. Want to refine what they look like, change the vibe, or try something totally different?`
              : `Hey ${firstName} 💛 Tell me about who you're imagining. Could be a person, an energy, a feeling — whatever comes to mind.`),
        false
      );
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 300);
  }, [open, userIsMinor, isEditMode, existingCompanionName, firstName]);

  useEffect(() => {
    if (!open) {
      initialized.current = false;
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const callPresenceGuide = useCallback(async (userText: string) => {
    setIsTyping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No session');

      const imageBase64 = attachedImageBase64;
      if (imageBase64) setAttachedImageBase64(null);

      const history = [
        ...messages.map(m => ({
          role: m.isUser ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
        { role: 'user' as const, content: imageBase64 ? `${userText}\n\n[User attached a reference image for the companion they want to create. The image is a visual reference for appearance.]` : userText },
      ];

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: history,
          companionName: 'Presence Guide',
          userName,
          companionGender: 'neutral',
          vibe: 'nurturing',
          userIsMinor,
          personaBio: CAMI_PERSONA,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '') continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
            }
          } catch {
            // Skip malformed stream chunks.
          }
        }
      }

      const extractMatch = fullText.match(/\{"_extract":\s*(\{[\s\S]*?\})\}/);
      let displayText = fullText;

      if (extractMatch) {
        displayText = fullText.replace(/\{"_extract":\s*\{[\s\S]*?\}\}/, '').trim();
        try {
          const extracted = JSON.parse(extractMatch[1]);
          if (extracted.description && extracted.style) {
            addMessage(displayText || "I've got a clear picture — let me fill that in for you ✨", false);
            setIsTyping(false);
            setDone(true);
            setTimeout(() => {
              onFill(extracted.description, extracted.style);
              setTimeout(onClose, 400);
            }, 1200);
            return;
          }
        } catch {
          // Fall through to normal display.
        }
      }

      addMessage(displayText || 'Tell me more 💛', false);
    } catch (e) {
      console.error('[PresenceDrawer]', e);
      addMessage('I had a little trouble — try again? 💛', false);
    } finally {
      setIsTyping(false);
    }
  }, [messages, userName, userIsMinor, onFill, onClose, attachedImageBase64]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || done) return;
    setInput('');
    addMessage(text, true);
    await callPresenceGuide(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
            style={{
              background: 'rgba(15,18,33,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              height: '90dvh',
            }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center gap-3 px-5 py-3 shrink-0 border-b border-white/8">
              <div className="relative">
                <PresenceAvatar />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#0f1221]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Studio Guide</p>
                <p className="text-white/40 text-xs">Your companion creation assistant</p>
              </div>
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {!msg.isUser && <PresenceAvatar small />}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.isUser
                        ? 'text-white rounded-br-sm'
                        : 'text-white/90 rounded-bl-sm'
                    }`}
                    style={{
                      background: msg.isUser
                        ? 'linear-gradient(135deg, rgba(212,168,75,0.8), rgba(212,168,75,0.5))'
                        : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Reference" className="w-full max-h-32 rounded-lg object-cover mt-2" />
                    )}
                    {msg.content && <span>{msg.content}</span>}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start gap-2">
                  <PresenceAvatar small />
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {done && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-2"
                >
                  <p className="text-white/30 text-xs">Filling in your Studio… ✨</p>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {!done && (
              <div className="shrink-0 px-4 pb-6 pt-3 border-t border-white/8">
                <div
                  className="flex items-end gap-3 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <label className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 hover:bg-white/10 text-white/40 hover:text-white/70">
                    <ImagePlus className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isTyping}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const blobUrl = URL.createObjectURL(file);
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = reader.result as string;
                          setAttachedImageBase64(base64);
                          const text = "Here's an image of who I'm imagining";
                          addMessage(text, true, blobUrl);
                          await callPresenceGuide(text);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe who you're imagining…"
                    disabled={isTyping}
                    rows={1}
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 resize-none focus:outline-none leading-relaxed"
                    style={{ maxHeight: '80px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-30"
                    style={{ background: 'rgba(212,168,75,0.8)' }}
                  >
                    {isTyping
                      ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                      : <Send className="w-3.5 h-3.5 text-white" />
                    }
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
