import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface KidChatSectionProps {
  familyLinkId: string;
  kidName: string;
  kidAvatarEmoji?: string;
  kidAvatarUrl?: string;
}

interface Message {
  id: string;
  sender_type: "parent" | "kid";
  message: string;
  created_at: string;
}

interface ParentProfile {
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

export const KidChatSection = ({ 
  familyLinkId, 
  kidName, 
  kidAvatarEmoji,
  kidAvatarUrl 
}: KidChatSectionProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchParentProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, profile_image_url")
      .eq("id", user.id)
      .maybeSingle();
    
    if (data) setParentProfile(data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("family_chat_messages")
      .select("*")
      .eq("family_link_id", familyLinkId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) setMessages(data as Message[]);
  };

  useEffect(() => {
    fetchMessages();
    fetchParentProfile();

    const channel = supabase
      .channel(`parent-chat:${familyLinkId}`)
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
  }, [familyLinkId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("family_chat_messages")
        .insert({
          family_link_id: familyLinkId,
          sender_type: "parent",
          sender_id: user.id,
          message: newMessage.trim(),
        });

      if (error) throw error;
      
      // Create notification for the kid (stored for when they next log in)
      // Note: Kid notifications could be handled differently since kids use PIN login
      
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const quickMessages = [
    "Great job! 🎉",
    "Keep it up! 💪",
    "I'm proud of you! ❤️",
    "Don't forget your chores!",
  ];

  const parentName = parentProfile?.first_name || "You";
  const parentInitial = parentProfile?.first_name?.[0]?.toUpperCase() || "P";

  return (
    <Card className="h-[400px] flex flex-col bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200/50">
      <CardHeader className="py-2.5 px-3 sm:px-4 border-b border-blue-100/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xs sm:text-sm">Private Chat</CardTitle>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">
                1-on-1
              </Badge>
            </div>
          </div>
          
          {/* Avatar Stack - Parent + Kid */}
          <div className="flex items-center -space-x-2">
            {/* Parent Avatar */}
            <Avatar className="h-7 w-7 shadow-sm">
              {parentProfile?.profile_image_url ? (
                <AvatarImage src={parentProfile.profile_image_url} className="object-cover w-full h-full" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-cyan-400 text-white text-xs font-medium">
                {parentInitial}
              </AvatarFallback>
            </Avatar>
            {/* Kid Avatar */}
            <Avatar className="h-7 w-7 shadow-sm">
              {kidAvatarUrl ? (
                <AvatarImage src={kidAvatarUrl} className="object-cover w-full h-full" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-pink-300 to-purple-300 text-base">
                {kidAvatarEmoji || "🧒"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-2">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-1">
                <div className="text-3xl">💬</div>
                <p className="text-muted-foreground text-xs">
                  Start a private conversation with {kidName}!
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isParent = msg.sender_type === "parent";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-1.5 ${isParent ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    {isParent ? (
                      <>
                        {parentProfile?.profile_image_url && <AvatarImage src={parentProfile.profile_image_url} />}
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-cyan-400 text-white text-[10px] font-medium">
                          {parentInitial}
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        {kidAvatarUrl && <AvatarImage src={kidAvatarUrl} />}
                        <AvatarFallback className="bg-gradient-to-br from-pink-300 to-purple-300 text-sm">
                          {kidAvatarEmoji || "🧒"}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className={`max-w-[75%] ${isParent ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-1.5 mb-0.5 ${isParent ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {isParent ? parentName : kidName}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </span>
                    </div>
                    <div
                      className={`
                        px-2.5 py-1.5 rounded-2xl shadow-sm
                        ${isParent
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-sm"
                          : "bg-white dark:bg-muted rounded-bl-sm border border-blue-100/50"
                        }
                      `}
                    >
                      <p className="text-xs sm:text-sm">{msg.message}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Messages */}
        <div className="px-3 sm:px-4 py-1.5 flex gap-1.5 overflow-x-auto border-t border-blue-100/50 scrollbar-hide">
          {quickMessages.map((msg) => (
            <Button
              key={msg}
              variant="outline"
              size="sm"
              className="flex-shrink-0 text-[10px] sm:text-xs h-6 px-2 border-blue-200/50 hover:bg-blue-50"
              onClick={() => setNewMessage(msg)}
            >
              {msg}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="p-2 sm:p-3 border-t border-blue-100/50 bg-background/50">
          <div className="flex gap-1.5 sm:gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="text-sm h-8 sm:h-9"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || isLoading}
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
