import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Eye, EyeOff, Lock, Users, BarChart3, Download, Trash2, UserCheck } from "lucide-react";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PrivacyPreferences {
  profile_visible: boolean;
  show_in_leaderboards: boolean;
  allow_goal_invites: boolean;
  share_anonymized_data: boolean;
  hide_balances_default: boolean;
  show_experts_on_dashboard: boolean;
}

export const PrivacySection = () => {
  const { user } = useAuth();
  const { isPartnerBranded } = usePartnerBranding();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    profile_visible: true,
    show_in_leaderboards: false,
    allow_goal_invites: true,
    share_anonymized_data: false,
    hide_balances_default: false,
    show_experts_on_dashboard: false,
  });

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("user_settings")
        .select("privacy_preferences")
        .eq("user_id", user.id)
        .single();
      
      if (data?.privacy_preferences && typeof data.privacy_preferences === 'object') {
        setPreferences(prev => ({ ...prev, ...(data.privacy_preferences as Record<string, boolean>) }));
      }
    };
    loadPreferences();
  }, [user?.id]);

  const handleToggle = (key: keyof PrivacyPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    let error;
    if (existing) {
      ({ error } = await supabase
        .from("user_settings")
        .update({ privacy_preferences: JSON.parse(JSON.stringify(preferences)) })
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("user_settings")
        .insert([{ user_id: user.id, privacy_preferences: JSON.parse(JSON.stringify(preferences)) }]));
    }
    
    setLoading(false);
    if (error) {
      toast.error("Failed to save preferences");
    } else {
      toast.success("Privacy settings saved!");
    }
  };

  const handleExportData = () => {
    toast.info("Preparing your data export...", { description: "You'll receive an email when it's ready" });
  };

  const basePrivacyOptions = [
    {
      key: "profile_visible" as const,
      icon: Eye,
      label: "Profile Visibility",
      description: "Allow collaborators to see your profile info",
    },
    {
      key: "show_in_leaderboards" as const,
      icon: BarChart3,
      label: "Show in Leaderboards",
      description: "Appear in community savings leaderboards",
    },
    {
      key: "allow_goal_invites" as const,
      icon: Users,
      label: "Allow Goal Invites",
      description: "Let others invite you to collaborative goals",
    },
    {
      key: "share_anonymized_data" as const,
      icon: Shield,
      label: "Share Anonymized Data",
      description: "Help improve CoinsBloom with anonymized insights",
    },
    {
      key: "hide_balances_default" as const,
      icon: EyeOff,
      label: "Hide Balances by Default",
      description: "Blur financial amounts until tapped",
    },
  ];

  // Add experts option only for non-partner users
  const privacyOptions = isPartnerBranded 
    ? basePrivacyOptions 
    : [
        ...basePrivacyOptions,
        {
          key: "show_experts_on_dashboard" as const,
          icon: UserCheck,
          label: "Show Experts on Dashboard",
          description: "Display financial expert recommendations on your dashboard",
        },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Privacy</h2>
        <p className="text-muted-foreground">Control your data and visibility</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {privacyOptions.map((option) => (
            <div 
              key={option.key}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor={option.key} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <Switch
                id={option.key}
                checked={preferences[option.key]}
                onCheckedChange={() => handleToggle(option.key)}
              />
            </div>
          ))}

          <Button 
            onClick={handleSave} 
            className="w-full mt-4"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Download className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all your financial data
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and data
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your data, including accounts, 
                    transactions, goals, and budgets will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => toast.info("Please contact support to delete your account")}
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
