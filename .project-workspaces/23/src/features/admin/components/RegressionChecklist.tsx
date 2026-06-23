import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const sections = [
  { title: 'Auth', items: ['New user signup completes', 'Sign out clears session', 'Password reset sends email'] },
  { title: 'Navigation', items: ['All routes load without 404', 'Logo goes to /projects', 'Avatar menu opens'] },
  { title: 'Workspace', items: ['Build stream generates strategy', 'MarQ dock opens and responds', 'Funnel steps save to DB'] },
  { title: 'Mobile', items: ['Dashboard scrolls on mobile', 'Workspace scrolls on mobile', "Dock doesn't clip content"] },
];

const allItems = sections.flatMap(s => s.items);

export default function RegressionChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (item: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  };

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Pre-Deploy Regression Checklist</CardTitle>
        <Badge variant="outline" className="text-xs">{checked.size}/{allItems.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map(s => (
          <div key={s.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{s.title}</p>
            <div className="space-y-1.5">
              {s.items.map(item => (
                <label key={item} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent/30 transition-colors">
                  <Checkbox checked={checked.has(item)} onCheckedChange={() => toggle(item)} />
                  <span className={`text-sm ${checked.has(item) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
