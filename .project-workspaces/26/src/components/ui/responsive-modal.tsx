import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  /** Max width class for desktop dialog, e.g. "max-w-lg", "max-w-2xl" */
  desktopMaxWidth?: string;
}

/**
 * Renders a Drawer on mobile, a centered Dialog on desktop.
 * Provides consistent sizing and scroll behavior.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  title,
  desktopMaxWidth = "max-w-lg",
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] flex flex-col rounded-t-3xl">
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${desktopMaxWidth} max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden`}
      >
        {title ? (
          <VisuallyHidden>
            <DialogTitle>{title}</DialogTitle>
          </VisuallyHidden>
        ) : null}
        {children}
      </DialogContent>
    </Dialog>
  );
}
