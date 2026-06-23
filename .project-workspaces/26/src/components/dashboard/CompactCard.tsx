import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown, ArrowRight, LucideIcon, HelpCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useDashboardEdit } from "@/contexts/DashboardEditContext";
import { CardInfoModal } from "./CardInfoModal";
import { motion, AnimatePresence } from "framer-motion";

interface CompactCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  hasNavigation?: boolean;
  navigationRoute?: string;
  badge?: string;
  badgeVariant?: "default" | "premium" | "critical" | "success" | "score";
  badgeIcon?: "sparkles";
  colorVariant?: "blue" | "purple" | "green" | "amber" | "pink" | "teal" | "slate" | "rose" | "indigo" | "emerald";
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  expandMode?: "height" | "sheet";
  className?: string;
}

const colorStyles = {
  blue: "bg-blue-50/70 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50",
  purple: "bg-purple-50/70 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50",
  green: "bg-green-50/70 dark:bg-green-950/30 border-green-100 dark:border-green-900/50",
  amber: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50",
  pink: "bg-pink-50/70 dark:bg-pink-950/30 border-pink-100 dark:border-pink-900/50",
  teal: "bg-teal-50/70 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/50",
  slate: "bg-slate-50/70 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50",
  rose: "bg-rose-50/70 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50",
  indigo: "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50",
  emerald: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50",
};

export const CompactCard = ({
  id,
  title,
  icon: Icon,
  hasNavigation = false,
  navigationRoute,
  badge,
  badgeVariant = "default",
  badgeIcon,
  colorVariant = "slate",
  children,
  expandedContent,
  expandMode = "height",
  className,
}: CompactCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const navigate = useNavigate();
  const { isEditMode, hideCard, getCardDescription } = useDashboardEdit();

  const handleNavigate = () => {
    if (navigationRoute) {
      navigate(navigationRoute);
    }
  };

  const handleExpandClick = () => {
    if (expandMode === "sheet") {
      setIsSheetOpen(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleKeep = () => {
    setIsInfoModalOpen(false);
  };

  const handleDelete = () => {
    hideCard(id);
    setIsInfoModalOpen(false);
  };

  const badgeStyles = {
    default: "bg-muted text-muted-foreground",
    premium: "bg-primary text-primary-foreground",
    critical: "bg-destructive text-destructive-foreground",
    success: "bg-green-500 text-white",
    score: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
  };

  return (
    <>
      <Card
        className={cn(
          "relative transition-all duration-300 border flex flex-col overflow-hidden",
          colorStyles[colorVariant],
          isExpanded && expandMode === "height" ? "row-span-2" : "",
          className
        )}
        style={{ height: isExpanded && expandMode === "height" ? 'auto' : '180px' }}
      >
        {/* Edit mode question mark button - animated pulse */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.1, 1], 
                opacity: 1,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                scale: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 1.5,
                  ease: "easeInOut"
                }
              }}
              className="absolute top-1 right-1 z-10"
            >
              <Button
                size="icon"
                onClick={() => setIsInfoModalOpen(true)}
                className="h-6 w-6 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 shadow-lg border-2 border-white"
              >
                <HelpCircle className="h-3 w-3 text-white" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader className="pb-1 pt-2.5 px-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="p-1 rounded-lg bg-primary/10 flex-shrink-0">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-semibold text-xs text-foreground leading-tight truncate min-w-0" title={title}>{title}</h3>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {hasNavigation && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleNavigate}
                  disabled={isEditMode}
                >
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full border border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                onClick={handleExpandClick}
                disabled={isEditMode}
              >
                {isExpanded && expandMode === "height" ? (
                  <ChevronUp className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                )}
              </Button>
            </div>
          </div>
          {badge && (
            <div className="mt-0.5 ml-7">
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5 whitespace-nowrap",
                  badgeStyles[badgeVariant]
                )}
              >
                {badgeIcon === "sparkles" && <Sparkles className="h-2.5 w-2.5" />}
                {badge}
              </span>
            </div>
          )}
        </CardHeader>

        {/* Content area with scroll */}
        <div className="flex-1 overflow-hidden px-1">
          <div 
            className="h-full w-full overflow-auto"
            style={{ 
              touchAction: 'pan-y',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              .compact-card-scroll::-webkit-scrollbar { display: none; }
            `}} />
            <div 
              className="compact-card-scroll"
              style={{ 
                transform: 'scale(0.6)', 
                width: '166.67%',
                minHeight: '166.67%',
                transformOrigin: 'top left',
                padding: '8px'
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </Card>

      {/* Sheet for expanded view */}
      {expandMode === "sheet" && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {title}
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-full pb-8">
              {expandedContent || children}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Card Info Modal */}
      <CardInfoModal
        open={isInfoModalOpen}
        onOpenChange={setIsInfoModalOpen}
        cardId={id}
        cardTitle={title}
        cardIcon={Icon}
        description={getCardDescription(id)}
        onKeep={handleKeep}
        onDelete={handleDelete}
      />
    </>
  );
};