import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImageIcon, Trash2 } from 'lucide-react';
import { useUserChatUploads, UserUploadItem } from '@/hooks/useUserChatUploads';
import ResilientImage from '@/components/ResilientImage';
import { toast } from 'sonner';

interface WorldUploadsTabProps {
  userId: string;
  /** When true, renders only the grid (for embedding inside another tab like Vault). */
  embedded?: boolean;
}

/**
 * Gallery of the user's uploaded chat images with delete control.
 * Reads from `chat-images/{userId}/`.
 */
export default function WorldUploadsTab({ userId, embedded = false }: WorldUploadsTabProps) {
  const { uploads, loading, deleteUpload } = useUserChatUploads(userId);
  const [lightbox, setLightbox] = useState<UserUploadItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">No uploads yet</p>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
          Photos you attach in chat will appear here so you can revisit them.
        </p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!lightbox) return;
    setDeleting(true);
    const ok = await deleteUpload(lightbox.path);
    setDeleting(false);
    if (ok) {
      toast.success('Removed from Uploads');
      setLightbox(null);
    } else {
      toast.error('Could not delete. Try again.');
    }
  };

  return (
    <div>
      {!embedded && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Your Uploads
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground">{uploads.length}</span>
        </div>
      )}

      <div className="columns-2 sm:columns-3 gap-1.5 sm:gap-2 space-y-1.5 sm:space-y-2">
        {uploads.map((item, i) => (
          <motion.button
            key={item.path}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            onClick={() => setLightbox(item)}
            className="group relative w-full break-inside-avoid overflow-hidden rounded-lg sm:rounded-xl border border-border/30"
          >
            <ResilientImage
              src={item.signedUrl}
              alt={item.name}
              wrapperClassName="w-full aspect-square"
              className="object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute bottom-1 left-1">
              <span className="rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                📤
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex h-[100dvh] w-screen flex-col bg-black"
          >
            <div className="relative z-10 flex shrink-0 items-center justify-between bg-black/70 px-4 py-3 backdrop-blur-sm">
              <p className="max-w-[70%] truncate text-xs text-white/60">
                {lightbox.createdAt
                  ? new Date(lightbox.createdAt).toLocaleString()
                  : 'Upload'}
              </p>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="flex min-h-0 flex-1 items-center justify-center px-3 py-4"
              onClick={() => setLightbox(null)}
            >
              <img
                src={lightbox.signedUrl}
                alt={lightbox.name}
                className="max-h-full max-w-full rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="shrink-0 bg-black/70 px-4 pb-4 pt-3 backdrop-blur-sm safe-area-bottom">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="mx-auto flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 active:bg-red-500/40 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Removing…' : 'Delete from Uploads'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
