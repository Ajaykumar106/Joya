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
    heading.textContent = `Sci-Fi Command Center Ready, ${name}`;
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

// Log message to Live HUD Terminal Drawer
function logToHudTerminal(msg) {
  const term = document.getElementById('terminalLogContent');
  if (term) {
    const time = new Date().toLocaleTimeString();
    term.innerHTML += `<br/>[${time}] ${escapeHtml(msg)}`;
    term.scrollTop = term.scrollHeight;
  }
}

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
  logToHudTerminal(`USER COMMAND: "${text}"`);

  // Disable Send Button
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  // 2. Append AI Response Bubble
  const aiBubbleEl = appendAiMessageUI('');
  aiBubbleEl.innerHTML = '<span style="color:var(--accent-purple); font-size:13px; font-weight:600;">🦋 Streaming AI telemetry...</span><span class="typing-cursor">●</span>';

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
                aiBubbleEl.innerHTML = formatMarkdown(fullAiResponse) + '<span class="typing-cursor" style="color:var(--accent-purple); margin-left:4px;">●</span>';
                scrollChatToBottom();
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
    console.error("Chat Error:", error);
    fullAiResponse = "⚠️ Connection issue. Render backend warming up or offline. Please retry in a moment.";
  }

  // Finalize Response Output
  aiBubbleEl.innerHTML = formatMarkdown(fullAiResponse);
  currentMessages.push({ role: 'assistant', content: fullAiResponse });

  logToHudTerminal(`AI STREAM COMPLETED (${fullAiResponse.length} chars)`);

  // Save to LocalStorage Threads
  saveThreadState(activeThreadId, currentMessages);

  // Enable Send Button
  if (sendBtn) sendBtn.disabled = false;
  scrollChatToBottom();
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
    <div class="welcome-screen" id="welcomeScreen" style="margin:auto; text-align:center; max-width:680px;">
      <div style="width:68px; height:68px; border-radius:20px; background:#fff; color:#000; display:flex; align-items:center; justify-content:center; font-size:38px; margin:0 auto 24px; font-weight:800; box-shadow:0 0 30px rgba(255,255,255,0.4);">🦋</div>
      <h1 style="font-size:32px; font-weight:800; color:#fff; margin-bottom:10px; letter-spacing:-0.5px;">Sci-Fi Command Center Ready</h1>
      <p style="font-size:14px; color:var(--text-secondary); margin-bottom:36px;">Execute live code matrix, internet telemetry search, or market analysis.</p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; text-align:left;">
        <div class="market-card" style="cursor:pointer;" onclick="quickPrompt('Write a JavaScript function to filter an array of objects and run it in the compiler')">
          <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:4px;">💻 Code Matrix</div>
          <div style="font-size:12px; color:var(--text-secondary);">Execute live JavaScript & Python in terminal drawer</div>
        </div>

        <div class="market-card" style="cursor:pointer;" onclick="quickPrompt('Analyze current live Bitcoin & Ethereum market trend and support levels')">
          <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:4px;">📊 Market Telemetry</div>
          <div style="font-size:12px; color:var(--text-secondary);">Fetch live CoinGecko crypto tickers & forex data</div>
        </div>

        <div class="market-card" style="cursor:pointer;" onclick="quickPrompt('Summarize the recent room-temperature superconductor claims in physics 2026')">
          <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:4px;">🔬 Science Discoveries</div>
          <div style="font-size:12px; color:var(--text-secondary);">Explore exoplanets, NASA JWST, and quantum physics</div>
        </div>

        <div class="market-card" style="cursor:pointer;" onclick="quickPrompt('Perform a live web search for today\\'s top breaking AI news')">
          <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:4px;">🌐 Web Intelligence</div>
          <div style="font-size:12px; color:var(--text-secondary);">Stream real-time web search results</div>
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

  logToHudTerminal('EXECUTING CODE MATRIX...');

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
    logToHudTerminal(`EXECUTION RESULT: ${output.slice(0, 100)}...`);
  } catch (err) {
    if (outputEl) outputEl.textContent = '❌ Execution Error:\n\n' + err.stack;
    logToHudTerminal(`EXECUTION ERROR: ${err.message}`);
  }
}

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
