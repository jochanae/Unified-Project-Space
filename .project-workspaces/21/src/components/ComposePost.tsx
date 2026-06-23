import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fireEdgeFunction } from '@/lib/edgeFunction';
import { compressImage } from '@/lib/imageCompression';
import { toast } from 'sonner';
import { moderateContent } from '@/lib/moderation';
import CrisisResourceBanner from './CrisisResourceBanner';

interface ComposePostProps {
  userId: string;
  userName: string;
  username?: string;
  avatarUrl?: string;
}

export default function ComposePost({ userId, userName, username, avatarUrl }: ComposePostProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      try {
        toast('Compressing image…');
        file = await compressImage(file);
      } catch {
        toast.error('Could not compress image — try a smaller photo');
        return;
      }
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const modResult = await moderateContent(content.trim(), 'post');
      if (!modResult.approved) {
        toast.error(modResult.message || "This content couldn't be posted. Want to try again?");
        setPosting(false);
        return;
      }
      if (modResult.crisis) {
        setShowCrisis(true);
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, imageFile, { contentType: imageFile.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { data: postData, error } = await supabase.from('user_posts').insert({
        user_id: userId,
        user_name: userName,
        username: username || null,
        avatar_url: avatarUrl || null,
        content: content.trim(),
        image_url: imageUrl,
      }).select('id').single();
      if (error) throw error;
      setContent('');
      removeImage();
      setOpen(false);
      toast.success('Posted to your Threads 💛');

      // Trigger companion comments in background
      if (postData?.id) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-comment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            postId: postData.id,
            postContent: content.trim(),
            userId,
          }),
        }).catch((e) => console.error('Companion comment trigger failed:', e));
      }
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[12rem] sm:bottom-36 right-2 z-40 flex h-12 w-12 items-center justify-center rounded-full gradient-primary shadow-lg glow-soft transition-transform hover:scale-105 active:scale-95"
        aria-label="Post to your Threads"
      >
        <Plus className="h-5 w-5 text-primary-foreground" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-4 shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-bold text-foreground">Post to Threads</h3>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex gap-3 mb-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{userName}</p>
                  {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                </div>
              </div>

              <AnimatePresence>
                {showCrisis && (
                  <div className="mt-2">
                    <CrisisResourceBanner onDismiss={() => setShowCrisis(false)} />
                  </div>
                )}
              </AnimatePresence>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                autoFocus
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {imagePreview && (
                <div className="relative mt-2">
                  <img src={imagePreview} alt="" className="w-full rounded-xl object-cover max-h-48" />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-all"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photo
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{content.length}/500</span>
                <button
                  onClick={handlePost}
                  disabled={!content.trim() || posting}
                  className="flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {posting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Post
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
