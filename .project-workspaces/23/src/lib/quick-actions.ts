/**
 * Global quick-action event bus.
 * Allows the global search modal (or any component) to trigger
 * shell-level actions like opening the New Lead modal,
 * exporting analytics, or activating Zero-Trace.
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type QuickActionEvent =
  | 'open-new-lead'
  | 'export-analytics'
  | 'open-zero-trace';

const EVENT_NAME = 'intoiq:quick-action';

export function dispatchQuickAction(action: QuickActionEvent) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: action }));
}

export function subscribeQuickAction(handler: (action: QuickActionEvent) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<QuickActionEvent>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportAnalyticsCsv(orgId: string) {
  const toastId = toast.loading('Preparing analytics export…');
  try {
    const [contactsRes, viewsRes, submissionsRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('email, first_name, last_name, pipeline_stage, score, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('page_views')
        .select('page_id, created_at, referrer, country')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('form_submissions')
        .select('page_id, contact_id, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    const stamp = new Date().toISOString().split('T')[0];
    const contacts = contactsRes.data || [];
    const views = viewsRes.data || [];
    const submissions = submissionsRes.data || [];

    if (contacts.length === 0 && views.length === 0 && submissions.length === 0) {
      toast.warning('No analytics data to export yet', { id: toastId });
      return;
    }

    if (contacts.length) {
      downloadCsv(
        `intoiq-contacts-${stamp}.csv`,
        toCsv(contacts as Array<Record<string, unknown>>, [
          'email', 'first_name', 'last_name', 'pipeline_stage', 'score', 'created_at',
        ]),
      );
    }
    if (views.length) {
      downloadCsv(
        `intoiq-pageviews-${stamp}.csv`,
        toCsv(views as Array<Record<string, unknown>>, ['page_id', 'created_at', 'referrer', 'country']),
      );
    }
    if (submissions.length) {
      downloadCsv(
        `intoiq-form-submissions-${stamp}.csv`,
        toCsv(submissions as Array<Record<string, unknown>>, ['page_id', 'contact_id', 'created_at']),
      );
    }

    const capped = contacts.length === 1000 || views.length === 1000 || submissions.length === 1000;
    toast.success('Analytics exported', {
      id: toastId,
      description: `${contacts.length} contacts · ${views.length} views · ${submissions.length} submissions${capped ? ' · showing most recent 1,000 per dataset' : ''}`,
    });
  } catch (e: any) {
    toast.error('Export failed', { id: toastId, description: e?.message || 'Please try again' });
  }
}
