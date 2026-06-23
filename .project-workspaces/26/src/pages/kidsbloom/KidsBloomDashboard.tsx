import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, Moon, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useKidAvatarUrl } from "@/hooks/useKidAvatarUrl";
import { KidsBloomLogo } from "@/components/kidsbloom/KidsBloomLogo";
import { KidCardDisplay } from "@/components/kidsbloom/dashboard/KidCardDisplay";

import { BucketDisplay } from "@/components/kidsbloom/dashboard/BucketDisplay";
import { QuickActions } from "@/components/kidsbloom/dashboard/QuickActions";
import { RecentActivity } from "@/components/kidsbloom/dashboard/RecentActivity";
import { BottomNavigation } from "@/components/kidsbloom/dashboard/BottomNavigation";
import { KidsHamburgerMenu } from "@/components/kidsbloom/dashboard/KidsHamburgerMenu";
import { KidsCalculatorModal } from "@/components/kidsbloom/dashboard/KidsCalculatorModal";
import { KidsNotesModal } from "@/components/kidsbloom/dashboard/KidsNotesModal";
import { KidCharts } from "@/components/kidsbloom/dashboard/KidCharts";
import { PlayfulCharts } from "@/components/kidsbloom/dashboard/PlayfulCharts";
import { GoalsAndDreams } from "@/components/kidsbloom/dashboard/GoalsAndDreams";
import { ChoresTabs } from "@/components/kidsbloom/dashboard/ChoresTabs";
import { LearnPlayButton } from "@/components/kidsbloom/dashboard/LearnPlayButton";
import { AllowanceRequest } from "@/components/kidsbloom/dashboard/AllowanceRequest";
import { FamilyChatWindow } from "@/components/kidsbloom/chat/FamilyChatWindow";
import { NoFamilyChatMessage } from "@/components/kidsbloom/dashboard/NoFamilyChatMessage";
import { LearningVault } from "@/components/kidsbloom/dashboard/LearningVault";
import { KidsEncouragementBanner } from "@/components/kidsbloom/dashboard/KidsEncouragementBanner";
import { FamilyExpectationsKid } from "@/components/kidsbloom/expectations";
import { useKidsSession } from "@/hooks/useKidsSession";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";

interface CardTheme {
  id: string;
  name: string;
  gradient_start: string;
  gradient_end: string;
  icon: string | null;
}

export default function KidsBloomDashboard() {
  const navigate = useNavigate();
  const { profile, isLoading, isAuthenticated, logout, updateProfileLocal, refreshProfile } = useKidsSession();
  const { isFeatureEnabled } = useFeatureFlags();
  const isChatEnabled = isFeatureEnabled("kids_chat");
  const [cardTheme, setCardTheme] = useState<CardTheme | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [familyLinkId, setFamilyLinkId] = useState<string | null>(null);
  const [parentInfo, setParentInfo] = useState<{ name: string; avatar: string | null } | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const kidAvatarSrc = useKidAvatarUrl(profile?.avatar_url);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isUnder10 = profile?.age_tier === "under_10";
  const isDarkMode = profile?.dark_mode_enabled ?? false;

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      await refreshProfile();
      toast.success(isUnder10 ? "All caught up! 🔄" : "Dashboard refreshed");
    } catch (error) {
      console.error("Error refreshing kid dashboard:", error);
      toast.error("Couldn't refresh right now");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/kidsbloom/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Fetch card theme when profile loads
  useEffect(() => {
    const fetchCardTheme = async () => {
      if (profile?.card_theme_id) {
        const { data: themeData } = await supabase
          .from("card_themes")
          .select("*")
          .eq("id", profile.card_theme_id)
          .single();
        if (themeData) setCardTheme(themeData);
      }
    };
    
    if (profile) {
      fetchCardTheme();
    }
  }, [profile]);

  // Fetch unread notifications count and family link info for chat
  useEffect(() => {
    const fetchFamilyLinkAndNotifications = async () => {
      if (!profile?.id) return;
      
      // Check for family link and parent info
      const { data: familyLink } = await supabase
        .from("family_links")
        .select("id, parent_user_id, relationship")
        .eq("kid_profile_id", profile.id)
        .eq("status", "active")
        .single();

      if (familyLink) {
        setFamilyLinkId(familyLink.id);
        
        // Fetch parent profile info
        const { data: parentProfile } = await supabase
          .from("profiles")
          .select("first_name, profile_image_url")
          .eq("id", familyLink.parent_user_id)
          .single();
        
        if (parentProfile) {
          setParentInfo({
            name: parentProfile.first_name || familyLink.relationship || "Parent",
            avatar: parentProfile.profile_image_url
          });
        }
        
        // Fetch unread count
        const { count } = await supabase
          .from("family_chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("family_link_id", familyLink.id)
          .eq("is_read", false)
          .eq("sender_type", "parent");

        setUnreadNotifications(count || 0);
      }
    };

    fetchFamilyLinkAndNotifications();
  }, [profile?.id]);

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

  // Determine background based on age tier + dark mode
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (isLoading || !profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getBgClass()}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-5xl"
        >
          ✨
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${getBgClass()}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b rounded-b-3xl shadow-lg ${
        isUnder10 
          ? isDarkMode ? "bg-black/30 border-white/5 shadow-purple-500/10" : "bg-white/60 border-purple-200/50 shadow-purple-500/15"
          : isDarkMode ? "bg-black/30 border-white/10 shadow-black/20" : "bg-white/80 border-emerald-200/50 shadow-emerald-500/10"
      }`}>
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between overflow-hidden">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-2">
            <KidsHamburgerMenu 
              variant={isUnder10 ? "playful" : "modern"} 
              kidId={profile.id}
              onNavigate={scrollToSection}
              onOpenCalculator={() => setShowCalculator(true)}
              onOpenNotes={() => setShowNotes(true)}
              onOpenChat={isChatEnabled ? () => setShowChat(true) : undefined}
              isDarkMode={isDarkMode}
            />
            <KidsBloomLogo size="sm" variant={isUnder10 ? "playful" : "modern"} />
          </div>
          
          {/* Right: Refresh, Dark Mode, Notifications, Avatar */}
          <div className="flex items-center gap-1">
            {/* Manual Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={getTextPrimary()}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            {/* Dark Mode Toggle - Always Visible */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleDarkMode}
              className={getTextPrimary()}
            >
              {isDarkMode ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* Notifications Bell - only when chat is enabled */}
            {isChatEnabled && (
              <Button 
                variant="ghost" 
                size="icon"
                className={`relative ${getTextPrimary()}`}
                onClick={() => setShowChat(true)}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            )}

            {/* Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0.5 sm:p-1 h-auto flex-shrink-0">
                  <Avatar className="h-9 w-9 sm:h-12 sm:w-12 shadow-lg">
                    <AvatarImage src={kidAvatarSrc || undefined} className="object-cover w-full h-full" />
                    <AvatarFallback className={`text-xl sm:text-2xl ${
                      isUnder10
                        ? "bg-gradient-to-br from-purple-200 to-pink-200" 
                        : isDarkMode ? "bg-gradient-to-br from-indigo-600 to-violet-600" : "bg-gradient-to-br from-emerald-200 to-teal-200"
                    }`}>
                      {profile.avatar_emoji || profile.display_name?.[0] || "🧒"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="font-medium">{profile.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isUnder10 ? "Super Saver! ⭐" : "KidsBloom Member"}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/kidsbloom/settings")}>
                  {isUnder10 ? "⚙️ Settings" : "Settings"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  {isUnder10 ? "👋 Sign Out" : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Date & Time Bar */}
      <div className={`px-4 py-2 text-center ${getTextSecondary()}`}>
        <p className="text-sm font-medium">
          {isUnder10 ? "📅 " : ""}{format(currentTime, "EEEE, MMMM d, yyyy")} {isUnder10 ? "⏰ " : "• "}{format(currentTime, "h:mm a")}
        </p>
      </div>

      {/* Encouragement Banner */}
      <KidsEncouragementBanner 
        kidId={profile.id} 
        isUnder10={isUnder10} 
        isDarkMode={isDarkMode} 
      />

      {/* Welcome Banner + Card */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center ring-2 ring-primary/30 shadow-lg"
          >
            <span className="text-4xl">{profile.avatar_emoji || "🧒"}</span>
          </motion.div>
          <div className="flex-1">
            <h1 className={`text-xl font-bold ${getTextPrimary()}`}>
              {isUnder10 ? `Hi ${profile.display_name}! 🌟` : `Hey, ${profile.display_name}`}
            </h1>
            <p className={`text-sm ${getTextSecondary()}`}>
              {isUnder10 
                ? `${profile.streak_days} day streak! 🔥` 
                : `${profile.streak_days} day streak`}
            </p>
          </div>
        </div>

        {/* Card Display - Lock balance for under-10 kids until PIN entered */}
        <KidCardDisplay
          profile={profile}
          cardTheme={cardTheme}
          variant={isUnder10 ? "playful" : "modern"}
          isLocked={isUnder10 && !vaultUnlocked}
        />
      </motion.div>

      {/* Main Content */}
      <div className="px-4 space-y-6">
        
        {/* Learning Vault - Only for young kids */}
        {isUnder10 && (
          <div id="section-vault" className="scroll-mt-32">
            <LearningVault
              kidId={profile.id}
              balance={profile.current_balance}
              variant="playful"
              onUnlock={() => setVaultUnlocked(true)}
              onLock={() => setVaultUnlocked(false)}
            />
          </div>
        )}
        
        {/* Section 1: Money Buckets - Hidden for young kids until vault unlocked */}
        {(!isUnder10 || vaultUnlocked) && (
          <div id="section-buckets" className="scroll-mt-32">
            <BucketDisplay
              spendBalance={profile.spend_balance ?? profile.current_balance}
              saveBalance={profile.save_balance ?? 0}
              giveBalance={profile.give_balance ?? 0}
              variant={isUnder10 ? "playful" : "modern"}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* Section: Family Expectations */}
        <div id="section-expectations" className="scroll-mt-32">
          <FamilyExpectationsKid kidProfileId={profile.id} />
        </div>

        {/* Section: Allowance Info */}
        <div id="section-allowance" className="scroll-mt-32">
          <AllowanceRequest
            kidId={profile.id}
            variant={isUnder10 ? "playful" : "modern"}
          />
        </div>


        {/* Section 2: Quick Actions */}
        <div id="section-actions" className="scroll-mt-32">
          <QuickActions
            kidId={profile.id}
            variant={isUnder10 ? "playful" : "modern"}
            soundEnabled={(profile as any).sound_effects_enabled ?? true}
            spendBalance={profile.spend_balance ?? profile.current_balance}
            onBalanceUpdate={refreshProfile}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Section 3: Combo Charts */}
        <div id="section-charts" className="scroll-mt-32">
          {isUnder10 ? (
            <PlayfulCharts 
              kidId={profile.id} 
              currentBalance={profile.current_balance}
              spendBalance={profile.spend_balance ?? profile.current_balance}
              saveBalance={profile.save_balance ?? 0}
              giveBalance={profile.give_balance ?? 0}
            />
          ) : (
            <KidCharts kidId={profile.id} isDarkMode={isDarkMode} />
          )}
        </div>

        {/* Section 4: Goals & Dreams (Tabbed) */}
        <div id="section-goals" className="scroll-mt-32">
          <GoalsAndDreams 
            kidId={profile.id} 
            variant={isUnder10 ? "playful" : "modern"}
            currentBalance={profile.spend_balance ?? profile.current_balance}
            onBalanceUpdate={refreshProfile}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Section 5: Chores (Tabbed: My Chores | Up for Grabs) */}
        <div id="section-chores" className="scroll-mt-32">
          <ChoresTabs
            kidId={profile.id}
            variant={isUnder10 ? "playful" : "modern"}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Section 6: Recent Transactions */}
        <div id="section-activity" className="scroll-mt-32">
          <RecentActivity
            kidId={profile.id}
            variant={isUnder10 ? "playful" : "modern"}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Section 7: Learn & Play Button */}
        <div id="section-learn" className="scroll-mt-32">
          <LearnPlayButton variant={isUnder10 ? "playful" : "modern"} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        variant={isUnder10 ? "playful" : "modern"} 
        kidId={profile.id}
        onOpenChat={isChatEnabled ? () => setShowChat(true) : undefined}
        isDarkMode={isDarkMode}
        unreadCount={unreadNotifications}
      />


      {/* Calculator Modal */}
      <KidsCalculatorModal
        open={showCalculator}
        onOpenChange={setShowCalculator}
        variant={isUnder10 ? "playful" : "modern"}
      />

      {/* Notes Modal */}
      <KidsNotesModal
        open={showNotes}
        onOpenChange={setShowNotes}
        kidId={profile.id}
        variant={isUnder10 ? "playful" : "modern"}
      />

      {/* Family Chat Window - only when chat is enabled */}
      {isChatEnabled && (
        <>
          {familyLinkId ? (
            <FamilyChatWindow
              open={showChat}
              familyLinkId={familyLinkId}
              kidId={profile.id}
              variant={isUnder10 ? "playful" : "modern"}
              onClose={() => setShowChat(false)}
              onMessagesRead={() => setUnreadNotifications(0)}
              parentName={parentInfo?.name}
              parentAvatar={parentInfo?.avatar}
              kidName={profile.display_name || "Me"}
              kidAvatar={kidAvatarSrc || profile.avatar_emoji}
            />
          ) : (
            <NoFamilyChatMessage
              open={showChat}
              onClose={() => setShowChat(false)}
              kidId={profile.id}
              kidUsername={profile.username || undefined}
              variant={isUnder10 ? "playful" : "modern"}
            />
          )}
        </>
      )}
    </div>
  );
}
