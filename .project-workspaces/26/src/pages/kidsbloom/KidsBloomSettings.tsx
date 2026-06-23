import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Moon, Sun, Palette, Lock, Bell, ChevronRight, Volume2, VolumeX, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KidsBloomLogo } from "@/components/kidsbloom/KidsBloomLogo";
import { CardThemeCarousel } from "@/components/kidsbloom/CardThemeCarousel";
import { KidsAvatarUpload } from "@/components/kidsbloom/dashboard/KidsAvatarUpload";
import { JoinFamilySection } from "@/components/kidsbloom/settings/JoinFamilySection";
import { AvatarSelector } from "@/components/kidsbloom/AvatarSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKidsSession } from "@/hooks/useKidsSession";

export default function KidsBloomSettings() {
  const navigate = useNavigate();
  const { profile, isLoading, isAuthenticated, logout, updateProfileLocal } = useKidsSession();
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [hasFamilyLink, setHasFamilyLink] = useState(false);
  const [familyName, setFamilyName] = useState<string | undefined>();

  // Check for family link
  useEffect(() => {
    const checkFamilyLink = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from("family_links")
        .select("id, relationship")
        .eq("kid_profile_id", profile.id)
        .eq("status", "active")
        .single();
      
      setHasFamilyLink(!!data);
      if (data) {
        setFamilyName(data.relationship || "Family");
      }
    };
    checkFamilyLink();
  }, [profile?.id]);

  const isUnder10 = profile?.age_tier === "under_10";
  const isDarkMode = profile?.dark_mode_enabled ?? false;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/kidsbloom/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const getBgClass = () => {
    if (isUnder10) {
      return isDarkMode 
        ? "bg-gradient-to-b from-purple-950 via-indigo-950 to-slate-950" 
        : "bg-gradient-to-b from-purple-100 via-pink-50 to-blue-100";
    }
    return isDarkMode 
      ? "bg-gradient-to-b from-slate-950 via-indigo-950 to-black" 
      : "bg-gradient-to-b from-slate-50 via-gray-50 to-emerald-50";
  };

  const getTextPrimary = () => {
    if (isUnder10) {
      return isDarkMode ? "text-purple-300" : "text-purple-600";
    }
    return isDarkMode ? "text-white" : "text-emerald-800";
  };

  const getTextSecondary = () => {
    if (isUnder10) {
      return isDarkMode ? "text-purple-400" : "text-purple-400";
    }
    return isDarkMode ? "text-violet-300" : "text-emerald-600";
  };

  const getCardBg = () => {
    if (isUnder10) {
      return isDarkMode ? "bg-white/5 border-purple-500/20" : "bg-white/80";
    }
    return isDarkMode ? "bg-white/5 border-white/5" : "bg-white/90 border-emerald-100";
  };

  const getIconBg = () => {
    if (isUnder10) {
      return isDarkMode ? "bg-purple-900/50" : "bg-purple-100";
    }
    return isDarkMode ? "bg-white/5" : "bg-emerald-100";
  };

  const getIconColor = () => {
    if (isUnder10) {
      return isDarkMode ? "text-purple-400" : "text-purple-500";
    }
    return isDarkMode ? "text-violet-400" : "text-emerald-600";
  };

  const toggleDarkMode = async () => {
    if (!profile) return;

    const newValue = !profile.dark_mode_enabled;
    await supabase
      .from("kids_profiles")
      .update({ dark_mode_enabled: newValue })
      .eq("id", profile.id);

    updateProfileLocal({ dark_mode_enabled: newValue });
    toast.success(newValue ? "Night mode on! 🌙" : "Day mode on! ☀️");
  };

  const toggleNotifications = async () => {
    if (!profile) return;

    const newValue = !profile.notifications_enabled;
    await supabase
      .from("kids_profiles")
      .update({ notifications_enabled: newValue })
      .eq("id", profile.id);

    updateProfileLocal({ notifications_enabled: newValue });
    toast.success(newValue ? "Notifications on" : "Notifications off");
  };

  const toggleSoundEffects = async () => {
    if (!profile) return;

    const newValue = !(profile as any).sound_effects_enabled;
    await supabase
      .from("kids_profiles")
      .update({ sound_effects_enabled: newValue })
      .eq("id", profile.id);

    updateProfileLocal({ sound_effects_enabled: newValue } as any);
    toast.success(newValue ? (isUnder10 ? "Sounds on! 🔊" : "Sound effects enabled") : (isUnder10 ? "Quiet mode 🤫" : "Sound effects disabled"));
  };

  const handleCardThemeChange = async (themeId: string) => {
    if (!profile) return;

    await supabase
      .from("kids_profiles")
      .update({ card_theme_id: themeId })
      .eq("id", profile.id);

    updateProfileLocal({ card_theme_id: themeId });
    toast.success(isUnder10 ? "New card unlocked! ✨" : "Card theme updated");
    setShowCardPicker(false);
  };

  const handleAvatarChange = async (emoji: string) => {
    if (!profile) return;

    await supabase
      .from("kids_profiles")
      .update({ avatar_emoji: emoji })
      .eq("id", profile.id);

    updateProfileLocal({ avatar_emoji: emoji });
    toast.success(isUnder10 ? "New avatar! Looking good! ✨" : "Avatar updated");
    setShowAvatarPicker(false);
  };

  if (isLoading || !profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getBgClass()}`}>
        <div className="animate-spin text-4xl">✨</div>
      </div>
    );
  }

  const settingsItems = [
    {
      icon: isUnder10 ? (profile.dark_mode_enabled ? Moon : Sun) : (profile.dark_mode_enabled ? Moon : Sun),
      label: isUnder10 ? "Night Mode" : "Dark Mode",
      description: isUnder10 ? "Stars and moon! 🌙" : "Switch to dark theme",
      action: <Switch checked={profile.dark_mode_enabled} onCheckedChange={toggleDarkMode} />,
    },
    {
      icon: Smile,
      label: isUnder10 ? "My Avatar" : "Change Avatar",
      description: isUnder10 ? "Pick a new buddy! 🎭" : "Change your profile icon",
      action: <ChevronRight className="h-5 w-5 text-muted-foreground" />,
      onClick: () => setShowAvatarPicker(true),
    },
    {
      icon: Palette,
      label: isUnder10 ? "My Card" : "Card Theme",
      description: isUnder10 ? "Pick a magic card! ✨" : "Change your card design",
      action: <ChevronRight className="h-5 w-5 text-muted-foreground" />,
      onClick: () => setShowCardPicker(true),
    },
    {
      icon: Lock,
      label: isUnder10 ? "Change Password" : "Change Password",
      description: isUnder10 ? "Update your secret password 🔐" : "Update your login password",
      action: <ChevronRight className="h-5 w-5 text-muted-foreground" />,
      onClick: () => navigate("/kidsbloom/change-password"),
    },
    {
      icon: Bell,
      label: "Notifications",
      description: isUnder10 ? "Get fun alerts! 🔔" : "Push notifications",
      action: <Switch checked={profile.notifications_enabled} onCheckedChange={toggleNotifications} />,
    },
    {
      icon: (profile as any).sound_effects_enabled ? Volume2 : VolumeX,
      label: isUnder10 ? "Sound Effects" : "Sounds",
      description: isUnder10 ? "Fun sounds! 🎵" : "Toggle sound effects",
      action: <Switch checked={(profile as any).sound_effects_enabled ?? true} onCheckedChange={toggleSoundEffects} />,
    },
  ];

  return (
    <div className={`min-h-screen pb-20 ${getBgClass()}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b ${
        isUnder10 
          ? isDarkMode ? "bg-black/30 border-white/5" : "bg-white/60 border-purple-200/50"
          : isDarkMode ? "bg-black/30 border-white/5" : "bg-white/80 border-teal-200/50"
      }`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/kidsbloom/dashboard")}
            className={getTextPrimary()}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <KidsBloomLogo size="sm" variant={isUnder10 ? "playful" : "modern"} />
          <div className="w-10" />
        </div>
      </header>

      {/* Profile Section with Avatar Upload */}
      <div className="px-4 py-6">
        <KidsAvatarUpload
          kidId={profile.id}
          currentUrl={profile.avatar_url}
          avatarEmoji={profile.avatar_emoji}
          displayName={profile.display_name || ""}
          variant={isUnder10 ? "playful" : "modern"}
          isDarkMode={isDarkMode}
          onUpload={(url) => {
            updateProfileLocal({ avatar_url: url || null });
          }}
        />
        <div className="text-center mt-3">
          <h1 className={`text-2xl font-bold ${getTextPrimary()}`}>
            {profile.display_name}
          </h1>
          <p className={`text-sm ${getTextSecondary()}`}>
            {isUnder10 ? "Super Saver! ⭐" : "KidsBloom Member"}
          </p>
        </div>
      </div>

      {/* Family Connection Section */}
      <div className="px-4 py-4">
        <JoinFamilySection
          kidId={profile.id}
          kidUsername={profile.username || undefined}
          variant={isUnder10 ? "playful" : "modern"}
          hasFamilyLink={hasFamilyLink}
          familyName={familyName}
        />
      </div>

      {/* Settings List */}
      <div className="px-4 space-y-3">
        {settingsItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`${getCardBg()} cursor-pointer transition-all hover:scale-[1.02]`}
              onClick={item.onClick}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${getIconBg()}`}>
                  <item.icon className={`h-5 w-5 ${getIconColor()}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${getTextPrimary()}`}>{item.label}</h3>
                  <p className={`text-sm ${getTextSecondary()}`}>{item.description}</p>
                </div>
                {item.action}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-8">
        <Button
          variant="outline"
          className={`w-full ${
            isUnder10 
              ? "border-purple-300 text-purple-600" 
              : isDarkMode 
                ? "border-violet-500/30 text-white" 
                : "border-teal-300 text-teal-700 bg-white/50 hover:bg-white/80"
          }`}
          onClick={logout}
        >
          {isUnder10 ? "Bye Bye! 👋" : "Sign Out"}
        </Button>
      </div>

      {/* Card Theme Picker Dialog */}
      <Dialog open={showCardPicker} onOpenChange={setShowCardPicker}>
        <DialogContent className={`max-w-lg ${
          isUnder10 
            ? "bg-purple-50" 
            : isDarkMode ? "bg-slate-900" : "bg-white"
        }`}>
          <DialogHeader>
            <DialogTitle className={isUnder10 ? "text-purple-600" : isDarkMode ? "text-white" : "text-teal-800"}>
              {isUnder10 ? "Pick Your Magic Card! ✨" : "Choose Card Theme"}
            </DialogTitle>
          </DialogHeader>
          <CardThemeCarousel
            selected={profile.card_theme_id || ""}
            onSelect={handleCardThemeChange}
            variant={isUnder10 ? "playful" : "modern"}
            userName={profile.display_name || ""}
          />
        </DialogContent>
      </Dialog>

      {/* Avatar Picker Dialog */}
      <Dialog open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
        <DialogContent className={`max-w-md ${
          isUnder10 
            ? "bg-purple-50" 
            : isDarkMode ? "bg-slate-900" : "bg-white"
        }`}>
          <DialogHeader>
            <DialogTitle className={isUnder10 ? "text-purple-600" : isDarkMode ? "text-white" : "text-teal-800"}>
              {isUnder10 ? "Pick Your Buddy! 🎭" : "Choose Avatar"}
            </DialogTitle>
          </DialogHeader>
          <AvatarSelector
            selected={profile.avatar_emoji || ""}
            onSelect={handleAvatarChange}
            variant={isUnder10 ? "playful" : "modern"}
            mode="inline"
          />
          <p className="text-center text-sm text-muted-foreground mt-2">
            You can also upload a photo using the camera icon above
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
