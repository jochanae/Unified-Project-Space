/**
 * StampPhotoTray — Glassmorphic expanding tray with "Springy Stack" fan-out.
 * Photos fan out like a deck of cards with spring physics when tapped.
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Plus, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getUploadSignedUrl } from '@/lib/signedUrl';
import { toast } from 'sonner';

export interface TravelPhoto {
  id: string;
  image_url: string;
  caption: string | null;
  travel_entry_id?: string;
}

interface StampPhotoTrayProps {
  entryId: string;
  cityName: string;
  date: string;
  companionName?: string;
  userId: string;
  photos: TravelPhoto[];
  onPhotosChange: (photos: TravelPhoto[]) => void;
  onClose: () => void;
  onShare?: () => void;
}

/** Fan-out positions for up to 5 photos — offset, rotation, lift */
const FAN_POSITIONS = [
  { x: -100, y: -20, rotate: -12 },
  { x: -50,  y: -35, rotate: -6 },
  { x: 0,    y: -42, rotate: 0 },
  { x: 50,   y: -35, rotate: 6 },
  { x: 100,  y: -20, rotate: 12 },
];

export default function StampPhotoTray({
  entryId,
  cityName,
  date,
  companionName,
  userId,
  photos,
  onPhotosChange,
  onClose,
  onShare,
}: StampPhotoTrayProps) {
  const [uploading, setUploading] = useState(false);
  const [fanOpen, setFanOpen] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<TravelPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${entryId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('chat-images')
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      const signedUrl = await getUploadSignedUrl('chat-images', path);
      // Store the path-based URL for persistence (signed URLs expire)
      const persistUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/chat-images/${path}`;

      const { data, error } = await supabase
        .from('travel_photos' as any)
        .insert({ travel_entry_id: entryId, user_id: userId, image_url: persistUrl })
        .select()
        .single();

      if (error) throw error;
      onPhotosChange([...photos, data as any]);
      toast.success('Memory inscribed ✨');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deletePhoto = async (photoId: string) => {
    await supabase.from('travel_photos' as any).delete().eq('id', photoId);
    onPhotosChange(photos.filter(p => p.id !== photoId));
    if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
  };

  // Compute fan positions based on photo count
  const getFanPosition = (index: number, total: number) => {
    if (total === 1) return FAN_POSITIONS[2]; // center
    if (total === 2) return FAN_POSITIONS[index === 0 ? 1 : 3];
    if (total === 3) return FAN_POSITIONS[index === 0 ? 0 : index === 1 ? 2 : 4];
    if (total === 4) return FAN_POSITIONS[index === 0 ? 0 : index === 1 ? 1 : index === 2 ? 3 : 4];
    // 5+ use all positions, wrap extras
    return FAN_POSITIONS[index % FAN_POSITIONS.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-2xl border border-white/[0.1] overflow-hidden"
      style={{ background: 'rgba(19, 20, 36, 0.92)', backdropFilter: 'blur(40px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div>
          <p className="text-sm font-medium text-foreground">{cityName}</p>
          <p className="text-[9px] text-muted-foreground/40 font-mono">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          {onShare && (
            <button
              onClick={onShare}
              className="p-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary/70 hover:text-primary transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Photo cluster — springy fan-out */}
      <div className="p-3">
        {photos.length === 0 && !uploading ? (
          <div className="text-center py-6 space-y-2">
            <Camera className="h-8 w-8 mx-auto text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground/40">No memories inscribed yet</p>
            <p className="text-[9px] text-muted-foreground/25">Add photos to this stamp</p>
          </div>
        ) : (
          <>
            {/* Fan-out view */}
            <div
              className="relative flex items-center justify-center cursor-pointer"
              style={{ height: photos.length > 0 ? '180px' : '0px' }}
              onClick={() => setFanOpen(!fanOpen)}
            >
              <AnimatePresence>
                {photos.slice(0, 5).map((photo, index) => {
                  const pos = getFanPosition(index, Math.min(photos.length, 5));
                  return (
                    <motion.div
                      key={photo.id}
                      initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
                      animate={fanOpen ? {
                        scale: 1,
                        opacity: 1,
                        x: pos.x,
                        y: pos.y,
                        rotate: pos.rotate,
                      } : {
                        scale: 0.9,
                        opacity: 0.7,
                        x: index * 4,
                        y: index * -2,
                        rotate: index * 2,
                      }}
                      exit={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: index * 0.05,
                      }}
                      whileHover={{ scale: 1.08, zIndex: 30 }}
                      whileTap={{ scale: 0.95 }}
                      className="absolute rounded-xl border border-white/[0.15] overflow-hidden shadow-2xl cursor-pointer"
                      style={{ zIndex: 10 + index, width: '80px', height: '106px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto(photo);
                      }}
                    >
                      <img
                        src={photo.image_url}
                        alt={photo.caption || cityName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Cinematic gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {/* Gold border glow on hover */}
                      <div className="absolute inset-0 rounded-xl border border-primary/0 hover:border-primary/30 transition-colors" />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Overflow count */}
              {photos.length > 5 && fanOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute right-0 bottom-2 bg-primary/20 border border-primary/30 text-primary text-[10px] font-medium px-2.5 py-1 rounded-full z-20"
                >
                  +{photos.length - 5} more
                </motion.div>
              )}
            </div>

            {/* Tap hint */}
            <p className="text-[8px] text-muted-foreground/25 text-center mt-1">
              {fanOpen ? 'Tap a photo to view · Tap fan to collapse' : 'Tap to fan out'}
            </p>
          </>
        )}

        {/* Add photo button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          {uploading ? (
            <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          {uploading ? 'Inscribing…' : 'Add Memory'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Companion witness footer */}
      {companionName && (
        <div className="px-4 pb-3">
          <p className="text-[9px] text-primary/30 text-center tracking-widest uppercase">
            Witnessed by {companionName}
          </p>
        </div>
      )}

      {/* Selected photo lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.image_url}
                alt={selectedPhoto.caption || cityName}
                className="w-full rounded-2xl border border-white/[0.1] shadow-2xl"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => deletePhoto(selectedPhoto.id)}
                  className="p-2 rounded-full bg-black/60 border border-white/10 text-destructive/80 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {selectedPhoto.caption && (
                <p className="absolute bottom-4 left-4 right-4 text-sm text-white/80 bg-black/50 rounded-xl px-3 py-2">
                  {selectedPhoto.caption}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
