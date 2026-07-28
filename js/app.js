// ── APP WORKSPACE NAVIGATION & DATA CONTROLLER ──

document.addEventListener('authReady', () => {
  const name = typeof userName !== 'undefined' ? userName : 'Developer';
  const plan = typeof userPlan !== 'undefined' ? userPlan : 'free';

  const nameEl = document.getElementById('sidebarUserName');
  const planEl = document.getElementById('sidebarUserPlan');
  const avEl = document.getElementById('sidebarUserAvatar');

  if (nameEl) nameEl.textContent = name;
  if (planEl) planEl.textContent = `${plan.toUpperCase()} PLAN`;

  if (avEl) {
    if (typeof userPhotoURL !== 'undefined' && userPhotoURL) {
      avEl.innerHTML = `<img src="${userPhotoURL}" alt="U"/>`;
    } else {
      avEl.textContent = name[0].toUpperCase();
    }
  }

  // Load Markets Data
  fetchMarketsData();
});

// Workspace Tab Switcher
function switchTab(tabId) {
  // Update Navigation Active State
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) activeNav.classList.add('active');

  // Hide All Workspace Panels
  const chatView = document.getElementById('tab-content-chat');
  const marketsView = document.getElementById('tab-content-markets');
  const scienceView = document.getElementById('tab-content-science');
  const agentsView = document.getElementById('tab-content-agents');

  [chatView, marketsView, scienceView, agentsView].forEach(el => {
    if (el) el.classList.add('hidden');
  });

  // Show Active Workspace Panel
  const target = document.getElementById(`tab-content-${tabId}`);
  if (target) target.classList.remove('hidden');

  if (tabId === 'markets') {
    fetchMarketsData();
  }
}

// Fetch Real Live Markets Data from CoinGecko & Forex APIs
async function fetchMarketsData() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true");
    const data = await res.json();

    if (data.bitcoin) {
      const btcPriceEl = document.getElementById('mkt-btc-price');
      const btcChangeEl = document.getElementById('mkt-btc-change');

      if (btcPriceEl) btcPriceEl.textContent = '$' + data.bitcoin.usd.toLocaleString();
      if (btcChangeEl) {
        const change = data.bitcoin.usd_24h_change;
        btcChangeEl.textContent = (change >= 0 ? '▲ +' : '▼ ') + Math.abs(change).toFixed(2) + '% (24h)';
        btcChangeEl.className = 'market-change ' + (change >= 0 ? 'change-up' : 'change-down');
      }
    }

    if (data.ethereum) {
      const ethPriceEl = document.getElementById('mkt-eth-price');
      const ethChangeEl = document.getElementById('mkt-eth-change');

      if (ethPriceEl) ethPriceEl.textContent = '$' + data.ethereum.usd.toLocaleString();
      if (ethChangeEl) {
        const change = data.ethereum.usd_24h_change;
        ethChangeEl.textContent = (change >= 0 ? '▲ +' : '▼ ') + Math.abs(change).toFixed(2) + '% (24h)';
        ethChangeEl.className = 'market-change ' + (change >= 0 ? 'change-up' : 'change-down');
      }
    }
  } catch (e) {
    console.log("Crypto market fetch error:", e);
  }

  try {
    const forexRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const forexData = await forexRes.json();
    if (forexData.rates?.INR) {
      const inrPriceEl = document.getElementById('mkt-inr-price');
      if (inrPriceEl) inrPriceEl.textContent = '₹' + forexData.rates.INR.toFixed(2);
    }
  } catch (e) {}
}

function toggleSettingsModal() {
  alert("Riya AI Account Settings & API Keys are configured.");
}
