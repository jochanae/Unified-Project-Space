import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronUp, Calendar, Bell, Clock, User, Loader2, Video, Check, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UpcomingEventsModal } from "@/components/dashboard/UpcomingEventsModal";
import { VideoPlayerModal } from "@/components/dashboard/VideoPlayerModal";
import { FeaturedVideosCarousel } from "@/components/dashboard/FeaturedVideosCarousel";
import { LiveStreamPlayer, useLiveStreamStatus } from "@/components/dashboard/LiveStreamPlayer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { format } from "date-fns";

interface UpcomingEvent {
  id: string;
  title: string;
  presenter: string;
  dateTime: string;
  start_time: string;
  image_url?: string | null;
}

interface FeaturedVideo {
  id: string;
  title: string;
  content_url: string | null;
  video_id: string | null;
  thumbnail_url: string | null;
  duration_minutes?: number | null;
}

export function LiveLearnCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partner, isPartnerBranded } = usePartnerBranding();
  const { isLive, loading: liveLoading } = useLiveStreamStatus();
  const [isExpanded, setIsExpanded] = useState(true);
  const [eventsModalOpen, setEventsModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<FeaturedVideo | null>(null);
  const [reminderSet, setReminderSet] = useState<Record<string, boolean>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
    if (user) {
      fetchExistingReminders();
    }
  }, [user, isPartnerBranded, partner?.id]);

  const fetchUpcomingEvents = async () => {
    try {
      let query = supabase
        .from("events")
        .select("id, title, event_type, start_time, image_url")
        .eq("is_published", true)
        .gte("start_time", new Date().toISOString());
      
      // Filter by partner if user is linked to one, or show global events
      if (isPartnerBranded && partner?.id) {
        query = query.or(`partner_id.eq.${partner.id},partner_id.is.null`);
      }
      
      const { data, error } = await query
        .order("start_time", { ascending: true })
        .limit(5);

      if (!error && data) {
        setUpcomingEvents(data.map(event => ({
          id: event.id,
          title: event.title,
          presenter: event.event_type,
          dateTime: format(new Date(event.start_time), "MMM d, h:mm a"),
          start_time: event.start_time,
          image_url: event.image_url
        })));
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchExistingReminders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("event_reminders")
      .select("event_id")
      .eq("user_id", user.id);
    
    if (data) {
      const reminders: Record<string, boolean> = {};
      data.forEach(r => { reminders[r.event_id] = true; });
      setReminderSet(reminders);
    }
  };

  const handleVideoSelect = (video: FeaturedVideo) => {
    setSelectedVideo(video);
    setVideoModalOpen(true);
  };

  const handleRemindClick = async (event: UpcomingEvent) => {
    if (!user) {
      toast.error("Please sign in to set reminders");
      return;
    }

    if (reminderSet[event.id]) {
      // Remove reminder
      const { error } = await supabase
        .from("event_reminders")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", event.id);

      if (error) {
        toast.error("Failed to remove reminder");
        return;
      }

      setReminderSet(prev => ({ ...prev, [event.id]: false }));
      toast.success("Reminder removed");
    } else {
      // Add reminder
      const { error } = await supabase
        .from("event_reminders")
        .insert({
          user_id: user.id,
          event_id: event.id,
          event_title: event.title,
          event_time: event.start_time, // Use the actual event start time
        });

      if (error) {
        toast.error("Failed to set reminder");
        return;
      }

      setReminderSet(prev => ({ ...prev, [event.id]: true }));
      toast.success("Reminder set!", {
        description: `You'll be notified before "${event.title}"`,
      });
    }
  };

  return (
    <>
      <Card className={`mt-6 overflow-hidden border-0 shadow-lg bg-[#0f1419] dark:bg-[#0f1419] isolate relative z-10 ${isLive ? 'ring-2 ring-red-500/50' : ''}`}>
        {/* Dark Header */}
        <div className="bg-[#0f1419] dark:bg-[#0f1419] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLive ? (
              <Radio className="h-6 w-6 text-red-500 animate-pulse" />
            ) : (
              <Video className="h-6 w-6 text-[hsl(180,80%,55%)]" />
            )}
            <h2 className="text-xl font-bold text-white">
              {isLive ? "Live Now" : "Live & Learn"}
            </h2>
            {isLive && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/money-academy")}
              className="h-10 w-10 rounded-full bg-white text-[hsl(180,80%,50%)] hover:bg-white/90"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-10 w-10 rounded-full bg-[#1a2332] text-[hsl(180,80%,55%)] hover:bg-[#243447]"
            >
              <ChevronUp className={`h-5 w-5 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-[#0f1419]">
            {/* Live Stream or Featured Videos Carousel */}
            <div className="px-4 py-2">
              {liveLoading ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a2332] border border-[#243447] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                </div>
              ) : isLive ? (
                <LiveStreamPlayer />
              ) : (
                <FeaturedVideosCarousel onVideoSelect={handleVideoSelect} />
              )}
            </div>

            {/* Upcoming Events */}
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[hsl(180,80%,55%)]" />
                  <h3 className="font-semibold">Upcoming Events</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEventsModalOpen(true)}
                  className="text-[hsl(180,80%,55%)] hover:text-white hover:bg-white/10 text-xs gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  View All
                </Button>
              </div>

              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <p>No upcoming events scheduled</p>
                </div>
              ) : (
                <>
                  {/* Event Card - with visible orb coming through */}
                  <Card className="relative overflow-hidden p-4 bg-[#1a2332]/90 backdrop-blur-sm border border-[#243447] rounded-xl">
                    {/* Decorative Orb - visible through the card */}
                    <div className="absolute right-16 -bottom-4 w-28 h-28 rounded-full bg-[hsl(250,50%,50%)]/30 blur-md" />
                    
                    <div className="relative z-10 flex items-start gap-3">
                      <Avatar className="h-12 w-12 bg-gradient-to-br from-[hsl(240,60%,60%)] to-[hsl(280,60%,55%)]">
                        {upcomingEvents[0].image_url ? (
                          <AvatarImage src={upcomingEvents[0].image_url} alt={upcomingEvents[0].title} />
                        ) : null}
                        <AvatarFallback className="text-white bg-transparent">
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{upcomingEvents[0].title}</h4>
                        <p className="text-sm text-white/60">{upcomingEvents[0].presenter}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-[hsl(180,80%,55%)]">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">{upcomingEvents[0].dateTime}</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`gap-1.5 border-0 ${reminderSet[upcomingEvents[0].id] ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-white text-[hsl(180,70%,45%)] hover:bg-white/90"}`}
                        onClick={() => handleRemindClick(upcomingEvents[0])}
                      >
                        {reminderSet[upcomingEvents[0].id] ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        {reminderSet[upcomingEvents[0].id] ? "Reminded" : "Remind"}
                      </Button>
                    </div>
                  </Card>

                  {/* More Events Button */}
                  {upcomingEvents.length > 1 && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-center gap-2 bg-white text-[#0f1419] hover:bg-white/90 rounded-full"
                      onClick={() => setEventsModalOpen(true)}
                    >
                      +{upcomingEvents.length - 1} more event{upcomingEvents.length > 2 ? 's' : ''}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <UpcomingEventsModal open={eventsModalOpen} onOpenChange={setEventsModalOpen} />
      <VideoPlayerModal 
        open={videoModalOpen} 
        onOpenChange={setVideoModalOpen} 
        videoUrl={selectedVideo?.content_url || null}
        title={selectedVideo?.title || "Featured Video"}
      />
    </>
  );
}
