import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  tradingGlossary,
  categoryLabels,
  categoryIcons,
  GlossaryTerm,
} from '@/data/tradingGlossary';
import {
  Search,
  BookOpen,
  Filter,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Category = GlossaryTerm['category'] | 'all';

export default function Glossary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  const categories: Category[] = ['all', 'basics', 'options', 'technical', 'fundamental', 'strategies', 'risk'];

  const filteredTerms = useMemo(() => {
    return tradingGlossary.filter((term) => {
      const matchesSearch =
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || term.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    filteredTerms.forEach((term) => {
      const firstLetter = term.term[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(term);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTerms]);

  const termCount = filteredTerms.length;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-4 to-primary shadow-lg">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trading Glossary</h1>
            <p className="text-sm text-muted-foreground">
              {tradingGlossary.length} terms to master your trading vocabulary
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search terms or definitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'gap-1.5',
                    selectedCategory === category && 'shadow-md'
                  )}
                >
                  {category === 'all' ? (
                    <Filter className="h-3.5 w-3.5" />
                  ) : (
                    <span>{categoryIcons[category]}</span>
                  )}
                  {category === 'all' ? 'All' : categoryLabels[category]}
                </Button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-sm text-muted-foreground">
              Showing {termCount} {termCount === 1 ? 'term' : 'terms'}
              {selectedCategory !== 'all' && ` in ${categoryLabels[selectedCategory]}`}
            </p>
          </CardContent>
        </Card>

        {/* Terms List */}
        {filteredTerms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No terms found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-22rem)]">
                <Accordion type="single" collapsible className="w-full">
                  {groupedTerms.map(([letter, terms]) => (
                    <div key={letter}>
                      <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b">
                        <span className="text-sm font-bold text-primary">{letter}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({terms.length})
                        </span>
                      </div>
                      {terms.map((term) => (
                        <AccordionItem key={term.term} value={term.term} className="border-b">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                            <div className="flex items-center gap-3 text-left">
                              <span className="text-lg">{categoryIcons[term.category]}</span>
                              <div>
                                <span className="font-semibold">{term.term}</span>
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs"
                                >
                                  {categoryLabels[term.category]}
                                </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="pl-9 space-y-3">
                              <p className="text-muted-foreground leading-relaxed">
                                {term.definition}
                              </p>
                              {term.relatedTerms && term.relatedTerms.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Related:</span>
                                  {term.relatedTerms.map((related) => (
                                    <Badge
                                      key={related}
                                      variant="outline"
                                      className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                                      onClick={() => setSearchQuery(related)}
                                    >
                                      {related}
                                      <ArrowRight className="h-3 w-3 ml-1" />
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </div>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Quinn Integration Tip */}
        <Card className="bg-gradient-to-r from-chart-3/5 via-primary/5 to-chart-3/5 border-chart-3/20">
          <CardContent className="flex items-start gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chart-3/20">
              <Sparkles className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="font-medium text-sm">Ask Quinn for more!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Want deeper explanations or real examples? Ask Quinn about any term and get 
                personalized explanations tailored to your experience level.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
