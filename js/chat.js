// ── RIYA.AI ENGINE & CHAT CONTROLLER ──
const BACKEND_URL = "https://riya-backend-ujz7.onrender.com";

// State Management
let currentMessages = [];
let chatThreads = JSON.parse(localStorage.getItem('riya_chat_threads') || '[]');
let activeThreadId = null;
let activeAgentPrompt = null;

let stateFeatures = {
  webSearch: true,
  deepThink: false,
  codeInterpreter: false
};

// Initialize Chat Controller on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderThreadHistory();
});

document.addEventListener('authReady', () => {
  const name = typeof userName !== 'undefined' ? userName : 'Developer';
  const heading = document.getElementById('welcomeHeading');
  if (heading) {
    heading.textContent = `What would you like to explore, ${name}?`;
  }
});

// Feature Toggles
function toggleFeature(featureKey) {
  stateFeatures[featureKey] = !stateFeatures[featureKey];
  
  const pill = document.getElementById(`${featureKey}Toggle`);
  const toolBtn = document.getElementById(`toolbar${featureKey.charAt(0).toUpperCase() + featureKey.slice(1)}`);
  
  [pill, toolBtn].forEach(el => {
    if (el) {
      if (stateFeatures[featureKey]) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });
}

// Handle Enter to Send Message
function handleInputKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitMessage();
  }
}

// Submit Message
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

  // Make sure we are on Chat Tab
  switchTab('chat');

  // Create new thread if none active
  if (!activeThreadId) {
    activeThreadId = 'thread_' + Date.now();
  }

  // Add User Message
  appendMessageUI(text, 'user');
  currentMessages.push({ role: 'user', content: text });

  // Disable Send Button
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  // Create AI Stream Container
  const aiBubbleEl = appendMessageUI('', 'assistant');
  
  if (stateFeatures.webSearch) {
    aiBubbleEl.innerHTML = '<span style="color:var(--accent-blue); font-size:12px;">🌐 Searching live web & fetching context...</span><br/><span class="typing-cursor"></span>';
  } else {
    aiBubbleEl.innerHTML = '<span class="typing-cursor"></span>';
  }

  let fullAiResponse = '';

  try {
    const historyPayload = currentMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    if (activeAgentPrompt) {
      historyPayload.unshift({ role: 'system', content: activeAgentPrompt });
    }

    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: historyPayload,
        userName: typeof userName !== 'undefined' ? userName : 'Developer',
        plan: typeof userPlan !== 'undefined' ? userPlan : 'free',
        stream: true,
        webSearch: stateFeatures.webSearch,
        deepThink: stateFeatures.deepThink
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
                aiBubbleEl.innerHTML = formatMarkdown(fullAiResponse) + '<span class="typing-cursor"></span>';
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

  // Save to Threads
  saveThreadState(activeThreadId, currentMessages);

  // Enable Send Button
  if (sendBtn) sendBtn.disabled = false;
  scrollChatToBottom();
}

// Append Message UI Element
function appendMessageUI(text, role) {
  const feed = document.getElementById('chatFeed');
  
  const msgRow = document.createElement('div');
  msgRow.className = `chat-message-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar-box';

  if (role === 'assistant') {
    avatar.textContent = '🪐';
  } else {
    const initial = typeof userName !== 'undefined' ? userName[0].toUpperCase() : 'U';
    avatar.textContent = initial;
  }

  const contentBox = document.createElement('div');
  contentBox.className = 'msg-content-box';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble-content';
  bubble.innerHTML = formatMarkdown(text);

  contentBox.appendChild(bubble);

  if (role === 'assistant' && text) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML = `
      <span class="msg-action-icon" onclick="copyText(this, \`${escapeJsString(text)}\`)">📋 Copy Text</span>
    `;
    contentBox.appendChild(actions);
  }

  msgRow.appendChild(avatar);
  msgRow.appendChild(contentBox);

  feed.appendChild(msgRow);
  scrollChatToBottom();

  return bubble;
}

// Quick Prompt Handler
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
  activeAgentPrompt = null;

  const feed = document.getElementById('chatFeed');
  feed.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-logo-badge">★</div>
      <h1 class="welcome-heading">What would you like to explore?</h1>
      <p class="welcome-subtext">Riya AI is ready for code execution, live web search, financial analysis, or deep scientific research.</p>

      <div class="starter-prompts-grid">
        <div class="starter-card" onclick="quickPrompt('Write a JavaScript function to filter an array of objects and run it in the compiler')">
          <div class="starter-card-title">💻 Code & Compile</div>
          <div class="starter-card-desc">Write & test interactive code directly in browser</div>
        </div>

        <div class="starter-card" onclick="quickPrompt('Analyze current live Bitcoin & Ethereum market trend and support levels')">
          <div class="starter-card-title">📊 Market Intelligence</div>
          <div class="starter-card-desc">Analyze live crypto prices & macro indicators</div>
        </div>

        <div class="starter-card" onclick="quickPrompt('Summarize the recent room-temperature superconductor claims in physics 2026')">
          <div class="starter-card-title">🔬 Scientific Research</div>
          <div class="starter-card-desc">Summarize latest physics & space breakthroughs</div>
        </div>

        <div class="starter-card" onclick="quickPrompt('Perform a live web search for today\\'s top breaking AI news')">
          <div class="starter-card-title">🌐 Live Web Search</div>
          <div class="starter-card-desc">Search real-time news and internet data</div>
        </div>
      </div>
    </div>
  `;

  switchTab('chat');
}

// Clear Current Chat
function clearCurrentChat() {
  if (confirm("Clear current conversation?")) {
    startNewChat();
  }
}

// Export Chat Thread
function exportChatThread() {
  if (currentMessages.length === 0) return alert("No chat messages to export.");
  
  const text = currentMessages.map(m => `[${m.role.toUpperCase()}]:\n${m.content}\n`).join('\n---\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Riya_Chat_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Activate Agent
function activateAgent(agentName, systemPrompt) {
  startNewChat();
  activeAgentPrompt = systemPrompt;
  quickPrompt(`Hello! Act as the ${agentName}. Let's get started.`);
}

// Save Thread State to LocalStorage
function saveThreadState(threadId, messages) {
  if (!threadId || messages.length === 0) return;

  const title = messages[0].content.slice(0, 30) + '...';
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
    container.innerHTML = `<div style="padding:12px; font-size:12px; color:var(--text-muted);">No saved conversations</div>`;
    return;
  }

  container.innerHTML = chatThreads.map(t => `
    <div class="history-item ${t.id === activeThreadId ? 'active' : ''}" onclick="loadThread('${t.id}')">
      <span class="history-title">💬 ${escapeHtml(t.title)}</span>
    </div>
  `).join('');
}

// Load Saved Thread
function loadThread(threadId) {
  const thread = chatThreads.find(t => t.id === threadId);
  if (!thread) return;

  activeThreadId = thread.id;
  currentMessages = thread.messages;

  const feed = document.getElementById('chatFeed');
  feed.innerHTML = '';

  currentMessages.forEach(m => {
    appendMessageUI(m.content, m.role);
  });

  switchTab('chat');
  renderThreadHistory();
}

// Markdown Formatter (With Run Code button)
function formatMarkdown(text) {
  if (!text) return '';
  
  let html = escapeHtml(text);

  // Fenced Code Blocks with Run & Copy buttons
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const l = (lang || 'code').toLowerCase();
    const canRun = (l === 'js' || l === 'javascript' || l === 'html' || l === 'code' || l === 'py' || l === 'python');
    
    const runBtn = canRun ? `<button class="run-code-btn" onclick="runCodeInCompiler(this)">▶ Run Code</button>` : '';

    return `
      <div class="code-block-container">
        <div class="code-header">
          <span>${l}</span>
          <div class="code-header-right">
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

// Interactive Code Execution in Console
function runCodeInCompiler(btn) {
  const code = btn.parentElement.parentElement.nextElementSibling.textContent;
  const modal = document.getElementById('compilerModal');
  const outputEl = document.getElementById('compilerOutput');

  if (!modal || !outputEl) return;

  modal.classList.remove('hidden');
  outputEl.textContent = '⚡ Executing code in browser sandbox...\n\n';

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
      output = '✓ Code executed successfully with no console output.';
    }

    outputEl.textContent = '⚡ Execution Output:\n\n' + output;
  } catch (err) {
    outputEl.textContent = '❌ Runtime Execution Error:\n\n' + err.stack;
  }
}

function closeCompilerModal() {
  const modal = document.getElementById('compilerModal');
  if (modal) modal.classList.add('hidden');
}

function toggleApiInfoModal() {
  const modal = document.getElementById('apiInfoModal');
  if (modal) modal.classList.toggle('hidden');
}

function scrollChatToBottom() {
  const feed = document.getElementById('chatFeed');
  if (feed) feed.scrollTop = feed.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeJsString(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function copyCodeBlock(btn) {
  const code = btn.parentElement.parentElement.nextElementSibling.textContent;
  navigator.clipboard.writeText(code);
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}

function copyText(el, text) {
  navigator.clipboard.writeText(text);
  el.textContent = '✓ Copied';
  setTimeout(() => el.textContent = '📋 Copy Text', 2000);
}
