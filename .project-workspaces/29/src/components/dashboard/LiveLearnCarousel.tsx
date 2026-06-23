import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play, Clock, Sparkles, Calendar, TrendingUp, AlertTriangle,
  X, ChevronLeft, ChevronRight, Eye, Maximize2, Minimize2, Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import { useLiveStream } from "@/hooks/useLiveStream";
import { LiveStreamBanner } from "@/components/dashboard/LiveStreamBanner";

/* ─── Types ─── */
interface EconomicEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  impact: "high" | "medium" | "low";
  category: string;
}

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  video_url: string;
}

/* ─── Helpers ─── */
const getYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const getVimeoId = (url: string): string | null => {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
};

const getEmbedUrl = (url: string): string | null => {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
  return null;
};

const getUpcomingEvents = (): EconomicEvent[] => {
  const now = new Date();
  const events: EconomicEvent[] = [
    { id: "1", title: "FOMC Meeting", date: new Date(now.getTime() + 2 * 864e5), time: "2:00 PM ET", impact: "high", category: "fed" },
    { id: "2", title: "EIA Crude Oil Inventory", date: new Date(now.getTime() + 1 * 864e5), time: "10:30 AM ET", impact: "high", category: "commodities" },
    { id: "3", title: "ES Futures Rollover", date: new Date(now.getTime() + 6 * 864e5), time: "All Day", impact: "medium", category: "futures" },
    { id: "4", title: "USDA Crop Report", date: new Date(now.getTime() + 3 * 864e5), time: "12:00 PM ET", impact: "high", category: "commodities" },
  ];
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const AUTO_PLAY_INTERVAL = 6000;

/* ─── Theme ─── */
const DARK_BG = "#0f1419";
const CARD_BG = "#1a2332";
const CARD_BORDER = "#243447";
const TEAL = "hsl(180,80%,55%)";
const TEAL_DARK = "hsl(180,80%,50%)";

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export function LiveLearnCarousel() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const { liveStream, isLive, isOptedOut, toggleOptOut } = useLiveStream();

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: false,
    loop: true,
    dragFree: false,
  });

  /* ─ Carousel callbacks ─ */
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (playingVideoId) return;
    autoPlayRef.current = setInterval(() => {
      if (emblaApi && !playingVideoId) emblaApi.scrollNext();
    }, AUTO_PLAY_INTERVAL);
  }, [emblaApi, playingVideoId]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    startAutoPlay();
    emblaApi.on("pointerDown", stopAutoPlay);
    emblaApi.on("pointerUp", startAutoPlay);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("pointerDown", stopAutoPlay);
      emblaApi.off("pointerUp", startAutoPlay);
      stopAutoPlay();
    };
  }, [emblaApi, onSelect, startAutoPlay, stopAutoPlay]);

  useEffect(() => {
    if (playingVideoId) stopAutoPlay();
    else startAutoPlay();
  }, [playingVideoId, startAutoPlay, stopAutoPlay]);

  useEffect(() => { fetchFeaturedVideos(); }, []);

  const fetchFeaturedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("educational_videos")
        .select("id, title, description, thumbnail_url, duration_seconds, video_url")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .limit(20);
      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error("Error fetching videos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const currentVideo = videos.find((v) => v.id === playingVideoId);
  const currentEmbedUrl = currentVideo ? getEmbedUrl(currentVideo.video_url) : null;
  const events = getUpcomingEvents();

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: DARK_BG }}>
        <div className="p-5 pb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
            <Video className="h-5 w-5" style={{ color: TEAL }} />
            Live & Learn
          </h3>
        </div>
        <div className="px-3 pb-5">
          <div className="aspect-video rounded-xl animate-pulse" style={{ background: CARD_BG }} />
        </div>
      </div>
    );
  }

  /* ─── Empty state ─── */
  if (videos.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: DARK_BG }}>
        <div className="p-5 pb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
            <Video className="h-5 w-5" style={{ color: TEAL }} />
            Live & Learn
          </h3>
        </div>
        <div className="text-center py-10 px-4">
          <Play className="h-10 w-10 text-white/30 mx-auto mb-3" />
          <p className="text-white/70 font-medium">No featured videos yet</p>
          <Link to="/learn">
            <Button size="sm" className="mt-4" style={{ background: TEAL_DARK, color: "#0f1419" }}>
              Explore Learning Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden shadow-xl relative transition-all duration-300",
        isExpanded && "fixed inset-0 z-50 rounded-none"
      )}
      style={{ background: DARK_BG }}
    >
      {/* Decorative orb */}
      <div
        className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl pointer-events-none"
        style={{ background: "hsl(250,50%,50%)", opacity: 0.12 }}
      />

      {/* ─── Header ─── */}
      <div className="p-4 pb-2 relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
            {isLive ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                Live & Learn
              </>
            ) : (
              <>
                <Video className="h-5 w-5" style={{ color: TEAL }} />
                Live & Learn
              </>
            )}
          </h3>
          <div className="flex items-center gap-1">
            {isOptedOut && (
              <Button variant="ghost" size="sm" className="text-white/50 text-xs gap-1 hover:text-white hover:bg-white/10" onClick={toggleOptOut}>
                <Eye className="h-3.5 w-3.5" />
                Show live
              </Button>
            )}
            <Link to="/videos">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" style={{ color: TEAL }}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/10 text-white/60"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          {isLive ? "A live session is happening now — tune in!" : "Educational videos to sharpen your edge"}
        </p>
      </div>

      {/* ─── Content area ─── */}
      <div className="relative z-10">
        {/* Live Stream */}
        {isLive && liveStream && (
          <div className="px-3 mb-3">
            <LiveStreamBanner
              title={liveStream.title}
              description={liveStream.description}
              streamUrl={liveStream.stream_url}
              platform={liveStream.platform}
              viewersCount={liveStream.viewers_count}
              isOptedOut={isOptedOut}
              onToggleOptOut={toggleOptOut}
            />
          </div>
        )}

        {/* Video Player (playing) */}
        {!isLive && playingVideoId && currentEmbedUrl && (
          <div className="relative px-3 mb-3">
            <div
              className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-2xl"
              style={{ border: `1px solid ${CARD_BORDER}` }}
            >
              <iframe
                src={currentEmbedUrl}
                title={currentVideo?.title || "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 z-10 border-0"
                onClick={() => setPlayingVideoId(null)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
            <h4 className="mt-2 font-semibold text-sm text-white line-clamp-1">{currentVideo?.title}</h4>
          </div>
        )}

        {/* Carousel (idle — each slide fills the viewport) */}
        {!isLive && !playingVideoId && (
          <div className="relative">
            {/* Nav arrows */}
            <button
              onClick={scrollPrev}
              className="absolute left-1 top-[40%] -translate-y-1/2 z-10 h-9 w-9 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-1 top-[40%] -translate-y-1/2 z-10 h-9 w-9 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>

            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {videos.map((video) => (
                  <div key={video.id} className="flex-[0_0_100%] min-w-0">
                    <button
                      onClick={() => setPlayingVideoId(video.id)}
                      className="group block w-full text-left"
                    >
                      <div className="relative overflow-hidden aspect-video">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${CARD_BG}, hsl(250,40%,25%))` }}
                          >
                            <Play className="h-16 w-16 text-white/40" />
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div
                            className="h-14 w-14 rounded-full flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform"
                            style={{ background: TEAL_DARK }}
                          >
                            <Play className="h-7 w-7 text-[#0f1419] ml-0.5" />
                          </div>
                        </div>
                        {/* Duration */}
                        {video.duration_seconds && (
                          <Badge className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 border-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(video.duration_seconds)}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dot indicators + title */}
            <div className="px-4 pt-2 pb-1">
              <p className="text-xs" style={{ color: TEAL }}>Featured</p>
              <h4 className="font-semibold text-sm text-white line-clamp-1 mt-0.5">
                {videos[selectedIndex]?.title}
              </h4>
            </div>

            {videos.length > 1 && (
              <div className="flex justify-center items-center gap-2 py-2 px-4">
                {videos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      selectedIndex === index ? "w-6" : "w-2"
                    )}
                    style={{
                      background: selectedIndex === index ? TEAL : "rgba(255,255,255,0.3)",
                    }}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Upcoming Events — INSIDE the same card ─── */}
        <div
          className="mx-3 mb-3 rounded-xl p-3"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 text-white/80">
              <Calendar className="h-3.5 w-3.5" style={{ color: TEAL }} />
              Upcoming Events
            </h4>
            <Link to="/dashboard" className="text-[10px] hover:underline" style={{ color: TEAL }}>
              View Calendar
            </Link>
          </div>
          <div className="space-y-1.5">
            {events.map((event) => {
              const daysUntil = Math.ceil(
                (event.date.getTime() - Date.now()) / 864e5
              );
              const dayLabel =
                daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background:
                          event.impact === "high"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(234,179,8,0.15)",
                      }}
                    >
                      {event.impact === "high" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <TrendingUp className="h-3.5 w-3.5 text-yellow-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {event.title}
                      </p>
                      <p className="text-[10px] text-white/35">{event.time}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0 px-1.5 py-0",
                      event.impact === "high"
                        ? "border-red-500/50 text-red-400"
                        : "border-yellow-500/50 text-yellow-400"
                    )}
                  >
                    {dayLabel}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
