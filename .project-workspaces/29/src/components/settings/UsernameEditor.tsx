import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shuffle, Check, Loader2, AtSign, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateMultipleUsernames } from '@/lib/usernameGenerator';

export function UsernameEditor() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(profile?.username || '');
  const [showRealName, setShowRealName] = useState(profile?.show_real_name ?? true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setShowRealName(profile.show_real_name ?? true);
    }
  }, [profile]);

  const generateSuggestions = () => {
    setSuggestions(generateMultipleUsernames(4));
  };

  const checkAvailability = async (name: string) => {
    if (!name || name.length < 3) {
      setIsAvailable(null);
      return;
    }

    // If it's the current username, it's available
    if (name === profile?.username) {
      setIsAvailable(true);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', name)
        .maybeSingle();

      if (error) throw error;
      setIsAvailable(!data);
    } catch (error) {
      console.error('Error checking username:', error);
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric and underscores
    const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(sanitized);
    setIsAvailable(null);
    
    // Debounce check
    const timeout = setTimeout(() => checkAvailability(sanitized), 500);
    return () => clearTimeout(timeout);
  };

  const selectSuggestion = (suggestion: string) => {
    setUsername(suggestion);
    checkAvailability(suggestion);
  };

  const saveSettings = async () => {
    if (!user || !username || username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    if (!isAvailable && username !== profile?.username) {
      toast.error('Username is not available');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username,
          show_real_name: showRealName 
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Profile updated!');
      
      // Invalidate profile-related queries and trigger auth refresh
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Force auth context to re-fetch profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (error.code === '23505') {
        toast.error('Username is already taken');
        setIsAvailable(false);
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AtSign className="h-5 w-5" />
          Community Identity
        </CardTitle>
        <CardDescription>
          Choose how you appear to other traders in the community.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Username Input */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="YourTradingName"
              className="pl-8"
              maxLength={20}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {!isChecking && isAvailable === true && (
                <Check className="h-4 w-4 text-gain" />
              )}
              {!isChecking && isAvailable === false && (
                <span className="text-xs text-loss">Taken</span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            3-20 characters. Letters, numbers, and underscores only.
          </p>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Need inspiration?</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={generateSuggestions}
              className="gap-1"
            >
              <Shuffle className="h-3 w-3" />
              Generate
            </Button>
          </div>
          
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  @{suggestion}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Display Preference */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="space-y-1">
            <Label htmlFor="show-name" className="flex items-center gap-2 cursor-pointer">
              {showRealName ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Show real name in community
            </Label>
            <p className="text-xs text-muted-foreground">
              {showRealName 
                ? `Others will see "${profile?.full_name || 'Your Name'}" with @${username || 'username'}`
                : `Others will only see @${username || 'username'}`
              }
            </p>
          </div>
          <Switch
            id="show-name"
            checked={showRealName}
            onCheckedChange={setShowRealName}
          />
        </div>

        <Button 
          onClick={saveSettings}
          disabled={isSaving || !username || username.length < 3 || (isAvailable === false)}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Profile'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
