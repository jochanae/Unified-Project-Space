import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Attachment {
  name: string;
  type: string;
  base64: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quinn-chat`;

export function useQuinnChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { session, role, subscriptionTier } = useAuth();
  const isAdminOrPro = role === 'admin' || role === 'super_admin' || subscriptionTier === 'pro';

  const sendMessage = useCallback(async (input: string, attachments?: Attachment[]) => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      attachments,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    try {
      // Build messages with proper multimodal content for images
      const messagesToSend = [...messages, userMessage].map(m => {
        // If there are image attachments, build multimodal content array
        if (m.attachments && m.attachments.length > 0) {
          const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          
          // Add the text content first
          if (m.content) {
            contentParts.push({ type: 'text', text: m.content });
          }
          
          // Add each image as a separate content part with base64 data
          for (const attachment of m.attachments) {
            if (attachment.type.startsWith('image/')) {
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url: `data:${attachment.type};base64,${attachment.base64}`,
                },
              });
            } else {
              // For non-image attachments, just mention them
              contentParts.push({ 
                type: 'text', 
                text: `[Attached file: ${attachment.name} (${attachment.type})]` 
              });
            }
          }
          
          return {
            role: m.role,
            content: contentParts,
          };
        }
        
        // No attachments - simple text content
        return {
          role: m.role,
          content: m.content,
        };
      });

      // Get a fresh session at send-time (AuthContext can be briefly stale during app bootstrap)
      const {
        data: { session: liveSession },
      } = await supabase.auth.getSession();

      // Use the access token when available so the backend can retrieve the user's saved profile.
      // Fallback to the publishable key for anonymous usage.
      const token =
        liveSession?.access_token ??
        session?.access_token ??
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: messagesToSend,
          conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error(errorData.error || 'Rate limited. Please wait a moment.');
        } else if (response.status === 402) {
          if (errorData.limit_reached) {
            // Usage limit reached for free users
            setShowUpgradeModal(true);
            const limitType = errorData.limit_type || 'monthly_messages';
            if (limitType === 'per_conversation') {
              toast.error(errorData.error || 'This conversation has reached its message limit. Start a new one or upgrade to Pro.');
            } else if (limitType === 'monthly_messages') {
              toast.error(errorData.error || 'You\'ve used all your free messages this month. Upgrade to Pro for unlimited.');
            } else {
              toast.error(errorData.error || 'You\'ve used all your free conversations this month. Upgrade to Pro for unlimited.');
            }
          } else if (isAdminOrPro) {
            toast.error('AI service temporarily unavailable. Platform credits may need to be replenished.');
          } else {
            setShowUpgradeModal(true);
            toast.error(errorData.error || 'AI credits depleted. Upgrade for unlimited access.');
          }
        } else {
          toast.error(errorData.error || 'Failed to get response from Quinn.');
        }
        setIsLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
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
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            /* ignore */
          }
        }
      }

      // Save conversation to database if user is logged in
      if (session?.user) {
        const finalMessages = [...messages, userMessage];
        if (assistantContent) {
          finalMessages.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date(),
          });
        }

        if (conversationId) {
          // Update existing conversation
          await supabase
            .from('conversations')
            .update({
              messages: finalMessages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
              })),
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId);
        } else {
          // Create new conversation
          const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
          const { data } = await supabase
            .from('conversations')
            .insert({
              user_id: session.user.id,
              title,
              messages: finalMessages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
              })),
            })
            .select('id')
            .single();

          if (data) {
            setConversationId(data.id);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, conversationId, session]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Failed to load conversation');
      return;
    }

    if (data) {
      setConversationId(data.id);
      const loadedMessages = (data.messages as Array<{ role: string; content: string; timestamp: string }>).map(
        (m, i) => ({
          id: `${id}-${i}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.timestamp),
        })
      );
      setMessages(loadedMessages);
    }
  }, []);

  // Retry the last message (regenerate response)
  const retryLastMessage = useCallback(() => {
    if (messages.length < 2) return;
    
    // Find the last user message
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }
    
    if (lastUserMessageIndex === -1) return;
    
    const lastUserMessage = messages[lastUserMessageIndex];
    
    // Remove the last assistant response and resend
    setMessages(prev => prev.slice(0, lastUserMessageIndex + 1).slice(0, -1));
    
    // Resend the user message
    sendMessage(lastUserMessage.content, lastUserMessage.attachments);
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    conversationId,
    showUpgradeModal,
    setShowUpgradeModal,
    sendMessage,
    clearMessages,
    loadConversation,
    retryLastMessage,
  };
}
