import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, X, RotateCcw, Check, SwitchCamera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UploadedFile } from './QuinnFileUpload';

interface QuinnCameraCaptureProps {
  onCapture: (file: UploadedFile) => void;
  disabled?: boolean;
}

export function QuinnCameraCapture({ onCapture, disabled }: QuinnCameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera. Please check permissions.');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
  }, [stream]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;

    // Convert data URL to File
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });

    const uploadedFile: UploadedFile = {
      id: crypto.randomUUID(),
      file,
      preview: capturedImage,
      type: 'image',
    };

    onCapture(uploadedFile);
    handleClose();
    toast.success('Photo captured!');
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Start camera when dialog opens
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
  }, [isOpen, facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Check if camera is supported
  const isCameraSupported = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  if (!isCameraSupported) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        disabled={disabled}
        title="Take a photo"
        className="shrink-0"
      >
        <Camera className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Take a Photo
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative aspect-[4/3] bg-black">
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Video preview or captured image */}
            {capturedImage ? (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover",
                    facingMode === 'user' && "scale-x-[-1]"
                  )}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Controls */}
          <div className="p-4 flex items-center justify-center gap-4">
            {capturedImage ? (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRetake}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
                <Button
                  size="lg"
                  onClick={handleConfirm}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Use Photo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCamera}
                  className="h-12 w-12"
                >
                  <SwitchCamera className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full"
                  onClick={handleCapture}
                  disabled={isLoading || !stream}
                >
                  <div className="h-12 w-12 rounded-full border-4 border-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-12 w-12"
                >
                  <X className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
