import { HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const HelpCenterHero = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative px-4 pt-8 pb-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Help Center
        </h1>
        
        <p className="text-muted-foreground text-lg mb-6">
          Get help, learn features, and find answers to your questions
        </p>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-card border-border/50"
          />
        </div>
      </div>
    </section>
  );
};
