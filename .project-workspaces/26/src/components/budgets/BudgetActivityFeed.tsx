import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Wallet,
  DollarSign,
  UserPlus,
  UserMinus,
  Edit,
  MessageCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  user_id: string | null;
  metadata: any;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    profile_image_url: string | null;
  };
}

interface BudgetActivityFeedProps {
  budgetId: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  budget_created: <Wallet className="h-4 w-4 text-green-500" />,
  expense_added: <DollarSign className="h-4 w-4 text-red-500" />,
  collaborator_joined: <UserPlus className="h-4 w-4 text-purple-500" />,
  collaborator_left: <UserMinus className="h-4 w-4 text-red-500" />,
  budget_updated: <Edit className="h-4 w-4 text-yellow-500" />,
  comment_added: <MessageCircle className="h-4 w-4 text-blue-400" />,
  budget_reset: <CheckCircle className="h-4 w-4 text-green-500" />,
};

const activityColors: Record<string, string> = {
  budget_created: "bg-green-100 border-green-200",
  expense_added: "bg-red-100 border-red-200",
  collaborator_joined: "bg-purple-100 border-purple-200",
  collaborator_left: "bg-red-100 border-red-200",
  budget_updated: "bg-yellow-100 border-yellow-200",
  comment_added: "bg-blue-50 border-blue-200",
  budget_reset: "bg-green-100 border-green-200",
};

const BudgetActivityFeed = ({ budgetId }: BudgetActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    setupRealtimeSubscription();
  }, [budgetId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_activity")
        .select("*")
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const userIds = [...new Set(data.filter((a) => a.user_id).map((a) => a.user_id!))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, profile_image_url")
          .in("id", userIds);

        const activitiesWithProfiles = data.map((a) => ({
          ...a,
          profile: profiles?.find((p) => p.id === a.user_id),
        }));

        setActivities(activitiesWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`budget-activity-${budgetId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "budget_activity", filter: `budget_id=eq.${budgetId}` },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getInitials = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.first_name) return profile.first_name[0].toUpperCase();
    if (profile?.email) return profile.email[0].toUpperCase();
    return "S";
  };

  const getName = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return profile?.email || "System";
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityItem[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No activity yet. Actions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <div className="sticky top-0 bg-card z-10 py-2">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {date}
                  </Badge>
                </div>
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-border" />

                  {dateActivities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-3">
                      <div
                        className={`absolute left-[-17px] w-6 h-6 rounded-full border-2 bg-card flex items-center justify-center ${
                          activityColors[activity.activity_type] || "bg-gray-100 border-gray-200"
                        }`}
                      >
                        {activityIcons[activity.activity_type] || (
                          <Activity className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.profile?.profile_image_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(activity.profile)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{getName(activity.profile)}</span>{" "}
                              <span className="text-muted-foreground">{activity.description}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {activity.metadata && activity.activity_type === "expense_added" && (
                          <div className="mt-2 p-2 rounded-md bg-muted/50 text-sm">
                            <span className="font-semibold text-red-600">
                              -${Number(activity.metadata.amount).toLocaleString()}
                            </span>
                            {activity.metadata.description && (
                              <p className="text-muted-foreground text-xs mt-1">
                                {activity.metadata.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetActivityFeed;