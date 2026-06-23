import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lock, Sparkles, Smile, Crown, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AvatarStack from "@/components/goals/AvatarStack";
import { StickerPicker } from "@/components/kidsbloom/chat/StickerPicker";
import { format } from "date-fns";

interface GroupChatSectionProps {
  familyGroupId: string;
  groupName: string;
  subscriptionTier: "free" | "premium";
  messageCount: number;
  messageLimit: number;
  onUpgrade?: () => void;
}

interface GroupMessage {
  id: string;
  sender_id: string;
  sender_type: "parent" | "kid";
  message: string;
  message_type: string;
  sticker_url: string | null;
  created_at: string;
}

interface MemberInfo {
  user_id: string | null;
  kid_profile_id: string | null;
  member_type: string;
  profile?: { first_name?: string; last_name?: string; profile_image_url?: string };
  kid_profile?: { display_name?: string; avatar_emoji?: string; avatar_url?: string };
}

export const GroupChatSection = ({
  familyGroupId,
  groupName,
  subscriptionTier,
  messageCount,
  messageLimit,
  onUpgrade,
}: GroupChatSectionProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [localMessageCount, setLocalMessageCount] = useState(messageCount);
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check if user is admin based on email from database
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.email) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("admin_emails")
        .select("email")
        .ilike("email", user.email)
        .single();
      
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user?.email]);

  // Admins bypass message limits
  const canSendMessage = isAdmin || subscriptionTier === "premium" || localMessageCount < messageLimit;
  const messagesRemaining = messageLimit - localMessageCount;

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("group_chat_messages")
      .select("*")
      .eq("family_group_id", familyGroupId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) setMessages(data as GroupMessage[]);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("family_group_members")
      .select(`
        user_id,
        kid_profile_id,
        member_type,
        kid_profile:kids_profiles(display_name, avatar_emoji, avatar_url)
      `)
      .eq("family_group_id", familyGroupId);

    if (data) {
      // Fetch profiles separately for parent members since there's no FK relationship
      const parentUserIds = data
        .filter(m => m.member_type === "parent" && m.user_id)
        .map(m => m.user_id as string);
      
      let profilesMap: Record<string, { first_name?: string; last_name?: string; profile_image_url?: string }> = {};
      
      if (parentUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, profile_image_url")
          .in("id", parentUserIds);
        
        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map(p => [p.id, p])
          );
        }
      }
      
      // Merge profiles into member data
      const membersWithProfiles = data.map(m => ({
        ...m,
        profile: m.user_id ? profilesMap[m.user_id] : undefined,
      }));
      
      setMembers(membersWithProfiles as unknown as MemberInfo[]);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchMembers();

    const channel = supabase
      .channel(`group-chat:${familyGroupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_messages",
          filter: `family_group_id=eq.${familyGroupId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as GroupMessage]);
          setLocalMessageCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyGroupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getSenderInfo = (senderId: string, senderType: string) => {
    if (senderType === "kid") {
      const member = members.find(m => m.kid_profile_id === senderId);
      return {
        name: member?.kid_profile?.display_name || "Child",
        avatar: member?.kid_profile?.avatar_emoji || "🧒",
        avatarUrl: member?.kid_profile?.avatar_url,
        isEmoji: !member?.kid_profile?.avatar_url,
      };
    } else {
      // Parent sender - support both current user and other parents
      const member = members.find(m => m.user_id === senderId);
      const firstName = member?.profile?.first_name;
      const lastName = member?.profile?.last_name;
      const profileAvatarUrl = member?.profile?.profile_image_url;
      const isCurrentUser = senderId === user?.id;

      const metadata = user?.user_metadata as any | undefined;
      const metaAvatarUrl = metadata?.avatar_url || metadata?.picture;

      // For the current parent user, prefer their chat/profile avatar, then auth metadata avatar
      const avatarUrl = isCurrentUser ? (profileAvatarUrl || metaAvatarUrl) : profileAvatarUrl;

      const displayName = firstName
        ? `${firstName}${lastName ? ` ${lastName[0]}.` : ""}`
        : (metadata?.full_name as string | undefined) || user?.email?.split("@")[0] || "Parent";

      const initial = (() => {
        if (firstName) return firstName[0]?.toUpperCase();
        const fullName = (metadata?.full_name as string | undefined);
        if (fullName) return fullName.trim()[0]?.toUpperCase();
        return user?.email?.[0]?.toUpperCase() || "P";
      })();

      return {
        name: displayName,
        avatar: initial,
        avatarUrl,
        isEmoji: false,
      };
    }
  };

  // Build avatar stack data from members
  const memberAvatars = members.map(m => ({
    id: m.user_id || m.kid_profile_id || '',
    name: m.member_type === 'kid' 
      ? m.kid_profile?.display_name 
      : m.profile?.first_name,
    imageUrl: m.member_type === 'kid' 
      ? m.kid_profile?.avatar_url 
      : m.profile?.profile_image_url,
    emoji: m.member_type === 'kid' ? m.kid_profile?.avatar_emoji : undefined,
  }));

  const sendMessage = async (messageText?: string, stickerUrl?: string) => {
    const text = messageText || newMessage.trim();
    if (!text && !stickerUrl) return;
    if (!user) return;

    if (!canSendMessage) {
      toast.error("Message limit reached! Upgrade to premium for unlimited group chat.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("group_chat_messages")
        .insert({
          family_group_id: familyGroupId,
          sender_id: user.id,
          sender_type: "parent",
          message: text || "",
          message_type: stickerUrl ? "sticker" : "text",
          sticker_url: stickerUrl || null,
        });

      if (error) throw error;
      
      // Create notifications for other family members
      const otherParents = members.filter(m => m.member_type === "parent" && m.user_id !== user.id);
      if (otherParents.length > 0) {
        const notifications = otherParents.map(parent => ({
          user_id: parent.user_id,
          title: `New message in ${groupName}`,
          message: text?.substring(0, 100) || "Sent a sticker",
          type: "info",
          action_url: "/kids",
        }));
        
        await supabase.from("notifications").insert(notifications);
      }
      
      setNewMessage("");
      setShowStickers(false);
    } catch (error: any) {
      console.error("Send message error:", error);
      if (error.message?.includes("can_send_group_message")) {
        toast.error("Message limit reached! Upgrade to premium for unlimited group chat.");
      } else {
        toast.error("Failed to send message");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStickerSelect = (sticker: string) => {
    sendMessage(sticker, sticker);
  };

  const quickMessages = [
    "Family meeting tonight! 📢",
    "Great job everyone! 🎉",
    "Chores done? ✅",
    "Dinner's ready! 🍽️",
  ];

  return (
    <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[400px] max-h-[600px] bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50">
      {/* Compact Header */}
      <CardHeader className="py-2.5 px-3 sm:px-4 border-b border-purple-100/50 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
              <MessageCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs sm:text-sm truncate">{groupName} Chat</CardTitle>
              <div className="flex items-center gap-1.5">
                {subscriptionTier === "premium" && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-purple-500 to-pink-500">
                    <Crown className="h-2.5 w-2.5 mr-0.5" /> Premium
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Avatar Stack */}
          <div className="flex items-center gap-2 shrink-0">
            <AvatarStack 
              avatars={memberAvatars} 
              size="sm" 
              maxDisplay={4}
              showCount={true}
            />
            {subscriptionTier === "free" && !isAdmin && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                  {messagesRemaining} left
                </span>
                <Progress 
                  value={(localMessageCount / messageLimit) * 100} 
                  className="w-8 sm:w-12 h-1.5"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        {/* Upgrade Banner */}
        {subscriptionTier === "free" && !isAdmin && messagesRemaining <= 3 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-200/50 p-2 sm:p-3 shrink-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span className="text-xs truncate">
                  {messagesRemaining === 0 
                    ? "Limit reached!" 
                    : `${messagesRemaining} messages left`
                  }
                </span>
              </div>
              <Button 
                size="sm" 
                onClick={onUpgrade} 
                className="gap-1 h-6 text-[10px] px-2 bg-gradient-to-r from-purple-500 to-pink-500 shrink-0"
              >
                <Sparkles className="h-3 w-3" />
                Upgrade
              </Button>
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3 min-h-0"
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-1.5 px-4">
                <div className="text-3xl sm:text-4xl">💬</div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Start a family conversation!
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const sender = getSenderInfo(msg.sender_id, msg.sender_type);
                const isMe = msg.sender_id === user?.id;
                const showDate = index === 0 || 
                  format(new Date(messages[index - 1].created_at), 'MMM d') !== 
                  format(new Date(msg.created_at), 'MMM d');
                
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                          {format(new Date(msg.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 shadow-sm">
                        {sender.avatarUrl ? (
                          <AvatarImage src={sender.avatarUrl} className="object-cover w-full h-full" />
                        ) : null}
                        <AvatarFallback 
                          className={
                            msg.sender_type === "kid"
                              ? "bg-gradient-to-br from-pink-300 to-purple-300 text-sm"
                              : "bg-gradient-to-br from-blue-300 to-cyan-300 text-xs font-medium"
                          }
                        >
                          {sender.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[75%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">
                            {sender.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                        </div>
                        <div
                          className={`
                            px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl shadow-sm
                            ${isMe
                              ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm"
                              : "bg-white dark:bg-muted rounded-bl-sm border border-purple-100/50"
                            }
                          `}
                        >
                          {msg.sticker_url ? (
                            <span className="text-2xl sm:text-3xl">{msg.sticker_url}</span>
                          ) : (
                            <p className="text-xs sm:text-sm leading-relaxed">{msg.message}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Sticker Picker */}
        <AnimatePresence>
          {showStickers && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0"
            >
              <StickerPicker
                onSelect={handleStickerSelect}
                onClose={() => setShowStickers(false)}
                variant="modern"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Messages */}
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 flex gap-1.5 sm:gap-2 overflow-x-auto border-t border-purple-100/50 shrink-0 scrollbar-hide">
          {quickMessages.map((msg) => (
            <Button
              key={msg}
              variant="outline"
              size="sm"
              className="flex-shrink-0 text-[10px] sm:text-xs h-6 sm:h-7 px-2 sm:px-3 border-purple-200/50 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              onClick={() => setNewMessage(msg)}
              disabled={!canSendMessage}
            >
              {msg}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="p-2 sm:p-3 border-t border-purple-100/50 bg-background/50 backdrop-blur shrink-0">
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowStickers(!showStickers)}
              disabled={!canSendMessage}
              className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
            >
              <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={canSendMessage ? "Type a message..." : "Upgrade for more messages"}
              disabled={!canSendMessage}
              className="text-sm h-8 sm:h-9"
            />
            <Button 
              onClick={() => sendMessage()} 
              disabled={!newMessage.trim() || isLoading || !canSendMessage}
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
