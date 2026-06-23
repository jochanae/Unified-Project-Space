import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeIdeasFeed } from "@/components/community/TradeIdeasFeed";
import { DiscussionsTab } from "@/components/community/DiscussionsTab";
import { LiveChatTab } from "@/components/community/LiveChatTab";
import { LiveStreamsTab } from "@/components/community/LiveStreamsTab";
import { SocialTradingTab } from "@/components/community/SocialTradingTab";
import { Lightbulb, MessageSquare, Radio, Users, Video } from "lucide-react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useCommunityEnabled } from "@/hooks/useCommunityEnabled";

export default function Community() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "ideas";
  const { enabled, isLoading } = useCommunityEnabled();

  if (!isLoading && !enabled) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="text-muted-foreground">
            Connect with traders, share ideas, and learn from each other
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="ideas" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Trade Ideas</span>
              <span className="sm:hidden">Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="discussions" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Discussions</span>
              <span className="sm:hidden">Forum</span>
            </TabsTrigger>
            <TabsTrigger value="streams" className="gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Live Streams</span>
              <span className="sm:hidden">Live</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">Chat Rooms</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Social Trading</span>
              <span className="sm:hidden">Social</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas">
            <TradeIdeasFeed />
          </TabsContent>

          <TabsContent value="discussions">
            <DiscussionsTab />
          </TabsContent>

          <TabsContent value="streams">
            <LiveStreamsTab />
          </TabsContent>

          <TabsContent value="chat">
            <LiveChatTab />
          </TabsContent>

          <TabsContent value="social">
            <SocialTradingTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
