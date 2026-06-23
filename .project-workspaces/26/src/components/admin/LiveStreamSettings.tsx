import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Radio, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LiveStreamConfig {
  id?: string;
  enabled: boolean;
  stream_url: string;
  stream_title: string;
}

export default function LiveStreamSettings() {
  const [config, setConfig] = useState<LiveStreamConfig>({
    enabled: false,
    stream_url: "",
    stream_title: "Live Stream",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("livestream_settings")
        .select("*")
        .is("partner_id", null)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          enabled: data.enabled,
          stream_url: data.stream_url || "",
          stream_title: data.stream_title || "Live Stream",
        });
      }
    } catch (error) {
      console.error("Error fetching livestream settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof LiveStreamConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config.stream_url && config.enabled) {
      toast.error("Please enter a stream URL");
      return;
    }

    setSaving(true);
    try {
      if (config.id) {
        // Update existing
        const { error } = await supabase
          .from("livestream_settings")
          .update({
            enabled: config.enabled,
            stream_url: config.stream_url,
            stream_title: config.stream_title,
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        // Insert new (global settings with partner_id = null)
        const { data, error } = await supabase
          .from("livestream_settings")
          .insert({
            enabled: config.enabled,
            stream_url: config.stream_url,
            stream_title: config.stream_title,
            partner_id: null,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id }));
        }
      }

      toast.success(config.enabled ? "Live stream is now ACTIVE!" : "Live stream settings saved");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Radio className={`h-5 w-5 ${config.enabled ? "text-red-500 animate-pulse" : "text-red-400"}`} />
            Live Stream Configuration
            {config.enabled && (
              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div>
              <Label className="text-white font-medium">Enable Live Streaming</Label>
              <p className="text-white/60 text-sm mt-1">
                When enabled, this will replace the featured videos on the dashboard
              </p>
            </div>
            <Switch 
              checked={config.enabled}
              onCheckedChange={(checked) => handleChange("enabled", checked)}
            />
          </div>

          {config.enabled && !config.stream_url && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <p className="text-amber-200 text-sm">Add a stream URL to go live</p>
            </div>
          )}

          <div>
            <Label className="text-white">Stream Title</Label>
            <Input 
              placeholder="Live Stream" 
              className="bg-white/5 border-white/10 text-white mt-1"
              value={config.stream_title}
              onChange={(e) => handleChange("stream_title", e.target.value)}
            />
          </div>

          <div>
            <Label className="text-white">Stream URL</Label>
            <Input 
              placeholder="https://youtube.com/embed/... or https://vimeo.com/..." 
              className="bg-white/5 border-white/10 text-white mt-1"
              value={config.stream_url}
              onChange={(e) => handleChange("stream_url", e.target.value)}
            />
            <p className="text-white/50 text-xs mt-1">
              Use embed URLs from YouTube, Vimeo, or other streaming platforms
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            variant={config.enabled && config.stream_url ? "destructive" : "default"}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              config.enabled && config.stream_url ? "Go Live Now" : "Save Settings"
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Settings Saved
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}