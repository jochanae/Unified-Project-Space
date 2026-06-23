import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, UserMinus, Trophy, TrendingUp, Target, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunity } from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";

interface TraderProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  show_real_name: boolean;
  stats?: {
    total_ideas_shared: number;
    successful_ideas: number;
    win_rate: number;
    followers_count: number;
    reputation_score: number;
  };
  is_following?: boolean;
}

export function SocialTradingTab() {
  const { user } = useAuth();
  const { toggleFollow } = useCommunity();
  const [searchTerm, setSearchTerm] = useState("");
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("leaderboard");

  useEffect(() => {
    fetchTraders();
    if (user) {
      fetchFollowing();
    }
  }, [user]);

  const fetchTraders = async () => {
    setLoading(true);
    
    // Fetch profiles with trading stats (use profiles_public view for other users' data)
    const { data: profiles, error } = await supabase
      .from('profiles_public')
      .select('user_id, full_name, avatar_url, username, show_real_name')
      .limit(50);

    if (error) {
      console.error('Error fetching traders:', error);
      setLoading(false);
      return;
    }

    // Fetch trading stats
    const { data: stats } = await supabase
      .from('user_trading_stats')
      .select('*');

    const tradersWithStats = profiles.map(p => ({
      ...p,
      stats: stats?.find(s => s.user_id === p.user_id) || {
        total_ideas_shared: 0,
        successful_ideas: 0,
        win_rate: 0,
        followers_count: 0,
        reputation_score: 0,
      },
    }));

    // Sort by reputation
    tradersWithStats.sort((a, b) => (b.stats?.reputation_score || 0) - (a.stats?.reputation_score || 0));

    setTraders(tradersWithStats);
    setLoading(false);
  };

  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);
    
    setFollowingIds(data?.map(f => f.following_id) || []);
  };

  const handleFollowToggle = async (traderId: string) => {
    const isFollowing = followingIds.includes(traderId);
    await toggleFollow.mutateAsync({ targetUserId: traderId, isFollowing });
    
    if (isFollowing) {
      setFollowingIds(prev => prev.filter(id => id !== traderId));
    } else {
      setFollowingIds(prev => [...prev, traderId]);
    }
    fetchTraders();
  };

  // Filter out users without names and test accounts
  const filteredTraders = traders.filter(t => 
    t.full_name && 
    t.full_name.trim() !== '' &&
    !t.full_name.toLowerCase().includes('test') &&
    t.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const followingTraders = filteredTraders.filter(t => followingIds.includes(t.user_id));
  // Only show traders with actual stats (reputation > 0 or ideas > 0)
  const topTraders = [...filteredTraders]
    .filter(t => (t.stats?.reputation_score || 0) > 0 || (t.stats?.total_ideas_shared || 0) > 0)
    .sort((a, b) => (b.stats?.reputation_score || 0) - (a.stats?.reputation_score || 0))
    .slice(0, 10);

  const getInitials = (trader: TraderProfile) => {
    if (trader.show_real_name && trader.full_name) {
      return trader.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (trader.username) return trader.username.slice(0, 2).toUpperCase();
    if (trader.full_name) return trader.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return "U";
  };

  const getDisplayName = (trader: TraderProfile) => {
    if (trader.show_real_name && trader.full_name) {
      return trader.full_name;
    }
    if (trader.username) {
      return `@${trader.username}`;
    }
    return trader.full_name || "Member";
  };

  const shouldShowUsername = (trader: TraderProfile) => {
    return trader.username && trader.show_real_name;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-medium">#{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search traders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="following">Following ({followingIds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Top Traders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {topTraders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No traders yet. Share trade ideas to appear on the leaderboard!
                  </div>
                ) : (
                  topTraders.map((trader, index) => (
                    <div key={trader.user_id} className="flex items-center gap-4 p-4">
                      <div className="w-8 flex justify-center">
                        {getRankBadge(index)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={trader.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(trader)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{getDisplayName(trader)}</p>
                        {shouldShowUsername(trader) && (
                          <p className="text-xs text-primary font-medium">@{trader.username}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {trader.stats?.total_ideas_shared || 0} ideas
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            {(trader.stats?.win_rate || 0).toFixed(0)}% win rate
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          {trader.stats?.reputation_score || 0}
                        </Badge>
                        {user && user.id !== trader.user_id && (
                          <Button
                            variant={followingIds.includes(trader.user_id) ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleFollowToggle(trader.user_id)}
                            className="gap-1"
                          >
                            {followingIds.includes(trader.user_id) ? (
                              <>
                                <UserMinus className="h-3 w-3" />
                                Unfollow
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3" />
                                Follow
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="following" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Traders You Follow</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {followingTraders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    You're not following anyone yet. Follow traders to see their ideas in your feed!
                  </div>
                ) : (
                  followingTraders.map((trader) => (
                    <div key={trader.user_id} className="flex items-center gap-4 p-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={trader.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(trader)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{getDisplayName(trader)}</p>
                        {shouldShowUsername(trader) && (
                          <p className="text-xs text-primary font-medium">@{trader.username}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{trader.stats?.followers_count || 0} followers</span>
                          <span>•</span>
                          <span>{trader.stats?.total_ideas_shared || 0} ideas shared</span>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFollowToggle(trader.user_id)}
                        className="gap-1"
                      >
                        <UserMinus className="h-3 w-3" />
                        Unfollow
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
