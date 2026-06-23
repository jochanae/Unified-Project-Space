import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, ChevronDown, Sparkles, Trophy, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getCategoryConfig, type VisionCategory, VISION_CATEGORIES } from '@/lib/visionCategories';
import type { VisionBoardItem } from './AddVisionSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TimelineJourneyProps {
  items: VisionBoardItem[];
  onOpenDetail: (item: VisionBoardItem) => void;
}

interface TimelineEvent {
  id: string;
  item: VisionBoardItem;
  type: 'created' | 'completed' | 'milestone';
  date: Date;
  title: string;
  description: string;
}

export function TimelineJourney({ items, onOpenDetail }: TimelineJourneyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Generate timeline events from items
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    items.forEach((item) => {
      // Created event - use a fallback date if createdAt doesn't exist
      const createdDate = (item as any).createdAt ? new Date((item as any).createdAt) : new Date();
      allEvents.push({
        id: `${item.id}-created`,
        item,
        type: 'created',
        date: createdDate,
        title: `Vision "${item.title}" born`,
        description: 'A new dream was added to your vision board',
      });

      // Completed event
      if (item.isCompleted && item.completedAt) {
        allEvents.push({
          id: `${item.id}-completed`,
          item,
          type: 'completed',
          date: new Date(item.completedAt),
          title: `Vision "${item.title}" achieved!`,
          description: 'Your dream became reality',
        });
      }
    });

    // Sort by date descending
    return allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items]);

  // Get unique years
  const years = useMemo(() => {
    const yearSet = new Set<string>();
    events.forEach((event) => {
      yearSet.add(event.date.getFullYear().toString());
    });
    return Array.from(yearSet).sort().reverse();
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch = searchQuery === '' || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.item.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesYear = selectedYear === 'all' || 
        event.date.getFullYear().toString() === selectedYear;
      
      const matchesCategory = selectedCategory === 'all' || 
        event.item.category === selectedCategory;

      return matchesSearch && matchesYear && matchesCategory;
    });
  }, [events, searchQuery, selectedYear, selectedCategory]);

  return (
    <div className="px-4 py-6 relative z-20">
      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Clock className="h-8 w-8 text-purple-300" />
          <h2 className="text-3xl font-bold text-white">
            Demo's Vision Journey
          </h2>
          <Calendar className="h-6 w-6 text-white/50" />
        </div>
        <p className="text-white/70 flex items-center justify-center gap-2">
          Relive the magical moments where dreams became reality
          <Sparkles className="h-4 w-4 text-yellow-400" />
        </p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-3 mb-8"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            placeholder="Search your journey..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
          />
        </div>

        {/* Year Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl min-w-[140px] justify-between"
            >
              {selectedYear === 'all' ? 'All Years' : selectedYear}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-purple-900/95 backdrop-blur-xl border-white/20">
            <DropdownMenuItem 
              onClick={() => setSelectedYear('all')}
              className="text-white hover:bg-white/10"
            >
              All Years
            </DropdownMenuItem>
            {years.map((year) => (
              <DropdownMenuItem 
                key={year}
                onClick={() => setSelectedYear(year)}
                className="text-white hover:bg-white/10"
              >
                {year}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl min-w-[160px] justify-between"
            >
              {selectedCategory === 'all' ? 'All Categories' : 
                VISION_CATEGORIES.find(c => c.value === selectedCategory)?.label || selectedCategory}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-purple-900/95 backdrop-blur-xl border-white/20">
            <DropdownMenuItem 
              onClick={() => setSelectedCategory('all')}
              className="text-white hover:bg-white/10"
            >
              All Categories
            </DropdownMenuItem>
            {VISION_CATEGORIES.map((cat) => (
              <DropdownMenuItem 
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className="text-white hover:bg-white/10"
              >
                <cat.icon className="h-4 w-4 mr-2" />
                {cat.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 via-purple-400 to-pink-400" />

        {/* Events */}
        <div className="space-y-6">
          {filteredEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Trophy className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white/80 mb-2">No events yet</h3>
              <p className="text-white/50">Start adding visions to begin your journey</p>
            </motion.div>
          ) : (
            filteredEvents.map((event, index) => {
              const categoryConfig = getCategoryConfig((event.item.category as VisionCategory) || 'other');
              const CategoryIcon = categoryConfig.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 border-2 border-white/30 shadow-lg" />

                  {/* Event card */}
                  <div 
                    onClick={() => onOpenDetail(event.item)}
                    className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 cursor-pointer hover:bg-white/15 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-purple-300" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{event.title}</h4>
                          <p className="text-sm text-white/60">
                            {format(event.date, 'MMMM d, yyyy')} at {format(event.date, 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="bg-white/10 text-white/80 border border-white/20"
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: categoryConfig.color }}
                        />
                        {categoryConfig.label}
                      </Badge>
                    </div>

                    <p className="text-white/70 mb-4">{event.description}</p>

                    {/* Preview card */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center gap-3">
                        {event.item.imageUrl ? (
                          <img 
                            src={event.item.imageUrl} 
                            alt={event.item.title}
                            className="w-14 h-14 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <CategoryIcon className="h-6 w-6 text-purple-300" />
                          </div>
                        )}
                        <div>
                          <h5 className="font-medium text-white">{event.item.title}</h5>
                          {event.item.description && (
                            <p className="text-sm text-white/60 line-clamp-1">
                              {event.item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
