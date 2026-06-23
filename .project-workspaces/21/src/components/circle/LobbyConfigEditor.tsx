import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, FileText, Video, Music, Plus, Trash2, Sparkles, Save, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LobbyConfigEditorProps {
  circleId: string;
  lobbyConfig: {
    welcome_message: string | null;
    video_url: string | null;
    music_url: string | null;
    handouts: { label: string; url: string }[];
    guestbook_enabled: boolean;
  } | null;
  onSaved?: () => void;
}

export default function LobbyConfigEditor({ circleId, lobbyConfig, onSaved }: LobbyConfigEditorProps) {
  const [open, setOpen] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [handouts, setHandouts] = useState<{ label: string; url: string }[]>([]);
  const [guestbookEnabled, setGuestbookEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync from lobbyConfig when opening
  useEffect(() => {
    if (open && lobbyConfig) {
      setWelcomeMessage(lobbyConfig.welcome_message || '');
      setVideoUrl(lobbyConfig.video_url || '');
      setMusicUrl(lobbyConfig.music_url || '');
      setHandouts(lobbyConfig.handouts || []);
      setGuestbookEnabled(lobbyConfig.guestbook_enabled);
    } else if (open && !lobbyConfig) {
      setWelcomeMessage('');
      setVideoUrl('');
      setMusicUrl('');
      setHandouts([]);
      setGuestbookEnabled(true);
    }
  }, [open, lobbyConfig]);

  const addHandout = () => {
    if (handouts.length < 5) setHandouts([...handouts, { label: '', url: '' }]);
  };
  const removeHandout = (i: number) => setHandouts(handouts.filter((_, idx) => idx !== i));
  const updateHandout = (i: number, field: 'label' | 'url', val: string) => {
    const h = [...handouts]; h[i] = { ...h[i], [field]: val }; setHandouts(h);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (handouts.length >= 5) { toast('Max 5 handouts'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'file';
      const path = `${circleId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('circle-handouts').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('circle-handouts').getPublicUrl(path);
      setHandouts([...handouts, { label: file.name, url: publicUrl }]);
      toast.success('File attached!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await (supabase as any).from('circle_lobby_config').upsert({
        circle_id: circleId,
        welcome_message: welcomeMessage.trim() || null,
        video_url: videoUrl.trim() || null,
        music_url: musicUrl.trim() || null,
        handouts: handouts.filter(h => h.url.trim()),
        guestbook_enabled: guestbookEnabled,
      }, { onConflict: 'circle_id' });
      toast.success('Lobby config saved!');
      setOpen(false);
      onSaved?.();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <Settings2 className="h-3.5 w-3.5" /> Edit Lobby
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md max-h-[90dvh] rounded-t-2xl sm:rounded-2xl shadow-2xl bg-card border border-border overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-base font-bold text-foreground">Edit Lobby</h3>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {/* Welcome message */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Welcome message</label>
                  <textarea
                    value={welcomeMessage}
                    onChange={e => setWelcomeMessage(e.target.value)}
                    placeholder="A greeting guests see when they arrive…"
                    maxLength={300}
                    rows={2}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border resize-none"
                  />
                </div>

                {/* Video URL */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Video className="h-3 w-3" /> Welcome video URL
                  </label>
                  <input
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border"
                  />
                </div>

                {/* Music URL */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Music className="h-3 w-3" /> Background music URL
                  </label>
                  <input
                    value={musicUrl}
                    onChange={e => setMusicUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border"
                  />
                </div>

                {/* Handouts */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Handouts ({handouts.length}/5)
                  </label>
                  {handouts.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2 rounded-lg border border-border bg-secondary/30 px-2.5 py-2">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <input
                        value={h.label}
                        onChange={e => updateHandout(i, 'label', e.target.value)}
                        placeholder="File label"
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
                      />
                      <button onClick={() => removeHandout(i)} className="rounded-lg p-1 hover:bg-destructive/10 transition-colors shrink-0">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                  {handouts.length < 5 && (
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
                        onChange={handleFileUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload a file'}
                      </button>
                      <button onClick={addHandout} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors mx-auto">
                        <Plus className="h-2.5 w-2.5" /> or add by URL
                      </button>
                    </div>
                  )}
                </div>

                {/* Guestbook toggle */}
                <div className="flex items-center justify-between rounded-xl bg-secondary/50 border border-border p-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">Guestbook</p>
                    <p className="text-[10px] text-muted-foreground">Capture arrival notes</p>
                  </div>
                  <button
                    onClick={() => setGuestbookEnabled(!guestbookEnabled)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${guestbookEnabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${guestbookEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border/30 flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><Save className="h-4 w-4" /> Save</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
