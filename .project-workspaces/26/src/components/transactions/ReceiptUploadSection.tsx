import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReceiptUploadSectionProps {
  receiptUrl: string | null;
  onReceiptChange: (url: string | null) => void;
  disabled?: boolean;
}

export const ReceiptUploadSection = ({
  receiptUrl,
  onReceiptChange,
  disabled = false,
}: ReceiptUploadSectionProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(receiptUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Supabase storage
      const fileName = `${user.id}/temp_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      onReceiptChange(urlData.publicUrl);
      toast.success("Receipt uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload receipt");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onReceiptChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Camera className="h-4 w-4" />
        <span>Attach Receipt</span>
        <span className="text-muted-foreground text-xs">(Optional)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border bg-muted/30">
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="w-full h-32 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="h-4 w-4" />
          </Button>
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-16 flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span className="text-xs">Take Photo</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-16 flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload</span>
              </>
            )}
          </Button>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Supported: JPG, PNG, HEIC • Max 5MB
      </p>
    </div>
  );
};
