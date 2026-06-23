import { motion } from 'framer-motion';
import { Home, MessageCircle, Heart, Settings, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getMember } from '@/lib/communityPersonas';
import { sfxNavTap } from '@/hooks/useAppSfx';

export type TabId = 'home' | 'feed' | 'circles' | 'messages' | 'companion' | 'favorites' | 'settings';

/** Combined badge: messages + feed notifications merged into the Messages icon */

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'nav.home', icon: Home },
  { id: 'messages', label: 'nav.messages', icon: MessageCircle },
  { id: 'companion', label: 'Companion', icon: Heart },
  { id: 'favorites', label: 'nav.favorites', icon: Star },
  { id: 'settings', label: 'nav.settings', icon: Settings },
];

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasConnections: boolean;
  companionMemberId?: string;
  badges?: Partial<Record<TabId, number>>;
}

export default function BottomNav({ activeTab, onTabChange, companionMemberId, badges = {} }: BottomNavProps) {
  const { t } = useTranslation();
  const companion = companionMemberId ? getMember(companionMemberId) : null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-white/10 bg-black/20 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.35)]" style={{ minHeight: '48px' }}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        const isCompanionTab = item.id === 'companion';

        if (isCompanionTab) {
          return (
            <div key={item.id} className="relative flex flex-1 flex-col items-center -mt-4 px-1">
              <motion.button
                onClick={() => { sfxNavTap(); onTabChange(item.id); }}
                whileTap={{ scale: 0.92 }}
                className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full shadow-md transition-all ${
                  companion ? '' : 'bg-muted border-2 border-primary/20'
                }`}
                style={companion ? {
                  backgroundColor: `hsl(var(${companion.colorVar}))`,
                  boxShadow: '0 0 0 3px hsl(var(--card)), 0 4px 16px -4px hsl(var(--primary) / 0.4)',
                } : {
                  boxShadow: '0 0 0 3px hsl(var(--card)), 0 4px 16px -4px hsl(var(--primary) / 0.3)',
                }}
              >
                {companion ? (
                  <span className="text-lg font-bold text-white">{companion.initial}</span>
                ) : (
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="cami-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%">
                          <animate attributeName="stop-color" values="#B5707A;#E8547C;#8B5CF6;#B5707A" dur="4s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="50%">
                          <animate attributeName="stop-color" values="#E8547C;#8B5CF6;#B5707A;#E8547C" dur="4s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%">
                          <animate attributeName="stop-color" values="#8B5CF6;#B5707A;#E8547C;#8B5CF6" dur="4s" repeatCount="indefinite" />
                        </stop>
                      </linearGradient>
                    </defs>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#cami-heart-grad)" />
                  </svg>
                )}
              </motion.button>
              <span className={`mt-0.5 text-[10px] font-semibold truncate hidden sm:block ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {companion ? companion.name : 'Friend'}
              </span>
            </div>
          );
        }

        // Messages icon absorbs both message + feed (notification bell) counts
        const badgeCount = item.id === 'messages'
          ? (badges.messages || 0) + (badges.feed || 0)
          : (badges[item.id] || 0);

        return (
          <motion.button
            key={item.id}
            onClick={() => { sfxNavTap(); onTabChange(item.id); }}
            whileTap={{ scale: 0.92 }}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2 sm:py-2.5 transition-colors group"
          >
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -top-px left-1/4 right-1/4 h-0.5 rounded-full gradient-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {/* Apple-style glass touch highlight */}
            <div className="absolute inset-x-2 inset-y-1 rounded-2xl opacity-0 group-active:opacity-100 transition-opacity duration-150 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '0.5px solid rgba(255,255,255,0.1)',
              }}
            />
            <div className="relative">
              <div className={`flex items-center justify-center rounded-full p-1 ${
                item.id === 'home' ? 'ring-1 ring-[hsl(38_70%_60%/0.45)] shadow-[0_0_8px_rgba(212,175,80,0.2)]' : ''
              }`}>
                <item.icon
                  className={`h-[18px] w-[18px] sm:h-5 sm:w-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                />
              </div>
              {badgeCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold notification-badge-gold shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </motion.span>
              )}
            </div>
            <span
              className={`text-[10px] font-semibold transition-colors truncate hidden sm:block ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {t(item.label)}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
