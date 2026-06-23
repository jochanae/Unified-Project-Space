import { type VisionCategory } from './visionCategories';

export interface VisionTemplate {
  id: string;
  title: string;
  description: string;
  category: VisionCategory;
  affirmation: string;
  tags: string[];
  suggestedAmount?: number;
  icon: string;
}

export const VISION_TEMPLATES: VisionTemplate[] = [
  // Financial Templates
  {
    id: 'emergency-fund',
    title: 'Emergency Fund',
    description: '3-6 months of living expenses saved for unexpected situations',
    category: 'financial',
    affirmation: 'I am building financial security and peace of mind',
    tags: ['savings', 'security', 'emergency'],
    suggestedAmount: 10000,
    icon: '🛡️',
  },
  {
    id: 'debt-free',
    title: 'Become Debt Free',
    description: 'Pay off all credit cards, loans, and achieve financial freedom',
    category: 'financial',
    affirmation: 'I am releasing the weight of debt and embracing financial freedom',
    tags: ['debt-free', 'freedom', 'payoff'],
    icon: '🔓',
  },
  {
    id: 'first-home',
    title: 'Buy My First Home',
    description: 'Save for a down payment and purchase my dream home',
    category: 'financial',
    affirmation: 'I am creating a beautiful home filled with love and memories',
    tags: ['home', 'property', 'investment'],
    suggestedAmount: 50000,
    icon: '🏠',
  },
  {
    id: 'retirement-savings',
    title: 'Retire Comfortably',
    description: 'Build a retirement nest egg for a worry-free future',
    category: 'financial',
    affirmation: 'I am securing a comfortable and abundant retirement',
    tags: ['retirement', 'future', 'investing'],
    suggestedAmount: 500000,
    icon: '🌴',
  },

  // Career Templates
  {
    id: 'promotion',
    title: 'Get Promoted',
    description: 'Advance to the next level in my career',
    category: 'career',
    affirmation: 'I am worthy of recognition and advancement in my career',
    tags: ['promotion', 'growth', 'leadership'],
    icon: '📈',
  },
  {
    id: 'start-business',
    title: 'Start My Own Business',
    description: 'Launch my entrepreneurial venture and be my own boss',
    category: 'career',
    affirmation: 'I have what it takes to build a successful business',
    tags: ['entrepreneur', 'business', 'startup'],
    suggestedAmount: 25000,
    icon: '🚀',
  },
  {
    id: 'career-change',
    title: 'Career Transition',
    description: 'Successfully transition to a new industry or role',
    category: 'career',
    affirmation: 'I am embracing new opportunities and growing professionally',
    tags: ['change', 'new-career', 'transition'],
    icon: '🔄',
  },

  // Travel Templates
  {
    id: 'dream-vacation',
    title: 'Dream Vacation',
    description: 'Take the trip of a lifetime to my bucket list destination',
    category: 'travel',
    affirmation: 'I deserve amazing experiences and adventures',
    tags: ['vacation', 'adventure', 'bucket-list'],
    suggestedAmount: 5000,
    icon: '✈️',
  },
  {
    id: 'world-travel',
    title: 'Travel the World',
    description: 'Visit multiple countries and experience different cultures',
    category: 'travel',
    affirmation: 'The world is my classroom and every journey enriches my soul',
    tags: ['world', 'culture', 'exploration'],
    suggestedAmount: 20000,
    icon: '🌍',
  },

  // Health Templates
  {
    id: 'fitness-goal',
    title: 'Get in Best Shape',
    description: 'Achieve my ideal fitness level and feel amazing',
    category: 'health',
    affirmation: 'My body is strong, healthy, and full of energy',
    tags: ['fitness', 'exercise', 'strength'],
    icon: '💪',
  },
  {
    id: 'run-marathon',
    title: 'Run a Marathon',
    description: 'Train for and complete a full marathon',
    category: 'health',
    affirmation: 'I have the endurance and determination to go the distance',
    tags: ['running', 'marathon', 'endurance'],
    icon: '🏃',
  },
  {
    id: 'mental-wellness',
    title: 'Mental Wellness Journey',
    description: 'Prioritize mental health through meditation and self-care',
    category: 'health',
    affirmation: 'I nurture my mind with peace, calm, and positive thoughts',
    tags: ['mental-health', 'meditation', 'self-care'],
    icon: '🧘',
  },

  // Education Templates
  {
    id: 'degree',
    title: 'Complete My Degree',
    description: 'Finish my educational degree and graduate',
    category: 'education',
    affirmation: 'I am committed to my education and future success',
    tags: ['degree', 'graduation', 'learning'],
    icon: '🎓',
  },
  {
    id: 'new-skill',
    title: 'Master a New Skill',
    description: 'Learn and become proficient in a valuable new skill',
    category: 'education',
    affirmation: 'I am a lifelong learner, always growing and improving',
    tags: ['skills', 'learning', 'mastery'],
    icon: '📚',
  },
  {
    id: 'certification',
    title: 'Get Certified',
    description: 'Earn a professional certification in my field',
    category: 'education',
    affirmation: 'I am investing in myself and my professional growth',
    tags: ['certification', 'professional', 'credentials'],
    icon: '📜',
  },

  // Family Templates
  {
    id: 'family-vacation',
    title: 'Family Adventure',
    description: 'Plan an unforgettable trip with my loved ones',
    category: 'family',
    affirmation: 'I create beautiful memories with the people I love',
    tags: ['family', 'vacation', 'memories'],
    suggestedAmount: 5000,
    icon: '👨‍👩‍👧‍👦',
  },
  {
    id: 'kids-education',
    title: 'Children\'s Education Fund',
    description: 'Save for my children\'s future education expenses',
    category: 'family',
    affirmation: 'I am providing the best opportunities for my children',
    tags: ['education', 'children', 'future'],
    suggestedAmount: 50000,
    icon: '👶',
  },

  // Personal Templates
  {
    id: 'new-car',
    title: 'Buy My Dream Car',
    description: 'Save for and purchase the vehicle I\'ve always wanted',
    category: 'personal',
    affirmation: 'I deserve nice things that bring me joy',
    tags: ['car', 'vehicle', 'luxury'],
    suggestedAmount: 30000,
    icon: '🚗',
  },
  {
    id: 'side-hustle',
    title: 'Build a Side Income',
    description: 'Create an additional income stream from my passion',
    category: 'personal',
    affirmation: 'I am resourceful and create multiple streams of income',
    tags: ['income', 'passive', 'hustle'],
    icon: '💡',
  },
  {
    id: 'minimalist',
    title: 'Live More Simply',
    description: 'Declutter and embrace a minimalist lifestyle',
    category: 'personal',
    affirmation: 'I find joy in simplicity and what truly matters',
    tags: ['minimalism', 'simplify', 'declutter'],
    icon: '🍃',
  },
];

export const getTemplatesByCategory = (category: VisionCategory): VisionTemplate[] => {
  return VISION_TEMPLATES.filter(t => t.category === category);
};

export const getAllTemplateCategories = (): VisionCategory[] => {
  const categories = new Set(VISION_TEMPLATES.map(t => t.category));
  return Array.from(categories) as VisionCategory[];
};
