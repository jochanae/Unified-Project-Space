import { useState, useEffect, useRef } from "react";
import { Send, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StickerPicker } from "./StickerPicker";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface FamilyChatWindowProps {
  familyLinkId: string;
  kidId: string;
  variant: "playful" | "modern";
  onClose: () => void;
  onMessagesRead: () => void;
  parentName?: string;
  parentAvatar?: string | null;
  kidName?: string;
  kidAvatar?: string | null;
  open: boolean;
}

interface Message {
  id: string;
  sender_type: "parent" | "kid";
  message: string;
  sticker_url: string | null;
  emoji_reaction: string | null;
  created_at: string;
  is_read: boolean;
}

export const FamilyChatWindow = ({
  familyLinkId,
  kidId,
  variant,
  onClose,
  onMessagesRead,
  parentName = "Parent",
  parentAvatar,
  kidName = "Me",
  kidAvatar,
  open,
}: FamilyChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isPlayful = variant === "playful";

  const fetchMessages = async () => {
    if (!familyLinkId) return;
    try {
      const { data, error } = await supabase
        .from("family_chat_messages")
        .select("*")
        .eq("family_link_id", familyLinkId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (data) {
        setMessages(data as Message[]);
        // Mark parent messages as read (don't block on this)
        supabase
          .from("family_chat_messages")
          .update({ is_read: true })
          .eq("family_link_id", familyLinkId)
          .eq("sender_type", "parent")
          .eq("is_read", false)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error("Error marking messages as read:", updateError);
            }
          });
        onMessagesRead();
      }
    } catch (err) {
      console.error("Unexpected error fetching messages:", err);
    }
  };

  useEffect(() => {
    if (open && familyLinkId) {
      fetchMessages();

      // Subscribe to new messages
      const channel = supabase
        .channel(`chat:${familyLinkId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "family_chat_messages",
            filter: `family_link_id=eq.${familyLinkId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [familyLinkId, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText?: string, stickerUrl?: string) => {
    const text = messageText || newMessage.trim();
    if (!text && !stickerUrl) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("family_chat_messages")
        .insert({
          family_link_id: familyLinkId,
          sender_type: "kid",
          sender_id: kidId,
          message: text || "",
          sticker_url: stickerUrl || null,
        });

      if (error) throw error;
      setNewMessage("");
      setShowStickers(false);
    } catch (error: any) {
      console.error("Chat send error:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStickerSelect = (sticker: string) => {
    sendMessage(sticker, sticker);
  };

  const renderAvatar = (isKid: boolean) => {
    const avatarSrc = isKid ? kidAvatar : parentAvatar;
    const name = isKid ? kidName : parentName;
    const fallbackEmoji = isKid ? "🧒" : "👨";
    
    return (
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={avatarSrc || undefined} />
        <AvatarFallback className={`text-sm ${isPlayful ? "bg-gradient-to-br from-pink-200 to-purple-200" : "bg-emerald-100"}`}>
          {name?.[0]?.toUpperCase() || fallbackEmoji}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className={`h-[85vh] ${isPlayful ? "bg-gradient-to-b from-pink-50 to-purple-50" : "bg-slate-900"}`}>
        {/* Header */}
        <DrawerHeader className={`p-3 flex flex-row items-center justify-between ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500" : "bg-emerald-600"}`}>
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 shadow-md">
              <AvatarImage src={parentAvatar || undefined} className="object-cover w-full h-full" />
              <AvatarFallback className="bg-white/20 text-white text-sm">
                {parentName?.[0]?.toUpperCase() || "👨"}
              </AvatarFallback>
            </Avatar>
            <div className="text-white text-left">
              <DrawerTitle className="text-white font-bold text-base">
                {isPlayful ? `Chat with ${parentName}` : parentName}
              </DrawerTitle>
              <p className="text-xs opacity-80">
                {isPlayful ? "Send a message! 💬" : "Online"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-10 w-10"
          >
            <X className="h-6 w-6" />
          </Button>
        </DrawerHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <p className={`text-center text-sm ${isPlayful ? "text-purple-400" : "text-white/50"}`}>
                {isPlayful ? `Say hi to ${parentName}! 👋` : "No messages yet"}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isKid = msg.sender_type === "kid";
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isKid ? "flex-row-reverse" : "flex-row"}`}
                >
                  {renderAvatar(isKid)}
                  <div
                    className={`
                      max-w-[75%] px-4 py-2.5 rounded-2xl
                      ${isKid
                        ? isPlayful
                          ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-br-sm"
                          : "bg-emerald-500 text-white rounded-br-sm"
                        : isPlayful
                          ? "bg-white text-purple-800 rounded-bl-sm shadow"
                          : "bg-white/10 text-white rounded-bl-sm"
                      }
                    `}
                  >
                    {msg.sticker_url ? (
                      <span className="text-4xl">{msg.sticker_url}</span>
                    ) : (
                      <p className="text-base">{msg.message}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sticker Picker */}
        {showStickers && (
          <StickerPicker
            onSelect={handleStickerSelect}
            onClose={() => setShowStickers(false)}
            variant={variant}
          />
        )}

        {/* Input */}
        <div className={`p-4 border-t ${isPlayful ? "border-purple-100" : "border-white/10"}`}>
          <div className="flex items-center gap-3">
            {isPlayful && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowStickers(!showStickers)}
                className="text-purple-500 h-12 w-12"
              >
                <Smile className="h-6 w-6" />
              </Button>
            )}
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={isPlayful ? "Type a message..." : "Message"}
              className={`h-12 text-base ${isPlayful ? "border-purple-200" : "bg-white/10 border-white/20 text-white placeholder:text-white/50"}`}
            />
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={!newMessage.trim() || isLoading}
              className={`h-12 w-12 ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500" : "bg-emerald-500"}`}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
