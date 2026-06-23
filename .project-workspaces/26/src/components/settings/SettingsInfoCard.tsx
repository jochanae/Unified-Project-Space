import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function SettingsInfoCard() {
  return (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute right-10 bottom-0 w-24 h-24 rounded-full bg-purple-200/40 dark:bg-purple-800/20" />
      <div className="absolute left-20 bottom-10 w-16 h-16 rounded-full bg-blue-200/40 dark:bg-blue-800/20" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center flex-shrink-0">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <span className="text-lg">💡</span>
              Settings (Your CoinsBloom Preferences)
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• <strong>Profile & Subscription:</strong> Manage your account, payment methods, and plan</li>
              <li>• <strong>Security:</strong> PIN lock, two-factor authentication</li>
              <li>• <strong>Dashboard:</strong> Customize which cards appear and adjust your display</li>
              <li>• <strong>Notifications & Privacy:</strong> Control alerts, data retention, and exports</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Make CoinsBloom work exactly how you want - from appearance to security to family settings.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
