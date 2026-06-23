import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Zap,
  Clock,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StrategyPayoffChart, STRATEGY_CONFIGS } from './StrategyPayoffChart';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Group strategies by type
const STRATEGY_GROUPS = {
  directional: {
    label: 'Directional',
    description: 'Profit from price movement up or down',
    icon: TrendingUp,
    strategies: ['bull-call-spread', 'bear-put-spread', 'covered-call', 'protective-put'],
  },
  neutral: {
    label: 'Market Neutral',
    description: 'Profit when price stays in a range',
    icon: BarChart3,
    strategies: ['iron-condor', 'iron-butterfly'],
  },
  volatility: {
    label: 'Volatility',
    description: 'Profit from big price moves in either direction',
    icon: Zap,
    strategies: ['straddle', 'strangle'],
  },
  '0dte': {
    label: '0DTE (Same-Day)',
    description: 'High-risk, same-day expiration strategies',
    icon: Clock,
    strategies: ['0dte-bull-put-spread', '0dte-bear-call-spread', '0dte-iron-condor', '0dte-iron-butterfly'],
  },
};

interface OptionsStrategiesSectionProps {
  expirationFilter?: string;
}

export function OptionsStrategiesSection({ expirationFilter = 'all' }: OptionsStrategiesSectionProps) {
  // Filter strategies based on expiration
  const filteredGroups = useMemo(() => {
    if (expirationFilter === 'all') {
      return STRATEGY_GROUPS;
    }
    if (expirationFilter === '0dte') {
      return { '0dte': STRATEGY_GROUPS['0dte'] };
    }
    // For weekly/monthly, show non-0DTE strategies
    const { '0dte': _, ...rest } = STRATEGY_GROUPS;
    return rest;
  }, [expirationFilter]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-3 shadow-lg shadow-primary/25">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              Options Strategies
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Interactive profit/loss diagrams showing potential outcomes at expiration. Hover over the chart to see P/L at different stock prices.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="mt-1">
              Explore P/L diagrams for common options strategies
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="directional" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto bg-muted/50">
              {Object.entries(filteredGroups).map(([key, group]) => {
                const Icon = group.icon;
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key}
                    className="gap-2 data-[state=active]:bg-primary/10"
                  >
                    <Icon className="h-4 w-4" />
                    {group.label}
                    {key === '0dte' && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-chart-4/10 text-chart-4 border-chart-4/30">
                        ⚡
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {Object.entries(filteredGroups).map(([key, group]) => (
            <TabsContent key={key} value={key} className="mt-4">
              {/* Group description */}
              <div className={cn(
                "mb-4 p-3 rounded-lg border",
                key === '0dte' 
                  ? "bg-chart-4/10 border-chart-4/30" 
                  : "bg-muted/50 border-muted"
              )}>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {key === '0dte' && <Zap className="h-4 w-4 text-chart-4" />}
                  {group.description}
                  {key === '0dte' && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Same-Day Expiration
                    </Badge>
                  )}
                </p>
                {key === '0dte' && (
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                    <li>• Rapid theta decay — time is critical</li>
                    <li>• High gamma risk — prices move fast</li>
                    <li>• Never risk more than 1-2% per trade</li>
                  </ul>
                )}
              </div>

              {/* P/L Charts Grid */}
              <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
                <div className="flex gap-4 pb-4">
                  {group.strategies.map((slug) => (
                    STRATEGY_CONFIGS[slug] && (
                      <div key={slug} className="w-[380px] shrink-0">
                        <StrategyPayoffChart config={STRATEGY_CONFIGS[slug](100)} />
                      </div>
                    )
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
