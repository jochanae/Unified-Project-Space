import { useState, useRef, useEffect } from "react";
import { useCommunity, useChatRoom } from "@/hooks/useCommunity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Hash, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./AvatarStack";

const roomIcons: Record<string, string> = {
  general: "💬",
  stocks: "📈",
  options: "🎯",
  crypto: "₿",
  forex: "💱",
  futures: "📊",
};

export function LiveChatTab() {
  const { user } = useAuth();
  const { chatRooms, loadingRooms } = useCommunity();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, loading: loadingMessages, sendMessage } = useChatRoom(selectedRoom);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user) return;
    await sendMessage(messageInput);
    setMessageInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Get unique participants for avatar stack
  const participants = messages
    .filter((m, i, arr) => arr.findIndex(x => x.user_id === m.user_id) === i)
    .map(m => ({
      id: m.user_id,
      name: m.author?.full_name || "User",
      avatar_url: m.author?.avatar_url,
    }));

  if (loadingRooms) {
    return (
      <div className="grid md:grid-cols-4 gap-4 h-[600px]">
        <Skeleton className="h-full rounded-lg" />
        <Skeleton className="md:col-span-3 h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-4 gap-4 h-[600px]">
      {/* Rooms List */}
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Chat Rooms
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1">
            {chatRooms.map((room) => (
              <Button
                key={room.id}
                variant={selectedRoom === room.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 text-sm h-auto py-2",
                  selectedRoom === room.id && "bg-primary/10"
                )}
                onClick={() => setSelectedRoom(room.id)}
              >
                <span className="text-lg">{roomIcons[room.asset_class || "general"]}</span>
                <div className="text-left truncate">
                  <p className="font-medium truncate">{room.name}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-3 h-full flex flex-col">
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Hash className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select a room to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            <CardHeader className="pb-2 border-b shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {chatRooms.find(r => r.id === selectedRoom)?.name}
                </CardTitle>
                {participants.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AvatarStack users={participants} size="sm" max={5} />
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {participants.length}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.user_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={msg.author?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(msg.author?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("max-w-[70%]", isOwn && "text-right")}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {msg.author?.full_name || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "inline-block rounded-lg px-3 py-2 text-sm",
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t shrink-0">
              {user ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Please sign in to send messages
                </p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
