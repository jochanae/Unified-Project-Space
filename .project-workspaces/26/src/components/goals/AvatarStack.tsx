import React from "react";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarStackProps {
  avatars: {
    id?: string;
    name?: string;
    imageUrl?: string | null;
    emoji?: string;
  }[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

const sizeClasses = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

const overlapClasses = {
  sm: "-ml-2",
  md: "-ml-2.5",
  lg: "-ml-3",
};

const AvatarStack = ({ 
  avatars, 
  maxDisplay = 4, 
  size = "md",
  showCount = true,
  showAddButton = false,
  onAddClick,
}: AvatarStackProps) => {
  const displayedAvatars = avatars.slice(0, maxDisplay);
  const remainingCount = avatars.length - maxDisplay;

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    // Single name - use first letter only for consistency
    return parts[0][0].toUpperCase();
  };

  const getColor = (index: number) => {
    const colors = [
      "bg-purple-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex items-center">
      <div className="flex">
        {displayedAvatars.map((avatar, index) => (
          <Avatar
            key={avatar.id || index}
            className={cn(
              sizeClasses[size],
              "border-2 border-background ring-0",
              index > 0 && overlapClasses[size]
            )}
          >
            <AvatarImage src={avatar.imageUrl || undefined} />
            <AvatarFallback 
              className={cn(
                "text-white font-medium",
                getColor(index)
              )}
            >
              {avatar.emoji || getInitials(avatar.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remainingCount > 0 && showCount && (
          <div
            className={cn(
              sizeClasses[size],
              overlapClasses[size],
              "rounded-full bg-muted border-2 border-background flex items-center justify-center font-medium text-muted-foreground"
            )}
          >
            +{remainingCount}
          </div>
        )}
        {showAddButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAddClick?.();
            }}
            className={cn(
              sizeClasses[size],
              (displayedAvatars.length > 0 || remainingCount > 0) && overlapClasses[size],
              "rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors"
            )}
            title="Add collaborator"
          >
            <Plus className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AvatarStack;
