import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Calendar, MapPin, Video } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  meeting_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  max_attendees: number | null;
}

interface PartnerEventsManagerProps {
  partnerId: string;
}

export function PartnerEventsManager({ partnerId }: PartnerEventsManagerProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "webinar",
    start_time: "",
    end_time: "",
    location: "",
    meeting_url: "",
    is_published: false,
    is_featured: false,
    max_attendees: "",
  });

  useEffect(() => {
    fetchEvents();
  }, [partnerId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("partner_id", partnerId)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.start_time) {
      toast.error("Title and start time are required");
      return;
    }

    try {
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        location: formData.location || null,
        meeting_url: formData.meeting_url || null,
        is_published: formData.is_published,
        is_featured: formData.is_featured,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update({ ...eventData, updated_at: new Date().toISOString() })
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast.success("Event updated");
      } else {
        const { error } = await supabase
          .from("events")
          .insert({ ...eventData, partner_id: partnerId });

        if (error) throw error;
        toast.success("Event created");
      }

      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      toast.success("Event deleted");
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const togglePublished = async (event: Event) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_published: !event.is_published })
        .eq("id", event.id);

      if (error) throw error;
      setEvents(events.map((e) => 
        e.id === event.id ? { ...e, is_published: !e.is_published } : e
      ));
      toast.success(event.is_published ? "Event unpublished" : "Event published");
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update event");
    }
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time?.slice(0, 16) || "",
      location: event.location || "",
      meeting_url: event.meeting_url || "",
      is_published: event.is_published,
      is_featured: event.is_featured,
      max_attendees: event.max_attendees?.toString() || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      event_type: "webinar",
      start_time: "",
      end_time: "",
      location: "",
      meeting_url: "",
      is_published: false,
      is_featured: false,
      max_attendees: "",
    });
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="md" text="Loading events..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Event" : "Create Event"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="live_stream">Live Stream</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Physical location or 'Online'"
                />
              </div>
              <div className="space-y-2">
                <Label>Meeting URL</Label>
                <Input
                  value={formData.meeting_url}
                  onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                  placeholder="https://zoom.us/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Max Attendees</Label>
                <Input
                  type="number"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Published</Label>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingEvent ? "Update" : "Create"} Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No events found. Create your first event above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      {event.is_featured && (
                        <Badge variant="secondary" className="text-xs">Featured</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.start_time), "MMM d, yyyy h:mm a")}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                      {event.meeting_url && (
                        <Video className="h-3 w-3" />
                      )}
                    </div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {event.event_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={event.is_published}
                      onCheckedChange={() => togglePublished(event)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(event)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
