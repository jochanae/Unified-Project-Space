import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuinnChat, Message } from '@/hooks/useQuinnChat';
import { useQuinnUsage } from '@/hooks/useQuinnUsage';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useVoiceInput } from '@/hooks/useVoiceInputV2';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, User, UserCircle2, Loader2, Plus, Volume2, VolumeX, Mic, MicOff, Minimize2, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { QuinnExport } from './QuinnExport';
import { QuinnFileUpload, UploadedFile, fileToBase64 } from './QuinnFileUpload';
import { QuinnCameraCapture } from './QuinnCameraCapture';
import { QuinnHistory } from './QuinnHistory';
import { QuinnWelcome } from './QuinnWelcome';
import { QuinnMessageActions } from './QuinnMessageActions';
import { AddToPlanButton } from './AddToPlanButton';
import { ShareToCommunityButton } from './ShareToCommunityButton';
import { DeepDiveLinks, isDeepDiveCandidate } from './DeepDiveLinks';
import { DownloadMessageDoc } from './DownloadMessageDoc';
import { QuinnTopicsMenu } from './QuinnTopicsMenu';
import { QuinnProfileDialog } from './QuinnProfileDialog';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  isLoadingAudio?: boolean;
  conversationId?: string | null;
  onRetry?: () => void;
  isLastAssistantMessage?: boolean;
  precedingUserQuestion?: string;
}

function MessageBubble({ 
  message, 
  isStreaming, 
  onSpeak, 
  isSpeaking, 
  isLoadingAudio, 
  conversationId,
  onRetry,
  isLastAssistantMessage,
  precedingUserQuestion,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  // Check if message contains actionable content for Plan
  const hasActionableContent = !isUser && message.content.length > 50 && (
    /(?:should|could|might want to|consider|try to|start|build|create|set up|establish|emergency fund|budget|savings|investment|retirement|401k|ira|portfolio)/i.test(message.content)
  );
  
  // Check if message contains trade-related content that could be shared to community
  const hasShareableContent = !isUser && message.content.length > 100 && (
    /(?:bullish|bearish|buy|sell|long|short|entry|target|stop|support|resistance|breakout|pattern|analysis|trade idea|opportunity|\$[A-Z]{1,5}|[A-Z]{2,5}\s+(?:stock|option|call|put))/i.test(message.content)
  );

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%]',
          isUser
            ? 'rounded-3xl rounded-br-lg bg-primary text-primary-foreground px-4 py-2.5'
            : 'rounded-3xl rounded-tl-lg bg-muted/50 px-4 py-3'
        )}
      >
        {isUser ? (
          <div>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map((att, i) => (
                  <div key={i} className="rounded bg-primary-foreground/10 px-2 py-1 text-xs">
                    📎 {att.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-background/50 px-1.5 py-0.5 rounded text-sm">{children}</code>
                ),
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50 border-b border-border">{children}</thead>
                ),
                tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-muted-foreground">{children}</td>
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse rounded-sm" />
            )}
            
            {/* Speaker button */}
            {!isStreaming && message.content && onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                disabled={isLoadingAudio}
                className={cn(
                  "mt-2 p-1.5 rounded-full transition-colors",
                  isSpeaking 
                    ? "bg-primary/20 text-primary" 
                    : "hover:bg-background/50 text-muted-foreground hover:text-foreground",
                  isLoadingAudio && "opacity-50 cursor-not-allowed"
                )}
                title={isSpeaking ? "Stop speaking" : "Read aloud"}
              >
                {isLoadingAudio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSpeaking ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            )}
            
            {/* Message actions - show for all assistant messages */}
            {!isStreaming && message.content && (
              <QuinnMessageActions
                messageContent={message.content}
                messageId={message.id}
                onRetry={isLastAssistantMessage ? onRetry : undefined}
                showAddToPlan={false}
                showShareToCommunity={false}
              />
            )}
            
            {/* Add to Plan and Share to Community - visible inline */}
            {!isStreaming && message.content && (hasActionableContent || hasShareableContent) && (
              <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                {hasActionableContent && (
                  <AddToPlanButton
                    messageContent={message.content}
                    conversationId={conversationId}
                  />
                )}
                {hasShareableContent && (
                  <ShareToCommunityButton messageContent={message.content} />
                )}
              </div>
            )}
            
            {/* Deep dive links + download for substantive responses */}
            {!isStreaming && message.content && isDeepDiveCandidate(message.content) && (
              <div className="mt-2 pt-2 border-t border-border/30 space-y-2">
                {message.content.length >= 300 && (
                  <DownloadMessageDoc content={message.content} />
                )}
                <DeepDiveLinks messageContent={message.content} userQuestion={precedingUserQuestion} />
              </div>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  );
}

interface QuinnChatProps {
  onClose?: () => void;
  onMinimize?: () => void;
  /**
   * Used for internal navigation actions (e.g. "Learn") so Quinn doesn't stay open
   * over the destination page.
   */
  onNavigateAway?: () => void;
  showCloseButton?: boolean;
  /** When provided, this prompt is auto-sent on mount (used by topic links). */
  initialPrompt?: string | null;
}

export function QuinnChat({
  onClose,
  onMinimize,
  onNavigateAway,
  showCloseButton = true,
  initialPrompt,
}: QuinnChatProps) {
  const {
    messages,
    isLoading,
    conversationId,
    showUpgradeModal,
    setShowUpgradeModal,
    sendMessage,
    clearMessages,
    loadConversation,
    retryLastMessage,
  } = useQuinnChat();
  const usage = useQuinnUsage();
  const { speak, stop, isPlaying, isLoading: isLoadingAudio } = useTextToSpeech();
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedFile, setExpandedFile] = useState<UploadedFile | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNavigateAway = onNavigateAway ?? onMinimize ?? onClose;

  // Voice input hook
  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript,
    toggleListening,
    error: voiceError,
  } = useVoiceInput({
    onResult: (text) => {
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  // Update input with live transcript while listening
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [transcript, isListening]);

  // Auto-send initial prompt from navigation (e.g. topic links)
  const initialPromptSentRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && !initialPromptSentRef.current && !isLoading && messages.length === 0) {
      initialPromptSentRef.current = true;
      sendMessage(initialPrompt);
    }
  }, [initialPrompt, isLoading, messages.length, sendMessage]);

  // Track which message is being spoken
  const handleSpeak = (messageId: string, text: string) => {
    if (speakingMessageId === messageId && isPlaying) {
      stop();
      setSpeakingMessageId(null);
    } else {
      setSpeakingMessageId(messageId);
      speak(text);
    }
  };

  // Reset speaking state when audio stops
  useEffect(() => {
    if (!isPlaying && !isLoadingAudio) {
      setSpeakingMessageId(null);
    }
  }, [isPlaying, isLoadingAudio]);

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const scrollTimeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
      prevMessagesLengthRef.current = messages.length;
      return () => clearTimeout(scrollTimeout);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Refetch usage counter when a new conversation starts (messages go from 0 to >0)
  const prevMsgCountForUsage = useRef(0);
  useEffect(() => {
    if (prevMsgCountForUsage.current === 0 && messages.length > 0 && !usage.isPro) {
      // Delay to let backend upsert complete
      const t = setTimeout(() => usage.refetch(), 2000);
      return () => clearTimeout(t);
    }
    prevMsgCountForUsage.current = messages.length;
  }, [messages.length, usage.isPro]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    const attachments = await Promise.all(
      attachedFiles.map(async (f) => ({
        name: f.file.name,
        type: f.file.type,
        base64: await fileToBase64(f.file),
      }))
    );

    let messageContent = input.trim();
    if (attachments.length > 0 && !messageContent) {
      messageContent = `Please analyze the attached ${attachments.length === 1 ? 'file' : 'files'}.`;
    }

    sendMessage(messageContent, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCameraCapture = (file: UploadedFile) => {
    setAttachedFiles((prev) => [...prev, file].slice(0, 10));
  };

  // Find last assistant message index for retry functionality (ES5 compatible)
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantIndex = i;
      break;
    }
  }

  const showWelcome = messages.length === 0;

  const handleWelcomeAsk = (message: string) => {
    sendMessage(message);
  };

  const chatContent = (
    <div className="flex flex-col bg-background h-full overflow-hidden">
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Quinn</span>
          {/* Usage counter for free tier */}
          {!usage.isPro && !usage.isLoading && (
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                usage.isAtLimit
                  ? "bg-loss/15 text-loss"
                  : usage.conversationsUsed >= usage.conversationsLimit - 2
                    ? "bg-gold/15 text-gold"
                    : "bg-muted text-muted-foreground"
              )}
              title={`${usage.conversationsUsed}/${usage.conversationsLimit} free conversations used this month. Resets ${usage.resetDate}.`}
            >
              {usage.conversationsUsed}/{usage.conversationsLimit}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Topics Menu - recall topic suggestions anytime */}
          <QuinnTopicsMenu
            onAskQuinn={handleWelcomeAsk}
            onOpenProfile={() => setProfileOpen(true)}
            onNavigateAway={handleNavigateAway}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setProfileOpen(true)}
            title="Edit your profile"
            className="h-8 w-8"
          >
            <UserCircle2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            disabled={messages.length === 0}
            title="New conversation"
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <QuinnHistory
            onSelectConversation={loadConversation}
            currentConversationId={conversationId}
          />
          <QuinnExport messages={messages} disabled={messages.length === 0} />

          {/* Minimize button - shrink Quinn to FAB */}
          {onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize}
              title="Minimize Quinn"
              className="h-8 w-8"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}

          {/* Close button */}
          {showCloseButton && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close Quinn"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="p-4 sm:p-6">
          {showWelcome ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <QuinnWelcome onAskQuinn={handleWelcomeAsk} onNavigateAway={handleNavigateAway} />
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                  onSpeak={message.role === 'assistant' ? (text) => handleSpeak(message.id, text) : undefined}
                  isSpeaking={speakingMessageId === message.id && isPlaying}
                  isLoadingAudio={speakingMessageId === message.id && isLoadingAudio}
                  conversationId={conversationId}
                  onRetry={retryLastMessage}
                  isLastAssistantMessage={index === lastAssistantIndex}
                  precedingUserQuestion={
                    message.role === 'assistant' && index > 0 && messages[index - 1]?.role === 'user'
                      ? messages[index - 1].content
                      : undefined
                  }
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-3xl rounded-tl-lg bg-muted/50 px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - Clean floating pill style */}
      <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-border/30">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Attached files preview - separate row above input */}
          {attachedFiles.length > 0 && (
            <div className="-mx-1 px-1">
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto touch-pan-x py-1">
          {attachedFiles.map((file) => (
                   <div
                     key={file.id}
                     className="relative flex-none group"
                   >
                     {file.preview ? (
                       <img
                         src={file.preview}
                         alt={file.file.name}
                         className="h-12 w-12 rounded-lg object-cover border border-border/30 cursor-pointer"
                         loading="lazy"
                         onClick={() => setExpandedFile(file)}
                       />
                     ) : (
                       <div
                         className="h-12 w-12 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center cursor-pointer"
                         onClick={() => setExpandedFile(file)}
                       >
                         <span className="text-lg">📄</span>
                       </div>
                     )}
                     <button
                       type="button"
                       onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                       className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                       aria-label={`Remove ${file.file.name}`}
                     >
                       <X className="h-3 w-3" />
                     </button>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* Input container - floating pill */}
          <form onSubmit={handleSubmit} className="relative">
            <div className={cn(
              "flex items-center gap-1.5 sm:gap-2 rounded-full border bg-muted/30 px-2 py-1.5",
              "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20",
              "transition-all duration-200",
              isListening && "border-destructive/50 bg-destructive/5"
            )}>
              {/* Attachment buttons inline */}
              <div className="flex items-center gap-0.5 shrink-0">
                <QuinnCameraCapture
                  onCapture={handleCameraCapture}
                  disabled={isLoading || attachedFiles.length >= 10}
                />
                <QuinnFileUpload
                  files={attachedFiles}
                  onFilesChange={setAttachedFiles}
                  disabled={isLoading}
                  showPreview={false}
                />
              </div>

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask Quinn..."}
                className={cn(
                  "flex-1 min-w-0 bg-transparent border-0 outline-none text-sm py-2",
                  "placeholder:text-muted-foreground"
                )}
                disabled={isLoading}
              />

              {/* Voice input */}
              {isVoiceSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={cn(
                    "h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0",
                    isListening && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Send button - always visible with fixed size */}
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0 flex-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
          
          <p className="text-center text-xs text-muted-foreground mt-2">
            Educational info, not financial advice
          </p>
        </div>
      </div>

      <QuinnProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      {/* File Preview Dialog */}
      {expandedFile && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpandedFile(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[85vh] bg-card rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
              <span className="text-sm font-medium truncate max-w-[60vw]">{expandedFile.file.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {expandedFile.preview ? (
              <img
                src={expandedFile.preview}
                alt={expandedFile.file.name}
                className="max-w-full max-h-[75vh] object-contain mx-auto"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <span className="text-4xl">📄</span>
                <p className="text-sm text-muted-foreground">{expandedFile.file.name}</p>
                <p className="text-xs text-muted-foreground">{(expandedFile.file.size / 1024).toFixed(1)} KB</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="Unlimited AI Conversations"
        requiredTier="pro"
        description={
          usage.isAtLimit
            ? `You've used all ${usage.conversationsLimit} free conversations this month. Your conversations reset on ${usage.resetDate}. Upgrade to Pro for unlimited access to Quinn.`
            : "You've used all your free AI conversations this month. Upgrade to Pro for unlimited access to Quinn."
        }
      />
    </div>
  );

  return chatContent;
}
