import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Video, BookOpen, Lightbulb, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";

interface ScheduledContent {
  id: string;
  title: string;
  type: string;
  publish_date: string;
}

export default function ContentCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledContent();
  }, [selectedDate]);

  const fetchScheduledContent = async () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    // Fetch tips with publish dates
    const { data: tips } = await supabase
      .from("financial_tips")
      .select("id, title, publish_date")
      .gte("publish_date", format(monthStart, "yyyy-MM-dd"))
      .lte("publish_date", format(monthEnd, "yyyy-MM-dd"));

    // Fetch events
    const { data: events } = await supabase
      .from("events")
      .select("id, title, start_time")
      .gte("start_time", monthStart.toISOString())
      .lte("start_time", monthEnd.toISOString());

    const allContent: ScheduledContent[] = [
      ...(tips || []).map((t) => ({ id: t.id, title: t.title, type: "tip", publish_date: t.publish_date })),
      ...(events || []).map((e) => ({ id: e.id, title: e.title, type: "event", publish_date: format(new Date(e.start_time), "yyyy-MM-dd") })),
    ];

    setScheduledContent(allContent);
    setLoading(false);
  };

  const getContentForDate = (date: Date) => {
    return scheduledContent.filter((c) => isSameDay(new Date(c.publish_date), date));
  };

  const selectedDateContent = getContentForDate(selectedDate);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "tip":
        return <Lightbulb className="h-4 w-4 text-amber-400" />;
      case "event":
        return <CalendarIcon className="h-4 w-4 text-blue-400" />;
      case "video":
        return <Video className="h-4 w-4 text-red-400" />;
      default:
        return <BookOpen className="h-4 w-4 text-emerald-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "tip":
        return "bg-amber-500/20 text-amber-400";
      case "event":
        return "bg-blue-500/20 text-blue-400";
      case "video":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-emerald-500/20 text-emerald-400";
    }
  };

  // Custom day content to show dots for scheduled content
  const modifiers = {
    hasContent: scheduledContent.map((c) => new Date(c.publish_date)),
  };

  const modifiersStyles = {
    hasContent: {
      fontWeight: "bold" as const,
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2 bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-emerald-400" />
            Content Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border border-white/10 bg-white/5"
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
          />
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            {format(selectedDate, "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-white/60 py-4">Loading...</div>
          ) : selectedDateContent.length === 0 ? (
            <div className="text-center text-white/60 py-8">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No content scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateContent.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {getTypeIcon(content.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{content.title}</h4>
                    <Badge className={`text-xs mt-1 ${getTypeColor(content.type)}`}>
                      {content.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Content */}
      <Card className="lg:col-span-3 bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Upcoming This Month</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledContent.length === 0 ? (
            <div className="text-center text-white/60 py-4">No upcoming content this month</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {scheduledContent.slice(0, 8).map((content) => (
                <div
                  key={content.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {getTypeIcon(content.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{content.title}</h4>
                    <p className="text-xs text-white/50">
                      {format(new Date(content.publish_date), "MMM d")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
