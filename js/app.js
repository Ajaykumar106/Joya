// ── APP LOGIC (Navigation & Dashboard Data) ──
const BACKEND = "https://riya-backend-ujz7.onrender.com";

document.addEventListener('authReady', () => {
  if (typeof userName !== 'undefined') {
    const el = document.getElementById('userNameDisplay');
    if (el) el.textContent = userName;
    
    const av = document.getElementById('userAvatar');
    if (av) {
      if (typeof userPhotoURL !== 'undefined' && userPhotoURL) {
        av.innerHTML = `<img src="${userPhotoURL}" alt="User"/>`;
      } else {
        av.textContent = userName[0].toUpperCase();
      }
    }

    const cw = document.getElementById('chatWelcomeTitle');
    if (cw) cw.textContent = `Hello ${userName}!`;
  }
  
  // Start fetching market data
  loadMarketData();
});

// SPA Navigation
function switchView(viewName, element) {
  // Update Sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  }

  // Hide all sections
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

  // Show target section
  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.remove('hidden');
  } else {
    document.getElementById('view-placeholder').classList.remove('hidden');
  }
}

// Redirect quick searches to Chat view
function quickSearch(query) {
  const chatInput = document.getElementById('msgInput');
  if (chatInput) {
    chatInput.value = query;
    // Switch to chat view
    const chatNavBtn = document.querySelector('.nav-item:nth-child(2)');
    switchView('chat', chatNavBtn);
    // Send message automatically if sendMsg function exists
    if (typeof sendMsg === 'function') {
      sendMsg();
    }
  }
}

// Fetch Market Data
async function loadMarketData() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true");
    const d = await r.json();
    
    if (d.bitcoin) {
      document.getElementById("btcVal").textContent = "$" + d.bitcoin.usd.toLocaleString();
      const c = d.bitcoin.usd_24h_change;
      const pct = document.getElementById("btcPct");
      pct.textContent = (c >= 0 ? "▲ +" : "▼ ") + Math.abs(c).toFixed(2) + "%";
      pct.className = c >= 0 ? "change-up" : "change-dn";
    }
    
    if (d.ethereum) {
      document.getElementById("ethVal").textContent = "$" + d.ethereum.usd.toLocaleString();
      const c = d.ethereum.usd_24h_change;
      const pct = document.getElementById("ethPct");
      pct.textContent = (c >= 0 ? "▲ +" : "▼ ") + Math.abs(c).toFixed(2) + "%";
      pct.className = c >= 0 ? "change-up" : "change-dn";
    }
  } catch(e) {
    console.error("Market data fetch error", e);
  }

  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const d = await r.json();
    if (d.rates?.INR) {
      document.getElementById("inrVal").textContent = "₹" + d.rates.INR.toFixed(2);
    }
  } catch(e) {}
  
  // Refresh every 60s
  setTimeout(loadMarketData, 60000);
}
