import {
  DollarSign,
  User,
  Briefcase,
  Heart,
  Activity,
  GraduationCap,
  Plane,
  Grid,
  type LucideIcon,
} from 'lucide-react';

export type VisionCategory = 
  | 'financial' 
  | 'personal' 
  | 'career' 
  | 'family' 
  | 'health' 
  | 'education' 
  | 'travel' 
  | 'other';

export interface CategoryConfig {
  value: VisionCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  chipColor: string;
  defaultTags: string[];
  description: string;
}

export const VISION_CATEGORIES: CategoryConfig[] = [
  {
    value: 'financial',
    label: 'Financial',
    icon: DollarSign,
    color: '#0891b2',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    chipColor: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
    defaultTags: ['investment', 'savings', 'retirement', 'budget', 'debt-free'],
    description: 'Financial goals and wealth building aspirations'
  },
  {
    value: 'personal',
    label: 'Personal',
    icon: User,
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    borderColor: 'border-purple-500',
    bgColor: 'bg-gradient-to-br from-purple-500 to-pink-500',
    textColor: 'text-purple-600 dark:text-purple-400',
    chipColor: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    defaultTags: ['self-improvement', 'habits', 'mindfulness', 'growth', 'wellbeing'],
    description: 'Personal development and self-improvement goals'
  },
  {
    value: 'career',
    label: 'Career',
    icon: Briefcase,
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
    borderColor: 'border-orange-500',
    bgColor: 'bg-gradient-to-br from-orange-500 to-yellow-500',
    textColor: 'text-orange-600 dark:text-orange-400',
    chipColor: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    defaultTags: ['promotion', 'skills', 'business', 'networking', 'achievement'],
    description: 'Professional growth and career advancement'
  },
  {
    value: 'family',
    label: 'Family',
    icon: Heart,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    borderColor: 'border-green-500',
    bgColor: 'bg-gradient-to-br from-green-500 to-emerald-500',
    textColor: 'text-green-600 dark:text-green-400',
    chipColor: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    defaultTags: ['relationships', 'parenting', 'home', 'love', 'togetherness'],
    description: 'Family relationships and home life'
  },
  {
    value: 'health',
    label: 'Health',
    icon: Activity,
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
    borderColor: 'border-red-500',
    bgColor: 'bg-gradient-to-br from-red-500 to-pink-500',
    textColor: 'text-red-600 dark:text-red-400',
    chipColor: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    defaultTags: ['fitness', 'nutrition', 'wellness', 'exercise', 'mental-health'],
    description: 'Health, fitness, and wellness aspirations'
  },
  {
    value: 'education',
    label: 'Education',
    icon: GraduationCap,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
    borderColor: 'border-indigo-500',
    bgColor: 'bg-gradient-to-br from-indigo-500 to-blue-500',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    chipColor: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    defaultTags: ['learning', 'degree', 'certification', 'skills', 'knowledge'],
    description: 'Educational and learning objectives'
  },
  {
    value: 'travel',
    label: 'Travel',
    icon: Plane,
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
    borderColor: 'border-sky-500',
    bgColor: 'bg-gradient-to-br from-sky-500 to-cyan-500',
    textColor: 'text-sky-600 dark:text-sky-400',
    chipColor: 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300',
    defaultTags: ['adventure', 'vacation', 'exploration', 'culture', 'destination'],
    description: 'Travel dreams and adventure goals'
  },
  {
    value: 'other',
    label: 'Other',
    icon: Grid,
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    borderColor: 'border-gray-500',
    bgColor: 'bg-gradient-to-br from-gray-500 to-slate-500',
    textColor: 'text-gray-600 dark:text-gray-400',
    chipColor: 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300',
    defaultTags: ['miscellaneous', 'hobby', 'project', 'creative', 'unique'],
    description: 'Other goals and aspirations'
  }
];

export const getCategoryConfig = (category: VisionCategory): CategoryConfig => {
  return VISION_CATEGORIES.find(c => c.value === category) || VISION_CATEGORIES[VISION_CATEGORIES.length - 1];
};

export const getCategoryGradient = (category: VisionCategory): string => {
  return getCategoryConfig(category).gradient;
};

export const getCategoryIcon = (category: VisionCategory): LucideIcon => {
  return getCategoryConfig(category).icon;
};

export const getCategoryColors = (category: VisionCategory) => {
  const config = getCategoryConfig(category);
  return {
    color: config.color,
    gradient: config.gradient,
    borderColor: config.borderColor,
    bgColor: config.bgColor,
    textColor: config.textColor,
    chipColor: config.chipColor,
  };
};

export const getCategoryBadgeClasses = (category: VisionCategory, size: 'sm' | 'md' | 'lg' = 'md') => {
  const config = getCategoryConfig(category);
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };
  
  return `inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${config.chipColor}`;
};

export const getSuggestedTags = (category: VisionCategory): string[] => {
  const config = getCategoryConfig(category);
  return config.defaultTags;
};

export const getVisionCardClasses = (category: VisionCategory, isHovered: boolean = false) => {
  const config = getCategoryConfig(category);
  const baseClasses = 'transition-all duration-300';
  const borderClasses = isHovered ? `${config.borderColor} border-2` : `${config.borderColor} border`;
  
  return `${baseClasses} ${borderClasses}`;
};

export const extractUniqueTags = (items: { tags?: string[] }[]): string[] => {
  const tagSet = new Set<string>();
  items.forEach(item => {
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort();
};

export const filterVisionItems = <T extends { category?: string; tags?: string[] }>(
  items: T[],
  selectedCategories: VisionCategory[],
  selectedTags: string[],
  includeAll: boolean = false
): T[] => {
  if (includeAll || (selectedCategories.length === 0 && selectedTags.length === 0)) {
    return items;
  }

  return items.filter(item => {
    const categoryMatch = selectedCategories.length === 0 || 
      (item.category && selectedCategories.includes(item.category as VisionCategory));
    
    const tagMatch = selectedTags.length === 0 || 
      (item.tags && item.tags.some(tag => selectedTags.includes(tag)));
    
    return categoryMatch && tagMatch;
  });
};
