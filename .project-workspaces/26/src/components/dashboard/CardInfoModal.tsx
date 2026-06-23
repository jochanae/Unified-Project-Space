import { HelpCircle, Trash2, Check, LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CardInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  cardTitle: string;
  cardIcon: LucideIcon;
  description: string;
  onKeep: () => void;
  onDelete: () => void;
}

export function CardInfoModal({
  open,
  onOpenChange,
  cardTitle,
  cardIcon: Icon,
  description,
  onKeep,
  onDelete,
}: CardInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">{cardTitle}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Would you like to keep this card on your dashboard, or remove it for a cleaner view?
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            You can always restore hidden cards in Settings → Dashboard Appearance.
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onDelete}
            className="flex-1 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
          <Button
            onClick={onKeep}
            className="flex-1 gap-2"
          >
            <Check className="h-4 w-4" />
            Keep
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}