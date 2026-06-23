import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Sparkles,
  BarChart3,
  LineChart,
  GraduationCap,
  Clock,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { 
  OptionChainExplorer, 
  ChartReadingExercise, 
  TradeTutorialWizard, 
  TimeframeExplainer 
} from '@/components/interactive';
import { cn } from '@/lib/utils';

interface InteractiveModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  component: React.ComponentType<{ className?: string; onComplete?: () => void }>;
}

const MODULES: InteractiveModule[] = [
  {
    id: 'timeframes',
    title: 'Timeframe Explorer',
    description: 'See how the same stock looks on different chart timeframes',
    icon: <Clock className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'beginner',
    component: TimeframeExplainer,
  },
  {
    id: 'chart-reading',
    title: 'Chart Reading Exercises',
    description: 'Test your pattern recognition and trend identification skills',
    icon: <LineChart className="h-6 w-6" />,
    duration: '10 min',
    difficulty: 'beginner',
    component: ChartReadingExercise,
  },
  {
    id: 'trade-wizard',
    title: 'Build a Trade Plan',
    description: 'Step-by-step guide to creating your first trade plan',
    icon: <GraduationCap className="h-6 w-6" />,
    duration: '15 min',
    difficulty: 'beginner',
    component: TradeTutorialWizard,
  },
  {
    id: 'option-chain',
    title: 'Option Chain Explorer',
    description: 'Interactive option chain with Greeks education',
    icon: <BarChart3 className="h-6 w-6" />,
    duration: '10 min',
    difficulty: 'intermediate',
    component: OptionChainExplorer,
  },
];

const difficultyColors = {
  beginner: 'bg-gain/10 text-gain border-gain/30',
  intermediate: 'bg-chart-4/10 text-chart-4 border-chart-4/30',
  advanced: 'bg-loss/10 text-loss border-loss/30',
};

export default function InteractiveLearning() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  
  const handleModuleComplete = (moduleId: string) => {
    setCompletedModules(prev => new Set([...prev, moduleId]));
    setActiveModule(null);
  };
  
  const activeModuleData = MODULES.find(m => m.id === activeModule);
  const overallProgress = (completedModules.size / MODULES.length) * 100;
  
  // If a module is active, show it full screen
  if (activeModuleData) {
    const ModuleComponent = activeModuleData.component;
    
    return (
      <DashboardLayout>
        <div className="container max-w-4xl mx-auto py-6 px-4">
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={() => setActiveModule(null)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to modules
            </Button>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ModuleComponent
                className="w-full"
                onComplete={() => handleModuleComplete(activeModuleData.id)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-chart-3/20 to-primary/20">
              <Sparkles className="h-7 w-7 text-chart-3" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Interactive Learning Lab</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Hands-on modules to practice trading concepts. Learn by doing, not just reading!
          </p>
        </div>
        
        {/* Overall Progress */}
        <Card className="bg-gradient-to-r from-primary/5 to-chart-3/5">
          <CardContent className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Your Progress</p>
                <p className="text-sm text-muted-foreground">
                  {completedModules.size} of {MODULES.length} modules completed
                </p>
              </div>
            </div>
            <div className="w-32">
              <Progress value={overallProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        {/* Module Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((module, index) => {
            const isCompleted = completedModules.has(module.id);
            
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                    isCompleted && 'border-gain/50 bg-gain/5'
                  )}
                  onClick={() => setActiveModule(module.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl shrink-0',
                        isCompleted ? 'bg-gain/20 text-gain' : 'bg-muted text-muted-foreground'
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          module.icon
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{module.title}</h3>
                          {isCompleted && (
                            <Badge className="bg-gain text-white shrink-0">
                              Done
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {module.description}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', difficultyColors[module.difficulty])}
                          >
                            {module.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            {module.duration}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-4 gap-2"
                    >
                      {isCompleted ? 'Review' : 'Start Module'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        
        {/* Completion Banner */}
        {completedModules.size === MODULES.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-r from-gain/10 via-chart-3/10 to-primary/10 border-gain/30">
              <CardContent className="flex flex-col items-center text-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gain/20 mb-4">
                  <Trophy className="h-8 w-8 text-gain" />
                </div>
                <h2 className="text-xl font-bold mb-2">🎉 All Modules Complete!</h2>
                <p className="text-muted-foreground max-w-sm">
                  You've finished all interactive learning modules. Keep practicing in the Paper Trading simulator!
                </p>
                <Button className="mt-4 gap-2" asChild>
                  <a href="/youth-mode">
                    Try Practice Trading
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
