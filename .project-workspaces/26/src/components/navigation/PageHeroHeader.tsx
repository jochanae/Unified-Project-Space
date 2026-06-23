import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeroHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  colorScheme?: "purple" | "teal" | "blue" | "green" | "orange" | "pink";
  children?: ReactNode;
}

// Vibrant HSL color schemes matching the Dashboard StatusHeroBar style
const colorSchemes = {
  purple: {
    gradient: "from-[hsl(270,75%,55%)] via-[hsl(290,70%,55%)] to-[hsl(320,80%,60%)]",
    decorativeCircle1: "bg-[hsl(280,60%,75%)]/40",
    decorativeCircle2: "bg-[hsl(320,70%,70%)]/30",
  },
  teal: {
    gradient: "from-[hsl(180,70%,45%)] via-[hsl(200,75%,50%)] to-[hsl(230,70%,55%)]",
    decorativeCircle1: "bg-[hsl(190,60%,70%)]/40",
    decorativeCircle2: "bg-[hsl(210,70%,65%)]/30",
  },
  blue: {
    gradient: "from-[hsl(200,85%,55%)] via-[hsl(220,80%,55%)] to-[hsl(250,75%,60%)]",
    decorativeCircle1: "bg-[hsl(210,60%,75%)]/40",
    decorativeCircle2: "bg-[hsl(240,70%,70%)]/30",
  },
  green: {
    gradient: "from-[hsl(150,70%,45%)] via-[hsl(170,65%,50%)] to-[hsl(190,70%,55%)]",
    decorativeCircle1: "bg-[hsl(160,60%,70%)]/40",
    decorativeCircle2: "bg-[hsl(180,70%,65%)]/30",
  },
  orange: {
    gradient: "from-[hsl(30,85%,55%)] via-[hsl(20,80%,55%)] to-[hsl(350,75%,60%)]",
    decorativeCircle1: "bg-[hsl(35,60%,75%)]/40",
    decorativeCircle2: "bg-[hsl(10,70%,70%)]/30",
  },
  pink: {
    gradient: "from-[hsl(320,75%,55%)] via-[hsl(340,70%,55%)] to-[hsl(360,80%,60%)]",
    decorativeCircle1: "bg-[hsl(330,60%,75%)]/40",
    decorativeCircle2: "bg-[hsl(350,70%,70%)]/30",
  },
};

export function PageHeroHeader({
  title,
  subtitle,
  icon,
  colorScheme = "purple",
  children,
}: PageHeroHeaderProps) {
  const navigate = useNavigate();
  const scheme = colorSchemes[colorScheme];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${scheme.gradient} text-white px-4 py-4 sm:py-3`}>
      {/* Decorative circles - matching Dashboard style */}
      <div className={`absolute -left-8 bottom-0 w-32 h-32 rounded-full ${scheme.decorativeCircle1} blur-sm`} />
      <div className={`absolute right-0 top-0 w-40 h-40 rounded-full ${scheme.decorativeCircle2} blur-sm`} />

      {/* Navigation buttons */}
      <div className="max-w-6xl mx-auto flex items-center gap-3 mb-3 sm:mb-2 relative z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20 h-9 w-9 sm:h-8 sm:w-8"
        >
          <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-white hover:bg-white/20 h-9 w-9 sm:h-8 sm:w-8"
        >
          <Home className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1 min-w-0">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2"
          >
            {icon}
            <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
          </motion.div>
          {subtitle && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-xs sm:text-sm text-white/90"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
