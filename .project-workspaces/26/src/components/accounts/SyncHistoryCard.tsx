import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SyncEvent {
  id: string;
  sync_type: string;
  accounts_synced: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface SyncHistoryCardProps {
  onSyncComplete?: () => void;
}

export function SyncHistoryCard({ onSyncComplete }: SyncHistoryCardProps) {
  const { user } = useAuth();
  const [syncHistory, setSyncHistory] = useState<SyncEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSyncHistory();
    }
  }, [user]);

  const fetchSyncHistory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("sync_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching sync history:", error);
    } else {
      setSyncHistory(data || []);
    }
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getSyncTypeLabel = (type: string) => {
    switch (type) {
      case "manual":
        return "Manual Sync";
      case "scheduled":
        return "Scheduled Sync";
      case "auto":
        return "Auto Sync";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Sync History
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchSyncHistory}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {syncHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No sync history yet.
          </p>
        ) : (
          <ScrollArea className={syncHistory.length <= 2 ? "h-auto" : "h-[140px]"}>
            <div className="space-y-2">
              {syncHistory.slice(0, syncHistory.length <= 2 ? 2 : 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {getStatusIcon(event.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {getSyncTypeLabel(event.sync_type)}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.status === "success" ? (
                        <span className="text-green-600">
                          {event.accounts_synced} account{event.accounts_synced !== 1 ? "s" : ""} synced
                        </span>
                      ) : event.error_message ? (
                        <span className="text-destructive truncate">{event.error_message}</span>
                      ) : (
                        "Processing..."
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {syncHistory.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Last: {format(new Date(syncHistory[0].created_at), "MMM d 'at' h:mm a")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
