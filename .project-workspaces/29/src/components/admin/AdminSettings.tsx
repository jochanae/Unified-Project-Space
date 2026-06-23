import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCommunityEnabled } from "@/hooks/useCommunityEnabled";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { Users } from "lucide-react";

export function AdminSettings() {
  const { enabled, isLoading, toggle } = useCommunityEnabled();

  const handleToggle = async () => {
    const newValue = await toggle();
    toast.success(`Community page ${newValue ? 'enabled' : 'disabled'}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Feature Toggles
          </CardTitle>
          <CardDescription>
            Enable or disable app-wide features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="community-toggle" className="text-base font-medium">
                Community Page
              </Label>
              <p className="text-sm text-muted-foreground">
                When disabled, the Community link is hidden from navigation and /community redirects to the Dashboard.
              </p>
            </div>
            <Switch
              id="community-toggle"
              checked={!!enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
