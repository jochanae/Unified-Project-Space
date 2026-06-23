import { useEffect, useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Archive, Shirt, Palette } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

interface CompanionQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CompanionQuickSheet = forwardRef<HTMLDivElement, CompanionQuickSheetProps>(({ open, onOpenChange }, _ref) => {
  const navigate = useNavigate();
  const { user, activeConnection } = useAppContext();
  const [recentMessage, setRecentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user || !activeConnection) return;
    supabase
      .from('chat_messages')
      .select('content')
      .eq('user_id', user.id)
      .eq('member_id', activeConnection.memberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRecentMessage(data?.content ?? null));
  }, [open, user, activeConnection?.memberId]);

  const go = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  if (!activeConnection) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-base">{activeConnection.name}</DrawerTitle>
          <DrawerDescription className="sr-only">Quick actions for {activeConnection.name}</DrawerDescription>
        </DrawerHeader>

        {/* Recent moment preview */}
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-muted/50 border border-border/40 p-3 flex items-start gap-2">
            <span className="text-sm mt-0.5">💬</span>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {recentMessage || 'No recent moments yet'}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-4 gap-3 px-6 pb-6">
          {[
            { icon: MessageCircle, label: 'Chat', route: `/chat/${activeConnection.memberId}` },
            { icon: Archive, label: 'Vault', route: '/world?tab=vault' },
            { icon: Shirt, label: 'Wardrobe', route: '/world?tab=wardrobe' },
            { icon: Palette, label: 'Studio', route: `/studio?from=world&memberId=${activeConnection.memberId}` },
          ].map(({ icon: Icon, label, route }) => (
            <button
              key={label}
              onClick={() => go(route)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent transition-colors"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground/80">{label}</span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
});
CompanionQuickSheet.displayName = 'CompanionQuickSheet';

export default CompanionQuickSheet;
