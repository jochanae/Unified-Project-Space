import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useKidAvatarUrl } from "@/hooks/useKidAvatarUrl";

interface LinkedKidCardProps {
  kid: {
    id: string;
    display_name: string;
    avatar_emoji: string;
    avatar_url?: string | null;
    age_tier: string;
    current_balance: number;
  };
  isSelected: boolean;
  onClick: () => void;
}

export const LinkedKidCard = ({ kid, isSelected, onClick }: LinkedKidCardProps) => {
  const avatarSrc = useKidAvatarUrl(kid.avatar_url);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex-shrink-0 p-4 rounded-2xl transition-all min-w-[140px]
        ${isSelected
          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
          : "bg-muted hover:bg-muted/80"
        }
      `}
    >
      <div className="text-center">
        {/* Avatar with photo and emoji badge */}
        <div className="relative inline-block mb-2">
          <Avatar className="h-16 w-16 mx-auto shadow-md">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt={kid.display_name} className="object-cover w-full h-full" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-purple-300 to-pink-300 text-3xl">
              {kid.avatar_emoji}
            </AvatarFallback>
          </Avatar>
          {/* Emoji badge in corner */}
          {avatarSrc && (
            <motion.span
              className="absolute -bottom-1 -right-1 text-xl bg-background rounded-full p-0.5 shadow-sm"
              animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {kid.avatar_emoji}
            </motion.span>
          )}
        </div>
        <p className="font-semibold truncate">{kid.display_name}</p>
        <p className={`text-sm ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          ${kid.current_balance.toFixed(2)}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
          isSelected ? "bg-primary-foreground/20" : "bg-background"
        }`}>
          {kid.age_tier === "under_10" ? "Under 10" : "Teen"}
        </span>
      </div>
    </motion.button>
  );
};
