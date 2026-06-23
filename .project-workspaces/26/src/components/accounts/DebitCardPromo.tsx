import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Sparkles, Shield, Zap, Users, CreditCard, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import CreditCardsSection from "@/components/credit/CreditCardsSection";

interface DebitCardPromoProps {
  variant?: "compact" | "full";
}

export const DebitCardPromo = ({ variant = "compact" }: DebitCardPromoProps) => {
  const [open, setOpen] = useState(false);
  
  const partnerDrawer = (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Partner Banking Products
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <CreditCardsSection />
        </div>
      </DrawerContent>
    </Drawer>
  );
  if (variant === "compact") {
    return (
      <>
        <Card className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border-0 text-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-8 bg-white/20 rounded-md flex items-center justify-center backdrop-blur-sm">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Banking Partners</h3>
                <p className="text-xs text-white/80 truncate">Explore cards & accounts from partners</p>
              </div>
              <Button 
                size="sm" 
                variant="secondary" 
                className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => setOpen(true)}
              >
                Explore
              </Button>
            </div>
          </CardContent>
        </Card>
        {partnerDrawer}
      </>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 border-0 text-white overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Building2 className="h-12 w-12 text-white" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3" />
                Partner Recommendations
              </div>
              <h3 className="text-2xl font-bold mb-2">Banking Partners</h3>
              <p className="text-white/70 mb-4 max-w-md">
                Explore curated banking products from our trusted partners. 
                Debit cards, savings accounts, and more.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-indigo-400" />
                  <span>Trusted Partners</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span>Easy Setup</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-pink-400" />
                  <span>Multiple Options</span>
                </div>
              </div>

              <Button 
                className="bg-white text-slate-900 hover:bg-white/90"
                onClick={() => setOpen(true)}
              >
                Explore Banking Options
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {partnerDrawer}
    </>
  );
};
