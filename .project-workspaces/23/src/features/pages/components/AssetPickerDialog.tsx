import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;

/** Resize an image file client-side if it exceeds max dimensions. Returns a Blob. */
async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width <= MAX_WIDTH && img.height <= MAX_HEIGHT) { resolve(file); return; }
      const scale = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Resize failed')),
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

interface Asset {
  name: string;
  url: string;
}

interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSelect: (url: string) => void;
}

export function AssetPickerDialog({ open, onOpenChange, projectId, onSelect }: AssetPickerDialogProps) {
  const { user } = useCurrentUser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const orgId = user?.orgId;
  const basePath = orgId ? `${orgId}/${projectId}` : null;

  const loadAssets = useCallback(async () => {
    if (!basePath) return;
    setLoading(true);
    const { data, error } = await supabase.storage.from('project-assets').list(basePath, { limit: 100 });
    if (error) {
      toast.error(error.message);
      setAssets([]);
    } else if (data) {
      const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');
      const signed = await Promise.all(
        files.map(async (f) => {
          const { data: s } = await supabase.storage
            .from('project-assets')
            .createSignedUrl(`${basePath}/${f.name}`, 60 * 60);
          return { name: f.name, url: s?.signedUrl || '' };
        }),
      );
      setAssets(signed.filter(a => a.url));
    }
    setLoading(false);
  }, [basePath]);

  useEffect(() => {
    if (open && basePath) {
      void loadAssets();
    }
  }, [open, basePath, loadAssets]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !basePath) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Max file size: 10 MB'); return; }

    setUploading(true);
    try {
      const optimized = await resizeImage(file);
      const ext = file.type === 'image/png' ? 'png' : file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('project-assets').upload(`${basePath}/${fileName}`, optimized, {
        contentType: file.type.startsWith('image/') ? (file.type === 'image/png' ? 'image/png' : 'image/jpeg') : file.type,
      });
      if (error) { toast.error(error.message); }
      else {
        const sizeMB = (optimized.size / 1024 / 1024).toFixed(1);
        toast.success(optimized.size < file.size ? `Uploaded (resized to ${sizeMB} MB)` : 'Uploaded');
        await loadAssets();
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Choose an Asset</span>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload New
            </Button>
          </DialogTitle>
        </DialogHeader>
        <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No assets yet. Upload an image to get started.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1">
            {assets.map(asset => (
              <button
                key={asset.name}
                className="group relative rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                onClick={() => { onSelect(asset.url); onOpenChange(false); }}
              >
                <img src={asset.url} alt={asset.name} className="w-full h-20 object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Check className="h-5 w-5 text-primary-foreground drop-shadow" />
                </div>
                <p className="text-[10px] truncate px-1 py-0.5 text-muted-foreground">{asset.name}</p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
