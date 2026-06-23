import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, CreditCard, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import CreditCardsSection from "@/components/credit/CreditCardsSection";

export const DualCardPromo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 px-4 py-1.5 rounded-full">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white tracking-wide">Partner Banking</span>
            </div>

            {/* Icons Display */}
            <div className="relative w-full max-w-xs h-36 flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-2xl shadow-2xl flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform">
                  <CreditCard className="h-10 w-10 text-white" />
                </div>
                <div className="w-24 h-24 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl shadow-2xl flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform">
                  <Users className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Cards & Accounts for Everyone</h3>
              <p className="text-white/60 text-sm max-w-sm">
                Explore banking products from trusted partners like Varo, SoFi, and Chime. Cards, savings, and more.
              </p>
            </div>

            {/* CTA - Opens bottom sheet on mobile */}
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setOpen(true)}
            >
              Explore Banking Options
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Sheet / Drawer for Partner Products */}
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
    </>
  );
};
