import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, DollarSign, User, Briefcase, Heart, Activity, Sparkles, GraduationCap, Plane, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VisionCategory, VISION_CATEGORIES } from '@/lib/visionCategories';

interface CategoryFilterBarProps {
  selectedCategories: VisionCategory[];
  onCategorySelect: (category: VisionCategory | null) => void;
}

const categoryIcons: Record<string, any> = {
  financial: DollarSign,
  personal: User,
  career: Briefcase,
  family: Heart,
  health: Activity,
  education: GraduationCap,
  travel: Plane,
  other: Grid,
};

const categoryColors: Record<string, string> = {
  financial: 'bg-teal-500',
  personal: 'bg-purple-500',
  career: 'bg-amber-500',
  family: 'bg-green-500',
  health: 'bg-red-500',
  education: 'bg-indigo-500',
  travel: 'bg-sky-500',
  other: 'bg-slate-500',
};

export function CategoryFilterBar({ selectedCategories, onCategorySelect }: CategoryFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 150;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  const allCategories = [
    { value: null, label: 'All', icon: Sparkles, color: 'bg-slate-500' },
    ...VISION_CATEGORIES.map(cat => ({
      value: cat.value,
      label: cat.label,
      icon: categoryIcons[cat.value] || cat.icon,
      color: categoryColors[cat.value] || 'bg-slate-500',
    })),
  ];

  return (
    <div className="relative z-20">
      {/* Left Arrow */}
      {canScrollLeft && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Categories Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allCategories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = cat.value === null 
            ? selectedCategories.length === 0 
            : selectedCategories.includes(cat.value);

          return (
            <motion.button
              key={cat.value || 'all'}
              onClick={() => onCategorySelect(cat.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300",
                "border backdrop-blur-md font-medium text-sm",
                isSelected
                  ? `${cat.color} text-white border-white/30 shadow-lg`
                  : "bg-white/10 border-white/20 text-white/90 hover:bg-white/20"
              )}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </motion.button>
          );
        })}
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
