import { useState, useCallback, useRef } from 'react';
import { CanvasElement } from '../components/LogoCanvas';
import { LogoProjectContext } from './use-logo-project-context';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface LogoChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageData?: string; // base64 data URL for attached images
}

export interface CanvasCommand {
  action: 'update_element' | 'add_text' | 'add_image' | 'delete_element' | 'set_background' | 'set_canvas_size' | 'generate_image' | 'edit_image';
  id?: string;
  attrs?: Partial<CanvasElement> & { text?: string };
  color?: string;
  width?: number;
  height?: number;
  prompt?: string;
}

interface CanvasState {
  elements: CanvasElement[];
  canvasSize: { width: number; height: number };
  backgroundColor: string;
}

interface UseQuinnLogoCallbacks {
  onUpdateElement: (id: string, attrs: Partial<CanvasElement>) => void;
  onAddText: (attrs: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onSetBackground: (color: string) => void;
  onSetCanvasSize: (size: { width: number; height: number }) => void;
  onAddImage: (attrs: { imageUrl: string; width: number; height: number; x?: number; y?: number }) => void;
}

/** Parse canvas-commands blocks from the assistant response */
function parseCanvasCommands(content: string): CanvasCommand[] {
  const commands: CanvasCommand[] = [];
  const regex = /```canvas-commands\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        commands.push(...parsed);
      } else {
        commands.push(parsed);
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return commands;
}

/** Strip the canvas-commands fenced blocks from display text */
function stripCommandBlocks(content: string): string {
  return content.replace(/```canvas-commands\s*\n[\s\S]*?```/g, '').trim();
}

/** Validate and sanitize gradient attrs to prevent canvas crashes */
function sanitizeAttrs(attrs: Record<string, any>): Record<string, any> {
  if (attrs.fillLinearGradient) {
    const grad = attrs.fillLinearGradient;
    const isValidColor = (c: string) => typeof c === 'string' && (/^#[0-9a-fA-F]{3,8}$/.test(c) || /^(rgb|hsl)/.test(c) || /^[a-zA-Z]{3,}$/.test(c));
    if (!Array.isArray(grad.colors) || grad.colors.length < 2 || !grad.colors.every(isValidColor)) {
      // Invalid gradient — strip it and fallback to fill
      const { fillLinearGradient, ...rest } = attrs;
      return { ...rest, fill: rest.fill || '#ffffff' };
    }
  }
  return attrs;
}

/** Remove white/near-white pixels from a base64 image, making them transparent */
function removeWhiteBackground(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      // Threshold: treat pixels with R,G,B all > 230 as "white"
      const threshold = 230;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
          data[i + 3] = 0; // set alpha to 0
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

/** Call generate/edit-image edge function */
async function callImageFunction(prompt: string, inputImage?: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-generate`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        mode: 'logo',
        subMode: 'icon',
        prompt,
        ...(inputImage ? { referenceImage: inputImage } : {}),
      }),
    });
    if (!resp.ok) throw new Error('Image operation failed');
    const data = await resp.json();
    const rawUrl = data.imageUrl || null;
    if (!rawUrl) return null;
    // Auto-remove white background for transparency
    const transparentUrl = await removeWhiteBackground(rawUrl);
    return transparentUrl;
  } catch (e) {
    console.error('Image operation error:', e);
    return null;
  }
}

export function useQuinnLogo(
  getCanvasState: () => CanvasState,
  callbacks: UseQuinnLogoCallbacks,
  projectContext?: LogoProjectContext
) {
  const [messages, setMessages] = useState<LogoChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const executeCommands = useCallback(async (commands: CanvasCommand[]) => {
    for (const cmd of commands) {
      switch (cmd.action) {
        case 'update_element':
          if (cmd.id && cmd.attrs) callbacks.onUpdateElement(cmd.id, sanitizeAttrs(cmd.attrs));
          break;
        case 'add_text':
          if (cmd.attrs) callbacks.onAddText(sanitizeAttrs(cmd.attrs));
          break;
        case 'add_image':
          if (cmd.attrs?.imageUrl) {
            callbacks.onAddImage({
              imageUrl: cmd.attrs.imageUrl as string,
              width: cmd.width || 150,
              height: cmd.height || 150,
              x: cmd.attrs.x,
              y: cmd.attrs.y,
            });
          }
          break;
        case 'delete_element':
          if (cmd.id) callbacks.onDeleteElement(cmd.id);
          break;
        case 'set_background':
          if (cmd.color) callbacks.onSetBackground(cmd.color);
          break;
        case 'set_canvas_size':
          if (cmd.width && cmd.height) callbacks.onSetCanvasSize({ width: cmd.width, height: cmd.height });
          break;
        case 'generate_image': {
          if (cmd.prompt) {
            toast.info('Generating image…');
            const imageUrl = await callImageFunction(cmd.prompt);
            if (imageUrl) {
              callbacks.onAddImage({
                imageUrl,
                width: cmd.width || 150,
                height: cmd.height || 150,
                x: cmd.attrs?.x,
                y: cmd.attrs?.y,
              });
              toast.success('Image generated and added to canvas!');
            } else {
              toast.error('Image generation failed');
            }
          }
          break;
        }
        case 'edit_image': {
          if (cmd.id && cmd.prompt) {
            // Find the existing image element to get its current imageUrl
            const canvasState = getCanvasState();
            const element = canvasState.elements.find(el => el.id === cmd.id);
            if (element?.imageUrl) {
              toast.info('Editing image…');
              const editedUrl = await callImageFunction(cmd.prompt, element.imageUrl);
              if (editedUrl) {
                callbacks.onUpdateElement(cmd.id, { imageUrl: editedUrl });
                toast.success('Image edited successfully!');
              } else {
                toast.error('Image editing failed');
              }
            } else {
              toast.error('Could not find image element to edit');
            }
          }
          break;
        }
      }
    }
  }, [callbacks]);

  const send = useCallback(async (content: string, imageData?: string) => {
    if (!content.trim() || streaming) return;

    const userMsg: LogoChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      imageData,
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = crypto.randomUUID();
    let assistantContent = '';

    try {
      const canvasState = getCanvasState();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again to use MarQ.');
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quinn-logo`;
      const historyForAI = [...messages, userMsg].slice(-10).map(m => {
        // If message has an attached image, format as multimodal content
        if (m.imageData) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              { type: 'image_url', image_url: { url: m.imageData } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: historyForAI,
          canvasState,
          projectContext: projectContext?.project ? {
            name: projectContext.project.name,
            goal: projectContext.project.goal,
            directives: projectContext.directives,
          } : undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

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
              const displayContent = stripCommandBlocks(assistantContent);
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: displayContent } : m)
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Parse and execute canvas commands from the full response
      const commands = parseCanvasCommands(assistantContent);
      if (commands.length > 0) {
        await executeCommands(commands);
        const nonGenCount = commands.filter(c => c.action !== 'generate_image').length;
        if (nonGenCount > 0) {
          toast.success(`Applied ${nonGenCount} canvas change${nonGenCount > 1 ? 's' : ''}`);
        }
      }

      // Final display update with commands stripped
      const finalDisplay = stripCommandBlocks(assistantContent);
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: finalDisplay } : m)
      );
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errorContent = e.message || 'Something went wrong.';
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${errorContent}` } : m)
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming, messages, getCanvasState, executeCommands, projectContext]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, streaming, send, cancel, clearHistory };
}
