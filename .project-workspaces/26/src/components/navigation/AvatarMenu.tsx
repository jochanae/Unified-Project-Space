import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  CreditCard, 
  DollarSign, 
  Bell, 
  Settings, 
  LogOut,
  Crown,
  Shield,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

type UserRole = 'admin' | 'moderator' | 'user' | null;

export function AvatarMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Fetch profile data, role, and subscription from database
  useEffect(() => {
    const fetchProfileAndRole = async () => {
      if (!user) return;
      
      // Skip for kid accounts (internal emails)
      if (user.email?.includes('@kidsbloom.internal')) return;
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, profile_image_url")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch user role - prioritize admin > moderator > user
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("role", { ascending: true }); // 'admin' comes before 'moderator' before 'user' alphabetically
      
      // Find highest priority role (super_admin > admin > moderator > user)
      const roles = roleData?.map(r => r.role) || [];
      let highestRole: UserRole = null;
      if (roles.includes('super_admin')) {
        highestRole = 'admin'; // Treat super_admin as admin in UI
      } else if (roles.includes('admin')) {
        highestRole = 'admin';
      } else if (roles.includes('moderator')) {
        highestRole = 'moderator';
      } else if (roles.length > 0) {
        highestRole = 'user';
      }
      
      if (highestRole) {
        setUserRole(highestRole);
        // Admins/moderators are treated as premium
        if (highestRole === 'admin' || highestRole === 'moderator') {
          setIsPremium(true);
        }
      }

      // Check subscription status for non-admin users
      if (!highestRole || (highestRole !== 'admin' && highestRole !== 'moderator')) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const { data: subData } = await supabase.functions.invoke('check-subscription', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            if (subData?.subscribed) {
              setIsPremium(true);
            }
          }
        } catch {
          // Subscription check failed, user remains free
        }
      }
    };
    
    fetchProfileAndRole();
  }, [user]);

  // Get first letter of first name + first letter of last name for initials
  const getInitials = () => {
    // First check profile data from database
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    }
    
    // Fallback to user metadata
    const fullName = user?.user_metadata?.full_name;
    if (fullName) {
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    // Last fallback - first letter of email
    return user?.email?.[0]?.toUpperCase() || "U";
  };
  
  const userInitials = getInitials();

  // Get avatar URL - prioritize profile, then user metadata
  const avatarUrl = profile?.profile_image_url || user?.user_metadata?.avatar_url;

  // Get display name
  const userName = profile?.first_name 
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";

  // Get role badge config
  const getRoleBadge = () => {
    switch (userRole) {
      case 'admin':
        return {
          icon: Crown,
          label: 'SUPER ADMIN',
          className: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 font-bold',
          showCrown: true
        };
      case 'moderator':
        return {
          icon: Shield,
          label: 'Moderator',
          className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0',
          showCrown: false
        };
      default:
        return null;
    }
  };

  // Get subscription badge for premium users (who aren't admin/mod)
  const getSubscriptionBadge = () => {
    if (userRole === 'admin' || userRole === 'moderator') return null;
    if (isPremium) {
      return {
        icon: Sparkles,
        label: 'Premium',
        className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0'
      };
    }
    return null;
  };

  const roleBadge = getRoleBadge();
  const subscriptionBadge = getSubscriptionBadge();
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const menuItems = [
    { icon: User, label: "My Profile", action: () => navigate("/settings?tab=profile") },
    { icon: CreditCard, label: "Subscription & Billing", action: () => navigate("/settings?tab=billing") },
    { icon: DollarSign, label: "Currency Settings", action: () => navigate("/settings?tab=currency") },
    { icon: Bell, label: "Notifications", action: () => navigate("/settings?tab=notifications") },
    { icon: Settings, label: "All Settings", action: () => navigate("/settings") },
  ];

  const { isOnline } = useConnectionStatus();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none relative">
          <Avatar
            className="h-12 w-12 rounded-xl hover:scale-105 transition-transform cursor-pointer"
            style={{
              boxShadow: isOnline
                ? '0 0 0 2.5px hsl(150,60%,50%), 0 0 10px 2px hsl(150,60%,50%,0.3)'
                : '0 0 0 2.5px hsl(0,60%,50%), 0 0 10px 2px hsl(0,60%,50%,0.3)',
              borderRadius: '0.75rem',
            }}
          >
            <AvatarImage src={avatarUrl || undefined} className="object-cover w-full h-full rounded-xl" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold rounded-xl">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64 p-2 obsidian-surface">
        {/* User Info Header */}
        <DropdownMenuLabel className="pb-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-foreground">{userName}</span>
              {(roleBadge?.showCrown || isPremium) && (
                <Crown className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <span className="text-sm font-normal obsidian-secondary">{userEmail}</span>
            {roleBadge && (
              <Badge className={`text-xs px-2.5 py-1 h-auto w-fit ${roleBadge.className}`}>
                <roleBadge.icon className="h-3.5 w-3.5 mr-1.5" />
                {roleBadge.label}
              </Badge>
            )}
            {subscriptionBadge && (
              <Badge className={`text-xs px-2.5 py-1 h-auto w-fit ${subscriptionBadge.className}`}>
                <subscriptionBadge.icon className="h-3.5 w-3.5 mr-1.5" />
                {subscriptionBadge.label}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Menu Items */}
        {menuItems.map((item) => (
          <DropdownMenuItem 
            key={item.label}
            onClick={item.action}
            className="py-2.5 px-3 cursor-pointer"
          >
            <item.icon className="h-4 w-4 mr-3 text-muted-foreground" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Logout */}
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="py-2.5 px-3 cursor-pointer text-red-500 focus:text-red-500"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AvatarMenu;
