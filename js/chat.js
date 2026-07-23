// ── CHAT LOGIC ──
let messages = [];
let deepOn = false;

document.addEventListener('authReady', () => {
  // Check if there is a query param e.g., ?q=Gold
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    document.getElementById("msgInput").value = `Give me analysis and outlook for ${q}. Should I buy, sell or hold?`;
    sendMsg();
  }
});

async function sendMsg() {
  const input = document.getElementById("msgInput");
  const msg = input.value.trim();
  if (!msg) return;

  input.value = "";
  input.style.height = "auto";
  document.getElementById("sugRow").style.display = "none";

  addMessage(msg, "user");

  let wctx = "";
  if (deepOn) {
    try {
      const sr = await fetch(`${BACKEND}/api/search`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ query: msg })
      });
      const sd = await sr.json();
      if (sd.results?.length) {
        wctx = "\n\n[LIVE WEB DATA]\n" + sd.results.map(r => `${r.title}: ${r.content?.slice(0,200)}`).join("\n");
      }
    } catch(e) {}
  }

  const hist = messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
  showThinking(true);
  document.getElementById("chatStatus").textContent = "Thinking...";

  try {
    const res = await fetch(`${BACKEND}/api/chat`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        messages: hist,
        userName: userName,
        plan: userPlan,
        stream: true,
        wctx: wctx,
        city: "India"
      })
    });

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/event-stream")) {
      showThinking(false);
      const aiMsgEl = addMessage("", "ai");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.token) {
                messages[messages.length-1].text += d.token;
                aiMsgEl.textContent = messages[messages.length-1].text;
                scrollChat();
              }
            } catch(e) {}
          }
        }
      }
    } else {
      const data = await res.json();
      showThinking(false);
      addMessage(data.reply || "Try again.", "ai");
    }
  } catch(e) {
    showThinking(false);
    addMessage("Connection issue. Check your internet and try again.", "ai");
  }

  document.getElementById("chatStatus").textContent = "Online · Ready";
}

function addMessage(text, role) {
  messages.push({ role, text });

  const welcome = document.getElementById("welcomeScreen");
  if (welcome) welcome.style.display = "none";

  const area = document.getElementById("msgArea");
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  if (role === "ai") {
    div.innerHTML = `<div class="msg-av">✦</div><div class="msg-bub"></div>`;
  } else {
    // secure way to render avatar
    const initials = (userName || "U")[0].toUpperCase();
    const avatarHTML = userPhotoURL ? `<img src="${userPhotoURL}" alt="avatar"/>` : initials;
    div.innerHTML = `<div class="msg-av" style="background:var(--s3)">${avatarHTML}</div><div class="msg-bub"></div>`;
  }

  const bub = div.querySelector(".msg-bub");
  bub.textContent = text;
  area.appendChild(div);
  scrollChat();
  return bub;
}

function showThinking(show) {
  document.getElementById("thinking").style.display = show ? "block" : "none";
  document.getElementById("sendBtn").disabled = show;
  scrollChat();
}

function scrollChat() {
  const area = document.getElementById("msgArea");
  area.scrollTop = area.scrollHeight;
}

function clearChat() {
  messages = [];
  const area = document.getElementById("msgArea");
  area.innerHTML = `
    <div class="welcome" id="welcomeScreen">
      <div class="w-orb">✦</div>
      <div>
        <div class="w-hi">Hello ${userName}! 👋</div>
        <div class="w-title">How can I help you today?</div>
        <div class="w-sub">I'm Riya. Your AI companion. Ask me anything or explore the world with me.</div>
      </div>
    </div>
  `;
  document.getElementById("sugRow").style.display = "flex";
}

function quickSug(el) {
  const t = el.textContent.replace(/^[^\s]+\s/, "").trim();
  document.getElementById("msgInput").value = t;
  sendMsg();
}

function toggleDeep() {
  deepOn = !deepOn;
  document.getElementById("deepTrack").classList.toggle("on", deepOn);
  const lbl = document.getElementById("deepLabel");
  lbl.textContent = deepOn ? "Deep Research (ON)" : "Deep Research";
  lbl.style.color = deepOn ? "var(--acc)" : "var(--t3)";
}

// Input listeners
document.getElementById("msgInput").addEventListener("input", function() {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 80) + "px";
});
document.getElementById("msgInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) { 
    e.preventDefault(); 
    sendMsg(); 
  }
});
