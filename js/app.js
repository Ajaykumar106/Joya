// ── UI STATE ──
let darkMode = true;

// ── INIT SECURE APP PAGES ──
// This listener fires when auth.js confirms the user is logged in
document.addEventListener('authReady', () => {
  // Populate Sidebar Avatars & Name
  const sbAv = document.getElementById("sbAv");
  const topAvatar = document.getElementById("topAvatar");
  const sbName = document.getElementById("sbName");
  const sbPlan = document.getElementById("sbPlan");
  const planLabel = document.getElementById("planLabel"); // might be on chat page
  const wHi = document.getElementById("wHi"); // might be on chat page

  const initials = (userName || "U")[0].toUpperCase();
  const avatarHTML = userPhotoURL ? `<img src="${userPhotoURL}" alt="avatar"/>` : initials;
  
  if (sbAv) sbAv.innerHTML = avatarHTML;
  if (topAvatar) topAvatar.innerHTML = avatarHTML;
  if (sbName) sbName.textContent = currentUser.displayName || "User";
  if (wHi) wHi.textContent = `Hello ${userName}! 👋`;

  if (userPlan === "paid") {
    if (sbPlan) sbPlan.textContent = "PREMIUM PLAN ⚡";
    if (planLabel) {
      planLabel.textContent = "PREMIUM · Claude";
      planLabel.style.color = "#10b981";
    }
  }

  // Show the app content (fade in)
  document.body.style.opacity = 1;
});

// ── SIDEBAR LOGIC ──
function toggleSidebar() {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("overlay");
  if (sb) {
    sb.classList.toggle("open");
    if (ov) {
      ov.style.display = sb.classList.contains("open") ? "block" : "none";
    }
  }
}

function closeSidebar() {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("overlay");
  if (sb) sb.classList.remove("open");
  if (ov) ov.style.display = "none";
}

// ── THEME LOGIC ──
function toggleTheme() {
  darkMode = !darkMode;
  const r = document.documentElement.style;
  if (!darkMode) {
    r.setProperty("--bg","#F8F9FC");
    r.setProperty("--s1","#FFFFFF");
    r.setProperty("--s2","#F3F4F6");
    r.setProperty("--s3","#E5E7EB");
    r.setProperty("--t1","#111827");
    r.setProperty("--t2","#6B7280");
    r.setProperty("--t3","#9CA3AF");
    r.setProperty("--br","rgba(0,0,0,0.07)");
  } else {
    r.setProperty("--bg","#07090f");
    r.setProperty("--s1","#0d1117");
    r.setProperty("--s2","#161b22");
    r.setProperty("--s3","#21262d");
    r.setProperty("--t1","#f0f6fc");
    r.setProperty("--t2","#8b949e");
    r.setProperty("--t3","#484f58");
    r.setProperty("--br","rgba(255,255,255,0.07)");
  }
}

// ── CLOCK LOGIC (For Right Panel) ──
function startClock() {
  const clk = document.getElementById("rpClock");
  const dt = document.getElementById("rpDate");
  if (!clk || !dt) return;

  function update() {
    const n = new Date();
    const pad = x => String(x).padStart(2,"0");
    clk.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    dt.textContent = `${days[n.getDay()]}, ${n.getDate()} ${months[n.getMonth()]} ${n.getFullYear()}`;
  }
  update();
  setInterval(update, 1000);
}

// Fire clock if it exists
document.addEventListener('DOMContentLoaded', () => {
  startClock();
});
