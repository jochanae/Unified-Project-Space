import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Save } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";

export default function FounderProfileManager() {
  const [profile, setProfile] = useState({ name: "", title: "", bio: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase.from("founder_profile").select("*").limit(1).maybeSingle();
    if (data) setProfile(data);
    setLoading(false);
  };

  const saveProfile = async (updatedProfile?: typeof profile) => {
    const profileToSave = updatedProfile || profile;
    const { data: existing } = await supabase.from("founder_profile").select("id").limit(1).maybeSingle();
    if (existing) {
      await supabase.from("founder_profile").update(profileToSave).eq("id", existing.id);
    } else {
      await supabase.from("founder_profile").insert(profileToSave);
    }
    toast.success("Profile saved");
  };

  // Auto-save when avatar changes
  const handleAvatarChange = async (url: string) => {
    const updatedProfile = { ...profile, avatar_url: url };
    setProfile(updatedProfile);
    // Auto-save immediately when photo is uploaded
    if (url) {
      await saveProfile(updatedProfile);
    }
  };

  if (loading) return <div className="text-white/60 text-center py-8">Loading...</div>;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <User className="h-5 w-5 text-amber-400" />
          Founder Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-amber-600 text-white text-xl">{profile.name?.[0] || "F"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <ImageUploader
              value={profile.avatar_url}
              onChange={handleAvatarChange}
              bucket="avatars"
              folder="founder"
              label="Avatar"
              className="[&_label]:text-white [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Name</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-white">Title</Label>
            <Input value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div>
          <Label className="text-white">Bio</Label>
          <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="bg-white/5 border-white/10 text-white" />
        </div>
        <Button onClick={() => saveProfile()} className="w-full gap-2"><Save className="h-4 w-4" /> Save Profile</Button>
      </CardContent>
    </Card>
  );
}
