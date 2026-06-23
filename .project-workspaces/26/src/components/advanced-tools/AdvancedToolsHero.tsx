import { ChevronLeft, Home, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const AdvancedToolsHero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 px-4 py-5 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -left-8 bottom-0 w-32 h-32 rounded-full bg-white/10 blur-sm" />
      <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/10 blur-sm" />
      
      {/* Navigation */}
      <div className="relative z-10 flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10"
          onClick={() => navigate("/dashboard")}
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <Wrench className="h-6 w-6 text-white" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Specialized Tools</h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-sm text-white/90"
          >
            Store policies, track expenses, plan taxes, and organize charitable giving
          </motion.p>
        </div>
      </div>
    </div>
  );
};
