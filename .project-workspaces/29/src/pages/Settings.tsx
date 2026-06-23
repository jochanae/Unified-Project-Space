import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { UsernameEditor } from "@/components/settings/UsernameEditor";
import { QuinnKnowsMe } from "@/components/settings/QuinnKnowsMe";
import { VoiceSelector } from "@/components/settings/VoiceSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account preferences
          </p>
        </div>

        {/* Quinn's Voice */}
        <VoiceSelector />

        {/* Quinn Knows Me - Profile for personalized mentorship */}
        <QuinnKnowsMe />

        {/* Username Editor */}
        <UsernameEditor />

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PushNotificationToggle />
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
