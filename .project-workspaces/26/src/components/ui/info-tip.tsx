import { useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InfoTipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * A mobile-friendly info tooltip that works on tap (touch) and hover (desktop).
 * Wraps children and shows an info popover when the ⓘ area is tapped/hovered.
 */
export function InfoTip({ children, content, side = "bottom", className }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={`cursor-help ${className || ""}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className="max-w-[220px] p-2 text-center text-xs"
        onPointerDownOutside={() => setOpen(false)}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
