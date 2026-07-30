const BACKEND_URL = "https://riya-backend-ujz7.onrender.com";

let messages = [
  { role: 'system', content: 'You are Riya, an elite, highly secure, private AI companion. You have access to the best models and act as a powerful protector and personal assistant. Keep responses elegant, serious, and deeply personal. Do not use generic AI language.' }
];

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('chat-input');
  
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = (inputEl.scrollHeight) + 'px';
  });
});

async function sendMessage() {
  const inputEl = document.getElementById('chat-input');
  const text = inputEl.value.trim();
  if (!text) return;

  // Clear input
  inputEl.value = '';
  inputEl.style.height = 'auto';

  // Add User Message
  appendMessage('user', text);
  messages.push({ role: 'user', content: text });

  // Add empty AI Message with typing cursor
  const aiMsgEl = appendMessage('riya', '');
  let fullAiResponse = '';

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        userName: 'Sir',
        plan: 'elite',
        stream: true
      })
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.token) {
                fullAiResponse += parsed.token;
                aiMsgEl.innerHTML = formatMarkdown(fullAiResponse) + '<span class="typing-cursor"></span>';
                scrollToBottom();
              }
            } catch (e) {}
          }
        }
      }
    } else {
      const json = await response.json();
      fullAiResponse = json.reply || json.response || "No response received.";
    }
  } catch (error) {
    fullAiResponse = "Connection established, but the neural link is warming up. Please retry in a moment.";
  }

  // Finalize UI
  aiMsgEl.innerHTML = formatMarkdown(fullAiResponse);
  messages.push({ role: 'assistant', content: fullAiResponse });
  scrollToBottom();
}

function appendMessage(role, text) {
  const feed = document.getElementById('chat-feed');
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `message msg-${role}`;
  
  if (role === 'riya' && text === '') {
    msgDiv.innerHTML = '<span class="typing-cursor"></span>';
  } else {
    msgDiv.innerHTML = formatMarkdown(text);
  }
  
  feed.appendChild(msgDiv);
  scrollToBottom();
  
  return msgDiv;
}

function scrollToBottom() {
  const feed = document.getElementById('chat-feed');
  feed.scrollTop = feed.scrollHeight;
}

function formatMarkdown(text) {
  if (!text) return '';
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br/>');
  
  return html;
}
