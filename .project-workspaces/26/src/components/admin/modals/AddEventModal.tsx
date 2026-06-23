import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

export default function AddEventModal({ open, onOpenChange, onSuccess, editData }: AddEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: editData?.title || "",
    description: editData?.description || "",
    event_type: editData?.event_type || "webinar",
    start_time: editData?.start_time ? new Date(editData.start_time).toISOString().slice(0, 16) : "",
    end_time: editData?.end_time ? new Date(editData.end_time).toISOString().slice(0, 16) : "",
    location: editData?.location || "",
    meeting_url: editData?.meeting_url || "",
    image_url: editData?.image_url || "",
    max_attendees: editData?.max_attendees || "",
    is_featured: editData?.is_featured ?? false,
    is_published: editData?.is_published ?? false,
  });

  const handleSubmit = async () => {
    if (!form.title || !form.start_time) {
      toast.error("Title and start time are required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      };

      if (editData?.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Event updated");
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
        toast.success("Event created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit" : "Add"} Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <Label>Event Type</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webinar">Webinar</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="livestream">Livestream</SelectItem>
                <SelectItem value="qa">Q&A Session</SelectItem>
                <SelectItem value="meetup">Meetup</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Online or physical location"
              />
            </div>
            <div>
              <Label>Max Attendees</Label>
              <Input
                type="number"
                value={form.max_attendees}
                onChange={(e) => setForm({ ...form, max_attendees: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Meeting URL</Label>
            <Input
              value={form.meeting_url}
              onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
              placeholder="Zoom, Google Meet, etc."
            />
          </div>

          <ImageUploader
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            bucket="avatars"
            folder="events"
            label="Event Image"
          />

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <Label>Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>Published</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editData ? "Update" : "Create"} Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
