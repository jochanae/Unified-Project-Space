import { supabase } from '@/integrations/supabase/client';

/**
 * Shared helper to call quinn-chat and extract text from the SSE stream.
 */
export async function callQuinnStream(
  prompt: string,
  projectId?: string,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(`${supabaseUrl}/functions/v1/quinn-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      projectId: projectId || 'signal-lab',
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(errBody || `Request failed with status ${resp.status}`);
  }

  const reader = resp.body?.getReader();
  let fullContent = '';

  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) fullContent += delta;
        } catch {}
      }
    }
  } else {
    fullContent = await resp.text();
  }

  return fullContent;
}

/** Extract JSON object from a string that may contain markdown fences */
export function extractJSON<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
