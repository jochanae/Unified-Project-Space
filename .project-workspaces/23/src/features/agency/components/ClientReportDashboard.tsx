import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Eye, MousePointerClick, Users, TrendingUp, Share2, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectReport {
  id: string;
  name: string;
  status: string;
  pageViews: number;
  submissions: number;
  contacts: number;
  conversionRate: number;
}

export function ClientReportDashboard() {
  const { user } = useCurrentUser();
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId) return;
    loadReports(user.orgId);
  }, [user?.orgId]);

  const loadReports = async (orgId: string) => {
    setLoading(true);
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (!projects?.length) {
        setReports([]);
        setLoading(false);
        return;
      }

      const projectIds = projects.map(p => p.id);

      const [viewsRes, subsRes, contactsRes] = await Promise.all([
        supabase.from('page_views').select('id, org_id').eq('org_id', orgId),
        supabase.from('form_submissions').select('id, org_id').eq('org_id', orgId),
        supabase.from('contacts').select('id, source_project_id').in('source_project_id', projectIds),
      ]);

      const views = viewsRes.data || [];
      const subs = subsRes.data || [];
      const contacts = contactsRes.data || [];

      const reportData: ProjectReport[] = projects.map(p => {
        const pv = views.length; // simplified — all org views
        const fs = subs.length;
        const ct = contacts.filter(c => c.source_project_id === p.id).length;
        const cr = pv > 0 ? (fs / pv) * 100 : 0;
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          pageViews: pv,
          submissions: fs,
          contacts: ct,
          conversionRate: Math.round(cr * 10) / 10,
        };
      });

      setReports(reportData);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = (report: ProjectReport) => {
    const text = `📊 ${report.name} Report\n\n👁 Page Views: ${report.pageViews}\n📝 Submissions: ${report.submissions}\n👥 Contacts: ${report.contacts}\n📈 Conversion: ${report.conversionRate}%`;
    navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    toast.success('Report copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <section className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">Client Reports</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Client Reports
        </h2>
        <Badge variant="secondary" className="text-[10px]">
          {reports.length} project{reports.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No projects yet. Create a project to see reports here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <Card key={report.id} className="card-hover-glow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{report.name}</p>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] mt-1',
                        report.status === 'complete' ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'
                      )}
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 shrink-0"
                    onClick={() => handleCopyReport(report)}
                  >
                    {copiedId === report.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Share
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl bg-muted/20 p-2.5 text-center">
                    <Eye className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-semibold">{report.pageViews.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Views</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-2.5 text-center">
                    <MousePointerClick className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-semibold">{report.submissions}</p>
                    <p className="text-[10px] text-muted-foreground">Submissions</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-2.5 text-center">
                    <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-semibold">{report.contacts}</p>
                    <p className="text-[10px] text-muted-foreground">Contacts</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-2.5 text-center">
                    <TrendingUp className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-semibold">{report.conversionRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
