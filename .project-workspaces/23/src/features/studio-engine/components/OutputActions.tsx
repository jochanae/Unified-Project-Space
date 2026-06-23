/**
 * OutputActions — Download / Copy URL / Open in Studio.
 * Used inline under both /studio renders and MarQ chat images.
 */

import { Download, Link2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Props {
  imageUrl: string;
  filename?: string;
  showOpenInStudio?: boolean;
}

export function OutputActions({ imageUrl, filename = 'studio-asset.png', showOpenInStudio }: Props) {
  const navigate = useNavigate();

  const download = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        onClick={download}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/40 px-2.5 py-1.5 hover:bg-muted/40"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </button>
      <button
        onClick={copyUrl}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/40 px-2.5 py-1.5 hover:bg-muted/40"
      >
        <Link2 className="h-3.5 w-3.5" /> Copy URL
      </button>
      {showOpenInStudio ? (
        <button
          onClick={() => navigate(`/studio?asset=${encodeURIComponent(imageUrl)}`)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/40 px-2.5 py-1.5 hover:bg-muted/40"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Open in Studio
        </button>
      ) : null}
    </div>
  );
}
