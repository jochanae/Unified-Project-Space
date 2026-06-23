import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Briefcase, User } from "lucide-react";
import { useProfessionalMode } from "@/contexts/ProfessionalModeContext";
import { cn } from "@/lib/utils";

interface ProfessionalModeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ProfessionalModeToggle({ className, compact = false }: ProfessionalModeToggleProps) {
  const { isLinkedProfessional, isProfessionalMode, toggleProfessionalMode, loading } = useProfessionalMode();

  if (loading || !isLinkedProfessional) {
    return null;
  }

  if (compact) {
    return (
      <button
        onClick={toggleProfessionalMode}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
          isProfessionalMode 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          className
        )}
      >
        {isProfessionalMode ? (
          <>
            <Briefcase className="h-3.5 w-3.5" />
            <span>Pro Mode</span>
          </>
        ) : (
          <>
            <User className="h-3.5 w-3.5" />
            <span>Personal</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border text-xs", className)}>
      <div className="flex items-center gap-1">
        <User className={cn("h-3 w-3", !isProfessionalMode && "text-primary")} />
        <Label htmlFor="professional-mode" className="text-xs font-medium cursor-pointer">
          Personal
        </Label>
      </div>
      
      <Switch
        id="professional-mode"
        checked={isProfessionalMode}
        onCheckedChange={toggleProfessionalMode}
        className="scale-75"
      />
      
      <div className="flex items-center gap-1">
        <Briefcase className={cn("h-3 w-3", isProfessionalMode && "text-primary")} />
        <Label htmlFor="professional-mode" className="text-xs font-medium cursor-pointer">
          Professional
        </Label>
      </div>
    </div>
  );
}
