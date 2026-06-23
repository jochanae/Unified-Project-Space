import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Headphones,
  RotateCcw,
  Play,
  ChevronDown,
  Highlighter,
  Download,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSkeleton } from "@/components/ui/page-skeletons";
import { useVoiceSettings, applyVoiceSettings } from "@/hooks/useVoiceSettings";
import { useHighlightsEnabled } from "@/hooks/useHighlightsEnabled";
import { downloadThemeSnapshot } from "@/lib/theme-export";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/reading")({
  head: () => ({
    meta: [
      { title: "Reading Preferences — SanctumIQ" },
      { name: "description", content: "Translation, font size, and voice preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReadingSettingsPage,
});

const PREVIEW_VERSE =
  "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures.";

function VoiceSettingsPanel() {
  const { settings, update, reset, voices, selectedVoice } = useVoiceSettings();
  const [previewing, setPreviewing] = useState(false);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const handlePreview = useCallback(() => {
    if (!supported || previewing) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(PREVIEW_VERSE);
    applyVoiceSettings(utterance, settings);
    utterance.onstart = () => setPreviewing(true);
    utterance.onend = () => setPreviewing(false);
    utterance.onerror = () => setPreviewing(false);
    window.speechSynthesis.speak(utterance);
  }, [settings, supported, previewing]);

  const stopPreview = useCallback(() => {
    window.speechSynthesis.cancel();
    setPreviewing(false);
  }, []);

  if (!supported) {
    return (
      <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6">
        <p className="text-sm text-muted-foreground/60 italic">
          Voice narration is not supported in this browser. Try Chrome, Safari, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Headphones className="h-5 w-5 text-gold" strokeWidth={1.5} />
          <p className="font-display text-sm text-gold-soft">Voice Narration</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/50 hover:text-gold-soft transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Voice picker */}
      {voices.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/60">
            Voice
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setVoicePickerOpen((v) => !v)}
              className="w-full flex items-center justify-between hairline rounded-xl bg-background/20 px-4 py-3 text-sm text-foreground/85 hover:bg-gold/5 transition-colors"
            >
              <span className="truncate">{selectedVoice?.name ?? "Browser default"}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform",
                  voicePickerOpen && "rotate-180",
                )}
              />
            </button>
            {voicePickerOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 max-h-56 overflow-y-auto hairline rounded-xl bg-[rgba(12,12,12,0.97)] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <button
                  type="button"
                  onClick={() => {
                    update({ voiceURI: "" });
                    setVoicePickerOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gold/8",
                    settings.voiceURI === "" ? "text-gold-soft" : "text-foreground/75",
                  )}
                >
                  Browser default
                </button>
                {voices.map((v) => (
                  <button
                    key={v.voiceURI}
                    type="button"
                    onClick={() => {
                      update({ voiceURI: v.voiceURI });
                      setVoicePickerOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm border-t border-gold/8 transition-colors hover:bg-gold/8",
                      settings.voiceURI === v.voiceURI ? "text-gold-soft" : "text-foreground/75",
                    )}
                  >
                    <span className="block truncate">{v.name}</span>
                    <span className="text-[10px] text-muted-foreground/40">{v.lang}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/45 leading-relaxed">
            Neural, enhanced, or premium voices sound significantly more natural. Look for those
            labels in the list.
          </p>
        </div>
      )}

      {/* Speed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/60">
            Speed
          </label>
          <span className="text-[11px] font-mono text-gold/70">{settings.rate.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={1.2}
          step={0.01}
          value={settings.rate}
          onChange={(e) => update({ rate: parseFloat(e.target.value) })}
          className="w-full accent-gold h-1 rounded-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/35 uppercase tracking-[0.15em]">
          <span>Slow</span>
          <span>Fast</span>
        </div>
      </div>

      {/* Pitch */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/60">
            Pitch
          </label>
          <span className="text-[11px] font-mono text-gold/70">{settings.pitch.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.7}
          max={1.2}
          step={0.01}
          value={settings.pitch}
          onChange={(e) => update({ pitch: parseFloat(e.target.value) })}
          className="w-full accent-gold h-1 rounded-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/35 uppercase tracking-[0.15em]">
          <span>Deep</span>
          <span>High</span>
        </div>
      </div>

      {/* Preview */}
      <div className="pt-2 border-t border-gold/10">
        <button
          type="button"
          onClick={previewing ? stopPreview : handlePreview}
          className={cn(
            "w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm transition-colors",
            previewing
              ? "border border-gold/30 bg-gold/10 text-gold-soft"
              : "border border-gold/20 bg-background/20 text-muted-foreground hover:bg-gold/8 hover:text-gold-soft",
          )}
        >
          <Play className={cn("h-4 w-4", previewing && "animate-pulse")} strokeWidth={1.5} />
          {previewing ? "Stop preview" : "Preview voice"}
        </button>
        <p className="text-[11px] text-muted-foreground/35 text-center mt-2 italic font-display">
          &ldquo;The LORD is my shepherd; I shall not want.&rdquo;
        </p>
      </div>
    </div>
  );
}

function HighlightsTogglePanel() {
  const [enabled, setEnabled] = useHighlightsEnabled();
  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6">
      <div className="flex items-start gap-3">
        <Highlighter className="h-5 w-5 text-gold mt-0.5" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm text-gold-soft">Show highlights</p>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Toggle highlights" />
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Controls saved verse highlights in the reader and matched-term highlighting in search.
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemeExportPanel() {
  const handleExport = useCallback(() => {
    try {
      downloadThemeSnapshot();
      toast.success("Theme snapshot downloaded");
    } catch (e) {
      toast.error("Couldn't export theme", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }, []);

  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6">
      <div className="flex items-start gap-3">
        <Download className="h-5 w-5 text-gold mt-0.5" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm text-gold-soft">Export theme snapshot</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Download every live design token as a self-contained{" "}
            <code className="text-gold/80">.css</code> file.
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/8 px-4 py-2 text-sm text-gold-soft hover:bg-gold/15 hover:text-gold transition-colors"
          >
            <Download className="h-4 w-4" />
            Download sanctumiq-theme.css
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadingSettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <LoadingAppShell pageTitle="Reading Settings">
        <SettingsSkeleton text="Fetching reading preferences…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Reading Preferences"
        title="Read the way you read best"
        description="Sign in to personalize translation, font size, and voice."
        redirectTo="/settings/reading"
      />
    );
  }

  return (
    <AppShell pageTitle="Reading Settings">
      <div className="mx-auto max-w-lg px-6 py-8 space-y-6">
        {/* Translation & theme — coming soon */}
        <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-gold mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-display text-sm text-gold-soft">Translation, type & theme</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Set your preferred translation, font size, and reader theme — coming soon.
              </p>
            </div>
          </div>
        </div>

        {/* Highlights toggle */}
        <HighlightsTogglePanel />

        {/* Voice settings */}
        <VoiceSettingsPanel />

        {/* Theme snapshot export */}
        <ThemeExportPanel />
      </div>
    </AppShell>
  );
}
