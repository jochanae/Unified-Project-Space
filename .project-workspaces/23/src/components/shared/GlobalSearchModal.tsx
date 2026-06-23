import { Command } from 'cmdk';
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  Home,
  Layers,
  Radio,
  TrendingUp,
  BarChart3,
  Camera,
  Settings,
  HelpCircle,
  Plus,
  Sparkles,
  Rocket,
  Zap,
  Map,
  LayoutTemplate,
  FileText,
  StickyNote,
  User,
  UserPlus,
  Download,
  ShieldOff,
  BookOpen,
  Search,
  ArrowRight,
  MessageSquare,
  Target,
  Clock,
  Video,
  X
} from 'lucide-react';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home, Layers, Radio, TrendingUp, BarChart3, Camera,
  Settings, HelpCircle, Plus, Sparkles, Rocket, Zap,
  Map, LayoutTemplate, FileText, StickyNote, User, UserPlus,
  Download, ShieldOff, BookOpen, MessageSquare, Target, Clock, Video
};

const CATEGORY_LABELS: Record<string, string> = {
  recent: 'Recently visited',
  navigation: 'Go to',
  actions: 'Quick actions',
  projects: 'Your projects',
  pages: 'Your pages',
  notes: 'Your notes',
  videos: 'Your videos',
  leads: 'Leads & contacts',
  templates: 'Templates',
  help: 'Help',
  knowledge: 'From the library',
};

const CATEGORY_ORDER: string[] = [
  'recent', 'actions', 'navigation', 'projects', 'pages',
  'videos', 'notes', 'leads', 'templates', 'help', 'knowledge'
];

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }:
  GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const { grouped, isSearching, total } = useGlobalSearch(query);

  // Clear query when closed
  useEffect(() => {
    if (!open) setTimeout(() => setQuery(''), 200);
  }, [open]);

  const handleSelect = useCallback((action: () => void, _title?: string) => {
    action();
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-background/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal — centered */}
      <div className="fixed inset-0 z-[201] flex items-start justify-center pt-20 px-4 pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto rounded-2xl border border-gold/40 bg-card shadow-[0_0_40px_hsl(var(--gold)/0.18)] ring-1 ring-gold/10 overflow-hidden">

          <Command shouldFilter={false} className={cn('w-full')}>

            {/* Input row — teal accent ring restored */}
            <div className="flex items-center gap-3 mx-3 mt-3 px-3 py-2.5 rounded-xl bg-muted/20 border border-primary/40 ring-1 ring-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
              {isSearching
                ? <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
                : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search projects, pages, templates, help..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 text-foreground min-w-0"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="shrink-0 text-xs text-muted-foreground/50 hover:text-muted-foreground px-1.5 py-0.5 rounded border border-border/30"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="shrink-0 flex items-center justify-center h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Results list */}
            <Command.List className="max-h-[60vh] overflow-y-auto py-2">

              <Command.Empty className="flex flex-col items-center justify-center py-8 px-4 text-sm text-muted-foreground">
                No results for "{query}"
              </Command.Empty>

              {CATEGORY_ORDER.filter(cat => grouped[cat]?.length > 0).map(cat => (
                <Command.Group
                  key={cat}
                  heading={CATEGORY_LABELS[cat]}
                  className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/60"
                >
                  {grouped[cat].map(result => {
                    const Icon = ICON_MAP[result.icon] || Search;
                    return (
                      <Command.Item
                        key={result.id}
                        value={`${result.title} ${result.subtitle || ''}`}
                        onSelect={() => handleSelect(result.action, result.title)}
                        className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-primary/10 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground mt-0.5">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                        {result.badge && (
                          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30">
                            {result.badge}
                          </span>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}

            </Command.List>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/20 bg-muted/10">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>ESC close</span>
              </div>
              {total > 0 && (
                <span className="text-[10px] text-muted-foreground/40">
                  {total} result{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>

          </Command>
        </div>
      </div>
    </>,
    document.body
  );
}
