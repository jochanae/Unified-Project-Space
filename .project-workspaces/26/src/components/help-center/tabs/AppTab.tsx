import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Zap, 
  Smartphone, 
  Bell, 
  Wifi, 
  WifiOff, 
  CheckCircle2,
  Chrome,
  Apple
} from "lucide-react";

interface AppTabProps {
  searchQuery?: string;
}

export const AppTab = ({ searchQuery }: AppTabProps) => {
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Install CoinsBloom as an App</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Get faster access, offline support, and home screen shortcuts
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* What is PWA */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">✨</span>
            What is a Progressive Web App (PWA)?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            A Progressive Web App is an app that works on your device just like a native mobile app or desktop application. It's not downloaded from an app store—instead, you install it directly from your browser while using CoinsBloom.
          </p>
        </CardContent>
      </Card>

      {/* Benefits */}
      <div className="space-y-4">
        <Card className="bg-bloom-green/5 border-bloom-green/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-bloom-green shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Faster Access</h3>
                <p className="text-sm text-bloom-green">Launch from home screen like any app</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bloom-blue/5 border-bloom-blue/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Smartphone className="w-6 h-6 text-bloom-blue shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Home Screen Shortcuts</h3>
                <p className="text-sm text-bloom-blue">Long-press app icon for quick actions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Bell className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-sm text-yellow-600">Get bill reminders and budget alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <WifiOff className="w-6 h-6 text-muted-foreground shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Works Offline</h3>
                <p className="text-sm text-muted-foreground">Access your data even without internet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">No App Store Required</h3>
                <p className="text-sm text-primary">Install directly from your browser</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installation Instructions */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">How to Install</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Android/Chrome */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Chrome className="w-5 h-5 text-foreground" />
              <h3 className="font-semibold text-foreground">Android / Chrome</h3>
            </div>
            <ol className="space-y-2 ml-7 text-sm text-muted-foreground list-decimal">
              <li>Open CoinsBloom in Chrome browser</li>
              <li>Tap the menu icon (three dots) in the top right</li>
              <li>Select "Add to Home screen" or "Install app"</li>
              <li>Tap "Install" to confirm</li>
              <li>Find CoinsBloom on your home screen!</li>
            </ol>
          </div>

          {/* iOS/Safari */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-foreground" />
              <h3 className="font-semibold text-foreground">iPhone / iPad (Safari)</h3>
            </div>
            <ol className="space-y-2 ml-7 text-sm text-muted-foreground list-decimal">
              <li>Open CoinsBloom in Safari browser</li>
              <li>Tap the Share button (square with arrow)</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" in the top right corner</li>
              <li>CoinsBloom is now on your home screen!</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <Card className="bg-muted/50 border-border/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> The installed app uses the same login as the website. 
            All your data syncs automatically between devices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
