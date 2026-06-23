/**
 * CamiMessageBubble — renders a single message in the Cami chat.
 * Handles the cinematic image reveal animation for avatar photos.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  imageUrl?: string;
}

interface CamiMessageBubbleProps {
  msg: ChatMessage;
  onImageClick?: (url: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text.replace(/\*\*/g, ''));
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute -bottom-1 right-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-full bg-background border border-border p-1.5 shadow-sm hover:bg-secondary"
      aria-label="Copy message"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

export default function CamiMessageBubble({ msg, onImageClick }: CamiMessageBubbleProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} group`}
    >
      <div className={`relative w-fit ${msg.isUser ? 'max-w-[80%] ml-auto' : 'max-w-[92%]'}`}>
        <div className={`px-4 py-3 text-sm leading-[1.85] font-light ${
          msg.isUser
            ? 'bg-primary/20 backdrop-blur-md border-l-2 border-l-primary/40 text-foreground rounded-[24px] rounded-br-[8px]'
            : 'bg-[#1A1B2E]/60 backdrop-blur-xl text-foreground rounded-[24px] rounded-bl-[8px]'
        }`}>
          {msg.content.split('\n').map((line, i) => {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </p>
            );
          })}

          {msg.imageUrl && (
            <div
              className="relative mt-3 rounded-xl overflow-hidden cursor-pointer"
              onClick={() => onImageClick?.(msg.imageUrl!)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => setRevealed(true)}
              >
                <img
                  src={msg.imageUrl}
                  alt="Companion"
                  className="w-full rounded-xl object-cover max-h-72"
                  loading="lazy"
                  style={{
                    filter: revealed ? 'blur(0px) brightness(1)' : 'blur(18px) brightness(1.8)',
                    transition: 'filter 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
                    boxShadow: revealed
                      ? '0 0 40px 8px hsl(18 85% 58% / 0.2), 0 0 80px 20px hsl(262 55% 62% / 0.1)'
                      : 'none',
                  }}
                />
              </motion.div>
              <AnimatePresence>
                {!revealed && (
                  <motion.div
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 0.7 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-xl bg-white/80 pointer-events-none"
                  />
                )}
              </AnimatePresence>
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, transparent 60%, hsl(225 25% 8% / 0.5) 100%)',
                  opacity: revealed ? 1 : 0,
                  transition: 'opacity 1s ease-out 0.8s',
                }}
              />
            </div>
          )}
        </div>
        {!msg.isUser && msg.content.length > 20 && (
          <CopyButton text={msg.content} />
        )}
      </div>
    </motion.div>
  );
}
