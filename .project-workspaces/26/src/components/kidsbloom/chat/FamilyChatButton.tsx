import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FamilyChatWindow } from "./FamilyChatWindow";

interface FamilyChatButtonProps {
  kidId: string;
  variant: "playful" | "modern";
  kidName?: string;
  kidAvatar?: string | null;
}

interface ParentInfo {
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

export const FamilyChatButton = ({ kidId, variant, kidName, kidAvatar }: FamilyChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [familyLink, setFamilyLink] = useState<any>(null);
  const [parentInfo, setParentInfo] = useState<ParentInfo | null>(null);
  const isPlayful = variant === "playful";

  useEffect(() => {
    const fetchFamilyLink = async () => {
      const { data } = await supabase
        .from("family_links")
        .select("*")
        .eq("kid_profile_id", kidId)
        .eq("status", "active")
        .limit(1)
        .single();

      if (data) {
        setFamilyLink(data);
        
        // Fetch parent profile info
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, profile_image_url")
          .eq("id", data.parent_user_id)
          .single();
        
        if (profileData) {
          setParentInfo(profileData);
        }
        
        // Fetch unread count
        const { count } = await supabase
          .from("family_chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("family_link_id", data.id)
          .eq("sender_type", "parent")
          .eq("is_read", false);

        setUnreadCount(count || 0);
      }
    };

    fetchFamilyLink();
  }, [kidId]);

  // Don't show if no family link
  if (!familyLink) return null;

  const parentName = parentInfo?.first_name || "Parent";

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.5 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full shadow-lg
            ${isPlayful
              ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              : "bg-emerald-500 hover:bg-emerald-600"
            }
          `}
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <MessageCircle className="h-6 w-6 text-white" />
            )}
          </motion.div>
        </Button>

        {/* Unread Badge */}
        {unreadCount > 0 && !isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
          >
            <span className="text-white text-xs font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </motion.div>
        )}

      </motion.div>

      {/* Chat Window */}
      <FamilyChatWindow
        open={isOpen}
        familyLinkId={familyLink.id}
        kidId={kidId}
        variant={variant}
        onClose={() => setIsOpen(false)}
        onMessagesRead={() => setUnreadCount(0)}
        parentName={parentName}
        parentAvatar={parentInfo?.profile_image_url}
        kidName={kidName}
        kidAvatar={kidAvatar}
      />
    </>
  );
};
