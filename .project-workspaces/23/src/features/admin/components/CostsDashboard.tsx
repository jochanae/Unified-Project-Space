import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

const services = [
  { name: 'Lovable AI Gateway', purpose: 'AI generation (build stream, ghost text, hero images)', pricing: 'Per-request', link: null },
  { name: 'Stripe', purpose: 'Payment processing', pricing: 'Per-transaction %', link: 'https://dashboard.stripe.com' },
  { name: 'Supabase (Lovable Cloud)', purpose: 'Database, auth, storage, edge functions', pricing: 'Included in plan', link: null },
];

export default function CostsDashboard() {
  const [aiCost, setAiCost] = useState(0.003);
  const [imgCost, setImgCost] = useState(0.04);
  const [users, setUsers] = useState(0);

  const daily = (users * 5 * aiCost) + (users * 0.5 * imgCost);
  const monthly = daily * 30;

  return (
    <>
      {/* Services table */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">External Services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Service</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Purpose</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Pricing</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Link</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.name} className="border-b border-border/10 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.purpose}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">{s.pricing}</Badge></td>
                    <td className="px-4 py-2.5">
                      {s.link ? (
                        <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                          Dashboard <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage estimates */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Usage Estimates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cost per AI call ($)</label>
              <Input type="number" step="0.001" value={aiCost} onChange={e => setAiCost(Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cost per image gen ($)</label>
              <Input type="number" step="0.01" value={imgCost} onChange={e => setImgCost(Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Active users</label>
              <Input type="number" value={users} onChange={e => setUsers(Number(e.target.value))} className="h-8 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Est. daily cost</p>
              <p className="text-lg font-bold text-foreground">${daily.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. monthly cost</p>
              <p className="text-lg font-bold text-foreground">${monthly.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
