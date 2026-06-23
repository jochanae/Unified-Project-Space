import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { Radio, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveStreamSettings {
  enabled: boolean;
  stream_url: string | null;
  stream_title: string | null;
}

interface LiveStreamPlayerProps {
  onClose?: () => void;
}

export function LiveStreamPlayer({ onClose }: LiveStreamPlayerProps) {
  const { partner, isPartnerBranded } = usePartnerBranding();
  const [settings, setSettings] = useState<LiveStreamSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveStreamSettings();
    
    // Set up realtime subscription for live updates
    const channel = supabase
      .channel('livestream-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'livestream_settings'
        },
        () => {
          fetchLiveStreamSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partner?.id, isPartnerBranded]);

  const fetchLiveStreamSettings = async () => {
    try {
      // First try to get partner-specific settings, then fall back to global
      let query = supabase
        .from("livestream_settings")
        .select("enabled, stream_url, stream_title")
        .eq("enabled", true);

      if (isPartnerBranded && partner?.id) {
        // Check for partner-specific first
        const { data: partnerData } = await supabase
          .from("livestream_settings")
          .select("enabled, stream_url, stream_title")
          .eq("partner_id", partner.id)
          .eq("enabled", true)
          .maybeSingle();

        if (partnerData) {
          setSettings(partnerData);
          setLoading(false);
          return;
        }
      }

      // Fall back to global settings
      const { data, error } = await supabase
        .from("livestream_settings")
        .select("enabled, stream_url, stream_title")
        .is("partner_id", null)
        .eq("enabled", true)
        .maybeSingle();

      if (!error && data) {
        setSettings(data);
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error("Error fetching livestream settings:", error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // Convert various video URLs to embed format
  const getEmbedUrl = (url: string): string => {
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

    // Already an embed URL or other format
    return url;
  };

  if (loading) {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a2332] border border-[#243447] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (!settings?.enabled || !settings?.stream_url) {
    return null;
  }

  const embedUrl = getEmbedUrl(settings.stream_url);

  return (
    <div className="relative">
      {/* Live Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
        <Radio className="h-3 w-3 animate-pulse" />
        LIVE
      </div>

      {/* Close button if onClose provided */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Video Player */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Stream Title */}
      <p className="mt-2 text-white font-medium flex items-center gap-2">
        <Radio className="h-4 w-4 text-red-500 animate-pulse" />
        {settings.stream_title || "Live Stream"}
      </p>
    </div>
  );
}

// Hook to check if live stream is active
export function useLiveStreamStatus() {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { partner, isPartnerBranded } = usePartnerBranding();

  useEffect(() => {
    checkLiveStatus();

    const channel = supabase
      .channel('livestream-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'livestream_settings'
        },
        () => {
          checkLiveStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partner?.id, isPartnerBranded]);

  const checkLiveStatus = async () => {
    try {
      if (isPartnerBranded && partner?.id) {
        const { data: partnerData } = await supabase
          .from("livestream_settings")
          .select("enabled, stream_url")
          .eq("partner_id", partner.id)
          .eq("enabled", true)
          .maybeSingle();

        if (partnerData?.enabled && partnerData?.stream_url) {
          setIsLive(true);
          setLoading(false);
          return;
        }
      }

      const { data } = await supabase
        .from("livestream_settings")
        .select("enabled, stream_url")
        .is("partner_id", null)
        .eq("enabled", true)
        .maybeSingle();

      setIsLive(!!(data?.enabled && data?.stream_url));
    } catch (error) {
      console.error("Error checking live status:", error);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  return { isLive, loading };
}