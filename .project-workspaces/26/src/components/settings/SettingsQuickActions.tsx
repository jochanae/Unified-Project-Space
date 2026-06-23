import { User, Shield, Bell, Lock, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
  variant?: 'primary' | 'default';
  iconBgColor?: string;
  borderColor?: string;
}

function QuickActionCard({ 
  icon, 
  label, 
  sublabel, 
  onClick, 
  variant = 'default',
  iconBgColor,
  borderColor 
}: QuickActionProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
        isPrimary 
          ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-500' 
          : `bg-white dark:bg-card border-2 ${borderColor || 'border-purple-200 dark:border-purple-800/30'} hover:shadow-lg`
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isPrimary 
            ? 'bg-white/20' 
            : iconBgColor || 'bg-gray-100'
        }`}>
          {icon}
        </div>
        <div>
          <p className={`font-semibold ${isPrimary ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`}>
            {label}
          </p>
          <p className={`text-xs ${isPrimary ? 'text-white/80' : 'text-muted-foreground'}`}>
            {sublabel}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SettingsQuickActionsProps {
  onNavigate: (section: string) => void;
}

export function SettingsQuickActions({ onNavigate }: SettingsQuickActionsProps) {
  const quickActions = [
    { 
      icon: <User className="h-6 w-6 text-white" />, 
      label: 'Edit Profile', 
      sublabel: 'Personal info',
      section: 'profile',
      variant: 'primary' as const,
      iconBgColor: '',
      borderColor: ''
    },
    { 
      icon: <Shield className="h-6 w-6 text-red-500" />, 
      label: 'Security', 
      sublabel: 'Password & 2FA',
      section: 'security',
      variant: 'default' as const,
      iconBgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800/30'
    },
    { 
      icon: <Bell className="h-6 w-6 text-yellow-600" />, 
      label: 'Notifications', 
      sublabel: 'Alert settings',
      section: 'notifications',
      variant: 'default' as const,
      iconBgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
      borderColor: 'border-yellow-300 dark:border-yellow-800/30'
    },
    { 
      icon: <Lock className="h-6 w-6 text-gray-500" />, 
      label: 'Privacy', 
      sublabel: 'Data settings',
      section: 'privacy',
      variant: 'default' as const,
      iconBgColor: 'bg-gray-100 dark:bg-gray-800/50',
      borderColor: 'border-gray-300 dark:border-gray-700/50'
    },
    { 
      icon: <HelpCircle className="h-6 w-6 text-emerald-500" />, 
      label: 'Help & Support', 
      sublabel: 'Get assistance',
      section: 'help',
      variant: 'default' as const,
      iconBgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-300 dark:border-emerald-800/30'
    },
  ];

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        <p className="text-sm text-muted-foreground mb-4">Jump to any settings section quickly</p>
        
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <QuickActionCard
              key={index}
              icon={action.icon}
              label={action.label}
              sublabel={action.sublabel}
              onClick={() => onNavigate(action.section)}
              variant={action.variant}
              iconBgColor={action.iconBgColor}
              borderColor={action.borderColor}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
