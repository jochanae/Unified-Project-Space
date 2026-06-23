import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { VISION_TEMPLATES, type VisionTemplate } from '@/lib/visionTemplates';
import { VISION_CATEGORIES, getCategoryConfig, type VisionCategory } from '@/lib/visionCategories';
import { cn } from '@/lib/utils';

interface VisionTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: VisionTemplate) => void;
}

export function VisionTemplateSelector({
  isOpen,
  onClose,
  onSelectTemplate,
}: VisionTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<VisionCategory | 'all'>('all');

  const filteredTemplates = selectedCategory === 'all'
    ? VISION_TEMPLATES
    : VISION_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleSelect = (template: VisionTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="template-selector"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl bg-background border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-4 border-b border-border bg-gradient-to-r from-purple-600 to-pink-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Vision Templates</h2>
                    <p className="text-sm text-white/80">Start with a pre-made vision for common goals</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="px-6 py-3 border-b border-border bg-muted/30">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-1">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                    className="shrink-0"
                  >
                    All
                  </Button>
                  {VISION_CATEGORIES.filter(c => c.value !== 'other').map((category) => {
                    const CategoryIcon = category.icon;
                    return (
                      <Button
                        key={category.value}
                        variant={selectedCategory === category.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.value)}
                        className="shrink-0 gap-1.5"
                      >
                        <CategoryIcon className="h-3.5 w-3.5" />
                        {category.label}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Templates Grid */}
            <ScrollArea className="h-[calc(85vh-180px)]">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => {
                  const categoryConfig = getCategoryConfig(template.category);
                  return (
                    <motion.button
                      key={template.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(template)}
                      className={cn(
                        "group relative p-4 rounded-xl border-2 text-left transition-all",
                        "bg-card hover:shadow-lg hover:border-primary/50",
                        "border-border"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ background: categoryConfig.gradient }}
                        >
                          {template.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{template.title}</h3>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {template.suggestedAmount && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Suggested goal: <span className="font-medium text-foreground">${template.suggestedAmount.toLocaleString()}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Affirmation preview on hover */}
                      <div className="mt-3 pt-3 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs italic text-muted-foreground">
                          "{template.affirmation}"
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
