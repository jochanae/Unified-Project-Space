import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityKind = 'lead' | 'submission' | 'followup' | 'open' | 'click';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  label: string;
  detail?: string;
}

/**
 * Aggregates recent activity for a single contact across:
 * - lead_notifications  (initial capture)
 * - form_submissions    (form fills)
 * - lead_followups      (follow-up sends + opens/clicks)
 */
export function useContactActivity(contactId: string | null, email: string | null) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId && !email) { setEvents([]); return; }
    let cancel = false;
    setLoading(true);

    (async () => {
      const out: ActivityEvent[] = [];

      const [{ data: leads }, { data: subs }, { data: ups }] = await Promise.all([
        contactId
          ? supabase.from('lead_notifications').select('id, created_at, source, page_id').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] as any[] }),
        contactId
          ? supabase.from('form_submissions').select('id, created_at, page_id').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] as any[] }),
        email
          ? supabase.from('lead_followups').select('id, created_at, subject, opened_at, clicked_at, open_count, click_count').eq('recipient_email', email).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      (leads || []).forEach((r: any) => out.push({
        id: `lead-${r.id}`, kind: 'lead', at: r.created_at,
        label: 'Lead captured', detail: r.source || undefined,
      }));
      (subs || []).forEach((r: any) => out.push({
        id: `sub-${r.id}`, kind: 'submission', at: r.created_at,
        label: 'Form submitted',
      }));
      (ups || []).forEach((r: any) => {
        out.push({
          id: `fu-${r.id}`, kind: 'followup', at: r.created_at,
          label: 'Follow-up sent', detail: r.subject || undefined,
        });
        if (r.opened_at) out.push({
          id: `fu-open-${r.id}`, kind: 'open', at: r.opened_at,
          label: `Opened${r.open_count > 1 ? ` ×${r.open_count}` : ''}`, detail: r.subject || undefined,
        });
        if (r.clicked_at) out.push({
          id: `fu-click-${r.id}`, kind: 'click', at: r.clicked_at,
          label: `Clicked${r.click_count > 1 ? ` ×${r.click_count}` : ''}`, detail: r.subject || undefined,
        });
      });

      out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      if (!cancel) { setEvents(out.slice(0, 30)); setLoading(false); }
    })();

    return () => { cancel = true; };
  }, [contactId, email]);

  return { events, loading };
}
