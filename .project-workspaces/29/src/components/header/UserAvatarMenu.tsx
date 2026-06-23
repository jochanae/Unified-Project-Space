import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Crown, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Camera,
  Loader2,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function UserAvatarMenu() {
  const { user, profile, subscriptionTier, role, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const isAdmin = role === 'admin' || role === 'super_admin';

  // Admins always display as Pro tier
  const displayTier = isAdmin ? 'pro' as const : subscriptionTier;

  const tierLabels = {
    free: 'Free Plan',
    learner: 'Learner',
    pro: 'Pro',
  };

  const tierColors = {
    free: 'bg-muted text-muted-foreground',
    learner: 'bg-primary/10 text-primary',
    pro: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  // Get avatar URL - prefer custom upload, then Google OAuth, then fallback
  const getAvatarUrl = () => {
    // Check for custom uploaded avatar first
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    // Check for Google OAuth avatar from user metadata
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    if (user?.user_metadata?.picture) {
      return user.user_metadata.picture;
    }
    return null;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // First, try to remove existing avatar if any
      await supabase.storage
        .from('cms-images')
        .remove([`avatars/${user.id}`]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(`avatars/${fileName}`, file, { 
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cms-images')
        .getPublicUrl(`avatars/${fileName}`);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Avatar updated!');
      
      // Refresh profile data without full page reload
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      await supabase.auth.refreshSession();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const avatarUrl = getAvatarUrl();

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-14 w-14 rounded-full p-0 hover:ring-2 hover:ring-primary/50 transition-all"
          >
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarImage src={avatarUrl || undefined} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-chart-3/20 text-foreground font-bold text-lg">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
              </p>
              {profile?.username && (
                <p className="text-xs text-primary font-medium">
                  @{profile.username}
                </p>
              )}
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
              <span
                className={`inline-flex items-center w-fit h-4 text-[10px] px-1.5 rounded-md font-medium mt-1 ${tierColors[displayTier]}`}
              >
                {displayTier === 'pro' && <Crown className="h-3 w-3 mr-0.5" />}
                {tierLabels[displayTier]}
              </span>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Change Avatar'}
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/pricing" className="cursor-pointer">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Panel
                </Link>
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive cursor-pointer" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
