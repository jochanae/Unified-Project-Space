import { useRef, useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  /** Storage bucket — defaults to public 'marketing-assets'. */
  bucket?: 'marketing-assets' | 'avatars';
  /** Optional folder prefix inside the bucket. */
  folder?: string;
  maxSizeMB?: number;
}

/**
 * Image input that accepts BOTH a direct upload and a pasted URL.
 * Uploads to a public bucket and writes the public URL into the field.
 */
export function ImageUploadField({
  value,
  onChange,
  placeholder = 'https://…/image.png',
  bucket = 'marketing-assets',
  folder,
  maxSizeMB = 5,
}: ImageUploadFieldProps) {
  const { user } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.orgId) { toast.error('Sign in required'); return; }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Max file size: ${maxSizeMB} MB`); return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const prefix = folder ? `${folder}/` : '';
      const path = `${user.orgId}/${prefix}${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">Upload</span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-16 w-16 rounded-md object-cover border border-border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1 -right-1 bg-background border border-border rounded-full p-0.5 hover:bg-muted"
            aria-label="Clear image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
