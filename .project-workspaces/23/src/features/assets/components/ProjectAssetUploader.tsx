import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Trash2, Copy, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Asset {
  name: string;
  url: string;
  created_at: string;
}

export function ProjectAssetUploader({ projectId }: { projectId: string }) {
  const { user, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const orgId = user?.orgId;
  const basePath = orgId ? `${orgId}/${projectId}` : null;

  const loadAssets = useCallback(async () => {
    if (!basePath) return;

    const { data, error } = await supabase.storage.from('project-assets').list(basePath, { limit: 50 });

    if (error) {
      toast.error(error.message);
      setAssets([]);
      setLoaded(true);
      return;
    }

    if (data) {
      const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');
      const signed = await Promise.all(
        files.map(async (f) => {
          const { data: s } = await supabase.storage
            .from('project-assets')
            .createSignedUrl(`${basePath}/${f.name}`, 60 * 60);
          return {
            name: f.name,
            url: s?.signedUrl || '',
            created_at: f.created_at || '',
          };
        }),
      );
      setAssets(signed.filter(a => a.url));
    }

    setLoaded(true);
  }, [basePath]);

  useEffect(() => {
    setAssets([]);
    setLoaded(false);

    if (!basePath) return;

    void loadAssets();
  }, [basePath, loadAssets]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!basePath) {
      toast.error('Workspace is still loading. Try again in a second.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size: 5MB'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('project-assets').upload(`${basePath}/${fileName}`, file);
    if (error) { toast.error(error.message); }
    else { toast.success('Asset uploaded'); await loadAssets(); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (name: string) => {
    if (!basePath) return;

    const { error } = await supabase.storage.from('project-assets').remove([`${basePath}/${name}`]);
    if (error) {
      toast.error(error.message);
      return;
    }

    setAssets(prev => prev.filter(a => a.name !== name));
    toast.success('Deleted');
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Project Assets
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || userLoading || !orgId}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload
          </Button>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*" onChange={handleUpload} />
        </div>
      </CardHeader>
      <CardContent>
        {userLoading || !loaded ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading assets…</p>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-xs text-muted-foreground text-center">No assets yet. Upload logos, images, or media files.</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => navigate('/logo-generator')}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate a Logo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {assets.map(asset => (
              <div key={asset.name} className="group relative rounded-lg overflow-hidden border border-border bg-muted/30">
                <img src={asset.url} alt={asset.name} className="w-full h-20 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => copyUrl(asset.url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => handleDelete(asset.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] truncate px-1 py-0.5 text-muted-foreground">{asset.name}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
