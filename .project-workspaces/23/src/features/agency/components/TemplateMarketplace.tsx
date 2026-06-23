import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate, Star, Zap, Briefcase, ShoppingBag, Megaphone, Heart, GraduationCap, Rocket, Mic, Clock, Users, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEMPLATES, type SharedTemplate, type TemplateCategory } from '@/data/templates';

interface TemplateMarketplaceProps {
  /** Optional handler. When omitted, scaffolds + routes to /workspace. */
  onUseTemplate?: (template: SharedTemplate) => void;
}

const CATEGORIES: TemplateCategory[] = ['Lead Gen', 'Sales', 'Launch'];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'lead-magnet': Zap,
  'coaching': Mic,
  'webinar': Megaphone,
  'creator': Sparkles,
  'ecommerce': ShoppingBag,
  'consulting': Target,
  'agency-portfolio': Briefcase,
  'fitness': Heart,
  'saas-launch': Rocket,
  'course': GraduationCap,
  'reclaim-your-name': Star,
  'nonprofit': Heart,
};

function formatInstalls(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/**
 * Start from a template — utility launcher.
 * One CTA per card. Outcome + installs + build time. No screenshots, no decoration.
 */
export function TemplateMarketplace({ onUseTemplate }: TemplateMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'All'>('All');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const handleUse = (template: SharedTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
      return;
    }
    // Scaffold: prefill project name + description + suggested steps, jump straight to build.
    navigate('/workspace', {
      state: {
        templateName: template.name,
        templateDescription: template.description,
        templateSteps: template.steps,
        templateId: template.id,
        quinnPrompt: `Build a ${template.name}: ${template.outcome}.`,
      },
    });
  };

  return (
    <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-serif tracking-tight">Start from a template</h2>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Curated funnels. One tap to scaffold the project and land in the build stream.
      </p>

      {/* 3-category filter (+ All). No search, no scrolling tag bar. */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(['All', ...CATEGORIES] as const).map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                active
                  ? 'border-primary/50 bg-primary/15 text-foreground shadow-[0_0_14px_-4px_hsl(var(--primary)/0.45)]'
                  : 'border-border/30 bg-muted/10 text-muted-foreground hover:text-foreground hover:bg-muted/20',
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((template) => {
          const Icon = ICONS[template.id] ?? LayoutTemplate;
          return (
            <Card key={template.id} className="border-border/30 bg-background/40 transition-all hover:border-primary/30">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold tracking-tight">{template.name}</p>
                      {template.popular && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                          <Star className="h-2.5 w-2.5" /> Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground/75 mt-1 leading-relaxed">
                      {template.outcome}
                    </p>
                  </div>
                </div>

                {/* Performance meta */}
                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-primary/70" />
                    {formatInstalls(template.installs)} installs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary/70" />
                    {template.buildTimeMin} min build
                  </span>
                </div>

                <Button
                  size="sm"
                  className="mt-4 w-full text-xs font-medium"
                  onClick={() => handleUse(template)}
                >
                  Use template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No templates in this category yet.
        </div>
      )}
    </section>
  );
}
