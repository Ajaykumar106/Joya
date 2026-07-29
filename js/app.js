// ── RIYA.AI APP CONTROLLER (NAVIGATION & MODALS) ──

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

  fetchMarketsData();
});

// Workspace Tab Switcher (100% Functional Sidebar!)
function switchTab(tabId) {
  // Update Active Class on Sidebar Nav Items
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) activeNav.classList.add('active');

  // Hide All Views
  const views = ['chat', 'library', 'markets', 'science', 'agents'];
  views.forEach(v => {
    const el = document.getElementById(`tab-content-${v}`);
    if (el) el.classList.add('hidden');
  });

  // Show Selected View
  const target = document.getElementById(`tab-content-${tabId}`);
  if (target) {
    target.classList.remove('hidden');
  }

  // Update Header Title
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    const titles = {
      chat: 'Chat Studio',
      library: 'My Library',
      markets: 'Market Intelligence',
      science: 'Scientific Research',
      agents: 'AI Agents'
    };
    headerTitle.textContent = titles[tabId] || 'Studio';
  }

  if (tabId === 'markets') {
    fetchMarketsData();
  }
}

// Fetch Real Live Markets Data
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

// Modal Controllers
function toggleSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.toggle('hidden');
}

function toggleProfileModal() {
  const name = typeof userName !== 'undefined' ? userName : 'Developer';
  const plan = typeof userPlan !== 'undefined' ? userPlan : 'free';

  const pName = document.getElementById('profileModalName');
  const pPlan = document.getElementById('profileModalPlan');

  if (pName) pName.textContent = name;
  if (pPlan) pPlan.textContent = `${plan.toUpperCase()} MEMBERSHIP`;

  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.toggle('hidden');
}
