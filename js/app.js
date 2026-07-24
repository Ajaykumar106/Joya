// ── APP LOGIC ──
const BACKEND = "https://riya-backend-ujz7.onrender.com";

document.addEventListener('authReady', () => {
  // User info
  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = userName || 'User';

  const av = document.getElementById('sidebarAvatar');
  if (av) {
    if (userPhotoURL) {
      av.innerHTML = `<img src="${userPhotoURL}" alt="U"/>`;
    } else {
      av.textContent = (userName || 'U')[0].toUpperCase();
    }
  }

  // Greeting
  const hour = new Date().getHours();
  let greet = 'Good Evening';
  if (hour < 12) greet = 'Good Morning';
  else if (hour < 17) greet = 'Good Afternoon';

  const greetEl = document.getElementById('greetingText');
  if (greetEl) greetEl.textContent = `${greet}, ${userName}!`;

  const cwTitle = document.getElementById('chatWelcomeTitle');
  if (cwTitle) cwTitle.textContent = `Hello ${userName}!`;

  // Markets
  loadMarketData();
});

// SPA Nav
function switchView(name, el) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));

  const titles = { home: 'Dashboard', chat: 'Ask Riya', markets: 'Markets', science: 'Science & Tech', agents: 'AI Agents' };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[name] || name;

  const target = document.getElementById(`view-${name}`);
  if (target) {
    target.classList.remove('hidden');
  } else {
    document.getElementById('view-placeholder').classList.remove('hidden');
  }
}

function quickSearch(query) {
  const chatBtn = document.querySelectorAll('.sb-item')[1];
  switchView('chat', chatBtn);
  const input = document.getElementById('msgInput');
  if (input) {
    input.value = query;
    if (typeof sendMsg === 'function') sendMsg();
  }
}

// Market data
async function loadMarketData() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true");
    const d = await r.json();
    if (d.bitcoin) {
      document.getElementById("btcVal").textContent = "$" + d.bitcoin.usd.toLocaleString();
      const c = d.bitcoin.usd_24h_change;
      const el = document.getElementById("btcPct");
      el.textContent = (c >= 0 ? "▲ +" : "▼ ") + Math.abs(c).toFixed(2) + "%";
      el.className = "mkt-change " + (c >= 0 ? "up" : "dn");
    }
    if (d.ethereum) {
      document.getElementById("ethVal").textContent = "$" + d.ethereum.usd.toLocaleString();
      const c = d.ethereum.usd_24h_change;
      const el = document.getElementById("ethPct");
      el.textContent = (c >= 0 ? "▲ +" : "▼ ") + Math.abs(c).toFixed(2) + "%";
      el.className = "mkt-change " + (c >= 0 ? "up" : "dn");
    }
  } catch(e) { console.error("Market error", e); }

  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const d = await r.json();
    if (d.rates?.INR) document.getElementById("inrVal").textContent = "₹" + d.rates.INR.toFixed(2);
  } catch(e) {}

  setTimeout(loadMarketData, 60000);
}
