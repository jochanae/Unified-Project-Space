import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, ExternalLink, Globe, Link2 } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tagline: string | null;
  contact_info: string | null;
  highlights_text: string | null;
  external_website_url: string | null;
  seats_purchased: number;
  seats_used: number;
  subscription_status: string;
  show_name_with_logo?: boolean;
}

interface PartnerSettingsManagerProps {
  partner: Partner;
  onUpdate: () => void;
}

export function PartnerSettingsManager({ partner, onUpdate }: PartnerSettingsManagerProps) {
  const [formData, setFormData] = useState({
    name: partner.name,
    logo_url: partner.logo_url || "",
    primary_color: partner.primary_color || "#10B981",
    secondary_color: partner.secondary_color || "#1A1A1A",
    tagline: partner.tagline || "",
    contact_info: partner.contact_info || "",
    highlights_text: partner.highlights_text || "",
    external_website_url: partner.external_website_url || "",
    show_name_with_logo: partner.show_name_with_logo || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("partners")
        .update({
          name: formData.name,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          tagline: formData.tagline || null,
          contact_info: formData.contact_info || null,
          highlights_text: formData.highlights_text || null,
          external_website_url: formData.external_website_url || null,
          show_name_with_logo: formData.show_name_with_logo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partner.id);

      if (error) throw error;
      toast.success("Settings saved");
      onUpdate();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://..."
            />
            {formData.logo_url && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-3">
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="h-10 object-contain"
                  />
                  {formData.show_name_with_logo && (
                    <span className="font-semibold text-foreground">{formData.name}</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="show-name">Show name alongside logo</Label>
                    <p className="text-xs text-muted-foreground">
                      Display your organization name next to the logo
                    </p>
                  </div>
                  <Switch
                    id="show-name"
                    checked={formData.show_name_with_logo}
                    onCheckedChange={(v) => setFormData({ ...formData, show_name_with_logo: v })}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <p className="text-xs text-muted-foreground">Main brand color for your header</p>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gradient Color (Optional)</Label>
              <p className="text-xs text-muted-foreground">Secondary color for gradient effect</p>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="flex-1"
                  placeholder="Same as primary for solid color"
                />
              </div>
            </div>
          </div>
          <div 
            className="h-16 rounded-lg flex items-center justify-center"
            style={{
              background: formData.secondary_color && formData.secondary_color !== formData.primary_color
                ? `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`
                : formData.primary_color
            }}
          >
            <span className="text-white font-semibold text-sm">Header Preview</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Landing Page Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tagline (Optional)</Label>
            <Input
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="e.g., Financial wellness tools for your customers"
            />
            <p className="text-xs text-muted-foreground">
              Custom tagline displayed below your logo on the landing page
            </p>
          </div>
          <div className="space-y-2">
            <Label>About / Highlights (Optional)</Label>
            <Textarea
              value={formData.highlights_text}
              onChange={(e) => setFormData({ ...formData, highlights_text: e.target.value })}
              placeholder="Tell visitors about your organization and why you recommend this tool..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This will appear in the "About" section of your landing page
            </p>
          </div>
          <div className="space-y-2">
            <Label>External Website URL (Optional)</Label>
            <Input
              value={formData.external_website_url}
              onChange={(e) => setFormData({ ...formData, external_website_url: e.target.value })}
              placeholder="https://yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Link to your main website for visitors who want to learn more
            </p>
          </div>
          <div className="space-y-2">
            <Label>Contact Information (Optional)</Label>
            <Textarea
              value={formData.contact_info}
              onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
              placeholder="Phone: (555) 123-4567&#10;Email: contact@company.com&#10;Address: 123 Main St"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Contact details shown on your landing page
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save All Settings"}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{partner.subscription_status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seats</p>
              <p className="font-semibold">{partner.seats_used} / {partner.seats_purchased}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Setup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Your Partner Links
          </CardTitle>
          <CardDescription>
            Share these links with your customers or set up your own domain redirect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Partner Landing Page URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Partner Landing Page
            </Label>
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={`${window.location.origin}/p/${partner.slug}`}
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/p/${partner.slug}`);
                  toast.success("Link copied!");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(`/p/${partner.slug}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your branded landing page where customers can sign up
            </p>
          </div>

          {/* Domain Redirect Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
            <h4 className="font-medium text-sm">Want to use your own domain?</h4>
            <p className="text-xs text-muted-foreground">
              You can point your domain (e.g., <span className="font-mono">financialtools.yourcompany.com</span>) to your CoinsBloom partner page using a simple redirect.
            </p>
            
            <div className="space-y-2">
              <p className="text-xs font-medium">How to set up:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                <li>Find "URL Redirect" or "Forwarding" settings</li>
                <li>Set up a redirect from your domain to:</li>
              </ol>
              <div className="flex items-center gap-2 mt-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/p/${partner.slug}`}
                  className="font-mono text-xs bg-background"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/p/${partner.slug}`);
                    toast.success("URL copied!");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Choose "301 Permanent Redirect" if your registrar asks for redirect type.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}