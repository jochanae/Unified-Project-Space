import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string | null;
  title: string;
}

export function VideoPlayerModal({ open, onOpenChange, videoUrl, title }: VideoPlayerModalProps) {
  const getEmbedUrl = (url: string | null) => {
    if (!url) return null;
    
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
    
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black border-0 overflow-hidden">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {embedUrl ? (
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center bg-[#1a1a2e]">
              <p className="text-white/60">Video not available</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-[#1a1a2e]">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      </DialogContent>
    </Dialog>
  );
}
