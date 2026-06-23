import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KidGlossaryTerm {
  term: string;
  emoji: string;
  definition: string;
  example: string;
  category: 'money-basics' | 'trading' | 'saving';
}

const KID_GLOSSARY: KidGlossaryTerm[] = [
  {
    term: 'Stock',
    emoji: '📊',
    definition: 'A tiny piece of a company that you can buy and own.',
    example: 'If you buy Apple stock, you own a teeny piece of Apple!',
    category: 'trading',
  },
  {
    term: 'Bond',
    emoji: '📜',
    definition: 'Like lending money to a company or government. They pay you back with extra!',
    example: 'You lend $100 and get $105 back later — the extra $5 is your reward!',
    category: 'money-basics',
  },
  {
    term: 'Dividend',
    emoji: '🎁',
    definition: "A little gift of money a company gives you just for owning their stock.",
    example: 'Some companies send you a few dollars every few months — just for being an owner!',
    category: 'trading',
  },
  {
    term: 'Interest',
    emoji: '🌱',
    definition: 'Extra money you earn just by keeping your money saved or invested.',
    example: 'Put $100 in a savings account and the bank pays you a little extra over time!',
    category: 'money-basics',
  },
  {
    term: 'Compound Interest',
    emoji: '⛄',
    definition: 'When your interest earns MORE interest — your money snowballs!',
    example: '$100 earns $7, then next year $107 earns $7.49 — the snowball grows!',
    category: 'money-basics',
  },
  {
    term: 'Portfolio',
    emoji: '🎒',
    definition: "A collection of all the stocks and investments you own, like a backpack of money stuff.",
    example: 'Your portfolio might have Apple, Disney, and Nike stocks all together!',
    category: 'trading',
  },
  {
    term: 'Bull Market',
    emoji: '🐂',
    definition: 'When the stock market is going UP — like a bull charging forward!',
    example: "Everyone's happy because stock prices keep climbing higher!",
    category: 'trading',
  },
  {
    term: 'Bear Market',
    emoji: '🐻',
    definition: "When the stock market is going DOWN — like a bear hibernating.",
    example: 'Stock prices are falling, but smart investors know it usually bounces back!',
    category: 'trading',
  },
  {
    term: 'Savings Account',
    emoji: '🏦',
    definition: 'A safe place at a bank where you keep your money and earn a little interest.',
    example: "It's like a piggy bank, but the bank pays you for using theirs!",
    category: 'saving',
  },
  {
    term: 'Budget',
    emoji: '📋',
    definition: 'A plan for how to use your money — what to save and what to spend.',
    example: 'You get $20 allowance: save $10, spend $5 on treats, $5 on a game!',
    category: 'money-basics',
  },
  {
    term: 'Profit',
    emoji: '💰',
    definition: 'The extra money you make when you sell something for more than you paid.',
    example: 'Buy a stock at $10, sell at $15 — you made $5 profit! 🎉',
    category: 'trading',
  },
  {
    term: 'Loss',
    emoji: '📉',
    definition: 'When you sell something for less than what you paid — you lost some money.',
    example: "Buy at $10, sell at $7 — that's a $3 loss. It happens to everyone!",
    category: 'trading',
  },
  {
    term: 'Risk',
    emoji: '⚠️',
    definition: 'The chance that you might lose money on an investment.',
    example: "Investing in one company is riskier than spreading across many — that's diversification!",
    category: 'money-basics',
  },
  {
    term: 'Diversification',
    emoji: '🌈',
    definition: "Don't put all your eggs in one basket! Spread your money across different investments.",
    example: 'Instead of buying just Nike, buy some Apple, Disney, AND Nike!',
    category: 'trading',
  },
  {
    term: 'Short Selling',
    emoji: '📉',
    definition: 'Borrowing a stock, selling it, and buying it back cheaper to keep the difference.',
    example: 'Borrow a toy, sell for $10, buy back at $7 on sale, keep $3!',
    category: 'trading',
  },
  {
    term: 'Savings Goal',
    emoji: '🎯',
    definition: "A specific thing you're saving money for — it keeps you motivated!",
    example: "I want to save $50 for a new game — that's my savings goal!",
    category: 'saving',
  },
  {
    term: 'Allowance',
    emoji: '💵',
    definition: 'Money you receive regularly, usually from parents, for chores or just because!',
    example: '$10 every week — save some, spend some, invest some!',
    category: 'saving',
  },
  {
    term: 'Investing',
    emoji: '🌳',
    definition: 'Putting your money into something (like stocks) hoping it will grow over time.',
    example: "Plant a money seed today, watch it grow into a money tree over many years!",
    category: 'money-basics',
  },
  {
    term: 'Market',
    emoji: '🏪',
    definition: "A place where people buy and sell stocks — it's like a big online store for companies.",
    example: 'The stock market opens every weekday morning and closes in the afternoon!',
    category: 'trading',
  },
  {
    term: 'Emergency Fund',
    emoji: '🆘',
    definition: 'Money you set aside for unexpected things — like a safety net!',
    example: "If your bike breaks, you can fix it without worrying because you saved for emergencies!",
    category: 'saving',
  },
];

const CATEGORY_LABELS: Record<KidGlossaryTerm['category'], string> = {
  'money-basics': '💡 Money Basics',
  trading: '📈 Trading',
  saving: '🐷 Saving',
};

export function KidGlossary() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<KidGlossaryTerm['category'] | 'all'>('all');

  const filtered = useMemo(() => {
    return KID_GLOSSARY.filter((t) => {
      const matchSearch =
        t.term.toLowerCase().includes(search.toLowerCase()) ||
        t.definition.toLowerCase().includes(search.toLowerCase());
      const matchCat = filter === 'all' || t.category === filter;
      return matchSearch && matchCat;
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [search, filter]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-4xl block mb-2">📖</span>
        <h3 className="text-xl font-bold">Money Words</h3>
        <p className="text-sm text-muted-foreground">
          Learn what these money words mean — in kid language!
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search a word..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-10 rounded-full"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearch('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'money-basics', 'trading', 'saving'] as const).map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={filter === cat ? 'default' : 'outline'}
            className="rounded-full text-xs"
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? '🔤 All' : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} word{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Terms */}
      <div className="space-y-3">
        {filtered.map((t) => (
          <Card key={t.term} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base">{t.term}</h4>
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[t.category]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t.definition}</p>
                  <div className="mt-2 bg-muted/50 rounded-lg p-2">
                    <p className="text-xs">
                      <strong>Example:</strong> {t.example}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <span className="text-4xl block mb-2">🔍</span>
            <p className="text-sm">No words found — try a different search!</p>
          </div>
        )}
      </div>
    </div>
  );
}
