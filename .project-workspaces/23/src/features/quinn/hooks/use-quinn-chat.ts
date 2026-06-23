import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Attachment } from '@/features/quinn/lib/attachments';

export interface DirectiveTrace {
  type: string;
  directive: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  directives?: DirectiveTrace[];
}

type StudioMode = 'logo' | 'flyer' | 'social' | 'hero' | 'freeform';

/**
 * Heuristic image-intent detector. Returns mode + cleaned prompt when the user
 * is clearly asking MarQ to create a visual, otherwise null. Errs on the side
 * of NOT triggering — false positives are worse than false negatives.
 */
function detectImageIntent(text: string): { mode: StudioMode; prompt: string } | null {
  const t = text.trim();
  if (!t || t.length < 4) return null;
  const lower = t.toLowerCase();

  const verbs = /\b(sketch|draw|design|generate|create|make|produce|render|illustrate|mock\s*up|mockup)\b/;
  const nouns = /\b(image|picture|photo|illustration|sketch|drawing|graphic|visual|artwork|logo|flyer|poster|banner|hero|thumbnail|social\s*post|instagram\s*post|linkedin\s*post)\b/;

  // "sketch me a heart", "draw a sunset" — verb followed by anything
  const verbObject = /\b(sketch|draw|illustrate|render)\s+(me\s+)?(a|an|the)?\s*\S+/i;

  const hasVerbAndNoun = verbs.test(lower) && nouns.test(lower);
  const hasVerbObject = verbObject.test(lower);
  if (!hasVerbAndNoun && !hasVerbObject) return null;

  // Mode picker
  let mode: StudioMode = 'freeform';
  if (/\blogo\b/.test(lower)) mode = 'logo';
  else if (/\bflyer|poster|banner\b/.test(lower)) mode = 'flyer';
  else if (/\bsocial\s*post|instagram|linkedin|twitter|x\s*post|thread\b/.test(lower)) mode = 'social';
  else if (/\bhero|landing|cover|og\b/.test(lower)) mode = 'hero';

  return { mode, prompt: t };
}

export function useQuinnChat(projectId: string | null) {
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load history
  useEffect(() => {
    if (!projectId || !user?.orgId) {
      setMessages([]);
      return;
    }

    supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });
  }, [projectId, user?.orgId]);

  const send = useCallback(async (content: string, attachments: Attachment[] = []) => {
    if (!projectId || !user?.orgId) return;
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;

    const attachmentSummary = attachments.length
      ? '\n\n' + attachments.map(a => `📎 *Attached: ${a.name}*`).join('\n')
      : '';
    const displayContent = (trimmed || '(see attachment)') + attachmentSummary;

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: displayContent,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    // Save user message to DB
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      org_id: user.orgId,
      role: 'user',
      content: displayContent,
    });

    // === Image-intent fast path ===
    // If the user is clearly asking for an image, route to studio-generate
    // and embed the result inline as markdown instead of streaming text.
    const intent = detectImageIntent(trimmed);
    if (intent && attachments.length === 0) {
      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: `*Generating ${intent.mode}…*`,
        created_at: new Date().toISOString(),
      }]);
      try {
        const { data, error } = await supabase.functions.invoke('studio-generate', {
          body: { mode: intent.mode, prompt: intent.prompt, projectId },
        });
        if (error) throw error;
        if (!data?.imageUrl) throw new Error(data?.error || 'No image returned');
        const studioLink = `/studio?tab=engine&mode=${intent.mode}&prompt=${encodeURIComponent(intent.prompt)}&asset=${encodeURIComponent(data.imageUrl)}`;
        const md = `Here's what I sketched for you:\n\n![${intent.prompt}](${data.imageUrl})\n\nSaved to your Asset Library. [Open in Studio](${studioLink})`;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: md } : m));
        await supabase.from('chat_messages').insert({
          project_id: projectId,
          org_id: user.orgId,
          role: 'assistant',
          content: md,
        });
      } catch (e: any) {
        const errorContent = e.message || 'Image generation failed.';
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${errorContent}` } : m));
      } finally {
        setStreaming(false);
      }
      return;
    }

    // Stream assistant response
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quinn-chat`;

      // Prior turns stay text-only (don't replay base64 images every turn).
      const history = [...messages].slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const docText = attachments
        .filter((a): a is Extract<Attachment, { kind: 'text' }> => a.kind === 'text')
        .map(a => `\n\n--- Attached document: ${a.name} ---\n${a.text}\n--- end ---`)
        .join('');

      const imageBlocks = attachments
        .filter((a): a is Extract<Attachment, { kind: 'image' }> => a.kind === 'image')
        .map(a => ({
          type: 'image',
          source: { type: 'base64', media_type: a.mediaType, data: a.base64 },
        }));

      const userText = (trimmed || 'Please review the attached file.') + docText;

      const latestUserPayload =
        imageBlocks.length > 0
          ? { role: 'user' as const, content: [...imageBlocks, { type: 'text', text: userText }] }
          : { role: 'user' as const, content: userText };

      const historyForAI = [...history, latestUserPayload];

      // Use the live user session token — the anon publishable key has no `sub` claim
      // and will fail server-side JWT validation with `bad_jwt`.
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not signed in');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: historyForAI,
          projectId,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      // Capture directive trace from response header
      let directiveTrace: DirectiveTrace[] | undefined;
      const directiveHeader = resp.headers.get('x-quinn-directives');
      if (directiveHeader) {
        try {
          directiveTrace = JSON.parse(decodeURIComponent(directiveHeader));
        } catch { /* ignore */ }
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString(), directives: directiveTrace }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantContent += delta;
              const snap = assistantContent;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: snap } : m)
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await supabase.from('chat_messages').insert({
          project_id: projectId,
          org_id: user.orgId,
          role: 'assistant',
          content: assistantContent,
        });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errorContent = e.message || 'Something went wrong. Try again.';
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${errorContent}` } : m)
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [projectId, user?.orgId, messages]);

  const clearHistory = useCallback(async () => {
    if (!projectId) return;
    setMessages([]);
    await supabase.from('chat_messages').delete().eq('project_id', projectId);
  }, [projectId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, streaming, send, clearHistory, cancel };
}
