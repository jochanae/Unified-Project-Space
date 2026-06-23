import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Calculator,
  Users,
  LineChart,
  GraduationCap,
  Play,
  Target,
  BarChart3,
  Scale,
  Percent,
  StickyNote,
  Bell,
  HelpCircle,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  Baby,
  FileDown,
  Settings,
  Clock,
  MessageCircle,
  ClipboardList,
  Lightbulb,
  Shield,
  ScrollText,
  MessagesSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { tradingGlossary } from '@/data/tradingGlossary';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: 'navigation' | 'lesson' | 'video' | 'strategy' | 'glossary' | 'trade' | 'reminder' | 'quinn' | 'community';
  href?: string;
  icon: React.ReactNode;
  keywords?: string[];
  action?: () => void;
}


// Navigation items
const navigationItems: SearchResult[] = [
  { id: 'nav-dashboard', title: 'Dashboard', description: 'Overview and quick actions', category: 'navigation', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, keywords: ['home', 'main'] },
  { id: 'nav-plan', title: 'My Plans', description: 'Financial goals & trading plan', category: 'navigation', href: '/plan', icon: <ClipboardList className="h-4 w-4" />, keywords: ['goals', 'tasks', 'checklist', 'action', 'money', 'trading', 'plan'] },
  { id: 'nav-journal', title: 'Trade Journal', description: 'Log and analyze your trades', category: 'navigation', href: '/journal', icon: <FileText className="h-4 w-4" />, keywords: ['log', 'trades', 'history'] },
  { id: 'nav-learn', title: 'Learning Hub', description: 'Lessons, videos, and resources', category: 'navigation', href: '/learn', icon: <GraduationCap className="h-4 w-4" />, keywords: ['education', 'courses', 'tutorials'] },
  { id: 'nav-videos', title: 'Video Library', description: 'Educational trading videos', category: 'navigation', href: '/videos', icon: <Play className="h-4 w-4" />, keywords: ['watch', 'tutorial'] },
  { id: 'nav-strategies', title: 'Strategies', description: 'Options strategies with payoff diagrams', category: 'navigation', href: '/strategies', icon: <TrendingUp className="h-4 w-4" />, keywords: ['options', 'spreads'] },
  { id: 'nav-paper', title: 'Paper Trading', description: 'Practice trading in Youth Mode', category: 'navigation', href: '/youth-mode', icon: <LineChart className="h-4 w-4" />, keywords: ['simulator', 'practice', 'demo', 'youth'] },
  { id: 'nav-community', title: 'Community', description: 'Discussions and trade ideas', category: 'navigation', href: '/community', icon: <Users className="h-4 w-4" />, keywords: ['forum', 'chat', 'social'] },
  { id: 'nav-mentor', title: 'Quinn Mentor', description: 'AI money assistant', category: 'navigation', href: '/mentor', icon: <Sparkles className="h-4 w-4" />, keywords: ['ai', 'help', 'assistant', 'quinn'] },
  { id: 'nav-analytics', title: 'Analytics', description: 'Advanced trading statistics', category: 'navigation', href: '/analytics', icon: <BarChart3 className="h-4 w-4" />, keywords: ['stats', 'performance'] },
  { id: 'nav-glossary', title: 'Glossary', description: 'Trading terminology', category: 'navigation', href: '/glossary', icon: <BookOpen className="h-4 w-4" />, keywords: ['terms', 'definitions'] },
  { id: 'nav-resources', title: 'Resources', description: 'External learning resources', category: 'navigation', href: '/resources', icon: <HelpCircle className="h-4 w-4" />, keywords: ['links', 'external'] },
  { id: 'nav-reminders', title: 'Reminders', description: 'Manage your reminders', category: 'navigation', href: '/reminders', icon: <Bell className="h-4 w-4" />, keywords: ['alerts', 'notifications'] },
  { id: 'nav-youth', title: 'Youth Mode', description: 'Fun financial education & practice trading', category: 'navigation', href: '/youth-mode', icon: <Baby className="h-4 w-4" />, keywords: ['children', 'youth', 'kids', 'learn'] },
  { id: 'nav-import', title: 'Import Trades', description: 'Import trades via CSV from any broker', category: 'navigation', href: '/broker-import-guide', icon: <FileDown className="h-4 w-4" />, keywords: ['broker', 'csv', 'import', 'export'] },
  // Tools
  { id: 'tool-options', title: 'Options Calculator', description: 'Calculate P&L and Greeks', category: 'navigation', href: '/options-calculator', icon: <Percent className="h-4 w-4" />, keywords: ['black-scholes', 'greeks', 'premium'] },
  { id: 'tool-position', title: 'Position Size Calculator', description: 'Calculate proper position sizes', category: 'navigation', href: '/tools/position-size', icon: <Target className="h-4 w-4" />, keywords: ['risk', 'sizing'] },
  { id: 'tool-risk', title: 'Risk/Reward Calculator', description: 'Visualize trade setups', category: 'navigation', href: '/tools/risk-reward', icon: <BarChart3 className="h-4 w-4" />, keywords: ['ratio', 'setup'] },
  { id: 'tool-margin', title: 'Margin Calculator', description: 'Calculate margin requirements', category: 'navigation', href: '/tools/margin', icon: <Scale className="h-4 w-4" />, keywords: ['leverage'] },
  { id: 'tool-compound', title: 'Compound Calculator', description: 'Visualize compound growth', category: 'navigation', href: '/tools/compound', icon: <Calculator className="h-4 w-4" />, keywords: ['interest', 'growth'] },
  { id: 'tool-notepad', title: 'Notepad', description: 'Quick notes and ideas', category: 'navigation', href: '/tools/notepad', icon: <StickyNote className="h-4 w-4" />, keywords: ['notes', 'text'] },
  // Legal
  { id: 'nav-privacy', title: 'Privacy Policy', description: 'How we handle your data', category: 'navigation', href: '/privacy', icon: <Shield className="h-4 w-4" />, keywords: ['legal', 'data', 'gdpr', 'policy'] },
  { id: 'nav-terms', title: 'Terms of Service', description: 'Terms and conditions', category: 'navigation', href: '/terms', icon: <ScrollText className="h-4 w-4" />, keywords: ['legal', 'terms', 'conditions', 'agreement'] },
];

// Convert glossary to search items
const glossaryItems: SearchResult[] = tradingGlossary.map((term) => ({
  id: `glossary-${term.term.toLowerCase().replace(/\s+/g, '-')}`,
  title: term.term,
  description: term.definition.substring(0, 80) + '...',
  category: 'glossary',
  href: `/glossary?term=${encodeURIComponent(term.term)}`,
  icon: <BookOpen className="h-4 w-4" />,
  keywords: term.category ? [term.category] : [],
}));

export function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [lessons, setLessons] = useState<SearchResult[]>([]);
  const [videos, setVideos] = useState<SearchResult[]>([]);
  const [trades, setTrades] = useState<SearchResult[]>([]);
  const [reminders, setReminders] = useState<SearchResult[]>([]);
  const [tradeIdeas, setTradeIdeas] = useState<SearchResult[]>([]);
  const [discussions, setDiscussions] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Listen for keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Fetch dynamic content when modal opens
  useEffect(() => {
    if (open) {
      fetchDynamicContent();
    }
  }, [open, user]);

  const fetchDynamicContent = async () => {
    try {
      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, description, slug')
        .eq('status', 'published')
        .limit(50);

      if (lessonsData) {
        setLessons(
          lessonsData.map((l) => ({
            id: `lesson-${l.id}`,
            title: l.title,
            description: l.description || undefined,
            category: 'lesson',
            href: `/learn/${l.slug}`,
            icon: <GraduationCap className="h-4 w-4" />,
          }))
        );
      }

      // Fetch videos
      const { data: videosData } = await supabase
        .from('educational_videos')
        .select('id, title, description')
        .eq('status', 'published')
        .limit(30);

      if (videosData) {
        setVideos(
          videosData.map((v) => ({
            id: `video-${v.id}`,
            title: v.title,
            description: v.description || undefined,
            category: 'video',
            href: `/videos?v=${v.id}`,
            icon: <Play className="h-4 w-4" />,
          }))
        );
      }

      // Fetch user's trades if logged in
      if (user) {
        const { data: tradesData } = await supabase
          .from('trades')
          .select('id, symbol, trade_type, entry_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (tradesData) {
          setTrades(
            tradesData.map((t) => ({
              id: `trade-${t.id}`,
              title: `${t.symbol} ${t.trade_type}`,
              description: `Entry: ${new Date(t.entry_date).toLocaleDateString()}`,
              category: 'trade',
              href: '/journal',
              icon: <Wallet className="h-4 w-4" />,
            }))
          );
        }

        // Fetch reminders
        const { data: remindersData } = await supabase
          .from('reminders')
          .select('id, title, type, trigger_at')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .eq('is_dismissed', false)
          .order('trigger_at', { ascending: true })
          .limit(10);

        if (remindersData) {
          setReminders(
            remindersData.map((r) => ({
              id: `reminder-${r.id}`,
              title: r.title,
              description: `${r.type} • ${new Date(r.trigger_at).toLocaleDateString()}`,
              category: 'reminder',
              href: '/reminders',
              icon: <Clock className="h-4 w-4" />,
            }))
          );
        }
      }

      // Fetch community trade ideas (public)
      const { data: tradeIdeasData } = await supabase
        .from('trade_ideas')
        .select('id, title, symbol, trade_direction, asset_class')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (tradeIdeasData) {
        setTradeIdeas(
          tradeIdeasData.map((t) => ({
            id: `idea-${t.id}`,
            title: `${t.symbol} - ${t.title}`,
            description: `${t.trade_direction} • ${t.asset_class}`,
            category: 'community',
            href: `/community?tab=ideas`,
            icon: <Lightbulb className="h-4 w-4" />,
            keywords: [t.symbol, t.asset_class, t.trade_direction],
          }))
        );
      }

      // Fetch community discussions (public)
      const { data: discussionsData } = await supabase
        .from('discussion_threads')
        .select('id, title, category')
        .eq('is_locked', false)
        .order('last_activity_at', { ascending: false })
        .limit(15);

      if (discussionsData) {
        setDiscussions(
          discussionsData.map((d) => ({
            id: `discussion-${d.id}`,
            title: d.title,
            description: `Discussion • ${d.category}`,
            category: 'community',
            href: `/community?tab=discussions`,
            icon: <MessagesSquare className="h-4 w-4" />,
            keywords: [d.category],
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching search content:', error);
    }
  };

  // Fuzzy search function
  const fuzzyMatch = useCallback((text: string, query: string): boolean => {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Direct includes
    if (lowerText.includes(lowerQuery)) return true;
    
    // Fuzzy: all query chars appear in order
    let queryIndex = 0;
    for (const char of lowerText) {
      if (char === lowerQuery[queryIndex]) {
        queryIndex++;
        if (queryIndex === lowerQuery.length) return true;
      }
    }
    
    return false;
  }, []);

  // Filter results based on search
  const filteredResults = useMemo(() => {
    if (!search.trim()) {
      return {
        navigation: navigationItems.slice(0, 8),
        lessons: lessons.slice(0, 5),
        videos: videos.slice(0, 3),
        glossary: [],
        trades: trades.slice(0, 3),
        reminders: reminders.slice(0, 3),
        tradeIdeas: tradeIdeas.slice(0, 3),
        discussions: discussions.slice(0, 2),
      };
    }

    const query = search.trim();

    const filterItems = (items: SearchResult[]) =>
      items.filter(
        (item) =>
          fuzzyMatch(item.title, query) ||
          (item.description && fuzzyMatch(item.description, query)) ||
          (item.keywords && item.keywords.some((k) => fuzzyMatch(k, query)))
      );

    return {
      navigation: filterItems(navigationItems),
      lessons: filterItems(lessons),
      videos: filterItems(videos),
      glossary: filterItems(glossaryItems).slice(0, 5),
      trades: filterItems(trades),
      reminders: filterItems(reminders),
      tradeIdeas: filterItems(tradeIdeas),
      discussions: filterItems(discussions),
    };
  }, [search, lessons, videos, trades, reminders, tradeIdeas, discussions, fuzzyMatch]);

  const handleSelect = (result: SearchResult) => {
    if (result.action) {
      result.action();
    } else if (result.href) {
      navigate(result.href);
    }
    setOpen(false);
    setSearch('');
  };

  // Generate "Ask Quinn" result when there's a search query
  const askQuinnResult: SearchResult | null = useMemo(() => {
    if (!search.trim() || search.length < 2) return null;
    return {
      id: 'ask-quinn',
      title: `Ask Quinn: "${search}"`,
      description: 'Get AI-powered help with your question',
      category: 'quinn',
      icon: <Sparkles className="h-4 w-4" />,
      action: () => {
        // Navigate to mentor page with the query as a URL parameter
        navigate(`/mentor?q=${encodeURIComponent(search.trim())}`);
      },
    };
  }, [search, navigate]);

  const totalResults =
    filteredResults.navigation.length +
    filteredResults.lessons.length +
    filteredResults.videos.length +
    filteredResults.glossary.length +
    filteredResults.trades.length +
    filteredResults.reminders.length +
    filteredResults.tradeIdeas.length +
    filteredResults.discussions.length;

  const categoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      navigation: 'bg-primary/10 text-primary',
      lesson: 'bg-chart-3/10 text-chart-3',
      video: 'bg-chart-4/10 text-chart-4',
      glossary: 'bg-gold/10 text-gold',
      trade: 'bg-gain/10 text-gain',
      reminder: 'bg-chart-5/10 text-chart-5',
      quinn: 'bg-primary/20 text-primary',
      community: 'bg-chart-2/10 text-chart-2',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search pages, lessons, glossary, trades..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          <div className="py-6 text-center">
            <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No results found for "{search}"</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
          </div>
        </CommandEmpty>

        {/* Ask Quinn - Always show when there's a search query */}
        {askQuinnResult && (
          <CommandGroup heading="AI Assistant">
            <CommandItem
              key={askQuinnResult.id}
              value={askQuinnResult.title}
              onSelect={() => handleSelect(askQuinnResult)}
              className="flex items-center gap-3 py-3 border border-primary/20 bg-primary/5 rounded-lg mx-1 my-1"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                {askQuinnResult.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary">{askQuinnResult.title}</p>
                <p className="text-sm text-muted-foreground">{askQuinnResult.description}</p>
              </div>
              <Badge variant="secondary" className={categoryBadge('quinn')}>
                Ask Quinn
              </Badge>
            </CommandItem>
          </CommandGroup>
        )}

        {filteredResults.navigation.length > 0 && (
          <CommandGroup heading="Navigation">
            {filteredResults.navigation.map((item) => (
              <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 py-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredResults.lessons.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Lessons">
              {filteredResults.lessons.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={categoryBadge('lesson')}>
                    Lesson
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredResults.videos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Videos">
              {filteredResults.videos.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/10">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                  </div>
                  <Badge variant="secondary" className={categoryBadge('video')}>
                    Video
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredResults.glossary.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Glossary">
              {filteredResults.glossary.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredResults.trades.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Your Trades">
              {filteredResults.trades.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gain/10">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredResults.reminders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Reminders">
              {filteredResults.reminders.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/10">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {(filteredResults.tradeIdeas.length > 0 || filteredResults.discussions.length > 0) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Community">
              {filteredResults.tradeIdeas.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={categoryBadge('community')}>
                    Trade Idea
                  </Badge>
                </CommandItem>
              ))}
              {filteredResults.discussions.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={categoryBadge('community')}>
                    Discussion
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>{totalResults} results</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">K</kbd>
          <span className="ml-1">to toggle</span>
        </span>
      </div>
    </CommandDialog>
  );
}
