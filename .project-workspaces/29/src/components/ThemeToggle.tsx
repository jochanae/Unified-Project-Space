import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          {/* Light mode icon - visible when light theme active */}
          <Sun className={cn(
            "h-5 w-5 transition-all text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]",
            theme === "light" ? "rotate-0 scale-100" : "rotate-90 scale-0 absolute"
          )} />
          {/* Dark mode icon - visible when dark theme active */}
          <Moon className={cn(
            "h-5 w-5 transition-all text-chart-4",
            theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0 absolute"
          )} />
          {/* System mode icon - visible when system theme active */}
          <Monitor className={cn(
            "h-5 w-5 transition-all text-primary",
            theme === "system" ? "rotate-0 scale-100" : "rotate-90 scale-0 absolute"
          )} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={cn(theme === "light" && "bg-accent")}
        >
          <Sun className="mr-2 h-4 w-4 text-gold" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "bg-accent")}
        >
          <Moon className="mr-2 h-4 w-4 text-chart-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={cn(theme === "system" && "bg-accent")}
        >
          <Monitor className="mr-2 h-4 w-4 text-primary" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
