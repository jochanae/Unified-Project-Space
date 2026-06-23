import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

interface CollapsibleCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  storageKey?: string; // Persist collapsed state
}

export function CollapsibleCard({
  title,
  description,
  icon,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  storageKey,
}: CollapsibleCardProps) {
  // Load initial state from localStorage if storageKey provided
  const getInitialState = () => {
    if (storageKey && typeof window !== "undefined") {
      const stored = localStorage.getItem(`collapsible-${storageKey}`);
      if (stored !== null) {
        return stored === "true";
      }
    }
    return defaultOpen;
  };

  const [isOpen, setIsOpen] = React.useState(getInitialState);

  // Persist state to localStorage
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(`collapsible-${storageKey}`, String(open));
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <Card className={cn("border-border/50 bg-card/50 backdrop-blur-sm", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className={cn(
              "cursor-pointer select-none transition-colors hover:bg-muted/30",
              !isOpen && "pb-4",
              headerClassName
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  {description && (
                    <CardDescription className="mt-0.5">{description}</CardDescription>
                  )}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className={contentClassName}>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
