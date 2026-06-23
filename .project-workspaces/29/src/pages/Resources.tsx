import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExternalLink,
  Building2,
  GraduationCap,
  LineChart,
  FileText,
  Star,
  Sparkles,
  BookOpen,
  TrendingUp,
  Shield,
} from 'lucide-react';

interface Resource {
  name: string;
  description: string;
  url: string;
  logo?: string;
  tags: string[];
  recommended?: boolean;
}

const brokerResources: Resource[] = [
  {
    name: 'Charles Schwab / thinkorswim',
    description: 'Full-service broker with excellent research, $0 stock trades, and the powerful thinkorswim trading platform.',
    url: 'https://www.schwab.com',
    tags: ['Paper Trading', 'Options', 'Advanced'],
    recommended: true,
  },
  {
    name: 'Fidelity',
    description: 'Top-rated broker with outstanding research tools, retirement accounts, and Active Trader Pro platform.',
    url: 'https://www.fidelity.com',
    tags: ['Beginner Friendly', 'Research', 'Retirement'],
    recommended: true,
  },
  {
    name: 'Fidelity',
    description: 'Top-rated broker with outstanding research tools, retirement accounts, and Active Trader Pro platform.',
    url: 'https://www.fidelity.com',
    tags: ['Research', 'Retirement', 'ETFs'],
  },
  {
    name: 'Interactive Brokers',
    description: 'Best for active traders with low costs, global market access, and professional-grade tools.',
    url: 'https://www.interactivebrokers.com',
    tags: ['Low Cost', 'Global', 'Professional'],
  },
  {
    name: 'E*TRADE',
    description: 'User-friendly platform with Power E*TRADE for options traders and solid educational resources.',
    url: 'https://www.etrade.com',
    tags: ['Options', 'Mobile', 'Education'],
  },
  {
    name: 'Robinhood',
    description: 'Commission-free trading with a simple mobile-first interface. Great for beginners.',
    url: 'https://robinhood.com',
    tags: ['Free', 'Mobile', 'Beginner'],
  },
  {
    name: 'Webull',
    description: 'Zero-commission trading with extended hours, advanced charting, and paper trading features.',
    url: 'https://www.webull.com',
    tags: ['Free', 'Paper Trading', 'Extended Hours'],
  },
  {
    name: 'tastytrade',
    description: 'Options-focused platform with unique trade mechanics, low fees, and excellent options education.',
    url: 'https://www.tastytrade.com',
    tags: ['Options', 'Education', 'Low Fees'],
    recommended: true,
  },
];

const educationalResources: Resource[] = [
  {
    name: 'Investopedia',
    description: 'The go-to resource for financial education. Comprehensive articles, tutorials, and a simulator.',
    url: 'https://www.investopedia.com',
    tags: ['Free', 'Comprehensive', 'Simulator'],
    recommended: true,
  },
  {
    name: 'Options Industry Council (OIC)',
    description: 'Free options education from industry experts. Courses, webinars, and strategy guides.',
    url: 'https://www.optionseducation.org',
    tags: ['Options', 'Free', 'Official'],
    recommended: true,
  },
  {
    name: 'CBOE Education',
    description: 'Learn options and volatility from the Chicago Board Options Exchange.',
    url: 'https://www.cboe.com/education',
    tags: ['Options', 'VIX', 'Official'],
  },
  {
    name: 'Khan Academy - Finance',
    description: 'Free, high-quality lessons on stocks, bonds, mutual funds, and personal finance.',
    url: 'https://www.khanacademy.org/economics-finance-domain',
    tags: ['Free', 'Video', 'Beginner'],
  },
  {
    name: 'Babypips',
    description: 'The ultimate forex education. Learn currency trading from scratch.',
    url: 'https://www.babypips.com',
    tags: ['Forex', 'Free', 'Structured'],
  },
  {
    name: 'CME Group Education',
    description: 'Learn futures and derivatives from the worlds leading derivatives marketplace.',
    url: 'https://www.cmegroup.com/education.html',
    tags: ['Futures', 'Commodities', 'Official'],
  },
];

const toolResources: Resource[] = [
  {
    name: 'TradingView',
    description: 'Professional charting platform with social features, screeners, and real-time data.',
    url: 'https://www.tradingview.com',
    tags: ['Charts', 'Screener', 'Social'],
    recommended: true,
  },
  {
    name: 'Finviz',
    description: 'Powerful stock screener with visual market maps, news aggregation, and technical analysis.',
    url: 'https://finviz.com',
    tags: ['Screener', 'Free', 'Visual'],
    recommended: true,
  },
  {
    name: 'Yahoo Finance',
    description: 'Free financial news, data, portfolio tracking, and basic screeners.',
    url: 'https://finance.yahoo.com',
    tags: ['Free', 'News', 'Portfolio'],
  },
  {
    name: 'Seeking Alpha',
    description: 'Crowdsourced investment research with analysis, news, and stock ratings.',
    url: 'https://seekingalpha.com',
    tags: ['Research', 'Analysis', 'Community'],
  },
  {
    name: 'StockCharts',
    description: 'Technical analysis tools, charting, and market commentary from ChartWatchers.',
    url: 'https://stockcharts.com',
    tags: ['Technical', 'Charts', 'Education'],
  },
  {
    name: 'Barchart',
    description: 'Market data, options flow, unusual activity screeners, and commodity data.',
    url: 'https://www.barchart.com',
    tags: ['Options Flow', 'Commodities', 'Data'],
  },
];

const newsResources: Resource[] = [
  {
    name: 'Bloomberg',
    description: 'Global financial news, data, and analysis. The gold standard for market news.',
    url: 'https://www.bloomberg.com',
    tags: ['News', 'Global', 'Premium'],
  },
  {
    name: 'CNBC',
    description: 'Real-time market news, analysis, and live TV coverage of financial markets.',
    url: 'https://www.cnbc.com',
    tags: ['News', 'Video', 'Free'],
  },
  {
    name: 'MarketWatch',
    description: 'Financial information and business news. Personal finance tools and market data.',
    url: 'https://www.marketwatch.com',
    tags: ['News', 'Free', 'Tools'],
  },
  {
    name: 'The Wall Street Journal',
    description: 'Premium financial journalism covering markets, business, and economic news.',
    url: 'https://www.wsj.com',
    tags: ['News', 'Premium', 'Quality'],
  },
  {
    name: 'Reuters',
    description: 'International news organization providing business and financial news.',
    url: 'https://www.reuters.com/business',
    tags: ['News', 'Global', 'Wire'],
  },
];

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              {resource.name}
            </CardTitle>
            {resource.recommended && (
              <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 gap-1">
                <Star className="h-3 w-3" fill="currentColor" />
                Recommended
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-sm mt-1">
          {resource.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {resource.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 group-hover:border-primary group-hover:text-primary"
          onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
        >
          Visit Site
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Resources() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-4 shadow-lg">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Resources</h1>
            <p className="text-sm text-muted-foreground">
              Curated tools, platforms, and learning resources for traders
            </p>
          </div>
        </div>

        {/* Quinn Tip */}
        <Card className="bg-gradient-to-r from-primary/5 via-chart-3/5 to-primary/5 border-primary/20">
          <CardContent className="flex items-start gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chart-3/20">
              <Sparkles className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="font-medium text-sm">Quinn's Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                While IntoIQ is great for learning and practice, I highly recommend using your broker's 
                paper trading platform (like thinkorswim) for realistic simulation. These are the same 
                tools you'll use for real trades, so you'll be ready when the time comes!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="brokers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="brokers" className="gap-2">
              <Building2 className="h-4 w-4 hidden sm:block" />
              Brokers
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-2">
              <GraduationCap className="h-4 w-4 hidden sm:block" />
              Education
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <LineChart className="h-4 w-4 hidden sm:block" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2">
              <FileText className="h-4 w-4 hidden sm:block" />
              News
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brokers" className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <p className="text-sm">All brokers listed are regulated and SIPC insured</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brokerResources.map((resource) => (
                <ResourceCard key={resource.name} resource={resource} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="education" className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm">Free and premium resources to level up your trading knowledge</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {educationalResources.map((resource) => (
                <ResourceCard key={resource.name} resource={resource} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <LineChart className="h-4 w-4" />
              <p className="text-sm">Charts, screeners, and analysis tools used by professional traders</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {toolResources.map((resource) => (
                <ResourceCard key={resource.name} resource={resource} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="news" className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <p className="text-sm">Stay informed with trusted financial news sources</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {newsResources.map((resource) => (
                <ResourceCard key={resource.name} resource={resource} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
