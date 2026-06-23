import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, User } from 'lucide-react';
import PlatformHealthView from './PlatformHealthView';
import UserIntegrityView from './UserIntegrityView';

interface DataIntegrityDashboardProps {
  userId: string;
}

export default function DataIntegrityDashboard({ userId }: DataIntegrityDashboardProps) {
  return (
    <Tabs defaultValue="platform" className="w-full">
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="platform" className="gap-1.5 text-xs">
          <Globe className="h-3.5 w-3.5" /> Platform
        </TabsTrigger>
        <TabsTrigger value="user" className="gap-1.5 text-xs">
          <User className="h-3.5 w-3.5" /> Per User
        </TabsTrigger>
      </TabsList>
      <TabsContent value="platform">
        <PlatformHealthView />
      </TabsContent>
      <TabsContent value="user">
        <UserIntegrityView currentUserId={userId} />
      </TabsContent>
    </Tabs>
  );
}
