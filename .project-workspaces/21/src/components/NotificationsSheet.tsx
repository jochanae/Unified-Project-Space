import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Trophy, Bell, UserMinus, UserPlus, CheckCheck, Clock } from 'lucide-react';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications, type NotificationItem } from '@/hooks/useNotifications';
import { useAppContext } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
  switch (type) {
    case 'reply':
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case 'companion_push':
    case 'companion_reminder':
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case 'reaction':
      return <AnimatedGradientHeart size={16} id="notif-reaction-heart" />;
    case 'milestone':
      return <Trophy className="h-4 w-4 text-primary" />;
    case 'circle_removed':
      return <UserMinus className="h-4 w-4 text-muted-foreground" />;
    case 'circle_join':
      return <UserPlus className="h-4 w-4 text-primary" />;
    case 'circle_comment':
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case 'reminder':
      return <Clock className="h-4 w-4 text-primary" />;
  }
}

function NotificationsList({ items, onTap }: { items: NotificationItem[]; onTap: (item: NotificationItem) => void }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No recent notifications</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Activity from replies, reactions & milestones will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onTap(item)}
          className={cn(
            'flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
            'border-b border-border/30 last:border-b-0'
          )}
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <NotificationIcon type={item.type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug line-clamp-2">{item.message}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { data: items = [], isLoading, markAllRead } = useNotifications(user?.id);
  const hasItems = items.length > 0;

  const handleTap = (item: NotificationItem) => {
    onOpenChange(false);
    if (item.circleId) {
      navigate(`/circles/${item.circleId}`);
    } else if (item.memberId) {
      navigate(`/chat/${item.memberId}`);
    } else if (item.postId) {
      navigate(`/threads?post=${item.postId}`);
    }
  };

  const content = (
    <>
      {hasItems && !isLoading && (
        <div className="flex justify-end px-4 py-2 border-b border-border/30">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        </div>
      )}
      <ScrollArea className="max-h-[70vh] sm:max-h-[60vh]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <NotificationsList items={items} onTap={handleTap} />
        )}
      </ScrollArea>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
