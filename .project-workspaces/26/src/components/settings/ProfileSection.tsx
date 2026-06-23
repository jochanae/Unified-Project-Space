import { useState, useEffect, useRef } from 'react';
import { Camera, User, Mail, Phone, Globe, Save, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProfileSectionProps {
  user: any;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada) (UTC-5/UTC-4)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada) (UTC-6/UTC-5)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada) (UTC-7/UTC-6)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada) (UTC-8/UTC-7)' },
  { value: 'Europe/London', label: 'London (UTC+0/UTC+1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/UTC+2)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/UTC+11)' },
];

export function ProfileSection({ user }: ProfileSectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    timezone: 'America/New_York',
    profileImageUrl: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      // Check for Google avatar from user metadata
      const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      if (googleAvatar) {
        setGoogleAvatarUrl(googleAvatar);
      }
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        email: data.email || user.email,
        phone: '',
        timezone: 'America/New_York',
        profileImageUrl: data.profile_image_url || '',
      });
    }
  };

  const handleUseGooglePhoto = async () => {
    if (!googleAvatarUrl) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          profile_image_url: googleAvatarUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, profileImageUrl: googleAvatarUrl }));
      toast({
        title: 'Success',
        description: 'Google profile photo applied',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to apply Google photo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, show helpful message
        if (uploadError.message.includes('Bucket not found')) {
          toast({
            title: 'Storage not configured',
            description: 'Profile photo storage is being set up. Please try again later.',
            variant: 'destructive',
          });
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, profileImageUrl: publicUrl }));
      
      toast({
        title: 'Success',
        description: 'Profile photo updated successfully',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload profile photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          profile_image_url: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, profileImageUrl: '' }));
      toast({
        title: 'Success',
        description: 'Profile photo removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove profile photo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    const [firstName, ...lastNameParts] = profile.fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile saved successfully',
      });
    }
  };

  const handleDetectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setProfile(prev => ({ ...prev, timezone: detected }));
    toast({
      title: 'Timezone Detected',
      description: `Set to ${detected}`,
    });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      timeZone: profile.timezone,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = () => {
    if (profile.fullName) {
      return profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 relative">
            {/* Decorative circle */}
            <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-purple-100/50 dark:bg-purple-900/20" />
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-1">Profile</h2>
              <p className="text-muted-foreground">Manage your personal information</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">Profile Photo</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Update your profile picture</p>
            
            {/* Avatar with upload overlay */}
            <div className="relative group">
              <Avatar className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600">
                <AvatarImage src={profile.profileImageUrl} />
                <AvatarFallback className="text-white text-2xl font-bold bg-gradient-to-br from-purple-500 to-purple-600">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              {/* Loading overlay during upload */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <div className="h-8 w-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              
              {/* Hover overlay (only when not uploading) */}
              {!isUploading && (
                <div 
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Photo action buttons with dropdown */}
            <div className="flex gap-2 mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading || isLoading}
                    className="border-purple-300 text-purple-600"
                  >
                    {isUploading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </DropdownMenuItem>
                  
                  {googleAvatarUrl && (
                    <DropdownMenuItem onClick={handleUseGooglePhoto}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Use Google Photo
                    </DropdownMenuItem>
                  )}
                  
                  {profile.profileImageUrl && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleRemovePhoto}
                        className="text-red-600 focus:text-red-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Photo
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Google photo indicator */}
            {googleAvatarUrl && !profile.profileImageUrl && (
              <p className="text-xs text-primary mt-2">
                Google profile photo available - click "Change Photo" to use it
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Personal Information</h3>
              <p className="text-sm text-muted-foreground">Update your profile details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">Full Name</Label>
              <p className="text-sm text-muted-foreground">Your display name across the app</p>
              <Input
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Demo User"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold">Email Address</Label>
              </div>
              <p className="text-sm text-muted-foreground">We'll use this to contact you</p>
              <Input
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="demo@coinsbloom.com"
                disabled
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold">Phone Number</Label>
              </div>
              <p className="text-sm text-muted-foreground">For account recovery and SMS notifications</p>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Regional Settings</h3>
              <p className="text-sm text-muted-foreground">Set your timezone for accurate date and time display</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Your Timezone</Label>
            <Select
              value={profile.timezone}
              onValueChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Current time in your timezone: {getCurrentTime()}
            </p>
          </div>

          <Button 
            variant="outline" 
            onClick={handleDetectTimezone}
            className="border-purple-300 text-purple-600"
          >
            <Globe className="h-4 w-4 mr-2" />
            Detect from browser
          </Button>

          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
