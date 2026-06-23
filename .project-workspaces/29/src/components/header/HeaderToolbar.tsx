import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SimpleCalculator } from "@/components/tools/SimpleCalculator";
import { ImportModal } from "@/components/header/ImportModal";
import { ExportModal } from "@/components/header/ExportModal";
import { downloadTradeTemplate, downloadPlanTemplate } from "@/lib/templateDownloads";
import {
  Upload,
  Download,
  FileText,
  Hash,
  BookOpen,
  Target,
  BarChart3,
  Scale,
  Percent,
  Calculator,
  ChevronRight,
} from "lucide-react";

interface ToolbarItem {
  icon: React.ReactNode;
  label: string;
  action: "link" | "callback";
  href?: string;
  onClick?: () => void;
  color: string;
}

interface HeaderToolbarProps {
  isOpen: boolean;
  onImportClick?: () => void;
}

export function HeaderToolbar({ isOpen, onImportClick }: HeaderToolbarProps) {
  const [calcOpen, setCalcOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Check if there's overflow to scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScrollRight(el.scrollWidth > el.clientWidth + el.scrollLeft + 8);
    check();
    el.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [isOpen]);

  // Hide pulsing arrow after 3 seconds
  useEffect(() => {
    if (isOpen) {
      setShowScrollHint(true);
      const timer = setTimeout(() => setShowScrollHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const isJournalPage = location.pathname === "/journal";
  const isPlanPage = location.pathname === "/plan";

  const toolbarItems: ToolbarItem[] = [
    {
      icon: <Upload className="h-4 w-4" />,
      label: "Import",
      action: "callback",
      onClick: () => setImportOpen(true),
      color: "text-primary",
    },
    {
      icon: <Download className="h-4 w-4" />,
      label: "CSV",
      action: "callback",
      onClick: () => {
        if (isPlanPage) {
          downloadPlanTemplate();
        } else {
          downloadTradeTemplate();
        }
      },
      color: "text-gain",
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Export",
      action: "callback",
      onClick: () => setExportOpen(true),
      color: "text-chart-3",
    },
    {
      icon: <Hash className="h-4 w-4" />,
      label: "Calculator",
      action: "callback",
      onClick: () => setCalcOpen(true),
      color: "text-chart-2",
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: "Notepad",
      action: "link",
      href: "/tools/notepad",
      color: "text-chart-5",
    },
    {
      icon: <Target className="h-4 w-4" />,
      label: "Position Size",
      action: "link",
      href: "/tools/position-size",
      color: "text-primary",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Risk/Reward",
      action: "link",
      href: "/tools/risk-reward",
      color: "text-gain",
    },
    {
      icon: <Scale className="h-4 w-4" />,
      label: "Margin",
      action: "link",
      href: "/tools/margin",
      color: "text-chart-4",
    },
    {
      icon: <Percent className="h-4 w-4" />,
      label: "Options",
      action: "link",
      href: "/calculator",
      color: "text-chart-3",
    },
    {
      icon: <Calculator className="h-4 w-4" />,
      label: "Compound",
      action: "link",
      href: "/tools/compound",
      color: "text-gold",
    },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden bg-card/80 backdrop-blur-xl border-b border-border/30 shadow-sm"
          >
            <div className="py-2.5 px-3">
              <div className="relative">
                <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 pr-6">
                  {toolbarItems.map((item) => {
                    const content = (
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={item.color}>{item.icon}</span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </span>
                    );

                    if (item.action === "link" && item.href) {
                      return (
                        <Link key={item.label} to={item.href}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-border/50 bg-background/60 hover:bg-accent shrink-0 h-9 px-4"
                          >
                            {content}
                          </Button>
                        </Link>
                      );
                    }

                    return (
                      <Button
                        key={item.label}
                        variant="outline"
                        size="sm"
                        onClick={item.onClick}
                        className="rounded-full border-border/50 bg-background/60 hover:bg-accent shrink-0 h-9 px-4"
                      >
                        {content}
                      </Button>
                    );
                  })}
                </div>

                {/* Fade gradient on right edge */}
                {canScrollRight && (
                  <div className="absolute right-0 top-0 bottom-1 w-10 pointer-events-none bg-gradient-to-l from-card/80 to-transparent" />
                )}

                {/* Pulsing scroll arrow */}
                {canScrollRight && showScrollHint && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground animate-[pulse_1.5s_ease-in-out_infinite]" />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calculator Dialog */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="w-auto p-0 border-0 bg-transparent shadow-none max-w-[90vw] sm:max-w-fit">
          <DialogTitle className="sr-only">Simple Calculator</DialogTitle>
          <SimpleCalculator onClose={() => setCalcOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />

      {/* Export Modal */}
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}
