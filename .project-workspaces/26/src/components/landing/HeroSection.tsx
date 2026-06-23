import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download, Sparkles, Wallet, Users, MessageCircle, Building2, TrendingUp, PiggyBank } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SmartBudgetingModal } from "./SmartBudgetingModal";
import { KidsBloomModal } from "./KidsBloomModal";
import { FamilyChatModal } from "./FamilyChatModal";
import { AIInsightsModal } from "./AIInsightsModal";
import { VisionBoardModal } from "./VisionBoardModal";
import { BankingPartnersModal } from "./BankingPartnersModal";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { trackEvent } from "@/lib/analytics";

type ModalType = "budgeting" | "kids" | "chat" | "ai" | "vision" | "banking" | null;

export const HeroSection = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { isFeatureEnabled } = useFeatureFlags();

  const allFeatures = [
    { icon: Wallet, title: "Smart Budgeting", desc: "Track spending & crush debt", color: "emerald", modal: "budgeting" as ModalType },
    { icon: Users, title: "KidsBloom App", desc: "100% free kids' money app", color: "purple", modal: "kids" as ModalType, flagKey: "kids" },
    { icon: MessageCircle, title: "Family Chat", desc: "Connected family finances", color: "blue", modal: "chat" as ModalType, flagKey: "kids_chat" },
    { icon: Building2, title: "Banking Partners", desc: "Cards & accounts for families", color: "orange", modal: "banking" as ModalType, flagKey: "banking_partners" },
    { icon: TrendingUp, title: "AI Insights", desc: "Financial Architect", color: "teal", modal: "ai" as ModalType, flagKey: "coach" },
    { icon: PiggyBank, title: "Vision Board", desc: "Visualize your goals", color: "pink", modal: "vision" as ModalType, flagKey: "vision_board" },
  ];

  const features = useMemo(() => 
    allFeatures.filter(f => !f.flagKey || isFeatureEnabled(f.flagKey)),
    [isFeatureEnabled]
  );

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
      pink: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    };
    return colorMap[color] || colorMap.emerald;
  };

  // Hybrid card styles: gradient bg + colored border + glassmorphism
  const getCardStyles = (color: string) => {
    const styleMap: Record<string, string> = {
      emerald: "bg-gradient-to-br from-white/70 via-emerald-50/40 to-emerald-100/30 border-emerald-200/60 dark:from-slate-800/70 dark:via-emerald-900/20 dark:to-emerald-800/30 dark:border-emerald-700/40",
      purple: "bg-gradient-to-br from-white/70 via-purple-50/40 to-purple-100/30 border-purple-200/60 dark:from-slate-800/70 dark:via-purple-900/20 dark:to-purple-800/30 dark:border-purple-700/40",
      blue: "bg-gradient-to-br from-white/70 via-blue-50/40 to-blue-100/30 border-blue-200/60 dark:from-slate-800/70 dark:via-blue-900/20 dark:to-blue-800/30 dark:border-blue-700/40",
      orange: "bg-gradient-to-br from-white/70 via-orange-50/40 to-orange-100/30 border-orange-200/60 dark:from-slate-800/70 dark:via-orange-900/20 dark:to-orange-800/30 dark:border-orange-700/40",
      teal: "bg-gradient-to-br from-white/70 via-teal-50/40 to-teal-100/30 border-teal-200/60 dark:from-slate-800/70 dark:via-teal-900/20 dark:to-teal-800/30 dark:border-teal-700/40",
      pink: "bg-gradient-to-br from-white/70 via-pink-50/40 to-pink-100/30 border-pink-200/60 dark:from-slate-800/70 dark:via-pink-900/20 dark:to-pink-800/30 dark:border-pink-700/40",
    };
    return styleMap[color] || styleMap.emerald;
  };

  const handleFeatureClick = (item: typeof allFeatures[0]) => {
    if (item.modal) {
      setActiveModal(item.modal);
    }
  };

  // Dynamic grid columns based on visible feature count
  const getGridCols = () => {
    const count = features.length;
    if (count <= 3) return "grid-cols-1 sm:grid-cols-3";
    if (count <= 4) return "grid-cols-2 md:grid-cols-4";
    if (count <= 5) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-6";
  };

  return (
    <>
      <section className="relative overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-24 lg:pb-24">
        {/* Left circle - responsive positioning aligned with badges */}
        <div 
          className="absolute rounded-full animate-orb-pulse z-0 w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] md:w-[180px] md:h-[180px] left-[10px] sm:left-[0px] md:-left-[20px] top-[10px] sm:top-[15px] md:top-[20px]"
          style={{ 
            background: 'radial-gradient(circle, rgba(140, 185, 240, 0.45), rgba(170, 210, 255, 0.25))',
            pointerEvents: 'none',
          }}
        />
        {/* Right circle - positioned just under Family-Ready pill */}
        <div 
          className="absolute rounded-full animate-orb-bounce z-0 w-[100px] h-[100px] sm:w-[115px] sm:h-[115px] md:w-[135px] md:h-[135px] right-[12%] sm:right-[15%] md:right-[18%] top-[100px] sm:top-[85px] md:top-[70px]"
          style={{ 
            background: 'radial-gradient(circle, rgba(216, 180, 254, 0.38), rgba(192, 132, 252, 0.18))',
            pointerEvents: 'none',
          }}
        />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Trust badges - three inline pills */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-10"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-purple-500/10 dark:bg-purple-400/15 text-purple-700 dark:text-purple-200 text-xs sm:text-sm font-medium whitespace-nowrap backdrop-blur-sm">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                AI-Powered Platform
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-200 text-xs sm:text-sm font-medium whitespace-nowrap backdrop-blur-sm">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                All-In-One
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-orange-500/10 dark:bg-orange-400/15 text-orange-700 dark:text-orange-200 text-xs sm:text-sm font-medium whitespace-nowrap backdrop-blur-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                Family-Ready
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            >
              <span className="text-foreground">One Platform to</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 bg-clip-text text-transparent">
                Master Your Money.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base md:text-lg text-muted-foreground mb-4 max-w-2xl mx-auto"
            >
              Budget smarter, track spending, manage bills, and grow your savings — plant your financial seeds, all in one place.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-sm md:text-base font-semibold tracking-wide mb-8 max-w-2xl mx-auto"
            >
              <span className="bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Most AI resets. Bloom builds.
              </span>
            </motion.p>
            

            {/* Primary CTA — single focused action; Install moved to header icon */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center mb-6"
            >
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-emerald-500/25 w-full sm:w-auto" asChild>
                <Link to="/auth?mode=signup" onClick={() => trackEvent("hero_cta_signup")}>
                  Start Free Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground mb-12"
            >
              Free to start • Premium from $9.99/mo • No contracts
            </motion.p>

            {/* Feature highlights - dynamic grid */}
            {features.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className={`grid ${getGridCols()} gap-3`}
              >
                {features.map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    onClick={() => handleFeatureClick(item)}
                    className={`relative p-4 rounded-xl border backdrop-blur-md shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 cursor-pointer group ${getCardStyles(item.color)}`}
                  >
                    {/* Subtle shimmer overlay */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 via-transparent to-white/10 dark:from-white/5 dark:to-white/5 pointer-events-none" />
                    
                    <div className={`relative w-9 h-9 rounded-lg flex items-center justify-center mb-2 mx-auto ${getColorClasses(item.color)} shadow-sm`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <h3 className="relative font-semibold text-xs mb-0.5 text-center">{item.title}</h3>
                    <p className="relative text-[10px] text-muted-foreground text-center leading-tight">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Modals */}
      <SmartBudgetingModal open={activeModal === "budgeting"} onOpenChange={(open) => !open && setActiveModal(null)} />
      <KidsBloomModal open={activeModal === "kids"} onOpenChange={(open) => !open && setActiveModal(null)} />
      <FamilyChatModal open={activeModal === "chat"} onOpenChange={(open) => !open && setActiveModal(null)} />
      <AIInsightsModal open={activeModal === "ai"} onOpenChange={(open) => !open && setActiveModal(null)} />
      <VisionBoardModal open={activeModal === "vision"} onOpenChange={(open) => !open && setActiveModal(null)} />
      <BankingPartnersModal open={activeModal === "banking"} onOpenChange={(open) => !open && setActiveModal(null)} />
    </>
  );
};
