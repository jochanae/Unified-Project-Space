/**
 * ChatHistoryModal — displays past conversation sessions for premium users.
 * Extracted from ChatInterface.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Loader2, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage } from '@/hooks/useChatHistory';

interface HistorySession {
  date: string;
  messages: { content: string; role: string; created_at: string }[];
}

interface ChatHistoryModalProps {
  open: boolean;
  onClose: () => void;
  viewingSession: HistorySession | null;
  setViewingSession: (s: HistorySession | null) => void;
  historyLoading: boolean;
  historySessions: HistorySession[];
  confirmClearAll: boolean;
  setConfirmClearAll: (v: boolean) => void;
  chatPartnerName: string;
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[]) => void;
  setChatHistory: (h: { role: string; content: string }[]) => void;
  memberId: string;
  userId: string;
  subscribed?: boolean;
  clearing: boolean;
  onClearAll: () => void;
}

export default function ChatHistoryModal({
  open, onClose, viewingSession, setViewingSession, historyLoading,
  historySessions, confirmClearAll, setConfirmClearAll,
  messages, setMessages, setChatHistory,
  clearing, onClearAll,
}: ChatHistoryModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[80vh] rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h3 className="font-display text-lg font-bold text-foreground">
                {viewingSession ? viewingSession.date : 'Chat History'}
              </h3>
              <button
                onClick={() => viewingSession ? setViewingSession(null) : onClose()}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
              >
                {viewingSession ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : viewingSession ? (
                <div className="space-y-3">
                  {viewingSession.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-user-bubble text-foreground rounded-br-lg'
                          : 'bg-companion-bubble text-foreground rounded-bl-lg border border-border/50'
                      }`}>
                        {msg.content}
                        <p className="mt-1 text-[10px] text-muted-foreground/50">
                          {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : historySessions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">No conversation history yet.</p>
              ) : (
                <div className="space-y-1">
                  {historySessions.map((session, i) => (
                    <button
                      key={i}
                      onClick={() => setViewingSession(session)}
                      className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-secondary transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{session.date}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {session.messages[0]?.content || 'Empty session'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground/60 shrink-0 ml-2">{session.messages.length} msgs</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {viewingSession && (
              <div className="border-t border-border/50 px-5 py-4">
                <button
                  onClick={() => {
                    const restored: typeof messages = viewingSession.messages.map((msg, i) => ({
                      id: `restored-${i}-${Date.now()}`,
                      content: msg.content,
                      isUser: msg.role === 'user',
                      timestamp: new Date(msg.created_at),
                    }));
                    setMessages(restored);
                    setChatHistory(viewingSession.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, ...(m.created_at ? { created_at: m.created_at } : {}) })));
                    onClose();
                    setViewingSession(null);
                    toast.success(`Restored conversation from ${viewingSession.date}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Continue from here
                </button>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Loads this session into your chat so you can pick up where you left off
                </p>
              </div>
            )}

            {!viewingSession && historySessions.length > 0 && (
              <div className="border-t border-border/50 px-5 py-4">
                {confirmClearAll ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-destructive flex-1">Delete all history? This cannot be undone.</p>
                    <button
                      onClick={onClearAll}
                      disabled={clearing}
                      className="rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {clearing ? 'Clearing…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear all history
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
