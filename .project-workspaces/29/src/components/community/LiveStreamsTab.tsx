import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Video, Plus, ExternalLink, Radio, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { parseStreamUrl, getStreamPlatformIcon, isValidStreamUrl } from "@/lib/streamUtils";
import { DiscordBanner } from "./DiscordBanner";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  stream_url: string;
  platform: string;
  thumbnail_url: string | null;
  is_live: boolean;
  scheduled_at: string | null;
  viewers_count: number;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function LiveStreamsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStream, setNewStream] = useState({
    title: "",
    description: "",
    stream_url: "",
  });

  // Fetch live streams
  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["live-streams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("*")
        .order("is_live", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch author profiles (use profiles_public view for other users' data)
      const userIds = [...new Set(data.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      return data.map((stream) => ({
        ...stream,
        author: profiles?.find((p) => p.user_id === stream.user_id) || null,
      })) as LiveStream[];
    },
  });

  // Create stream mutation
  const createStream = useMutation({
    mutationFn: async (stream: typeof newStream) => {
      const streamInfo = parseStreamUrl(stream.stream_url);
      const { error } = await supabase.from("live_streams").insert([
        {
          user_id: user!.id,
          title: stream.title,
          description: stream.description || null,
          stream_url: stream.stream_url,
          platform: streamInfo.platform,
          thumbnail_url: streamInfo.thumbnailUrl,
          is_live: true,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-streams"] });
      toast.success("Stream shared!");
      setIsDialogOpen(false);
      setNewStream({ title: "", description: "", stream_url: "" });
    },
    onError: () => {
      toast.error("Failed to share stream");
    },
  });

  // End stream mutation
  const endStream = useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from("live_streams")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", streamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-streams"] });
      toast.success("Stream ended");
    },
  });

  const handleSubmit = () => {
    if (!newStream.title.trim() || !newStream.stream_url.trim()) {
      toast.error("Please fill in title and stream URL");
      return;
    }
    if (!isValidStreamUrl(newStream.stream_url)) {
      toast.error("Please enter a valid YouTube or Twitch URL");
      return;
    }
    createStream.mutate(newStream);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const liveStreams = streams.filter((s) => s.is_live);
  const pastStreams = streams.filter((s) => !s.is_live);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discord Banner */}
      <DiscordBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="h-5 w-5 text-destructive animate-pulse" />
            Live Streams
          </h2>
          <p className="text-sm text-muted-foreground">
            Share your trading sessions on YouTube or Twitch
          </p>
        </div>

        {user && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Share Stream
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share a Live Stream</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Stream Title</Label>
                  <Input
                    placeholder="e.g., Morning Market Analysis"
                    value={newStream.title}
                    onChange={(e) =>
                      setNewStream({ ...newStream, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stream URL (YouTube or Twitch)</Label>
                  <Input
                    placeholder="https://youtube.com/live/... or https://twitch.tv/..."
                    value={newStream.stream_url}
                    onChange={(e) =>
                      setNewStream({ ...newStream, stream_url: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your YouTube Live or Twitch stream link
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="What will you be covering?"
                    value={newStream.description}
                    onChange={(e) =>
                      setNewStream({ ...newStream, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={createStream.isPending}
                  className="w-full"
                >
                  {createStream.isPending ? "Sharing..." : "Share Stream"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Live Now Section */}
      {liveStreams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            🔴 Live Now
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {liveStreams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                isOwner={stream.user_id === user?.id}
                onEndStream={() => endStream.mutate(stream.id)}
                getInitials={getInitials}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Live Streams */}
      {liveStreams.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No live streams right now</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to share your trading session!
            </p>
            {user && (
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Share Stream
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past Streams */}
      {pastStreams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Recent Streams
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastStreams.slice(0, 6).map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                isOwner={stream.user_id === user?.id}
                onEndStream={() => {}}
                getInitials={getInitials}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stream Card Component
function StreamCard({
  stream,
  isOwner,
  onEndStream,
  getInitials,
  compact = false,
}: {
  stream: LiveStream;
  isOwner: boolean;
  onEndStream: () => void;
  getInitials: (name: string | null) => string;
  compact?: boolean;
}) {
  const streamInfo = parseStreamUrl(stream.stream_url);

  return (
    <Card className={compact ? "" : "border-primary/20"}>
      {/* Thumbnail */}
      {stream.thumbnail_url && (
        <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
          {stream.is_live && (
            <Badge
              variant="destructive"
              className="absolute top-2 left-2 gap-1"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="absolute top-2 right-2"
          >
            {getStreamPlatformIcon(stream.platform)} {stream.platform}
          </Badge>
        </div>
      )}

      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{stream.title}</CardTitle>
            {!compact && stream.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {stream.description}
              </p>
            )}
          </div>
          {!stream.thumbnail_url && stream.is_live && (
            <Badge variant="destructive" className="shrink-0">
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className={compact ? "pt-0" : ""}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={stream.author?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(stream.author?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {stream.author?.full_name || "Member"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(stream.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && stream.is_live && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEndStream}
              >
                End
              </Button>
            )}
            <Button
              variant={stream.is_live ? "default" : "outline"}
              size="sm"
              className="gap-1"
              asChild
            >
              <a href={stream.stream_url} target="_blank" rel="noopener noreferrer">
                {stream.is_live ? "Watch" : "View"}
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
