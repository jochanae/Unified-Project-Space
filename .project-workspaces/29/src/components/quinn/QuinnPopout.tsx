import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import { QuinnChat } from './QuinnChat';
import { cn } from '@/lib/utils';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const MIN_WIDTH = 360;
const MIN_HEIGHT = 500;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 600;

export function QuinnPopoutButton() {
  const [isOpen, setIsOpen] = useState(false);

  // Hide on mobile - popout window only makes sense on desktop
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 hidden md:inline-flex"
        title="Open Quinn in floating window for side-by-side trading"
      >
        <ExternalLink className="h-4 w-4" />
        <span className="hidden sm:inline">Pop Out</span>
      </Button>

      {isOpen && <QuinnPopoutWindow onClose={() => setIsOpen(false)} />}
    </>
  );
}

interface QuinnPopoutWindowProps {
  onClose: () => void;
}

export function QuinnPopoutWindow({ onClose }: QuinnPopoutWindowProps) {
  const [position, setPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('quinn-popout-position');
    if (saved) return JSON.parse(saved);
    return { x: window.innerWidth - DEFAULT_WIDTH - 20, y: 80 };
  });

  const [size, setSize] = useState<Size>(() => {
    const saved = localStorage.getItem('quinn-popout-size');
    if (saved) return JSON.parse(saved);
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Save position and size to localStorage
  useEffect(() => {
    localStorage.setItem('quinn-popout-position', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem('quinn-popout-size', JSON.stringify(size));
  }, [size]);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.popout-header-drag')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    }
    if (isResizing) {
      const newWidth = Math.max(MIN_WIDTH, e.clientX - position.x);
      const newHeight = Math.max(MIN_HEIGHT, e.clientY - position.y);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragOffset, position, size.width]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const popoutContent = (
    <div
      className={cn(
        "fixed z-[9999] rounded-xl border border-border/50 shadow-2xl",
        "flex flex-col overflow-hidden",
        "bg-background/95 backdrop-blur-xl",
        isDragging && "cursor-grabbing select-none",
        isMinimized && "h-auto"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="popout-header-drag flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Quinn — Trading Companion</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          <QuinnChat />
        </div>
      )}

      {/* Resize handle */}
      {!isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsResizing(true);
          }}
        >
          <svg
            className="w-4 h-4 text-muted-foreground/50"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      )}
    </div>
  );

  return createPortal(popoutContent, document.body);
}


