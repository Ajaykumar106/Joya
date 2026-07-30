const BACKEND_URL = "https://riya-backend-ujz7.onrender.com";

let messages = [];

const orb = document.getElementById('orb');
const statusText = document.getElementById('status-text');
const subtitle = document.getElementById('subtitle');

let recognition;
let isListening = false;
let currentAudio = null;

// Initialize Speech Recognition
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    statusText.innerText = "BROWSER NOT SUPPORTED";
    subtitle.innerText = "Please use Chrome or Edge for voice capabilities.";
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    setOrbState('listening');
    statusText.innerText = "LISTENING...";
    subtitle.innerText = "";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    subtitle.innerText = `"${transcript}"`;
    processVoiceInput(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech error", event.error);
    setOrbState('idle');
    statusText.innerText = "TAP TO WAKE";
    isListening = false;
  };

  recognition.onend = () => {
    isListening = false;
  };
}

// Manage Orb States
function setOrbState(state) {
  orb.className = `orb state-${state}`;
}

// Interaction
orb.addEventListener('click', () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  if (!isListening && recognition) {
    recognition.start();
  }
});

// Process Input and Speak
async function processVoiceInput(text) {
  setOrbState('thinking');
  statusText.innerText = "PROCESSING";
  
  messages.push({ role: 'user', content: text });

  try {
    // 1. Get AI Response (Non-streaming to get full text for TTS)
    const chatRes = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        userName: 'Sir',
        stream: false 
      })
    });
    const chatData = await chatRes.json();
    const replyText = chatData.reply || "I'm sorry, I encountered an error.";
    
    messages.push({ role: 'assistant', content: replyText });
    subtitle.innerText = replyText;

    // 2. Convert to Voice via ElevenLabs endpoint
    statusText.innerText = "SYNTHESIZING";
    
    const speakRes = await fetch(`${BACKEND_URL}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: replyText
      })
    });

    if (!speakRes.ok) throw new Error("TTS failed");

    const audioBlob = await speakRes.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    currentAudio = new Audio(audioUrl);
    
    currentAudio.onplay = () => {
      setOrbState('speaking');
      statusText.innerText = "SPEAKING";
    };
    
    currentAudio.onended = () => {
      setOrbState('idle');
      statusText.innerText = "TAP TO WAKE";
    };

    currentAudio.play();
    
  } catch (error) {
    console.error(error);
    setOrbState('idle');
    statusText.innerText = "CONNECTION FAILED";
  }
}

// Init
document.addEventListener('DOMContentLoaded', initSpeechRecognition);
