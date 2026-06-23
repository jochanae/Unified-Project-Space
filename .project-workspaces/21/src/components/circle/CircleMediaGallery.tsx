import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, X, Download } from 'lucide-react';

interface CircleMessage {
  id: string;
  content: string;
  sender_name: string;
  sender_type: string;
  created_at: string;
}

interface CircleMediaGalleryProps {
  messages: CircleMessage[];
}

interface MediaItem {
  url: string;
  senderName: string;
  createdAt: string;
  msgId: string;
}

const PHOTO_REGEX = /\[📸 Photo\]\((https?:\/\/[^\s)]+)\)/;

function extractMedia(messages: CircleMessage[]): MediaItem[] {
  const items: MediaItem[] = [];
  for (const msg of messages) {
    const match = msg.content.match(PHOTO_REGEX);
    if (match) {
      items.push({ url: match[1], senderName: msg.sender_name, createdAt: msg.created_at, msgId: msg.id });
    }
  }
  return items.reverse(); // newest first
}

export default function CircleMediaGallery({ messages }: CircleMediaGalleryProps) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const media = extractMedia(messages);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-[11px] text-muted-foreground">No photos shared yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {media.map((item, i) => (
          <motion.button
            key={item.msgId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setLightbox(item)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border/30 bg-secondary/30"
          >
            <img
              src={item.url}
              alt={`Shared by ${item.senderName}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1">
              <p className="text-[9px] font-semibold text-white truncate">{item.senderName}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-sm w-full"
            >
              <img
                src={lightbox.url}
                alt={`Shared by ${lightbox.senderName}`}
                className="w-full rounded-2xl shadow-2xl"
              />
              <p className="mt-2 text-center text-xs text-white/70">
                Shared by <span className="font-semibold text-white/90">{lightbox.senderName}</span>
              </p>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setLightbox(null)}
                  className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
                >
                  <X className="h-3 w-3" /> Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
