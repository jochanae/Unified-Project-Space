import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MessageSquare, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SMSLog {
  id: string;
  message_body: string;
  parsed_amount: number | null;
  parsed_title: string | null;
  parsed_category: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export const SMSTransactionHistory = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("sms_transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">Recorded</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-xs">Pending</Badge>;
    }
  };

  const getCategoryEmoji = (category: string | null) => {
    const emojis: Record<string, string> = {
      food: "🍽️",
      transportation: "🚗",
      shopping: "🛍️",
      utilities: "💡",
      entertainment: "🎬",
      healthcare: "🏥",
      education: "📚",
      housing: "🏠",
      insurance: "🛡️",
      income: "💰",
      other: "📝",
    };
    return emojis[category || "other"] || "📝";
  };

  if (loading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center">
        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No SMS transactions yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Text your transactions to see them here
        </p>
      </div>
    );
  }

  const displayLogs = showAll ? logs : logs.slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Recent SMS Transactions
        </h4>
        <span className="text-xs text-muted-foreground">Last 7 days</span>
      </div>

      <ScrollArea className={showAll ? "h-[300px]" : undefined}>
        <div className="space-y-2 pr-2">
          {displayLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">
                  {getCategoryEmoji(log.parsed_category)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(log.status)}
                    <span className="text-sm font-medium truncate">
                      {log.parsed_title || "SMS Transaction"}
                    </span>
                    {log.parsed_amount && log.status === "success" && (
                      <span className="text-sm font-semibold text-foreground ml-auto">
                        ${log.parsed_amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    "{log.message_body}"
                  </p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(log.status)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {logs.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" /> Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" /> Show All ({logs.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
};
