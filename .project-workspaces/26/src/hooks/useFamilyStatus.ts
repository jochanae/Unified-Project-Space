import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LinkedKid {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url?: string | null;
}

interface FamilyStatus {
  hasFamily: boolean;
  linkedKids: LinkedKid[];
  kidCount: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const useFamilyStatus = (): FamilyStatus => {
  const { user } = useAuth();
  const [linkedKids, setLinkedKids] = useState<LinkedKid[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinkedKids = async () => {
    if (!user) {
      setLinkedKids([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data: familyLinks } = await supabase
        .from("family_links")
        .select(`
          kid_profile_id,
          kids_profiles (
            id,
            display_name,
            avatar_emoji,
            avatar_url
          )
        `)
        .eq("parent_user_id", user.id)
        .eq("status", "active");

      if (familyLinks) {
        const kids = familyLinks
          .filter((link: any) => link.kids_profiles)
          .map((link: any) => ({
            id: link.kids_profiles.id,
            display_name: link.kids_profiles.display_name,
            avatar_emoji: link.kids_profiles.avatar_emoji,
            avatar_url: link.kids_profiles.avatar_url,
          }));
        setLinkedKids(kids);
      }
    } catch (error) {
      console.error("Error fetching family status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedKids();
  }, [user]);

  return {
    hasFamily: linkedKids.length > 0,
    linkedKids,
    kidCount: linkedKids.length,
    isLoading,
    refetch: fetchLinkedKids,
  };
};
