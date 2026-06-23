import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  stream_url: string;
  platform: string;
  thumbnail_url: string | null;
  is_live: boolean;
  viewers_count: number;
  scheduled_at: string | null;
  user_id: string;
}

const LIVE_SESSION_OPT_OUT_KEY = "intoiq-live-session-opt-out";

export function useLiveStream() {
  const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptedOut, setIsOptedOut] = useState(() => {
    return localStorage.getItem(LIVE_SESSION_OPT_OUT_KEY) === "true";
  });

  const toggleOptOut = () => {
    const newValue = !isOptedOut;
    setIsOptedOut(newValue);
    localStorage.setItem(LIVE_SESSION_OPT_OUT_KEY, String(newValue));
  };

  useEffect(() => {
    fetchLiveStream();

    // Subscribe to realtime changes on live_streams
    const channel = supabase
      .channel("live-stream-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
        },
        () => {
          // Re-fetch whenever any live_streams row changes
          fetchLiveStream();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveStream = async () => {
    try {
      const { data, error } = await supabase
        .from("live_streams")
        .select("id, title, description, stream_url, platform, thumbnail_url, is_live, viewers_count, scheduled_at, user_id")
        .eq("is_live", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLiveStream(data);
    } catch (error) {
      console.error("Error fetching live stream:", error);
      setLiveStream(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    liveStream: isOptedOut ? null : liveStream,
    isLive: !isOptedOut && !!liveStream,
    isLoading,
    isOptedOut,
    toggleOptOut,
  };
}
