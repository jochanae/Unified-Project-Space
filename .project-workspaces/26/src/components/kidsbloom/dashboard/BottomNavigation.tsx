import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Gamepad2, MessageCircle, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BottomNavigationProps {
  variant?: "playful" | "modern";
  kidId?: string;
  onOpenChat?: () => void;
  isDarkMode?: boolean;
  unreadCount?: number;
}

export function BottomNavigation({ variant = "playful", kidId, onOpenChat, isDarkMode = false, unreadCount: externalUnreadCount }: BottomNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isPlayful = variant === "playful";
  const [internalUnreadCount, setInternalUnreadCount] = useState(0);
  
  // Use external count if provided, otherwise use internal
  const unreadCount = externalUnreadCount !== undefined ? externalUnreadCount : internalUnreadCount;

  useEffect(() => {
    if (!kidId) return;

    const fetchUnreadCount = async () => {
      const { data: familyLink } = await supabase
        .from("family_links")
        .select("id")
        .eq("kid_profile_id", kidId)
        .eq("status", "active")
        .single();

      if (familyLink) {
        const { count } = await supabase
          .from("family_chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("family_link_id", familyLink.id)
          .eq("is_read", false)
          .eq("sender_type", "parent");

        setInternalUnreadCount(count || 0);
      }
    };

    // Only fetch if no external count is provided
    if (externalUnreadCount === undefined) {
      fetchUnreadCount();
    }
  }, [kidId]);

  const scrollToPosition = (position: "top" | "bottom") => {
    if (position === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  const navItems = [
    { 
      id: "home", 
      icon: Home, 
      label: "Home", 
      action: () => {
        if (location.pathname === "/kidsbloom/dashboard") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          navigate("/kidsbloom/dashboard");
        }
      },
      isActive: location.pathname === "/kidsbloom/dashboard"
    },
    { 
      id: "learn", 
      icon: Gamepad2, 
      label: isPlayful ? "Learn & Play" : "Learn", 
      action: () => navigate("/kidsbloom/learn"),
      isActive: location.pathname === "/kidsbloom/learn"
    },
    { 
      id: "chat", 
      icon: MessageCircle, 
      label: "Chat", 
      action: onOpenChat || (() => {}),
      badge: unreadCount,
      isActive: false
    },
  ];

  const getNavBgStyle = () => {
    if (isPlayful) return "bg-gradient-to-t from-white via-white to-white/95 border-t-2 border-purple-200 shadow-lg shadow-purple-500/10";
    if (isDarkMode) return "bg-slate-950/95 backdrop-blur-lg border-t border-white/10";
    return "bg-white/95 backdrop-blur-lg border-t border-emerald-200 shadow-lg";
  };

  const getScrollButtonStyle = () => {
    if (isPlayful) return "text-purple-400 hover:text-purple-600 hover:bg-purple-50";
    if (isDarkMode) return "text-white/50 hover:text-white hover:bg-white/5";
    return "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50";
  };

  const getActiveStyle = () => {
    if (isPlayful) return "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30";
    if (isDarkMode) return "bg-violet-600 text-white shadow-lg shadow-violet-600/30";
    return "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30";
  };

  const getChatButtonStyle = () => {
    if (isPlayful) return "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30";
    if (isDarkMode) return "bg-emerald-600 text-white shadow-lg";
    return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30";
  };

  const getInactiveStyle = () => {
    if (isPlayful) return "text-purple-400 hover:text-purple-600 hover:bg-purple-50";
    if (isDarkMode) return "text-white/50 hover:text-white hover:bg-white/5";
    return "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50";
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`fixed bottom-0 left-0 right-0 z-50 ${getNavBgStyle()}`}
    >
      <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
        {/* Jump to Top */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => scrollToPosition("top")}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${getScrollButtonStyle()}`}
        >
          <ChevronUp className="h-5 w-5" />
          <span className="text-[9px] font-medium">Top</span>
        </motion.button>

        {/* Main Nav Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isChatButton = item.id === "chat";

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={item.action}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                item.isActive
                  ? getActiveStyle()
                  : isChatButton
                  ? getChatButtonStyle()
                  : getInactiveStyle()
              }`}
            >
              <Icon className={isChatButton ? "h-6 w-6" : "h-5 w-5"} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Jump to Bottom */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => scrollToPosition("bottom")}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${getScrollButtonStyle()}`}
        >
          <ChevronDown className="h-5 w-5" />
          <span className="text-[9px] font-medium">Bottom</span>
        </motion.button>
      </div>
    </motion.nav>
  );
}
