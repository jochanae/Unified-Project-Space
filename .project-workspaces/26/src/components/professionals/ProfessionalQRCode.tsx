import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Share2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";

interface ProfessionalQRCodeProps {
  professionalId: string;
  professionalName: string;
  variant?: "button" | "icon";
}

export function ProfessionalQRCode({ 
  professionalId, 
  professionalName,
  variant = "button" 
}: ProfessionalQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profileUrl = `${window.location.origin}/professionals/${professionalId}`;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(true);

  // Generate QR code using QR Server API
  useEffect(() => {
    const generateQR = async () => {
      setQrLoading(true);
      setCanvasReady(false);
      
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}&format=png`;
      
      try {
        const response = await fetch(qrImageUrl);
        const blob = await response.blob();
        const dataUrl = URL.createObjectURL(blob);
        setQrDataUrl(dataUrl);
        
        // Draw to canvas for download functionality
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              canvas.width = 300;
              canvas.height = 300;
              ctx.fillStyle = "white";
              ctx.fillRect(0, 0, 300, 300);
              ctx.drawImage(img, 0, 0, 300, 300);
              setCanvasReady(true);
            };
            img.onerror = () => {
              console.error("Failed to load QR image into canvas");
              setCanvasReady(false);
            };
            img.src = dataUrl;
          }
        }
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      } finally {
        setQrLoading(false);
      }
    };

    generateQR();
    
    return () => {
      if (qrDataUrl) {
        URL.revokeObjectURL(qrDataUrl);
      }
    };
  }, [profileUrl]);

  const handleShare = async () => {
    const success = await smartShare({
      url: profileUrl,
      title: `${professionalName} - CoinsBloom Professional`,
      text: `Check out ${professionalName}'s professional profile on CoinsBloom!`,
    });
    if (success && !supportsNativeShare()) {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    // If canvas isn't ready yet, wait for it
    if (!canvasReady) {
      setDownloading(true);
      
      // Try to generate the image directly from the QR URL
      try {
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}&format=png`;
        const response = await fetch(qrImageUrl);
        const blob = await response.blob();
        
        // Create download link from blob
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${professionalName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success("QR code downloaded!");
      } catch (error) {
        console.error("Download failed:", error);
        toast.error("Failed to download QR code");
      } finally {
        setDownloading(false);
      }
      return;
    }

    // Use canvas if ready
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const link = document.createElement("a");
      link.download = `${professionalName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("QR code downloaded!");
    } catch (error) {
      console.error("Canvas download failed:", error);
      toast.error("Failed to download QR code");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
        ) : (
          <Button variant="ghost" size="icon">
            <QrCode className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {professionalName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            {qrLoading ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-[200px] h-[200px]" />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Failed to load QR code
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Scan this QR code to view the professional profile page
          </p>

          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              readOnly
              value={profileUrl}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted truncate"
            />
            <Button variant="outline" size="icon" onClick={handleShare}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2 w-full">
            <Button onClick={handleDownload} className="flex-1" disabled={downloading || qrLoading}>
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PNG
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
