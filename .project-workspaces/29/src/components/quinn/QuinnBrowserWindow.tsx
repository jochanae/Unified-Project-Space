import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuinnBrowserWindowButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

// HTML template for the pop-out window
const getQuinnWindowHTML = (supabaseUrl: string, supabaseKey: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quinn — Trading Companion</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --background: 240 10% 3.9%;
      --foreground: 0 0% 98%;
      --card: 240 10% 3.9%;
      --card-foreground: 0 0% 98%;
      --primary: 168 84% 39%;
      --primary-foreground: 0 0% 98%;
      --muted: 240 3.7% 15.9%;
      --muted-foreground: 240 5% 64.9%;
      --border: 240 3.7% 15.9%;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      height: 100vh;
      overflow: hidden;
    }
    
    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: hsl(var(--muted) / 0.5);
      border-bottom: 1px solid hsl(var(--border));
    }
    
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, hsl(168 84% 39%), hsl(168 84% 39% / 0.6));
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .avatar svg {
      width: 16px;
      height: 16px;
      color: white;
    }
    
    .title {
      font-weight: 600;
      font-size: 14px;
    }
    
    .subtitle {
      font-size: 11px;
      color: hsl(var(--muted-foreground));
    }
    
    .chat-area {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .message {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    
    .message.assistant .bubble {
      background: hsl(var(--muted) / 0.7);
      border: 1px solid hsl(var(--border) / 0.5);
      border-radius: 16px;
      border-top-left-radius: 4px;
      padding: 12px;
      max-width: 85%;
    }
    
    .message.user {
      justify-content: flex-end;
    }
    
    .message.user .bubble {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: 16px;
      border-bottom-right-radius: 4px;
      padding: 12px;
      max-width: 85%;
    }
    
    .input-area {
      padding: 16px;
      border-top: 1px solid hsl(var(--border));
      display: flex;
      gap: 8px;
    }
    
    .input-area textarea {
      flex: 1;
      background: hsl(var(--muted) / 0.3);
      border: 1px solid hsl(var(--border));
      border-radius: 12px;
      padding: 12px;
      color: inherit;
      font-size: 14px;
      resize: none;
      outline: none;
      font-family: inherit;
    }
    
    .input-area textarea:focus {
      border-color: hsl(var(--primary));
    }
    
    .input-area button {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .input-area button:hover {
      opacity: 0.9;
    }
    
    .input-area button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .loading {
      display: inline-block;
      width: 8px;
      height: 8px;
      border: 2px solid hsl(var(--primary));
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .welcome-prompts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    
    .welcome-prompts button {
      background: hsl(var(--primary) / 0.1);
      color: hsl(var(--primary));
      border: 1px solid hsl(var(--primary) / 0.2);
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .welcome-prompts button:hover {
      background: hsl(var(--primary) / 0.2);
      border-color: hsl(var(--primary) / 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="avatar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/>
        </svg>
      </div>
      <div>
        <div class="title">Quinn</div>
        <div class="subtitle">Your Trading Companion</div>
      </div>
    </div>
    
    <div class="chat-area" id="chatArea">
      <div class="message assistant">
        <div class="avatar" style="width: 28px; height: 28px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
            <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/>
          </svg>
        </div>
        <div class="bubble">
          <p>Hey! 👋 I'm Quinn, your trading companion.</p>
          <p style="margin-top: 8px;">I'm here in a separate window so you can keep me open alongside your broker platform. Ask me anything!</p>
          <div class="welcome-prompts">
            <button onclick="sendPrompt('Analyze a chart pattern')">📊 Chart Analysis</button>
            <button onclick="sendPrompt('Help with position sizing')">⚖️ Position Sizing</button>
            <button onclick="sendPrompt('Explain a trading concept')">📚 Learn</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="input-area">
      <textarea 
        id="messageInput" 
        placeholder="Ask Quinn anything..." 
        rows="1"
        onkeydown="handleKeyDown(event)"
      ></textarea>
      <button onclick="sendMessage()" id="sendButton">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
        </svg>
      </button>
    </div>
  </div>
  
  <script>
    const SUPABASE_URL = "${supabaseUrl}";
    const SUPABASE_KEY = "${supabaseKey}";
    const CHAT_URL = SUPABASE_URL + "/functions/v1/quinn-chat";
    
    let messages = [];
    let isLoading = false;
    
    function handleKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }
    
    function sendPrompt(prompt) {
      document.getElementById('messageInput').value = prompt;
      sendMessage();
    }
    
    async function sendMessage() {
      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (!text || isLoading) return;
      
      input.value = '';
      isLoading = true;
      document.getElementById('sendButton').disabled = true;
      
      // Add user message
      messages.push({ role: 'user', content: text });
      appendMessage('user', text);
      
      // Show loading
      const loadingId = 'loading-' + Date.now();
      appendLoading(loadingId);
      
      try {
        const response = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_KEY,
          },
          body: JSON.stringify({
            messages: messages.map(m => ({ role: m.role, content: m.content })),
          }),
        });
        
        if (!response.ok) throw new Error('Failed to get response');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let textBuffer = '';
        
        // Remove loading, add assistant bubble
        removeLoading(loadingId);
        const assistantId = 'assistant-' + Date.now();
        appendMessage('assistant', '', assistantId);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = textBuffer.indexOf('\\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            
            if (line.endsWith('\\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                updateMessage(assistantId, assistantContent);
              }
            } catch (e) {}
          }
        }
        
        messages.push({ role: 'assistant', content: assistantContent });
        
      } catch (error) {
        removeLoading(loadingId);
        appendMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      }
      
      isLoading = false;
      document.getElementById('sendButton').disabled = false;
    }
    
    function appendMessage(role, content, id) {
      const chatArea = document.getElementById('chatArea');
      const div = document.createElement('div');
      div.className = 'message ' + role;
      if (id) div.id = id;
      
      if (role === 'assistant') {
        div.innerHTML = \`
          <div class="avatar" style="width: 28px; height: 28px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/>
            </svg>
          </div>
          <div class="bubble">\${formatMarkdown(content)}</div>
        \`;
      } else {
        div.innerHTML = '<div class="bubble">' + escapeHtml(content) + '</div>';
      }
      
      chatArea.appendChild(div);
      chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    function updateMessage(id, content) {
      const el = document.getElementById(id);
      if (el) {
        const bubble = el.querySelector('.bubble');
        if (bubble) {
          bubble.innerHTML = formatMarkdown(content);
          document.getElementById('chatArea').scrollTop = document.getElementById('chatArea').scrollHeight;
        }
      }
    }
    
    function appendLoading(id) {
      const chatArea = document.getElementById('chatArea');
      const div = document.createElement('div');
      div.className = 'message assistant';
      div.id = id;
      div.innerHTML = \`
        <div class="avatar" style="width: 28px; height: 28px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
            <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/>
          </svg>
        </div>
        <div class="bubble"><span class="loading"></span></div>
      \`;
      chatArea.appendChild(div);
      chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    function removeLoading(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function formatMarkdown(text) {
      if (!text) return '';
      // Comprehensive HTML escaping to prevent XSS
      const escapeForHtml = (str) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      
      // First escape all HTML, then apply safe markdown formatting
      let escaped = escapeForHtml(text);
      
      // Apply safe markdown transforms (only on already-escaped content)
      return escaped
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/\\n/g, '<br>');
    }
  </script>
</body>
</html>
`;

export function QuinnBrowserWindowButton({ className, variant = 'outline', showLabel = true }: QuinnBrowserWindowButtonProps) {
  const [windowRef, setWindowRef] = useState<Window | null>(null);

  // Check if window is still open
  useEffect(() => {
    if (!windowRef) return;
    
    const checkWindow = setInterval(() => {
      if (windowRef.closed) {
        setWindowRef(null);
      }
    }, 1000);

    return () => clearInterval(checkWindow);
  }, [windowRef]);

  const openBrowserWindow = () => {
    // If window already open, focus it
    if (windowRef && !windowRef.closed) {
      windowRef.focus();
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const width = 420;
    const height = 650;
    const left = window.screenX + window.innerWidth - width - 20;
    const top = window.screenY + 80;

    const newWindow = window.open(
      '',
      'QuinnTradingCompanion',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );

    if (newWindow) {
      newWindow.document.write(getQuinnWindowHTML(supabaseUrl, supabaseKey));
      newWindow.document.close();
      setWindowRef(newWindow);
    }
  };

  const isWindowOpen = windowRef && !windowRef.closed;

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={openBrowserWindow}
      className={cn('gap-2', className)}
      title="Open Quinn in a separate browser window for side-by-side trading"
    >
      <Monitor className="h-4 w-4" />
      {showLabel && (
        <span className="hidden sm:inline">
          {isWindowOpen ? 'Focus Quinn' : 'New Window'}
        </span>
      )}
    </Button>
  );
}
