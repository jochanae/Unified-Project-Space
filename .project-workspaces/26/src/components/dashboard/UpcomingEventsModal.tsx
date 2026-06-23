import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, ChevronRight, Calendar, ExternalLink, MapPin, Video, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, isFuture, parseISO } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  meeting_url: string | null;
  is_featured: boolean;
}

const eventTypeColors: Record<string, { bg: string; badge: string }> = {
  webinar: {
    bg: "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  workshop: {
    bg: "bg-purple-50 border-purple-300 dark:bg-purple-950/30 dark:border-purple-700",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  seminar: {
    bg: "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700",
    badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  meetup: {
    bg: "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  default: {
    bg: "bg-gray-50 border-gray-300 dark:bg-gray-950/30 dark:border-gray-700",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  },
};

interface UpcomingEventsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpcomingEventsModal({ open, onOpenChange }: UpcomingEventsModalProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchEvents();
    }
  }, [open]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(10);

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const getEventColors = (eventType: string) => {
    return eventTypeColors[eventType] || eventTypeColors.default;
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "MMM d, h:mm a");
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return null;
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Calendar className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold">Upcoming Events</DialogTitle>
          </div>
          <p className="text-muted-foreground text-sm">
            View and register for upcoming learning sessions
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No upcoming events scheduled</p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon for new events!</p>
            </div>
          ) : (
            events.map((event) => {
              const colors = getEventColors(event.event_type);
              const duration = getDuration(event.start_time, event.end_time);
              
              return (
                <div
                  key={event.id}
                  className={`rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition-shadow ${colors.bg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg text-foreground mb-1">{event.title}</h3>
                    {event.is_featured && (
                      <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatEventDate(event.start_time)}
                      </span>
                    </div>
                    
                    <Badge variant="secondary" className={colors.badge}>
                      {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                    </Badge>
                    
                    {duration && (
                      <span className="text-muted-foreground">{duration}</span>
                    )}
                  </div>

                  {/* Location or Meeting URL */}
                  <div className="flex items-center gap-3 mt-3">
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.meeting_url && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(event.meeting_url!, "_blank");
                        }}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Join Online
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
