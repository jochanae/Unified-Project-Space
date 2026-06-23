import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import AddEventModal from "./modals/AddEventModal";

export default function EventsManager() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("start_time", { ascending: true });
    if (data) setEvents(data);
    setLoading(false);
  };

  const togglePublished = async (id: string, status: boolean) => {
    await supabase.from("events").update({ is_published: !status }).eq("id", id);
    setEvents(events.map((e) => (e.id === id ? { ...e, is_published: !status } : e)));
    toast.success("Updated");
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setEvents(events.filter((e) => e.id !== id));
    toast.success("Event deleted");
  };

  const openEdit = (event: any) => {
    setEditData(event);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium text-white">Events & Webinars</h3>
        <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Event</Button>
      </div>
      <div className="space-y-2">
        {loading ? <div className="text-white/60 text-center py-8">Loading...</div> : events.length === 0 ? <div className="text-white/60 text-center py-8">No events scheduled</div> : events.map((event) => (
          <Card key={event.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-4">
              <Calendar className="h-5 w-5 text-blue-400" />
              <div className="flex-1">
                <h3 className="text-white font-medium">{event.title}</h3>
                <p className="text-white/60 text-sm">{format(new Date(event.start_time), "MMM d, yyyy h:mm a")} • {event.event_type}</p>
              </div>
              <Switch checked={event.is_published} onCheckedChange={() => togglePublished(event.id, event.is_published)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(event)} className="text-white/60">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteEvent(event.id)} className="text-red-400">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <AddEventModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchEvents} editData={editData} />
    </div>
  );
}
