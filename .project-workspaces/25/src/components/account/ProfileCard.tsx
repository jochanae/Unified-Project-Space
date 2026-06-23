import { useRef, useState, type ChangeEvent } from "react";
import { Loader2, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  userId: string;
  email: string | null | undefined;
  displayName: string;
  avatarUrl: string | null;
  onChange: (next: { displayName?: string; avatarUrl?: string | null }) => void;
};

export function ProfileCard({ userId, email, displayName, avatarUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "S";

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const nextUrl = urlData.publicUrl;
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: displayName, avatar_url: nextUrl });
      if (profErr) throw profErr;
      onChange({ avatarUrl: nextUrl });
      toast.success("Photo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === displayName) {
      setEditingName(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, display_name: trimmed, avatar_url: avatarUrl ?? null });
    if (error) {
      toast.error("Could not save name.");
      return;
    }
    onChange({ displayName: trimmed });
    setEditingName(false);
    toast.success("Name updated.");
  };

  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <Avatar className="h-20 w-20 border-2 border-gold/25">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-gold/10 font-display text-xl tracking-[0.2em] text-gold-soft">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-obsidian/70 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Upload photo"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gold-soft" />
            ) : (
              <Upload className="h-5 w-5 text-gold-soft" />
            )}
          </button>
        </div>

        {editingName ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <input
              autoFocus
              aria-label="Display name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="flex-1 rounded-md border border-gold/25 bg-obsidian/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold/50 transition-colors text-center"
            />
            <button
              onClick={handleSaveName}
              className="rounded-md bg-gold/90 hover:bg-gold text-obsidian px-3 py-2"
              aria-label="Save name"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => {
                setNameInput(displayName);
                setEditingName(true);
              }}
              className="font-display text-2xl text-foreground hover:text-gold-soft transition-colors"
              title="Tap to edit name"
            >
              {displayName}
            </button>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Tap name to edit</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground/70">{email}</p>
      </div>
    </div>
  );
}
