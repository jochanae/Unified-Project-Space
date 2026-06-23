import { 
  User, Bell, Shield, Link2, CreditCard, Baby, Lock, 
  LayoutDashboard, Download, HelpCircle, Trash2, Heart, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  showArrow?: boolean;
  className?: string;
}

function MenuItem({ icon, label, onClick, showArrow = true, className = '' }: MenuItemProps) {
  return (
    <button 
      className={`w-full flex items-center justify-between py-4 px-2 hover:bg-muted/50 rounded-lg transition-colors ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      {showArrow && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </button>
  );
}

interface SettingsMenuProps {
  onNavigate: (section: string) => void;
}

export function SettingsMenu({ onNavigate }: SettingsMenuProps) {
  return (
    <Card>
      <CardContent className="p-2">
        {/* Plan & Billing */}
        <p className="text-sm text-muted-foreground px-2 py-2">Plan & Billing</p>
        <div 
          className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 mb-4 cursor-pointer hover:from-purple-700 hover:to-purple-800 transition-colors"
          onClick={() => onNavigate('billing')}
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5" />
              <div>
                <p className="font-semibold">Subscription</p>
                <p className="text-sm text-white/80">Manage plan</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>

        <Separator className="my-2" />

        {/* Main Menu Items */}
        <MenuItem 
          icon={<User className="h-5 w-5 text-muted-foreground" />}
          label="Profile"
          onClick={() => onNavigate('profile')}
        />
        <MenuItem 
          icon={<Bell className="h-5 w-5 text-muted-foreground" />}
          label="Notifications"
          onClick={() => onNavigate('notifications')}
        />
        <MenuItem 
          icon={<Shield className="h-5 w-5 text-muted-foreground" />}
          label="Security"
          onClick={() => onNavigate('security')}
        />
        <MenuItem 
          icon={<Link2 className="h-5 w-5 text-muted-foreground" />}
          label="Integrations"
          onClick={() => onNavigate('integrations')}
        />
        <MenuItem 
          icon={<><Baby className="h-5 w-5 text-muted-foreground" /><span className="ml-1">👶</span></>}
          label="My Kids"
          onClick={() => onNavigate('kids')}
        />
        <MenuItem 
          icon={<Lock className="h-5 w-5 text-muted-foreground" />}
          label="Privacy"
          onClick={() => onNavigate('privacy')}
        />
        <MenuItem 
          icon={<LayoutDashboard className="h-5 w-5 text-muted-foreground" />}
          label="Display & Preferences"
          onClick={() => onNavigate('dashboard')}
        />
        <MenuItem 
          icon={<Download className="h-5 w-5 text-muted-foreground" />}
          label="Data Export"
          onClick={() => onNavigate('export')}
        />
        <MenuItem 
          icon={<HelpCircle className="h-5 w-5 text-muted-foreground" />}
          label="Help & Support"
          onClick={() => onNavigate('help')}
        />
        <MenuItem 
          icon={<Trash2 className="h-5 w-5 text-muted-foreground" />}
          label="Reset Account"
          onClick={() => onNavigate('reset')}
        />
        <MenuItem 
          icon={<Heart className="h-5 w-5 text-muted-foreground" />}
          label="Support Development"
          onClick={() => onNavigate('support')}
        />
      </CardContent>
    </Card>
  );
}
