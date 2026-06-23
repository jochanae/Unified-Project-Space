import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Settings, Lock, Unlock, Sparkles, FolderOpen, Brain } from "lucide-react";
import { motion } from "framer-motion";

const VAULT_HINT_KEY = "quinn_vault_hint_dismissed_v1";

interface BloomCoachHeaderProps {
  onClose: () => void;
  onNewChat: () => void;
  onOpenVault: () => void;
  onOpenSettings: () => void;
  onOpenShredder?: () => void;
  privateMode?: boolean;
  onTogglePrivate?: () => void;
}

export function BloomCoachHeader({
  onClose,
  onNewChat,
  onOpenVault,
  onOpenSettings,
  onOpenShredder,
  privateMode = false,
  onTogglePrivate,
}: BloomCoachHeaderProps) {
  const [vaultHintDismissed, setVaultHintDismissed] = useState(true);
  useEffect(() => {
    try { setVaultHintDismissed(localStorage.getItem(VAULT_HINT_KEY) === "1"); } catch {}
  }, []);
  const handleOpenVault = () => {
    if (!vaultHintDismissed) {
      try { localStorage.setItem(VAULT_HINT_KEY, "1"); } catch {}
      setVaultHintDismissed(true);
    }
    onOpenVault();
  };
  return (
    <div className="quinn-glass-strong relative z-10 px-3.5 py-2.5 border-b border-[hsl(var(--quinn-glass-border))]">
      <div className="flex items-center justify-between gap-3">
        {/* Far Left: Back arrow → Avatar + identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-champagne hover:text-champagne hover:bg-white/5 shrink-0 transition-all hover:shadow-[0_0_10px_hsl(var(--quinn-champagne)/0.35)]"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </Button>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative h-10 w-10 rounded-full bg-emerald-grad flex items-center justify-center shrink-0 ring-1 ring-[hsl(var(--quinn-champagne)/0.55)] shadow-[0_0_14px_hsl(var(--quinn-champagne)/0.25)]"
          >
            <Sparkles className="h-4 w-4 text-[hsl(160,30%,8%)]" strokeWidth={2.5} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--quinn-emerald))] ring-2 ring-[hsl(160,22%,5%)] animate-pulse-soft" />
          </motion.div>

          <div className="flex flex-col min-w-0 leading-tight">
            <h1 className="text-[16px] font-semibold text-foreground tracking-tight">
              {privateMode ? "Think Freely" : "Bloom"}
            </h1>
            <span className={`text-[11px] font-normal tracking-wide truncate transition-colors ${privateMode ? "text-champagne/80" : "text-muted-foreground/80"}`}>
              {privateMode ? "Private session" : "Financial Architect"}
            </span>
          </div>
        </div>

        {/* Right: Executive Row — Privacy · Vault · Settings · New · Close */}
        <div className="flex items-center gap-0.5 shrink-0 [&_button]:transition-all [&_button:hover]:shadow-[0_0_10px_hsl(var(--quinn-champagne)/0.35)]">
          {onTogglePrivate && (
            <Button variant="ghost" size="icon" onClick={onTogglePrivate}
              className={`h-8 w-8 rounded-full hover:bg-white/5 transition-all duration-300 ${
                privateMode
                  ? "text-champagne bg-champagne/10 ring-1 ring-champagne/50 shadow-[0_0_12px_hsl(var(--quinn-champagne)/0.45)]"
                  : "text-foreground/60 hover:text-champagne"
              }`}
              title={privateMode ? "Exit private mode" : "Enter private mode"}>
              {privateMode
                ? <Lock className="h-[18px] w-[18px] animate-in zoom-in-50 duration-300" strokeWidth={2.6} />
                : <Unlock className="h-[18px] w-[18px] animate-in zoom-in-50 duration-300" strokeWidth={2.2} />}
            </Button>
          )}
          {onOpenShredder && (
            <Button variant="ghost" size="icon" onClick={onOpenShredder}
              className="h-8 w-8 rounded-full text-foreground/70 hover:text-champagne hover:bg-white/5"
              title="Mental Shredder — turn anxious thoughts into structure">
              <Brain className="h-4 w-4" strokeWidth={2.4} />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleOpenVault}
            className="relative h-8 w-8 rounded-full text-foreground/70 hover:text-champagne hover:bg-white/5"
            title="Bloom Vault — Plans, Saved & Chat History">
            <FolderOpen className="h-4 w-4" strokeWidth={2.4} />
            {!vaultHintDismissed && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[hsl(var(--quinn-champagne))] animate-pulse-soft ring-2 ring-[hsl(160,22%,5%)]" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onOpenSettings}
            className="h-8 w-8 rounded-full text-foreground/70 hover:text-champagne hover:bg-white/5" title="Settings">
            <Settings className="h-4 w-4" strokeWidth={2.4} />
          </Button>
          {/* Utility zone */}
          <Button variant="ghost" size="icon" onClick={onNewChat}
            className="h-8 w-8 rounded-full text-foreground/70 hover:text-champagne hover:bg-white/5" title="New Chat">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
          </Button>
        </div>
      </div>
    </div>
  );
}
