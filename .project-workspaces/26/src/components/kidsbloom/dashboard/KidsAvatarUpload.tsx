import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const KID_AVATAR_BUCKET = "kid-avatars";

// Extracts the storage path from either a stored path (`{kidId}/file.png`)
// or a legacy public URL pointing at the old `avatars` bucket.
function extractKidAvatarPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const marker = `/storage/v1/object/public/avatars/`;
  if (value.includes(marker)) return null; // legacy public URL — render directly
  const privateMarker = `/storage/v1/object/`;
  if (value.startsWith("http") && !value.includes(privateMarker)) return null;
  if (value.startsWith("http")) {
    const idx = value.indexOf(`/${KID_AVATAR_BUCKET}/`);
    if (idx === -1) return null;
    return value.substring(idx + KID_AVATAR_BUCKET.length + 2);
  }
  return value; // already a storage path
}
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface KidsAvatarUploadProps {
  kidId: string;
  currentUrl?: string | null;
  avatarEmoji?: string | null;
  displayName?: string;
  variant: "playful" | "modern";
  isDarkMode?: boolean;
  onUpload: (url: string) => void;
}

export function KidsAvatarUpload({
  kidId,
  currentUrl,
  avatarEmoji,
  displayName,
  variant,
  isDarkMode = false,
  onUpload,
}: KidsAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPlayful = variant === "playful";

  // Resolve a signed URL when the stored value is a private kid-avatars path
  useEffect(() => {
    let cancelled = false;
    const path = extractKidAvatarPath(currentUrl);
    if (!path) {
      setSignedUrl(null);
      return;
    }
    supabase.storage
      .from(KID_AVATAR_BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUrl]);

  const displayUrl = signedUrl || currentUrl || undefined;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(isPlayful ? "That's not a picture! 📷" : "Please select an image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isPlayful ? "Picture too big! Try a smaller one 🖼️" : "File must be under 5MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      // Path MUST start with `{kidId}/` — RLS policy enforces this
      const filePath = `${kidId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(KID_AVATAR_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      // Store the storage PATH (not a public URL) for the private bucket
      const { error: updateError } = await supabase
        .from("kids_profiles")
        .update({ avatar_url: filePath })
        .eq("id", kidId);

      if (updateError) {
        console.error("Failed to save avatar path to profile:", updateError);
        throw new Error("Failed to save photo to profile");
      }

      // Generate signed URL for immediate display
      const { data: signed } = await supabase.storage
        .from(KID_AVATAR_BUCKET)
        .createSignedUrl(filePath, 3600);

      if (signed?.signedUrl) setSignedUrl(signed.signedUrl);
      onUpload(filePath);
      toast.success(isPlayful ? "New picture! Looking good! ✨" : "Avatar updated!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(isPlayful ? "Oops! Try again! 🙈" : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    try {
      // Best-effort delete from storage if it's a private path
      const path = extractKidAvatarPath(currentUrl);
      if (path) {
        await supabase.storage.from(KID_AVATAR_BUCKET).remove([path]);
      }

      await supabase
        .from("kids_profiles")
        .update({ avatar_url: null })
        .eq("id", kidId);

      setSignedUrl(null);
      onUpload("");
      toast.success(isPlayful ? "Back to emoji! 😊" : "Photo removed");
    } catch (error) {
      toast.error("Failed to remove photo");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="h-24 w-24 shadow-lg">
          <AvatarImage src={displayUrl} className="object-cover w-full h-full" />
          <AvatarFallback className={`text-4xl ${
            isPlayful 
              ? "bg-gradient-to-br from-purple-200 to-pink-200" 
              : isDarkMode
                ? "bg-gradient-to-br from-indigo-600 to-violet-600"
                : "bg-gradient-to-br from-teal-200 to-emerald-200"
          }`}>
            {avatarEmoji || displayName?.[0] || "🌟"}
          </AvatarFallback>
        </Avatar>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <Button
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`absolute -bottom-1 -right-1 h-8 w-8 rounded-full ${
            isPlayful 
              ? "bg-purple-500 hover:bg-purple-600" 
              : isDarkMode
                ? "bg-violet-500 hover:bg-violet-600"
                : "bg-teal-500 hover:bg-teal-600"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Camera className="h-4 w-4 text-white" />
          )}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={isPlayful 
            ? "border-purple-300 text-purple-600 text-xs" 
            : isDarkMode
              ? "border-violet-500/30 text-white text-xs"
              : "border-teal-300 text-teal-700 bg-white/80 text-xs"
          }
        >
          {isPlayful ? "📷 New Photo" : "Upload Photo"}
        </Button>
        
        {currentUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            className={isPlayful 
              ? "text-purple-500 text-xs" 
              : isDarkMode
                ? "text-violet-400 text-xs"
                : "text-teal-600 text-xs"
            }
          >
            <X className="h-3 w-3 mr-1" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
