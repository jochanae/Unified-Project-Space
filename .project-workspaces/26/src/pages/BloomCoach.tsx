import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureLimitCheck } from "@/components/FeatureGate";
import { useFeatureGating } from "@/hooks/useFeatureGating";

import { BloomCoachHeader } from "@/components/bloom-coach/BloomCoachHeader";
import { BloomCoachMessage, BloomCoachTypingIndicator } from "@/components/bloom-coach/BloomCoachMessage";
import { BloomCoachInput } from "@/components/bloom-coach/BloomCoachInput";
import { BloomCoachWelcome } from "@/components/bloom-coach/BloomCoachWelcome";
import { QuinnInsightBar } from "@/components/bloom-coach/QuinnInsightBar";
import { QuinnVaultDrawer } from "@/components/bloom-coach/QuinnVaultDrawer";
import { QuinnSettingsDrawer } from "@/components/bloom-coach/QuinnSettingsDrawer";
import { MentalShredderModal } from "@/components/bloom-coach/MentalShredderModal";
import { trackEvent } from "@/lib/analytics";
import type { QuinnMode } from "@/components/bloom-coach/QuinnModeChips";
import type { QuinnProject } from "@/components/bloom-coach/QuinnProjectChip";
import { sfxMessageSent, sfxMessageReceived, privacyShieldHaptic } from "@/lib/quinnSfx";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;       // legacy single-image (still supported when reading old history)
  imageUrls?: string[];    // multi-image bento (up to 10)
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bloom-coach-chat`;

export default function BloomCoach() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremiumUser } = useFeatureGating();
  const { remaining, limit, refreshUsage } = useFeatureLimitCheck('bloom-coach');
  const [chatInput, setChatInput] = useState("");
  // Persistent Strategic Memory chat — NEVER touched while private mode is on.
  const [messages, setMessages] = useState<Message[]>([]);
  // Ephemeral Think Freely buffer — backed by sessionStorage so refresh/rotation
  // doesn't wipe an active private session.
  const [privateMessages, setPrivateMessages] = useState<Message[]>(() => {
    try {
      const v = sessionStorage.getItem("quinn-private-messages");
      return v ? JSON.parse(v) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showVault, setShowVault] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShredder, setShowShredder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<QuinnMode>(() => {
    try { return (localStorage.getItem("quinn-active-mode-v1") as QuinnMode) || null; } catch { return null; }
  });
  const [project, setProject] = useState<QuinnProject | null>(() => {
    try { const v = localStorage.getItem("quinn-active-project-v1"); return v ? JSON.parse(v) : null; } catch { return null; }
  });
  const [privateMode, setPrivateMode] = useState(() => {
    try {
      // Restore active private session across reloads (Compani-style)
      if (sessionStorage.getItem("quinn-private-active") === "1") return true;
      return localStorage.getItem("quinn:privacy:defaultPrivate") === "true";
    } catch { return false; }
  });
  const initialConversationLoadedForUserRef = useRef<string | null>(null);

  // Mirror private buffer to sessionStorage (survives refresh / rotation)
  useEffect(() => {
    try {
      if (privateMode) {
        sessionStorage.setItem("quinn-private-active", "1");
        sessionStorage.setItem("quinn-private-messages", JSON.stringify(privateMessages));
      } else {
        sessionStorage.removeItem("quinn-private-active");
        sessionStorage.removeItem("quinn-private-messages");
      }
    } catch { /* ignore */ }
  }, [privateMode, privateMessages]);

  // The view always reads/writes through these — never the raw arrays directly.
  const displayMessages = privateMode ? privateMessages : messages;
  const setDisplayMessages = privateMode ? setPrivateMessages : setMessages;

  const userName = user?.user_metadata?.first_name || user?.email?.split("@")[0] || "Friend";

  useEffect(() => {
    localStorage.setItem("visited_bloom_coach", "true");
  }, []);

  // Keep active project persisted across reloads & in sync with Vault picks
  useEffect(() => {
    try {
      if (project) localStorage.setItem("quinn-active-project-v1", JSON.stringify(project));
      else localStorage.removeItem("quinn-active-project-v1");
    } catch { /* ignore */ }
  }, [project]);

  // Persist active mode so the chosen lens survives reloads
  useEffect(() => {
    try {
      if (mode) localStorage.setItem("quinn-active-mode-v1", mode);
      else localStorage.removeItem("quinn-active-mode-v1");
    } catch { /* ignore */ }
  }, [mode]);

  // (Strategic Memory snapshot ref removed — `messages` is the snapshot,
  // since private mode now writes to a separate `privateMessages` buffer.)


  // Auto-load the most recent conversation so returning users open into their
  // chat history (Compani-style "invitation to a conversation"), not an empty
  // landing screen. New users get the soft Bloom intro bubble instead.
  useEffect(() => {
    if (!user || privateMode || initialConversationLoadedForUserRef.current === user.id) return;
    initialConversationLoadedForUserRef.current = user.id;
    let cancelled = false;
    (async () => {
      try {
        const { data: convo } = await supabase
          .from("bloom_coach_conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("category", "coach")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || !convo?.id) return;

        const { data: msgs } = await supabase
          .from("bloom_coach_messages")
          .select("role, content")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: true });

        if (cancelled || !msgs?.length) return;
        const loadedMessages = msgs.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        setCurrentConversationId(convo.id);
        setMessages(loadedMessages);
      } catch (err) {
        console.error("Failed to auto-load last conversation:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [user, privateMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, privateMessages, privateMode]);

  // Save conversation to DB
  const saveConversation = useCallback(async (msgs: Message[]) => {
    if (!user || msgs.length < 2) return;
    // Mental Shredder: never persist private sessions
    if (privateMode) return;

    try {
      if (!currentConversationId) {
        const firstUserMsg = msgs.find(m => m.role === "user");
        const title = firstUserMsg?.content.slice(0, 80) || "New Conversation";

        const { data, error } = await supabase
          .from("bloom_coach_conversations")
          .insert({ user_id: user.id, title, category: "coach" })
          .select("id")
          .single();

        if (error) throw error;
        if (data) {
          setCurrentConversationId(data.id);
          const messagesToInsert = msgs.map(m => ({
            conversation_id: data.id,
            user_id: user.id,
            role: m.role,
            content: m.content,
          }));
          await supabase.from("bloom_coach_messages").insert(messagesToInsert);
        }
      } else {
        const latestMsg = msgs[msgs.length - 1];
        await supabase.from("bloom_coach_messages").insert({
          conversation_id: currentConversationId,
          user_id: user.id,
          role: latestMsg.role,
          content: latestMsg.content,
        });
        await supabase
          .from("bloom_coach_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", currentConversationId);
      }
    } catch (error) {
      console.error("Failed to save conversation:", error);
    }
  }, [user, currentConversationId, privateMode]);

  const streamChat = async (userMessages: Message[]) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Please sign in to use Bloom");
    }

    // Convert messages to API format, handling images as multimodal content
    const apiMessages = userMessages.map(m => {
      // Combine legacy single + new multi into one list
      const urls: string[] = [
        ...(m.imageUrls ?? []),
        ...(m.imageUrl ? [m.imageUrl] : []),
      ];
      if (urls.length > 0 && m.role === "user") {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content },
            ...urls.map(url => ({ type: "image_url", image_url: { url } })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const projectContext = project
      ? {
          id: project.id,
          title: project.name,
          lens: project.lens,
        }
      : null;

    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        messages: apiMessages,
        category: "coach",
        projectContext,
        mode,
        privateMode,
        conversationId: currentConversationId,
        allowedAccountIds: (() => {
          try {
            const raw = localStorage.getItem("quinn:data:listeningAccountIds");
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
          } catch { return []; }
        })(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429 && errorData.limit_info) {
        setShowUpgradePrompt(true);
        const err = new Error(errorData.upgrade_message || "Daily limit reached") as any;
        err.isLimitReached = true;
        err.limitInfo = errorData.limit_info;
        throw err;
      }
      throw new Error(errorData.error || "Failed to get response");
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setDisplayMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSendMessage = async (text?: string, imageUrls?: string[]) => {
    const messageText = text || chatInput.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText, imageUrls };
    const newMessages = [...displayMessages, userMessage];
    setDisplayMessages(newMessages);
    setChatInput("");
    setIsLoading(true);
    sfxMessageSent();

    try {
      await streamChat(newMessages);
      sfxMessageReceived();
      // Only persist Strategic Memory; private mode never touches the DB.
      if (!privateMode) {
        setMessages(prev => {
          saveConversation(prev);
          return prev;
        });
      }
      refreshUsage?.();
    } catch (error: any) {
      console.error("Chat error:", error);
      if (error?.isLimitReached) {
        toast.error("Daily limit reached", {
          description: "You've used your 3 free messages today. Upgrade to Premium for unlimited access!",
          action: {
            label: "Upgrade",
            onClick: () => navigate('/settings?tab=billing'),
          },
          duration: 8000,
        });
        setDisplayMessages(prev => [
          ...prev,
          {
            role: "assistant" as const,
            content: `⚠️ You've used all **3 free Bloom messages** for today.\n\nYour messages reset tomorrow at midnight. To keep chatting with me anytime, upgrade to **Premium** for unlimited access!\n\n💎 [Upgrade to Premium →](/settings?tab=billing)`,
          },
        ]);
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to send message";
        toast.error(errorMessage);
        setDisplayMessages(prev => prev.filter(m => m !== userMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (privateMode) {
      // In private mode, "new chat" just clears the ephemeral buffer.
      setPrivateMessages([]);
    } else {
      setMessages([]);
      setCurrentConversationId(null);
    }
    setChatInput("");
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!user) return;
    // Selecting a stored conversation always lands you in Strategic Memory.
    if (privateMode) {
      setPrivateMode(false);
      setPrivateMessages([]);
    }
    try {
      const { data, error } = await supabase
        .from("bloom_coach_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast.error("Failed to load conversation");
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || displayMessages.length < 2) return;

    const messagesWithoutLast = displayMessages.slice(0, -1);
    setDisplayMessages(messagesWithoutLast);
    setIsLoading(true);

    try {
      await streamChat(messagesWithoutLast);
      refreshUsage?.();
    } catch (error) {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`quinn-obsidian quinn-shell ${privateMode ? "quinn-private" : ""} h-[100dvh] w-full min-w-0 max-w-[980px] flex flex-col overflow-hidden mx-auto lg:border-x lg:border-border/50 lg:shadow-sm lg:rounded-t-2xl relative text-foreground`}>
      {/* Animated emerald + champagne ambient field */}
      <div className="quinn-ambient" />
      <Helmet>
        <title>Bloom | CoinsBloom — Financial Architect</title>
        <meta name="description" content="Get personalized financial guidance from Bloom, your AI financial mentor." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <BloomCoachHeader
        onClose={() => {
          // Fallback to dashboard if there's no history (deep-link / direct entry)
          if (window.history.length > 1 && document.referrer && !document.referrer.includes("/quinn")) {
            navigate(-1);
          } else {
            navigate("/dashboard");
          }
        }}
        onNewChat={handleNewChat}
        onOpenVault={() => setShowVault(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenShredder={() => { trackEvent("shredder_opened"); setShowShredder(true); }}
        privateMode={privateMode}
        onTogglePrivate={() => {
          privacyShieldHaptic();
          setChatInput("");
          if (!privateMode) {
            // Enter Think Freely — Strategic Memory (`messages`) is left intact.
            // Private buffer starts fresh.
            setPrivateMessages([]);
            setPrivateMode(true);
            toast("🔒 Private session engaged", {
              description: "Zero-trace mode. Nothing is recorded.",
              duration: 2800,
            });
          } else {
            // Exit — wipe the ephemeral buffer; `messages` was never touched, so
            // Strategic Memory reappears automatically.
            setPrivateMessages([]);
            setPrivateMode(false);
            try {
              sessionStorage.removeItem("quinn-private-messages");
              sessionStorage.removeItem("quinn-private-active");
            } catch { /* ignore */ }
            const autoClear = (() => { try { return localStorage.getItem("quinn:privacy:autoClear") !== "false"; } catch { return true; } })();
            if (autoClear) {
              toast.success("Session shredded", {
                description: "Private transcript cleared. Back to Strategic Memory.",
                duration: 2400,
              });
            } else {
              toast("Strategic Memory resumed", { duration: 2000 });
            }
          }
        }}
      />

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-foreground">
                Daily limit reached. Upgrade for unlimited access.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/settings?tab=billing')}
              className="shrink-0 gap-1 text-xs"
            >
              <Crown className="h-3.5 w-3.5" />
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Smart Insight Bar — sub-header executive briefing */}
      <QuinnInsightBar
        onDiscuss={(prompt) => handleSendMessage(prompt)}
        projectName={project?.name ?? null}
      />

      {/* Chat area */}
      <div className="quinn-chat-panel flex-1 min-w-0 overflow-hidden flex flex-col" ref={scrollRef}>
        <ScrollArea className="quinn-chat-scroll flex-1 p-4">
          {displayMessages.length === 0 ? (
            privateMode ? (
              <div className="flex justify-start pt-2">
                <div className="w-7 h-7 rounded-full bg-emerald-grad flex items-center justify-center mr-2 flex-shrink-0 mt-1 ring-emerald-glow">
                  <Sparkles className="h-3.5 w-3.5 text-[hsl(160,30%,8%)]" strokeWidth={2.5} />
                </div>
                <div className="max-w-[85%] rounded-2xl px-4 py-3 quinn-glass-strong border border-[hsl(var(--quinn-champagne)/0.25)]">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-champagne/80 mb-1">Think Freely · Zero-trace</div>
                  <p className="text-[14px] text-foreground/90 leading-relaxed">
                    This session is private. Nothing here is recorded to your ledger or Strategic Memory. Speak freely — when you close this, it's gone.
                  </p>
                </div>
              </div>
            ) : (
              <BloomCoachWelcome
                userName={userName}
                onSendMessage={handleSendMessage}
                projectName={project?.name ?? null}
              />
            )
          ) : (
            <div className="quinn-message-list space-y-3 pb-4 min-w-0 max-w-full">
              {displayMessages.map((msg, index) => (
                <BloomCoachMessage
                  key={index}
                  message={msg}
                  index={index}
                  isLastAssistant={
                    msg.role === "assistant" &&
                    index === displayMessages.length - 1
                  }
                  isLoading={isLoading}
                  onRegenerate={handleRegenerate}
                  projectId={project?.id ?? null}
                  conversationId={privateMode ? null : currentConversationId}
                  modeLens={mode}
                />
              ))}
              {isLoading && displayMessages[displayMessages.length - 1]?.role === "user" && (
                <BloomCoachTypingIndicator />
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <BloomCoachInput
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSendMessage={handleSendMessage}
        onSelectTopic={handleSendMessage}
        isLoading={isLoading}
        mode={mode}
        onModeChange={setMode}
        project={project}
        onProjectChange={setProject}
        privateMode={privateMode}
        onOpenVault={() => setShowVault(true)}
      />

      <QuinnVaultDrawer
        open={showVault}
        onOpenChange={setShowVault}
        onSelectConversation={handleSelectConversation}
        currentConversationId={currentConversationId}
        activeProjectId={project?.id ?? null}
        onSelectPlan={(plan) => {
          setProject({
            id: plan.id,
            name: plan.title,
            emoji: "🗺️",
            lens: "planner",
          });
        }}
      />

      <QuinnSettingsDrawer open={showSettings} onOpenChange={setShowSettings} />

      <MentalShredderModal open={showShredder} onOpenChange={setShowShredder} />
    </div>
  );
}
