import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Camera, Paperclip, Mic, MicOff, X, Image as ImageIcon, Vault } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import QuinnModeChips, { type QuinnMode } from "./QuinnModeChips";
import QuinnProjectChip, { type QuinnProject } from "./QuinnProjectChip";
import { BloomCoachQuickTopics } from "./BloomCoachQuickTopics";

interface PendingImage {
  signedUrl: string;        // Time-limited URL Bloom can fetch (private bucket)
  storagePath: string;      // <uid>/<timestamp>-<filename>
  fileName: string;
  size: number;
  mimeType: string;
  vaultItemId?: string;     // vault_items row id (for later linking)
}

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB each
const SIGNED_URL_TTL = 60 * 60 * 24;    // 24h — long enough for the chat turn

interface BloomCoachInputProps {
  chatInput: string;
  setChatInput: (value: string) => void;
  onSendMessage: (text?: string, imageUrls?: string[]) => void;
  onSelectTopic?: (text: string) => void;
  isLoading: boolean;
  mode: QuinnMode;
  onModeChange: (m: QuinnMode) => void;
  project: QuinnProject | null;
  onProjectChange: (p: QuinnProject | null) => void;
  privateMode?: boolean;
  onOpenVault?: () => void;
}

export function BloomCoachInput({
  chatInput,
  setChatInput,
  onSendMessage,
  onSelectTopic,
  isLoading,
  mode,
  onModeChange,
  project,
  onProjectChange,
  privateMode = false,
  onOpenVault,
}: BloomCoachInputProps) {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (!user) {
      toast.error("Please sign in to upload images");
      return;
    }

    const incoming = Array.from(files);
    const remaining = MAX_IMAGES - pendingImages.length;
    if (remaining <= 0) {
      toast.error(`Up to ${MAX_IMAGES} images per message`);
      return;
    }

    const slice = incoming.slice(0, remaining);
    if (incoming.length > remaining) {
      toast.warning(`Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed (max ${MAX_IMAGES} per message)`);
    }

    setIsUploading(true);
    try {
      const uploaded: PendingImage[] = [];

      for (const file of slice) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: only image files supported`);
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          toast.error(`${file.name}: must be under 5MB`);
          continue;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

        // 1. Upload to private quinn-vault bucket
        const { error: upErr } = await supabase.storage
          .from("quinn-vault")
          .upload(storagePath, file, { upsert: false, contentType: file.type });
        if (upErr) {
          console.error("Vault upload failed:", upErr);
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }

        // 2. Generate signed URL Bloom can fetch (private bucket)
        const { data: signed, error: signErr } = await supabase.storage
          .from("quinn-vault")
          .createSignedUrl(storagePath, SIGNED_URL_TTL);
        if (signErr || !signed?.signedUrl) {
          toast.error(`Could not link ${file.name}`);
          continue;
        }

        // 3. Record in vault_items (skip in private mode — leaves no trace)
        let vaultItemId: string | undefined;
        if (!privateMode) {
          const { data: itemRow, error: itemErr } = await supabase
            .from("vault_items")
            .insert({
              user_id: user.id,
              storage_path: storagePath,
              file_name: file.name,
              mime_type: file.type,
              size_bytes: file.size,
              project_id: project?.id ?? null,
            })
            .select("id")
            .single();
          if (itemErr) {
            console.error("Vault metadata insert failed:", itemErr);
          } else {
            vaultItemId = itemRow.id;
          }
        }

        uploaded.push({
          signedUrl: signed.signedUrl,
          storagePath,
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
          vaultItemId,
        });
      }

      if (uploaded.length) {
        setPendingImages(prev => [...prev, ...uploaded]);
        toast.success(
          `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} ${privateMode ? "attached" : "saved to Vault"}`
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removePending = (idx: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    const text = chatInput.trim();
    if ((!text && pendingImages.length === 0) || isLoading) return;

    const messageText = pendingImages.length > 0
      ? (text || (pendingImages.length === 1 ? "Analyze this image" : `Analyze these ${pendingImages.length} images`))
      : text;

    const urls = pendingImages.map(p => p.signedUrl);
    onSendMessage(messageText, urls);
    setPendingImages([]);
  };

  const handleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setChatInput((chatInput ? chatInput + " " : "") + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Could not recognize speech. Try again.");
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const slotsLeft = MAX_IMAGES - pendingImages.length;

  return (
    <div className="relative z-10 px-3 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[hsl(160_24%_3%)] via-[hsl(160_22%_4%/0.92)] to-transparent border-t border-[hsl(var(--quinn-champagne))]/15 shadow-[0_-12px_40px_-12px_hsl(160_60%_4%/0.8)]">
      {/* Champagne hairline above input area */}
      <div className="quinn-divider mb-3" />

      {/* Preview strip — review images before sending */}
      {pendingImages.length > 0 && (
        <div className="mb-2 quinn-glass rounded-2xl p-2.5 ring-1 ring-[hsl(var(--quinn-champagne))]/20">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] font-bold tracking-widest text-champagne/85 inline-flex items-center gap-1.5">
              <Vault className="h-3 w-3" />
              {pendingImages.length}/{MAX_IMAGES} {privateMode ? "ATTACHED" : "READY TO SEND"}
            </span>
            <button
              onClick={() => setPendingImages([])}
              className="text-[10px] font-medium text-muted-foreground/80 hover:text-destructive transition-colors px-2 py-0.5 rounded-full hover:bg-destructive/10"
            >
              Clear all
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 snap-x snap-mandatory scrollbar-thin">
            {pendingImages.map((img, idx) => (
              <div
                key={img.storagePath}
                className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 snap-start group"
              >
                <img
                  src={img.signedUrl}
                  alt={img.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Remove button — always visible on mobile */}
                <button
                  onClick={() => removePending(idx)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/80 backdrop-blur text-white flex items-center justify-center ring-1 ring-white/20 active:scale-90 transition-transform"
                  aria-label={`Remove ${img.fileName}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                {/* Index badge */}
                <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-black/60 backdrop-blur px-1.5 py-0.5 rounded-md tabular-nums">
                  {idx + 1}
                </span>
              </div>
            ))}
            {/* Add more tile */}
            {slotsLeft > 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-white/15 hover:border-champagne/50 hover:bg-white/[0.03] flex flex-col items-center justify-center gap-1 text-muted-foreground/60 hover:text-champagne transition-all active:scale-95"
                aria-label="Add more images"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-[9px] font-semibold tracking-wider">+{slotsLeft} MORE</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Command Center: Quick Topics + Project + Mode chips above input. */}
      <div className="quinn-chip-row flex items-center justify-center gap-2 mb-2">
        {onSelectTopic && <BloomCoachQuickTopics onSelectTopic={onSelectTopic} />}
        <QuinnProjectChip activeProject={project} onProjectChange={onProjectChange} />
        <QuinnModeChips activeMode={mode} onSelect={onModeChange} />
      </div>

      {/* Input pill — luxury glass */}
      <div className="quinn-glass-strong flex items-center gap-1.5 rounded-full px-2 py-1 ring-1 ring-[hsl(var(--quinn-emerald))]/15 focus-within:ring-[hsl(var(--quinn-emerald))]/40 transition-all">
        {/* Camera */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading || slotsLeft <= 0}
          title={slotsLeft <= 0 ? `Max ${MAX_IMAGES} images` : "Take photo or choose from gallery"}
        >
          <Camera className="h-4 w-4" />
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Attachment — multi-select */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || slotsLeft <= 0}
          title={slotsLeft <= 0 ? `Max ${MAX_IMAGES} images` : `Attach images (up to ${slotsLeft} more)`}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Text input */}
        <input
          type="text"
          placeholder={
            pendingImages.length > 0
              ? `Add a message about ${pendingImages.length === 1 ? "this image" : "these images"}...`
              : privateMode
                ? "Speak freely. Nothing is recorded."
                : "Message Bloom..."
          }
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={isLoading}
          className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
        />

        {/* Mic */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 shrink-0 rounded-full ${
            isListening
              ? "text-destructive animate-pulse"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
          onClick={handleMic}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* Send — emerald gradient with glow */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isLoading || (!chatInput.trim() && pendingImages.length === 0)}
          className="h-9 w-9 shrink-0 rounded-full bg-emerald-grad hover:opacity-90 ring-emerald-glow border-0"
        >
          {isLoading || isUploading ? (
            <Loader2 className="h-4 w-4 text-[hsl(160,30%,8%)] animate-spin" />
          ) : (
            <Send className="h-4 w-4 text-[hsl(160,30%,8%)]" strokeWidth={2.5} />
          )}
        </Button>
      </div>
      <p className="text-center text-[9px] text-muted-foreground/40 pt-1.5 tracking-wider">
        Educational info, not financial advice
      </p>
    </div>
  );
}
