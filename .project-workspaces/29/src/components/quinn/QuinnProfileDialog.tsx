import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QuinnKnowsMe } from "@/components/settings/QuinnKnowsMe";

interface QuinnProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuinnProfileDialog({ open, onOpenChange }: QuinnProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <QuinnKnowsMe />
        </div>
      </DialogContent>
    </Dialog>
  );
}
