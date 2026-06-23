import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Zap, CreditCard, Star, Bell } from "lucide-react";
import { motion } from "framer-motion";

export const CardPromoSidebar = () => {
  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 relative">
      {/* Enhanced Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <CardContent className="p-6 md:p-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left side - Cards Display */}
          <div className="relative h-56 md:h-64">
            {/* KidsBloom Card - Back */}
            <motion.div 
              initial={{ rotate: -8, x: -10 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="absolute left-0 top-4 w-44 md:w-52 h-28 md:h-32 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl shadow-2xl cursor-pointer"
            >
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-white/80 text-[9px] md:text-[10px] font-medium tracking-wider">DEBIT</span>
                  <div className="w-7 h-4 md:w-8 md:h-5 bg-yellow-400/80 rounded-sm" />
                </div>
                <div>
                  <div className="text-white/60 text-[7px] md:text-[8px] tracking-widest mb-1">•••• •••• •••• 4321</div>
                  <div className="text-white text-xs md:text-sm font-bold tracking-wide">KidsBloom</div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-white/5 rounded-2xl" />
            </motion.div>

            {/* CoinsBloom Card - Front */}
            <motion.div 
              initial={{ rotate: 8, x: 10 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="absolute right-0 top-12 w-44 md:w-52 h-28 md:h-32 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-2xl shadow-2xl z-10 cursor-pointer"
            >
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-white/80 text-[9px] md:text-[10px] font-medium tracking-wider">DEBIT</span>
                  <div className="w-7 h-4 md:w-8 md:h-5 bg-yellow-400/80 rounded-sm" />
                </div>
                <div>
                  <div className="text-white/60 text-[7px] md:text-[8px] tracking-widest mb-1">•••• •••• •••• 1234</div>
                  <div className="text-white text-xs md:text-sm font-bold tracking-wide">CoinsBloom</div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-white/5 rounded-2xl" />
            </motion.div>
          </div>

          {/* Right side - Content */}
          <div className="space-y-5">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 px-4 py-1.5 rounded-full">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-white tracking-wide">Coming Soon</span>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white">Your Cards, Your Way</h3>
              <p className="text-white/60 text-sm md:text-base mt-2 leading-relaxed">
                Personalized debit cards for the whole family. Track spending, earn rewards, and build financial literacy.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2">
                <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2">
                <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <span>Real-time sync</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2">
                <CreditCard className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <span>Virtual & physical</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2">
                <Star className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <span>Rewards program</span>
              </div>
            </div>

            {/* CTA */}
            <Button 
              className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 border-0 shadow-lg shadow-emerald-500/25"
              size="lg"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notify Me When Available
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
