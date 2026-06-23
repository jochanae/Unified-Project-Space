import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface AvatarStackUser {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface AvatarStackProps {
  users: AvatarStackUser[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showInvite?: boolean;
  onInvite?: () => void;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const overlapClasses = {
  sm: "-ml-2",
  md: "-ml-3",
  lg: "-ml-4",
};

export function AvatarStack({ users, max = 5, size = "md", className, showInvite = false, onInvite }: AvatarStackProps) {
  const displayUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("flex items-center", className)}>
      {displayUsers.map((user, index) => (
        <Tooltip key={user.id}>
          <TooltipTrigger asChild>
            <Avatar
              className={cn(
                sizeClasses[size],
                "border-2 border-background ring-2 ring-background cursor-pointer transition-transform hover:scale-110 hover:z-10",
                index > 0 && overlapClasses[size]
              )}
            >
              <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {getInitials(user.name || "U")}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{user.name}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar
              className={cn(
                sizeClasses[size],
                overlapClasses[size],
                "border-2 border-background ring-2 ring-background cursor-pointer bg-muted"
              )}
            >
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                +{remainingCount}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{remainingCount} more participants</p>
          </TooltipContent>
        </Tooltip>
      )}
      {showInvite && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onInvite}
              className={cn(
                sizeClasses[size],
                overlapClasses[size],
                "rounded-full border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all hover:scale-110"
              )}
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Invite someone</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
