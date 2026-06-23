import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Image, Shirt } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CompanionHero from '@/components/world/CompanionHero';
import WorldVaultTab from '@/components/world/WorldVaultTab';
import WorldWardrobeTab from '@/components/world/WorldWardrobeTab';
import StudioPreviewCard from '@/components/world/StudioPreviewCard';
import { useActiveProps } from '@/hooks/useActiveProps';

export default function WorldPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, connections, activeConnection, activeConnectionIndex, setActiveConnectionIndex } = useAppContext();

  const tabParam = searchParams.get('tab');
  // 'uploads' is now a chip *inside* the Vault tab — redirect legacy ?tab=uploads to vault
  const initialTab: 'vault' | 'wardrobe' =
    tabParam === 'wardrobe' ? 'wardrobe' : 'vault';

  const activeCompanions = connections.filter(c => !c.isArchived);
  const [selectedMemberId, setSelectedMemberId] = useState(activeConnection?.memberId || '');

  useEffect(() => {
    if (activeConnection?.memberId) setSelectedMemberId(activeConnection.memberId);
  }, [activeConnection?.memberId]);

  const companion = activeCompanions.find(c => c.memberId === selectedMemberId) || activeConnection;
  const { currentProp, propCount } = useActiveProps(user?.id ?? null, companion?.memberId);

  const handleSwitch = (memberId: string) => {
    setSelectedMemberId(memberId);
    const idx = activeCompanions.findIndex(c => c.memberId === memberId);
    if (idx >= 0) setActiveConnectionIndex(idx);
  };

  if (!companion) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-semibold text-foreground">No companion yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create a companion to explore their world.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 shrink-0 md:-mx-[max(2rem,env(safe-area-inset-left,0px))] md:px-[calc(max(2rem,env(safe-area-inset-left,0px))+1.25rem)]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40 hover:bg-muted/60 transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
          <Globe className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-base font-bold text-foreground">
            {companion.name}'s World
          </h1>
          <p className="text-[11px] text-muted-foreground">Identity, style & creations</p>
        </div>
      </div>

      {/* Companion Hero */}
      <CompanionHero
        companion={companion}
        allCompanions={activeCompanions}
        onSwitch={handleSwitch}
        currentProp={currentProp}
        propCount={propCount}
      />

      {/* Tabbed Content */}
      <div className="flex-1">
        <Tabs
          value={initialTab}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', v);
            setSearchParams(next, { replace: true });
          }}
          className="flex flex-col h-full"
        >
          <div className="px-5 pt-3 shrink-0">
            <TabsList className="w-full bg-muted/50">
              <TabsTrigger value="vault" className="flex-1 gap-1.5 text-xs">
                <Image className="h-3.5 w-3.5" />
                Vault
              </TabsTrigger>
              <TabsTrigger value="wardrobe" className="flex-1 gap-1.5 text-xs">
                <Shirt className="h-3.5 w-3.5" />
                Wardrobe
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-5 py-4 pb-40">
            {/* Studio preview card — always visible */}
            <div className="mb-4">
              <StudioPreviewCard companion={companion} />
            </div>

            <TabsContent value="vault" className="mt-0">
              {user && (
                <WorldVaultTab
                  userId={user.id}
                  memberId={companion.memberId}
                  companionName={companion.name}
                />
              )}
            </TabsContent>

            <TabsContent value="wardrobe" className="mt-0">
              {user && (
                <WorldWardrobeTab
                  userId={user.id}
                  memberId={companion.memberId}
                  companionName={companion.name}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
