import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellRing, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  Settings,
  Trash2,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface CreditScore {
  id: string;
  score: number;
  bureau: string;
  score_date: string;
}

interface Alert {
  id: string;
  type: 'increase' | 'decrease' | 'milestone';
  message: string;
  date: string;
  isRead: boolean;
  scoreChange?: number;
}

interface CreditScoreAlertsProps {
  creditScores: CreditScore[];
}

const CreditScoreAlerts = ({ creditScores }: CreditScoreAlertsProps) => {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [significantChangeThreshold, setSignificantChangeThreshold] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [previousAlertsCount, setPreviousAlertsCount] = useState(0);

  const { 
    permission, 
    isSupported, 
    requestPermission, 
    sendNotification 
  } = usePushNotifications();

  // Load push notification preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('creditAlertsPushEnabled');
    if (saved === 'true' && permission === 'granted') {
      setPushNotificationsEnabled(true);
    }
  }, [permission]);

  // Generate alerts based on score changes
  useEffect(() => {
    if (creditScores.length < 2) return;

    const generatedAlerts: Alert[] = [];
    
    for (let i = 0; i < creditScores.length - 1; i++) {
      const current = creditScores[i];
      const previous = creditScores[i + 1];
      const change = current.score - previous.score;
      
      // Significant change alert
      if (Math.abs(change) >= significantChangeThreshold) {
        generatedAlerts.push({
          id: `change-${current.id}`,
          type: change > 0 ? 'increase' : 'decrease',
          message: change > 0 
            ? `Your credit score increased by ${change} points!`
            : `Your credit score decreased by ${Math.abs(change)} points.`,
          date: current.score_date,
          isRead: false,
          scoreChange: change,
        });
      }
      
      // Milestone alerts
      const milestones = [800, 750, 700, 670, 580];
      milestones.forEach(milestone => {
        if (previous.score < milestone && current.score >= milestone) {
          generatedAlerts.push({
            id: `milestone-${milestone}-${current.id}`,
            type: 'milestone',
            message: `Congratulations! You've reached a ${milestone}+ credit score!`,
            date: current.score_date,
            isRead: false,
          });
        }
      });
    }

    // Check if score hasn't been updated in 30+ days
    if (creditScores.length > 0) {
      const latestDate = parseISO(creditScores[0].score_date);
      const daysSinceUpdate = differenceInDays(new Date(), latestDate);
      
      if (daysSinceUpdate >= 30) {
        generatedAlerts.unshift({
          id: 'reminder-update',
          type: 'decrease',
          message: `It's been ${daysSinceUpdate} days since your last credit score update. Consider checking your score!`,
          date: new Date().toISOString().split('T')[0],
          isRead: false,
        });
      }
    }

    const newAlerts = generatedAlerts.slice(0, 10);
    
    // Show in-app toast for new alerts (push notifications removed for manual score entry)
    if (newAlerts.length > previousAlertsCount && previousAlertsCount > 0) {
      const newestAlert = newAlerts[0];
      if (newestAlert && !newestAlert.isRead) {
        // Show a toast notification instead of push
        toast(newestAlert.message, {
          description: newestAlert.type === 'milestone' ? '🎉 Keep up the great work!' : undefined,
        });
      }
    }
    
    setPreviousAlertsCount(newAlerts.length);
    setAlerts(newAlerts);
  }, [creditScores, significantChangeThreshold]);

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      if (permission === 'granted') {
        setPushNotificationsEnabled(true);
        localStorage.setItem('creditAlertsPushEnabled', 'true');
        toast.success('Push notifications enabled for credit alerts');
      } else {
        const granted = await requestPermission();
        if (granted) {
          setPushNotificationsEnabled(true);
          localStorage.setItem('creditAlertsPushEnabled', 'true');
        }
      }
    } else {
      setPushNotificationsEnabled(false);
      localStorage.setItem('creditAlertsPushEnabled', 'false');
      toast.success('Push notifications disabled');
    }
  };

  const testPushNotification = () => {
    if (permission === 'granted') {
      sendNotification({
        title: '🎉 Credit Score Milestone!',
        body: 'This is a test notification!',
        tag: 'credit-test',
      });
      toast.success('Test notification sent!');
    } else {
      toast.error('Please enable push notifications first');
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast.success('Alert dismissed');
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'increase': return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case 'decrease': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'milestone': return <CheckCircle className="h-5 w-5 text-primary" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'increase': return 'border-emerald-500/30 bg-emerald-500/10';
      case 'decrease': return 'border-red-500/30 bg-red-500/10';
      case 'milestone': return 'border-primary/30 bg-primary/10';
    }
  };

  if (creditScores.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Credit Score Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-1"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get notified about significant changes to your credit score
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-muted/50 rounded-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="alerts-enabled" className="font-medium">Enable Alerts</Label>
                  <p className="text-xs text-muted-foreground">Receive notifications about score changes</p>
                </div>
                <Switch
                  id="alerts-enabled"
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
              </div>

              {/* Push Notifications Toggle */}
              {isSupported && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="push-enabled" className="font-medium">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Get browser notifications for alerts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pushNotificationsEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={testPushNotification}
                        className="text-xs"
                      >
                        Test
                      </Button>
                    )}
                    <Switch
                      id="push-enabled"
                      checked={pushNotificationsEnabled}
                      onCheckedChange={handlePushToggle}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="threshold">Significant Change Threshold</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="threshold"
                    type="number"
                    min={5}
                    max={100}
                    value={significantChangeThreshold}
                    onChange={(e) => setSignificantChangeThreshold(parseInt(e.target.value) || 20)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">points</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alert when score changes by this many points or more
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alerts List */}
        {alertsEnabled ? (
          alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => markAsRead(alert.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all group ${getAlertColor(alert.type)} ${
                    !alert.isRead ? 'ring-1 ring-primary/50' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!alert.isRead ? 'font-medium' : ''}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(alert.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No alerts yet</p>
              <p className="text-sm">You'll see notifications here when your score changes significantly</p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Alerts are disabled</p>
            <p className="text-sm">Enable alerts in settings to receive notifications</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditScoreAlerts;
