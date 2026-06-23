import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'circle-last-read';

function getLastReadMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function markCircleRead(circleId: string) {
  const map = getLastReadMap();
  map[circleId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export interface CirclePreview {
  senderName: string;
  content: string;
  createdAt: string;
}

export function useCircleUnread(circleIds: string[]) {
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [previewMap, setPreviewMap] = useState<Record<string, CirclePreview>>({});

  const check = useCallback(async () => {
    if (circleIds.length === 0) return;

    const { data } = await supabase
      .from('circle_messages' as any)
      .select('circle_id, created_at, sender_name, content')
      .in('circle_id', circleIds)
      .order('created_at', { ascending: false });

    if (!data) return;

    const latestByCircle: Record<string, string> = {};
    const previews: Record<string, CirclePreview> = {};
    for (const row of data as any[]) {
      if (!latestByCircle[row.circle_id]) {
        latestByCircle[row.circle_id] = row.created_at;
        previews[row.circle_id] = {
          senderName: row.sender_name,
          content: row.content,
          createdAt: row.created_at,
        };
      }
    }

    const lastRead = getLastReadMap();
    const result: Record<string, boolean> = {};
    for (const cid of circleIds) {
      const latest = latestByCircle[cid];
      if (!latest) {
        result[cid] = false;
        continue;
      }
      const lr = lastRead[cid];
      result[cid] = !lr || new Date(latest) > new Date(lr);
    }
    setUnreadMap(result);
    setPreviewMap(previews);
  }, [circleIds.join(',')]);

  useEffect(() => {
    check();
  }, [check]);

  return { unreadMap, previewMap };
}
