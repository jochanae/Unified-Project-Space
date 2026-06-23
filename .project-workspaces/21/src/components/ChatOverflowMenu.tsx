/**
 * ChatOverflowMenu — the 3-dot overflow menu and call button in the chat header.
 * Extracted from ChatInterface to keep the parent component focused on message logic.
 */

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, Search, RotateCcw, Brain, Gift, History, Download, FileText, ChevronDown, Loader2, Sparkles, Phone, Crown, Flame, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import MessageProgressRing from './MessageProgressRing';

interface ChatOverflowMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribed: boolean;
  usageLimits: { loading: boolean; messagesRemaining: number };
  showSearch: boolean;
  onToggleSearch: () => void;
  onRefetch: () => Promise<void>;
  onOpenMemory: () => void;
  onOpenHistory: () => void;
  isChatWithCompanion: boolean;
  downloadExpanded: boolean;
  onToggleDownload: () => void;
  downloadLoading: boolean;
  extractLoading: boolean;
  onDownloadSession: () => void;
  onDownloadFull: () => void;
  onExtractSave: () => void;
  connectionAvatarUrl: string;
  onStartVoiceCall: () => void;
  onPreviewPortrait: () => void;
  voiceBlocked?: boolean;
  premiumCapReached?: boolean;
  voiceMinutesResetAt?: string;
  showFlameOption?: boolean;
  onActivateFlame?: () => void;
  onOpenArtifacts: () => void;
  artifactCount?: number;
  hasNewArtifact?: boolean;
}

export default function ChatOverflowMenu({
  open, onOpenChange, subscribed, usageLimits, showSearch, onToggleSearch,
  onRefetch, onOpenMemory, onOpenHistory, isChatWithCompanion,
  downloadExpanded, onToggleDownload, downloadLoading, extractLoading,
  onDownloadSession, onDownloadFull, onExtractSave,
  connectionAvatarUrl, onStartVoiceCall, onPreviewPortrait, voiceBlocked, premiumCapReached, voiceMinutesResetAt, showFlameOption, onActivateFlame,
  onOpenArtifacts, artifactCount = 0, hasNewArtifact = false,
}: ChatOverflowMenuProps) {
  const navigate = useNavigate();

  return (
    <>
      <Popover open={open} onOpenChange={(o) => { onOpenChange(o); }}>
        <PopoverTrigger asChild>
          <button title="More options" className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors shrink-0">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-56 p-0 rounded-xl overflow-hidden">
          {!subscribed && !usageLimits.loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-border/50">
              <MessageProgressRing remaining={usageLimits.messagesRemaining} total={30} />
              <span className="text-xs text-muted-foreground">{usageLimits.messagesRemaining} messages left</span>
            </div>
          )}
          <button onClick={() => { onToggleSearch(); onOpenChange(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors">
            <Search className="h-4 w-4 text-muted-foreground" />
            Search messages
          </button>
          <button onClick={async () => {
              onOpenChange(false);
              toast.loading('Refreshing…', { id: 'chat-refresh' });
              await onRefetch();
              toast.success('Messages updated', { id: 'chat-refresh', duration: 1500 });
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/50">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            Refresh messages
          </button>
          <button onClick={() => { onOpenMemory(); onOpenChange(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/50">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Connection Memory
          </button>
          {isChatWithCompanion && (
            <button onClick={() => { navigate('/store'); onOpenChange(false); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/50">
              <Gift className="h-4 w-4 text-muted-foreground" />
              Gift Shop
            </button>
          )}
          <button onClick={() => { onOpenArtifacts(); onOpenChange(false); }}
            className="flex w-full items-center justify-between gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/50">
            <span className="flex items-center gap-2.5">
              <Bookmark className={cn("h-4 w-4", hasNewArtifact ? "text-primary fill-primary/20" : "text-muted-foreground")} />
              The Workbench
            </span>
            {artifactCount > 0 && (
              <span className="text-[10px] text-muted-foreground/70">{artifactCount}</span>
            )}
          </button>
          {subscribed && (
            <button onClick={() => { onOpenHistory(); onOpenChange(false); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/50">
              <History className="h-4 w-4 text-muted-foreground" />
              Chat history
            </button>
          )}
          {showFlameOption && (
            <button onClick={() => { onActivateFlame?.(); onOpenChange(false); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/50">
              <Flame className="h-4 w-4 text-orange-400" />
              Turn on 🔥 Flame
            </button>
          )}
          <div className="border-t border-border/50">
            <button onClick={onToggleDownload}
              className="flex w-full items-center justify-between gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors">
              <span className="flex items-center gap-2.5">
                {downloadLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Download className="h-4 w-4 text-muted-foreground" />}
                Download chat
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", downloadExpanded && "rotate-180")} />
            </button>
            {downloadExpanded && (
              <div className="border-t border-border/50 bg-muted/30">
                <button onClick={() => { onDownloadSession(); onOpenChange(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 pl-8 text-left text-sm text-foreground hover:bg-secondary transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  This conversation
                </button>
                <button onClick={() => { onDownloadFull(); onOpenChange(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 pl-8 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/30">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  Full history
                </button>
                <button onClick={() => { onExtractSave(); onOpenChange(false); }} disabled={extractLoading}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 pl-8 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/30 disabled:opacity-50">
                  {extractLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Sparkles className="h-4 w-4 text-muted-foreground" />}
                  ✨ Extract & save
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {isChatWithCompanion && (
        voiceBlocked ? (
          <div className="flex flex-col items-center shrink-0">
            <button
              title={premiumCapReached ? 'Monthly voice limit reached' : 'Upgrade to Premium for voice calls'}
              className="rounded-full p-2 text-muted-foreground/40 cursor-not-allowed"
              onClick={() => !premiumCapReached && navigate('/pricing')}
            >
              <Phone className="h-5 w-5" />
            </button>
            {premiumCapReached && voiceMinutesResetAt && (
              <span className="text-[10px] text-muted-foreground/60 -mt-0.5">
                Resets {new Date(voiceMinutesResetAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <button title="Call" className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors shrink-0">
                <Phone className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-52 p-0 rounded-xl overflow-hidden">
              <button onClick={onStartVoiceCall}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Voice Call
              </button>
              {connectionAvatarUrl && (
                <button onClick={onPreviewPortrait}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-t border-border/50">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Preview Living Portrait
                </button>
              )}
            </PopoverContent>
          </Popover>
        )
      )}
    </>
  );
}
