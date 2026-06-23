import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  buttonText: string;
}

const helpTopics: Record<string, HelpTopic> = {
  dashboard: {
    id: "dashboard",
    title: "Customize Your Dashboard",
    content: "Your dashboard is like the command center of CoinsBloom. Tap the \"Customize\" button at the top of your dashboard to enter Edit Mode. Each card will show a ? icon—tap it to learn what that card does! You can hide cards you don't need with the X button, and restore hidden cards anytime by tapping \"Restore Cards\". Keep the cards that match YOUR financial goals.",
    buttonText: "Got it! Back to Customize Your Dashboard",
  },
  account: {
    id: "account",
    title: "Add Your First Account",
    content: "An account can be a bank account, credit card, or cash envelope. To add an account, go to the Accounts section and click \"Add Account\". You'll enter basic info like the account name, type, and starting balance. Once added, you can start tracking transactions against it!",
    buttonText: "Got it! Back to Add Your First Account",
  },
  budget: {
    id: "budget",
    title: "Create Your First Budget",
    content: "Budgets help you set spending limits for different categories. Go to Budgets and click \"Create Budget\". Choose your categories (like groceries, entertainment, etc.), set monthly limits, and CoinsBloom will track your spending against these limits. You'll see alerts if you're getting close to your limit!",
    buttonText: "Got it! Back to Create Your First Budget",
  },
  bills: {
    id: "bills",
    title: "Add Your Bills",
    content: "Bills are recurring charges you need to pay. Go to Bills, click \"Add Bill\", and enter details like the amount, due date, and frequency (monthly, quarterly, etc.). CoinsBloom will remind you before they're due and help you plan for them in your budget.",
    buttonText: "Got it! Back to Add Your Bills",
  },
  transaction: {
    id: "transaction",
    title: "Track Your First Transaction",
    content: "Transactions are your income and expenses. In the Transactions section, click \"Add Transaction\" to manually log them. You can also use voice commands by tapping the microphone, or enable SMS tracking to auto-import expenses via text message. Try all three methods to find what works for you!",
    buttonText: "Got it! Back to Track Your First Transaction",
  },
  credit: {
    id: "credit",
    title: "Track Your Credit Score",
    content: "Your credit score is a key indicator of your financial health. In the Credit section, you can manually enter your score from free services like Credit Karma or your bank. Track your score over time, set improvement goals, and get personalized tips to boost your credit. Monitor your credit utilization across all cards to keep it under 30%!",
    buttonText: "Got it! Back to Credit Score",
  },
  goals: {
    id: "goals",
    title: "Set Savings Goals",
    content: "Goals help you save for what matters most—a vacation, emergency fund, new car, or anything else! Create a goal with a target amount and deadline, then track contributions over time. You can even invite family or friends to contribute to shared goals like group gifts or family trips.",
    buttonText: "Got it! Back to Savings Goals",
  },
  reports: {
    id: "reports",
    title: "Financial Reports & Insights",
    content: "Reports give you a bird's eye view of your finances. See spending trends, income vs. expenses, budget performance, and savings progress over time. Compare different periods, export reports for tax purposes, or share summaries with your financial advisor. Use the What-If simulator to plan major financial decisions!",
    buttonText: "Got it! Back to Reports",
  },
  debts: {
    id: "debts",
    title: "Manage Your Debts",
    content: "Track all your debts in one place—credit cards, loans, mortgages, and more. Enter each debt with its balance, interest rate, and minimum payment. CoinsBloom will calculate your debt-to-income ratio and suggest payoff strategies like the avalanche (highest interest first) or snowball (smallest balance first) methods.",
    buttonText: "Got it! Back to Debt Management",
  },
  visionboard: {
    id: "visionboard",
    title: "Vision Board",
    content: "Your Vision Board is where dreams become goals! Add visual representations of what you're working toward—a dream home, vacation destination, or financial freedom. Each vision can be linked to a savings goal, so you can see your progress toward making those dreams a reality.",
    buttonText: "Got it! Back to Vision Board",
  },
  coach: {
    id: "coach",
    title: "Bloom",
    content: "Bloom is your personal AI financial mentor! Ask questions about budgeting, debt payoff strategies, saving tips, or anything money-related. You can even upload credit score screenshots and Bloom will save them for you. Get personalized advice based on your financial situation. The more you use CoinsBloom, the smarter Bloom becomes at helping you reach your goals.",
    buttonText: "Got it! Back to Bloom",
  },
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BloomCoachHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bloom-coach-chat`;

export function BloomCoachHelpModal({ open, onOpenChange, topicId }: BloomCoachHelpModalProps) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topic = helpTopics[topicId];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when topic changes
  useEffect(() => {
    setMessages([]);
    setChatInput("");
  }, [topicId]);

  if (!topic) return null;

  const streamChat = async (userMessages: Message[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error("Please sign in to use Bloom");
    }
    
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        messages: [
          { role: "user", content: `I'm learning about "${topic.title}". Context: ${topic.content}` },
          ...userMessages 
        ], 
        category: "coach" 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
            setMessages(prev => {
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

  const handleSendMessage = async () => {
    const messageText = chatInput.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      setMessages(prev => prev.filter(m => m !== userMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-md p-0 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Purple Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 relative flex-shrink-0">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bloom</h2>
                <p className="text-sm text-white/80">Financial Architect</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content (native scroll for mobile reliability) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 touch-pan-y">
          {messages.length === 0 ? (
            <>
              {/* AI Avatar */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
              </div>

              {/* Help Content */}
              <p className="text-foreground text-center leading-relaxed mb-6">
                {topic.content}
              </p>

              {/* Action Button */}
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 py-6 text-white font-semibold"
              >
                {topic.buttonText}
              </Button>
            </>
          ) : (
            /* Chat Messages */
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-2">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="bg-muted p-3 rounded-2xl">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything about your finances..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              disabled={isLoading}
              className="flex-1 rounded-full"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={isLoading || !chatInput.trim()}
              className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
