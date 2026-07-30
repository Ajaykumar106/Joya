const BACKEND_URL = "https://riya-backend-ujz7.onrender.com";

let messages = [];

const orb = document.getElementById('orb');
const statusText = document.getElementById('status-text');
const chatFeed = document.getElementById('chat-feed');
const inputEl = document.getElementById('chat-input');
const micBtn = document.getElementById('mic-btn');

let recognition;
let isListening = false;
let currentAudio = null;

// Initialize Speech Recognition
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech recognition not supported in this browser.");
    micBtn.style.display = 'none';
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    setOrbState('listening');
    statusText.innerText = "LISTENING";
    micBtn.classList.add('active');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    inputEl.value = transcript;
    sendVoiceMessage(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech error", event.error);
    setOrbState('idle');
    statusText.innerText = "ONLINE";
    isListening = false;
    micBtn.classList.remove('active');
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove('active');
  };
}

// Manage Orb States
function setOrbState(state) {
  orb.className = `orb state-${state}`;
}

// Interactions
micBtn.addEventListener('click', () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  if (!isListening && recognition) {
    recognition.start();
  } else if (isListening && recognition) {
    recognition.stop();
  }
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
});

inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = (inputEl.scrollHeight) + 'px';
});

// TEXT CHAT (Streaming + Typewriter Queue)
async function sendTextMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';

  appendMessage('user', text);
  messages.push({ role: 'user', content: text });

  const aiMsgEl = appendMessage('riya', '');
  let fullAiResponse = '';
  setOrbState('thinking');
  statusText.innerText = "THINKING";

  // Typing Queue System for fast APIs (like Groq)
  let typeQueue = "";
  let currentRenderedText = "";
  let isTyping = false;

  function processTypeQueue() {
    if (typeQueue.length > 0) {
      isTyping = true;
      let chunkSize = Math.max(1, Math.floor(typeQueue.length / 15)); 
      chunkSize = Math.min(chunkSize, 4);
      
      currentRenderedText += typeQueue.substring(0, chunkSize);
      typeQueue = typeQueue.substring(chunkSize);
      
      aiMsgEl.innerHTML = formatMarkdown(currentRenderedText) + '<span class="typing-cursor"></span>';
      scrollToBottom();
      
      setTimeout(processTypeQueue, 25);
    } else {
      isTyping = false;
    }
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, userName: 'Sir', stream: true })
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
                typeQueue += parsed.token;
                if (!isTyping) {
                  processTypeQueue();
                }
              }
            } catch (e) {}
          }
        }
      }
    } else {
      const json = await response.json();
      fullAiResponse = json.reply || "No response received.";
      typeQueue += fullAiResponse;
      if (!isTyping) processTypeQueue();
    }
  } catch (error) {
    fullAiResponse = "Connection established, but the neural link is warming up. Try again in a moment.";
    typeQueue += fullAiResponse;
    if (!isTyping) processTypeQueue();
  }

  const checkTypingInterval = setInterval(() => {
    if (!isTyping && typeQueue.length === 0) {
      clearInterval(checkTypingInterval);
      aiMsgEl.innerHTML = formatMarkdown(fullAiResponse);
      messages.push({ role: 'assistant', content: fullAiResponse });
      scrollToBottom();
      setOrbState('idle');
      statusText.innerText = "ONLINE";
    }
  }, 100);
}

// VOICE CHAT (Non-streaming + TTS)
async function sendVoiceMessage(text) {
  if (!text) return;
  inputEl.value = '';

  appendMessage('user', text);
  messages.push({ role: 'user', content: text });

  const aiMsgEl = appendMessage('riya', '');
  let replyText = '';
  setOrbState('thinking');
  statusText.innerText = "PROCESSING";
  aiMsgEl.innerHTML = '<span class="typing-cursor"></span>';

  try {
    const chatRes = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, userName: 'Sir', stream: false })
    });
    const chatData = await chatRes.json();
    replyText = chatData.reply || "Connection issue with Groq/Gemini. Check API keys.";
    
    messages.push({ role: 'assistant', content: replyText });
    aiMsgEl.innerHTML = formatMarkdown(replyText);
    scrollToBottom();

    // Text to Speech
    statusText.innerText = "SYNTHESIZING";
    const speakRes = await fetch(`${BACKEND_URL}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: replyText })
    });

    if (!speakRes.ok) throw new Error("TTS failed");

    const audioBlob = await speakRes.blob();
    currentAudio = new Audio(URL.createObjectURL(audioBlob));
    
    currentAudio.onplay = () => {
      setOrbState('speaking');
      statusText.innerText = "SPEAKING";
    };
    
    currentAudio.onended = () => {
      setOrbState('idle');
      statusText.innerText = "ONLINE";
    };

    currentAudio.play();
  } catch (error) {
    console.error(error);
    if (!replyText) {
      replyText = "Connection issue. Backend warming up.";
      aiMsgEl.innerHTML = formatMarkdown(replyText);
    }
    setOrbState('idle');
    statusText.innerText = "ONLINE";
  }
}

// Utils
function appendMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message msg-${role}`;
  if (role === 'riya' && text === '') {
    msgDiv.innerHTML = '<span class="typing-cursor"></span>';
  } else {
    msgDiv.innerHTML = formatMarkdown(text);
  }
  chatFeed.appendChild(msgDiv);
  scrollToBottom();
  return msgDiv;
}

function scrollToBottom() {
  chatFeed.scrollTop = chatFeed.scrollHeight;
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

// Init
document.addEventListener('DOMContentLoaded', initSpeechRecognition);
