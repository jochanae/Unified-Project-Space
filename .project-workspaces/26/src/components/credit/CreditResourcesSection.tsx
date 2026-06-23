import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Calculator, 
  ExternalLink, 
  Clock,
  GraduationCap,
  Shield,
  TrendingUp,
  HelpCircle,
  CreditCard,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'guide' | 'tool';
  category: string;
  readTime?: string;
  link: string;
}

const resources: Resource[] = [
  {
    id: '1',
    title: 'Understanding Your Credit Score',
    description: 'Learn what factors affect your credit score and how to improve it.',
    type: 'article',
    category: 'Basics',
    readTime: '5 min read',
    link: '#',
  },
  {
    id: '2',
    title: 'How to Dispute Errors on Your Credit Report',
    description: 'Step-by-step guide to identifying and disputing inaccuracies.',
    type: 'guide',
    category: 'Credit Report',
    readTime: '8 min read',
    link: '#',
  },
  {
    id: '3',
    title: 'Credit Building Strategies',
    description: 'Proven methods to build or rebuild your credit over time.',
    type: 'video',
    category: 'Building Credit',
    readTime: '12 min watch',
    link: '#',
  },
  {
    id: '4',
    title: 'Debt-to-Income Calculator',
    description: 'Calculate your DTI ratio and understand what lenders see.',
    type: 'tool',
    category: 'Tools',
    link: '#',
  },
  {
    id: '5',
    title: 'Protecting Your Credit from Fraud',
    description: 'Essential tips to safeguard your credit from identity theft.',
    type: 'article',
    category: 'Security',
    readTime: '6 min read',
    link: '#',
  },
  {
    id: '6',
    title: 'Credit Utilization Explained',
    description: 'Why keeping your utilization low matters for your score.',
    type: 'article',
    category: 'Basics',
    readTime: '4 min read',
    link: '#',
  },
];

const getTypeIcon = (type: Resource['type']) => {
  switch (type) {
    case 'article': return <BookOpen className="h-4 w-4" />;
    case 'video': return <Video className="h-4 w-4" />;
    case 'guide': return <FileText className="h-4 w-4" />;
    case 'tool': return <Calculator className="h-4 w-4" />;
  }
};

const getTypeColor = (type: Resource['type']) => {
  switch (type) {
    case 'article': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'video': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'guide': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'tool': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Basics': return <GraduationCap className="h-5 w-5 text-blue-400" />;
    case 'Credit Report': return <FileText className="h-5 w-5 text-emerald-400" />;
    case 'Building Credit': return <TrendingUp className="h-5 w-5 text-purple-400" />;
    case 'Security': return <Shield className="h-5 w-5 text-red-400" />;
    case 'Tools': return <Calculator className="h-5 w-5 text-orange-400" />;
    default: return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const CreditResourcesSection = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Credit Resources
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Learn how to improve and protect your credit
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource, index) => (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full bg-muted/30 hover:bg-muted/50 transition-colors border-muted-foreground/20 group cursor-pointer">
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-background/50">
                      {getCategoryIcon(resource.category)}
                    </div>
                    <Badge variant="outline" className={getTypeColor(resource.type)}>
                      <span className="flex items-center gap-1">
                        {getTypeIcon(resource.type)}
                        {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                      </span>
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {resource.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-3 flex-grow">
                    {resource.description}
                  </p>

                  <div className="flex items-center justify-between">
                    {resource.readTime && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {resource.readTime}
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                    >
                      Read
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" className="gap-2">
            View All Resources
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      </Card>
    </div>
  );
};

export default CreditResourcesSection;
