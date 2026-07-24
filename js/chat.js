// ── CHAT LOGIC ──
let messages = [];

function handleEnter(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
}

async function sendMsg() {
  const input = document.getElementById("msgInput");
  const msg = input.value.trim();
  if (!msg) return;

  input.value = "";
  
  addMessage(msg, "user");

  const hist = messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
  
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  sendBtn.style.opacity = "0.5";

  try {
    const res = await fetch(`https://riya-backend-ujz7.onrender.com/api/chat`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        messages: hist,
        userName: typeof userName !== 'undefined' ? userName : "there",
        plan: typeof userPlan !== 'undefined' ? userPlan : "free",
        stream: true,
        wctx: "",
        city: "India"
      })
    });

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/event-stream")) {
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
      addMessage(data.reply || "Try again.", "ai");
    }
  } catch(e) {
    addMessage("Connection issue. Check your internet and try again.", "ai");
  }

  sendBtn.disabled = false;
  sendBtn.style.opacity = "1";
}

function addMessage(text, role) {
  messages.push({ role, text });

  // Hide welcome text inside chat
  const welcome = document.querySelector("#msgArea > div[style*='text-align: center']");
  if (welcome) welcome.style.display = "none";

  const area = document.getElementById("msgArea");
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  if (role === "ai") {
    div.innerHTML = `<div class="msg-av">✦</div><div class="msg-bub"></div>`;
  } else {
    const initial = typeof userName !== 'undefined' ? (userName || "U")[0].toUpperCase() : "U";
    const avatarHTML = (typeof userPhotoURL !== 'undefined' && userPhotoURL) 
      ? `<img src="${userPhotoURL}" alt="User"/>` 
      : initial;
    div.innerHTML = `<div class="msg-av" style="background:var(--bg-panel);border:1px solid var(--border-color);">${avatarHTML}</div><div class="msg-bub"></div>`;
  }

  const bub = div.querySelector(".msg-bub");
  bub.textContent = text;
  area.appendChild(div);
  scrollChat();
  return bub;
}

function scrollChat() {
  const area = document.getElementById("msgArea");
  area.scrollTop = area.scrollHeight;
}
