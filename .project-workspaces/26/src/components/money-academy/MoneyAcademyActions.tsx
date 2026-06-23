import { Video, BookOpen, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MoneyAcademyActionsProps {
  activeSection: "videos" | "lessons" | "expert";
  onSectionChange: (section: "videos" | "lessons" | "expert") => void;
}

export const MoneyAcademyActions = ({ activeSection, onSectionChange }: MoneyAcademyActionsProps) => {
  const handleSectionClick = (section: "videos" | "lessons" | "expert") => {
    onSectionChange(section);
    
    // Smooth scroll to content area after a brief delay for state update
    if (section !== "expert") {
      setTimeout(() => {
        const contentArea = document.getElementById("academy-content");
        if (contentArea) {
          contentArea.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  return (
    <div className="px-4 pt-4 max-w-3xl mx-auto">
      <div className="grid grid-cols-3 gap-3">
        <Card 
          onClick={() => handleSectionClick("videos")}
          className={`cursor-pointer border-0 p-2.5 lg:p-2 text-center text-white shadow-lg transition-all hover:scale-105 ${
            activeSection === "videos" 
              ? "bg-gradient-to-br from-red-500 to-red-600 ring-2 ring-red-300" 
              : "bg-gradient-to-br from-red-500/80 to-red-600/80"
          }`}
        >
          <Video className="w-4 h-4 mx-auto mb-0.5 text-red-100" />
          <p className="text-[10px] text-red-100/80">Watch</p>
          <p className="text-xs lg:text-sm font-bold">Videos</p>
        </Card>
        
        <Card 
          onClick={() => handleSectionClick("lessons")}
          className={`cursor-pointer border-0 p-2.5 lg:p-2 text-center text-white shadow-lg transition-all hover:scale-105 ${
            activeSection === "lessons" 
              ? "bg-gradient-to-br from-primary to-primary/90 ring-2 ring-primary/50" 
              : "bg-gradient-to-br from-primary/80 to-primary/70"
          }`}
        >
          <BookOpen className="w-4 h-4 mx-auto mb-0.5 text-primary-foreground/80" />
          <p className="text-[10px] text-primary-foreground/70">Browse</p>
          <p className="text-xs lg:text-sm font-bold">Lessons</p>
        </Card>
        
        <Card 
          onClick={() => handleSectionClick("expert")}
          className={`cursor-pointer border-0 p-2.5 lg:p-2 text-center text-white shadow-lg transition-all hover:scale-105 ${
            activeSection === "expert" 
              ? "bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-purple-300" 
              : "bg-gradient-to-br from-purple-500/80 to-pink-500/80"
          }`}
        >
          <Users className="w-4 h-4 mx-auto mb-0.5 text-purple-100" />
          <p className="text-[10px] text-purple-100/80">Ask an</p>
          <p className="text-xs lg:text-sm font-bold">Expert</p>
        </Card>
      </div>
    </div>
  );
};
