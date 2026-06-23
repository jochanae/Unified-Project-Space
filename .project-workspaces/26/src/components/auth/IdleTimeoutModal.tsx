import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface IdleTimeoutModalProps {
  open: boolean;
  remainingTime: number;
  onStayActive: () => void;
  onLogout: () => void;
}

export function IdleTimeoutModal({
  open,
  remainingTime,
  onStayActive,
  onLogout,
}: IdleTimeoutModalProps) {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-xl">
              Are you still there?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-base text-muted-foreground">
              <span>For your security, you'll be automatically logged out due to inactivity.</span>
              <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                <span className="text-3xl font-mono font-bold text-foreground">
                  {timeDisplay}
                </span>
                <span className="block text-sm text-muted-foreground mt-1">
                  until automatic logout
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onLogout}>
            Log Out Now
          </Button>
          <Button onClick={onStayActive}>
            Stay Logged In
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
