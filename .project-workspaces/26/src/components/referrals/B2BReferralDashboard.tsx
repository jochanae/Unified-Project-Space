import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { B2BReferralForm } from "./B2BReferralForm";
import { MyB2BReferrals } from "./MyB2BReferrals";
import { Building2, PlusCircle, List } from "lucide-react";

interface B2BReferralDashboardProps {
  referrerType: 'professional' | 'user';
  professionalId?: string;
}

const COMMISSION_RATES = {
  professional: 15,
  user: 10,
};

export function B2BReferralDashboard({ referrerType, professionalId }: B2BReferralDashboardProps) {
  const [activeTab, setActiveTab] = useState("referrals");
  const commissionRate = COMMISSION_RATES[referrerType];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">B2B Partner Referrals</h2>
          <p className="text-sm text-muted-foreground">
            Earn {commissionRate}% monthly commission for up to 12 months
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            My Referrals
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New Referral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-6">
          <MyB2BReferrals 
            referrerType={referrerType} 
            professionalId={professionalId} 
          />
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <B2BReferralForm
            referrerType={referrerType}
            professionalId={professionalId}
            commissionRate={commissionRate}
            onSuccess={() => setActiveTab("referrals")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
