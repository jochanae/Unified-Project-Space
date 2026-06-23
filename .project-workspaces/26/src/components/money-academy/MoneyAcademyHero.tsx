import { ArrowLeft, Home, Video, BookOpen, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface MoneyAcademyHeroProps {
  activeSection: "videos" | "lessons" | "expert";
  onSectionChange: (section: "videos" | "lessons" | "expert") => void;
}

export const MoneyAcademyHero = ({ activeSection, onSectionChange }: MoneyAcademyHeroProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-r from-[hsl(270,70%,55%)] to-[hsl(340,70%,50%)] px-4 pt-4 pb-6">
      {/* Decorative circle - matches bill reminders style */}
      <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-white/15 rounded-full" />
      {/* Background blur decoration */}
      <div className="absolute top-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      
      {/* Navigation */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/dashboard")}
          className="text-white hover:bg-white/20"
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>

      {/* Title */}
      <div className="relative z-10 mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">Money Academy</h1>
        <p className="text-white/80 text-sm">
          Learn financial literacy through interactive lessons, videos, and expert insights
        </p>
      </div>

      {/* Section Buttons */}
      <div className="relative z-10 flex gap-3 mt-6">
        <Button
          onClick={() => onSectionChange("videos")}
          className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-xl transition-all ${
            activeSection === "videos" 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "bg-red-500/80 hover:bg-red-500 text-white"
          }`}
        >
          <Video className="h-5 w-5" />
          <span className="text-xs font-medium">Watch Videos</span>
        </Button>
        
        <Button
          onClick={() => onSectionChange("lessons")}
          className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-xl transition-all ${
            activeSection === "lessons" 
              ? "bg-primary hover:bg-primary/90 text-white" 
              : "bg-primary/80 hover:bg-primary text-white"
          }`}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-medium">Browse Lessons</span>
        </Button>
        
        <Button
          onClick={() => onSectionChange("expert")}
          className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-xl transition-all bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white`}
        >
          <Users className="h-5 w-5" />
          <span className="text-xs font-medium">Ask an Expert</span>
        </Button>
      </div>
    </div>
  );
};
