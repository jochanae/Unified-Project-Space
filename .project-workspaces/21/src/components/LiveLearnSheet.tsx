import { useState } from 'react';
import { MonitorPlay } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import LiveLearnCarousel from './LiveLearnCarousel';
import { treatAsMinor } from '@/lib/ageUtils';
import { useAppContext } from '@/contexts/AppContext';

interface LiveLearnSheetProps {
  trigger: React.ReactNode;
}

export default function LiveLearnSheet({ trigger }: LiveLearnSheetProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { profile } = useAppContext();
  const isMinor = treatAsMinor(profile?.dateOfBirth);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85svh] rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <MonitorPlay className="h-5 w-5 text-primary" />
              {isMinor ? 'Learn & Create' : 'Live & Learn'}
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-2 pb-6">
            <LiveLearnCarousel isMinor={isMinor} glassMode={false} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MonitorPlay className="h-5 w-5 text-primary" />
            {isMinor ? 'Learn & Create' : 'Live & Learn'}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-2 pb-6">
          <LiveLearnCarousel isMinor={isMinor} glassMode={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
