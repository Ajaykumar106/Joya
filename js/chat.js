// ── RIYA.AI CONCEPT 2 SCI-FI COMMAND CENTER CHAT & TERMINAL ENGINE ──
const BACKEND_URL = "https://riya-backend-ujz7.onrender.com";

// State
let currentMessages = [];
let chatThreads = JSON.parse(localStorage.getItem('riya_chat_threads') || '[]');
let activeThreadId = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderThreadHistory();
});

document.addEventListener('authReady', () => {
  const name = typeof userName !== 'undefined' ? userName : 'Operator';
  const heading = document.getElementById('welcomeHeading');
  if (heading) {
    heading.textContent = `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${name}`;
  }
});

// Toggle Sidebar Collapse
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
}

// Handle Enter to Send Message
function handleInputKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitMessage();
  }
}

// Removed terminal log function

// Submit Message (Real-Time Live Streaming with HUD Terminal Logging)
async function submitMessage() {
  const inputEl = document.getElementById('chatInput');
  const text = inputEl.value.trim();
  if (!text) return;

  // Clear Input
  inputEl.value = '';
  inputEl.style.height = 'auto';

  // Hide Welcome Screen
  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.style.display = 'none';

  // Switch to Chat Tab
  switchTab('chat');

  if (!activeThreadId) {
    activeThreadId = 'thread_' + Date.now();
  }

  // 1. Append User Message
  appendUserMessageUI(text);
  currentMessages.push({ role: 'user', content: text });

  // Disable Send Button
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  // 2. Append AI Response Bubble
  const aiBubbleEl = appendAiMessageUI('');
  aiBubbleEl.innerHTML = '<span style="color:var(--text-secondary); font-size:14px; display:flex; align-items:center; gap:6px;"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';

  let fullAiResponse = '';

  try {
    const systemInstruction = {
      role: 'system',
      content: 'You are Riya AI, an advanced AI companion created by Ajay. ALWAYS respond in fluent, natural English by default unless the user explicitly requests another language.'
    };

    const historyPayload = [
      systemInstruction,
      ...currentMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ];

    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: historyPayload,
        userName: typeof userName !== 'undefined' ? userName : 'Operator',
        plan: typeof userPlan !== 'undefined' ? userPlan : 'free',
        stream: true,
        language: 'English'
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
                aiBubbleEl.innerHTML = formatMarkdown(fullAiResponse) + '<span class="typing-cursor" style="color:var(--text-secondary); margin-left:4px;">●</span>';
                scrollChatToBottom();
              }
            } catch (e) {}
          }
        }
      }
      finalizeResponseUI();
    } else {
      const json = await response.json();
      fullAiResponse = json.reply || json.response || "No response received.";
      simulateTypingEffect();
    }
  } catch (error) {
    console.error("Chat Error:", error);
    fullAiResponse = "⚠️ Connection issue. Render backend warming up or offline. Please retry in a moment.";
    simulateTypingEffect();
  }

  function simulateTypingEffect() {
    let index = 0;
    aiBubbleEl.innerHTML = '';
    const typingSpeed = 15; // ms per character for simulated fast typing

    function typeChar() {
      if (index < fullAiResponse.length) {
        // Simple chunking to avoid breaking markdown mid-render for large dumps
        const chunk = fullAiResponse.substring(0, index + 3);
        aiBubbleEl.innerHTML = formatMarkdown(chunk) + '<span class="typing-cursor" style="color:var(--text-secondary); margin-left:4px;">●</span>';
        index += 3;
        scrollChatToBottom();
        setTimeout(typeChar, typingSpeed);
      } else {
        finalizeResponseUI();
      }
    }
    typeChar();
  }

  function finalizeResponseUI() {
    // Detect if there's an HTML code block
    const codeBlockRegex = /```html\n([\s\S]*?)```/;
    const codeMatch = fullAiResponse.match(codeBlockRegex);
    
    if (codeMatch && codeMatch[1]) {
      const rawCode = codeMatch[1];
      const modifiedResponse = fullAiResponse.replace(codeBlockRegex, `
<div style="margin: 16px 0; border: 1px solid var(--border-medium); border-radius: 8px; overflow: hidden;">
  <div style="background: rgba(255,255,255,0.05); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
    <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
      HTML / UI Component
    </div>
    <button class="action-btn" onclick="openPreview(this.nextElementSibling.textContent)" style="padding: 6px 12px; font-size: 12px; background: #fff; color: #000; border: none;">
      Open Preview
    </button>
  </div>
  <textarea style="display:none;">${escapeHtml(rawCode)}</textarea>
</div>
      `);
      aiBubbleEl.innerHTML = formatMarkdown(modifiedResponse);
    } else {
      aiBubbleEl.innerHTML = formatMarkdown(fullAiResponse);
    }

    currentMessages.push({ role: 'assistant', content: fullAiResponse });

    // Save to LocalStorage Threads
    saveThreadState(activeThreadId, currentMessages);

    // Enable Send Button
    if (sendBtn) sendBtn.disabled = false;
    scrollChatToBottom();
  }
}

// Append User Message UI Row
function appendUserMessageUI(text) {
  const feed = document.getElementById('chatFeed');
  
  const userRow = document.createElement('div');
  userRow.className = 'user-msg-row';

  const bubble = document.createElement('div');
  bubble.className = 'user-msg-bubble';
  bubble.innerHTML = escapeHtml(text).replace(/\n/g, '<br/>');

  const avatar = document.createElement('div');
  avatar.className = 'user-avatar-circle';
  const initial = typeof userName !== 'undefined' ? userName[0].toUpperCase() : 'U';
  avatar.textContent = initial;

  userRow.appendChild(bubble);
  userRow.appendChild(avatar);

  feed.appendChild(userRow);
  scrollChatToBottom();
}

// Append AI Message UI Row
function appendAiMessageUI(text) {
  const feed = document.getElementById('chatFeed');

  const aiRow = document.createElement('div');
  aiRow.className = 'ai-msg-row';

  const avatar = document.createElement('div');
  avatar.className = 'ai-avatar-circle';
  avatar.textContent = '🦋';

  const container = document.createElement('div');
  container.className = 'ai-response-container';

  const bubble = document.createElement('div');
  bubble.className = 'ai-msg-bubble';
  bubble.innerHTML = formatMarkdown(text);

  container.appendChild(bubble);
  aiRow.appendChild(avatar);
  aiRow.appendChild(container);

  feed.appendChild(aiRow);
  scrollChatToBottom();

  return bubble;
}

// Quick Prompt Trigger
function quickPrompt(text) {
  const inputEl = document.getElementById('chatInput');
  if (inputEl) {
    inputEl.value = text;
    submitMessage();
  }
}

// Start New Chat Thread
function startNewChat() {
  activeThreadId = null;
  currentMessages = [];

  const feed = document.getElementById('chatFeed');
  feed.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen" style="margin:auto; text-align:center; max-width:680px; padding-top:40px;">
      <div style="width:56px; height:56px; border-radius:16px; background:#ffffff; color:#000000; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; box-shadow:0 0 30px rgba(255,255,255,0.15);">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5C9.5 2.5 7.5 4.5 7.5 7v2H12l5.5-5.5a3.5 3.5 0 0 0-5.5-1z"/><path d="M12 2.5C14.5 2.5 16.5 4.5 16.5 7v2H12L6.5 3.5a3.5 3.5 0 0 1 5.5-1z"/><path d="M7.5 9A4.5 4.5 0 0 0 3 13.5c0 2.5 2 4.5 4.5 4.5H12V9H7.5z"/><path d="M16.5 9A4.5 4.5 0 0 1 21 13.5c0 2.5-2 4.5-4.5 4.5H12V9h4.5z"/><path d="M12 21.5v-3.5"/></svg>
      </div>
      <h1 id="welcomeHeading" style="font-size:28px; font-weight:700; color:#fff; margin-bottom:8px; letter-spacing:-0.5px;">How can I help you today?</h1>
      <p style="font-size:14px; color:var(--text-secondary); margin-bottom:40px;">I can write code, analyze markets, or search the web for you.</p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:left;">
        <div class="market-card" style="cursor:pointer; padding:16px;" onclick="quickPrompt('Write a clean, production-ready React component')">
          <div style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#fff; margin-bottom:4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            Write code
          </div>
          <div style="font-size:13px; color:var(--text-muted);">Generate clean and optimized functions</div>
        </div>

        <div class="market-card" style="cursor:pointer; padding:16px;" onclick="quickPrompt('Analyze the current crypto market trends')">
          <div style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#fff; margin-bottom:4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Analyze data
          </div>
          <div style="font-size:13px; color:var(--text-muted);">Get live market prices and analysis</div>
        </div>

        <div class="market-card" style="cursor:pointer; padding:16px;" onclick="quickPrompt('Help me brainstorm ideas for a new project')">
          <div style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#fff; margin-bottom:4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path></svg>
            Brainstorm
          </div>
          <div style="font-size:13px; color:var(--text-muted);">Generate creative ideas and structures</div>
        </div>

        <div class="market-card" style="cursor:pointer; padding:16px;" onclick="quickPrompt('Search the web for the latest technology news')">
          <div style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#fff; margin-bottom:4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search web
          </div>
          <div style="font-size:13px; color:var(--text-muted);">Get real-time answers from the internet</div>
        </div>
      </div>
    </div>
  `;

  switchTab('chat');
  renderThreadHistory();
}

// Save Thread State to LocalStorage
function saveThreadState(threadId, messages) {
  if (!threadId || messages.length === 0) return;

  const firstUserMsg = messages.find(m => m.role === 'user');
  const title = firstUserMsg ? firstUserMsg.content.slice(0, 24) + '...' : 'Telemetry Stream';

  const existingIdx = chatThreads.findIndex(t => t.id === threadId);

  if (existingIdx >= 0) {
    chatThreads[existingIdx].messages = messages;
    chatThreads[existingIdx].updatedAt = Date.now();
  } else {
    chatThreads.unshift({
      id: threadId,
      title: title,
      messages: messages,
      updatedAt: Date.now()
    });
  }

  if (chatThreads.length > 20) chatThreads.pop();

  localStorage.setItem('riya_chat_threads', JSON.stringify(chatThreads));
  renderThreadHistory();
}

// Render Thread History List in Sidebar
function renderThreadHistory() {
  const container = document.getElementById('threadHistoryList');
  if (!container) return;

  if (chatThreads.length === 0) {
    container.innerHTML = `<div style="padding:12px; font-size:12px; color:var(--text-muted);">No saved streams</div>`;
    return;
  }

  container.innerHTML = chatThreads.map(t => `
    <div class="history-item ${t.id === activeThreadId ? 'active' : ''}" style="justify-content:space-between; cursor:default;">
      <span class="history-title" style="flex:1; cursor:pointer;" onclick="loadThread('${t.id}')">💬 ${escapeHtml(t.title)}</span>
      <button class="delete-thread-btn" onclick="deleteThread('${t.id}')" title="Delete Stream" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:12px; padding:2px 4px; border-radius:4px;">✕</button>
    </div>
  `).join('');
}

// Delete Thread
function deleteThread(threadId) {
  if (!confirm("Are you sure you want to permanently delete this stream?")) return;
  chatThreads = chatThreads.filter(t => t.id !== threadId);
  localStorage.setItem('riya_chat_threads', JSON.stringify(chatThreads));
  if (activeThreadId === threadId) {
    startNewChat();
  } else {
    renderThreadHistory();
  }
}

// Load Saved Thread when Clicked
function loadThread(threadId) {
  const thread = chatThreads.find(t => t.id === threadId);
  if (!thread) return;

  activeThreadId = thread.id;
  currentMessages = thread.messages;

  const feed = document.getElementById('chatFeed');
  feed.innerHTML = '';

  currentMessages.forEach(m => {
    if (m.role === 'user') {
      appendUserMessageUI(m.content);
    } else {
      appendAiMessageUI(m.content);
    }
  });

  switchTab('chat');
  renderThreadHistory();
}

// Markdown Formatter (With Run Code button)
function formatMarkdown(text) {
  if (!text) return '';
  
  let html = escapeHtml(text);

  // Code Blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const l = (lang || 'code').toLowerCase();
    const canRun = (l === 'js' || l === 'javascript' || l === 'html' || l === 'code');
    const runBtn = canRun ? `<button class="run-code-btn" onclick="runCodeInCompiler(this)">▶ Run Code</button>` : '';

    return `
      <div class="code-block-container">
        <div class="code-header">
          <span>${l}</span>
          <div style="display:flex; gap:8px;">
            ${runBtn}
            <button class="copy-code-btn" onclick="copyCodeBlock(this)">Copy</button>
          </div>
        </div>
        <pre><code class="language-${l}">${code.trim()}</code></pre>
      </div>
    `;
  });

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">$1</code>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Newlines to Linebreaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}

// In-Browser Code Compiler Console (Outputs to both modal and HUD Live Terminal)
function runCodeInCompiler(btn) {
  const code = btn.parentElement.parentElement.nextElementSibling.textContent;
  const modal = document.getElementById('compilerModal');
  const outputEl = document.getElementById('compilerOutput');

  if (modal && outputEl) modal.classList.remove('hidden');

  // Removed terminal log call

  let logs = [];
  const customConsole = {
    log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ')),
    error: (...args) => logs.push('❌ Error: ' + args.join(' ')),
    warn: (...args) => logs.push('⚠️ Warning: ' + args.join(' '))
  };

  try {
    const runFn = new Function('console', code);
    const result = runFn(customConsole);

    let output = logs.join('\n');
    if (result !== undefined) {
      output += '\n\n➜ Returned: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
    }
    if (!output.trim()) {
      output = '✓ Code executed successfully.';
    }

    if (outputEl) outputEl.textContent = '⚡ Execution Output:\n\n' + output;
  } catch (err) {
    if (outputEl) outputEl.textContent = '❌ Execution Error:\n\n' + err.stack;
  }
}

/* ── SETTINGS & DATA CONTROLS ── */

function toggleSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    if (modal.classList.contains('hidden')) {
      modal.classList.remove('hidden');
      const nameEl = document.getElementById('settingsModalName');
      if (nameEl) nameEl.textContent = typeof userName !== 'undefined' ? userName : 'Operator';
    } else {
      modal.classList.add('hidden');
    }
  }
}

function clearAllChats() {
  if (confirm("Are you sure you want to delete ALL chats? This cannot be undone.")) {
    chatThreads = [];
    localStorage.removeItem('riya_chat_threads');
    renderThreadHistory();
    startNewChat();
    toggleSettingsModal();
  }
}

/* ── PREVIEW & ARTIFACTS LOGIC ── */

let currentPreviewCode = "";

window.openPreview = function(codeContent) {
  currentPreviewCode = codeContent;
  const previewCol = document.getElementById('previewColumn');
  const chatCol = document.getElementById('chatColumn');
  
  if (previewCol && chatCol) {
    previewCol.classList.remove('hidden');
  }
  
  switchPreviewTab('preview');
};

window.closePreview = function() {
  const previewCol = document.getElementById('previewColumn');
  if (previewCol) {
    previewCol.classList.add('hidden');
  }
  const iframe = document.getElementById('codeIframe');
  if (iframe) iframe.srcdoc = "";
};

window.switchPreviewTab = function(tab) {
  const iframe = document.getElementById('codeIframe');
  const rawView = document.getElementById('rawCodeView');
  const tabCode = document.getElementById('tabCode');
  const tabPreview = document.getElementById('tabPreview');

  if (tab === 'preview') {
    iframe.classList.remove('hidden');
    rawView.classList.add('hidden');
    tabPreview.style.color = "#fff";
    tabCode.style.color = "var(--text-secondary)";
    
    // Inject code into iframe
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; }
        </style>
      </head>
      <body>
        ${currentPreviewCode}
      </body>
      </html>
    `;
    iframe.srcdoc = htmlTemplate;
  } else {
    iframe.classList.add('hidden');
    rawView.classList.remove('hidden');
    tabCode.style.color = "#fff";
    tabPreview.style.color = "var(--text-secondary)";
    
    rawView.textContent = currentPreviewCode;
  }
};

function closeCompilerModal() {
  const modal = document.getElementById('compilerModal');
  if (modal) modal.classList.add('hidden');
}

function clearCurrentChat() {
  if (confirm("Purge current telemetry stream?")) {
    startNewChat();
  }
}

function exportChatThread() {
  if (currentMessages.length === 0) return alert("No telemetry logs to export.");
  
  const text = currentMessages.map(m => `[${m.role.toUpperCase()}]:\n${m.content}\n`).join('\n---\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Riya_Telemetry_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function scrollChatToBottom() {
  const feed = document.getElementById('chatFeed');
  if (feed) feed.scrollTop = feed.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function copyCodeBlock(btn) {
  const code = btn.parentElement.parentElement.nextElementSibling.textContent;
  navigator.clipboard.writeText(code);
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}
