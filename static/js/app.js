/* Smart Parking System — Frontend JS */

let slotsData = [];

// ── Page Navigation ────────────────────────────
function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const targetSection = document.getElementById('page-' + pageId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Highlight the corresponding nav buttons (both in header and footer if any)
  document.querySelectorAll('.nav-links .nav-btn, .footer-link').forEach(btn => {
    const clickAttr = btn.getAttribute('onclick');
    if (clickAttr && clickAttr.includes(pageId)) {
      btn.classList.add('active');
    }
  });

  // If there's footer navigation click handling, update top navigation active class accordingly
  document.querySelectorAll('.nav-links .nav-btn').forEach(btn => {
    const clickAttr = btn.getAttribute('onclick');
    if (clickAttr && clickAttr.includes(pageId)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Save the current active page in localStorage
  localStorage.setItem('activePage', pageId);
}

// ── Clock ──────────────────────────────────────
function updateClock() {
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    clockEl.textContent = new Date().toLocaleTimeString();
  }
}
setInterval(updateClock, 1000);
updateClock();

// ── API helper ─────────────────────────────────
async function api(path, method = 'GET') {
  try {
    const res = await fetch(path, { method });
    return await res.json();
  } catch (e) {
    console.error('API error:', e);
    return null;
  }
}

// ── Render metrics ─────────────────────────────
function renderMetrics(stats) {
  // Update dashboard page metrics
  document.getElementById('m-total').textContent   = stats.total;
  document.getElementById('m-avail').textContent   = stats.available;
  document.getElementById('m-occ').textContent     = stats.occupied;
  document.getElementById('m-entered').textContent = stats.entered_today;
  document.getElementById('m-exited').textContent  = stats.exited_today;

  // Update homepage quick metrics
  document.getElementById('qs-total').textContent   = stats.total;
  document.getElementById('qs-avail').textContent   = stats.available;
  document.getElementById('qs-occ').textContent     = stats.occupied;
  document.getElementById('qs-entered').textContent = stats.entered_today;

  const pct = stats.occupancy_pct;
  const fill = document.getElementById('occ-fill');
  fill.style.width = pct + '%';
  fill.style.background = pct >= 90 ? '#dc2626' : pct >= 60 ? '#d97706' : '#10b981';
  document.getElementById('occ-pct-label').textContent = pct + '%';

  // display board
  document.getElementById('dp-avail').textContent = stats.available + ' FREE';
  document.getElementById('dp-occ').textContent   = stats.occupied  + ' TAKEN';
  const statusEl = document.getElementById('dp-status');
  statusEl.textContent = stats.status;
  statusEl.className   = 'board-status' + (stats.available === 0 ? ' full' : '');

  drawPie(stats.available, stats.occupied);

  // Trigger gate animations if the backend indicates they are open
  if (stats.entry_gate_open) {
    openGate('entry');
  }
  if (stats.exit_gate_open) {
    openGate('exit');
  }
}

// ── Render slots grid ──────────────────────────
function renderSlots(slots) {
  slotsData = slots;
  const grid = document.getElementById('slots-grid');
  grid.innerHTML = '';
  slots.forEach(slot => {
    const el = document.createElement('div');
    el.className = 'slot ' + slot.status;
    el.id        = 'slot-' + slot.id;
    el.title     = `Slot ${slot.id}: ${slot.status}`;
    el.textContent = slot.id;
    el.onclick = () => toggleSlot(slot.id);
    grid.appendChild(el);
  });
}

// ── Render log ─────────────────────────────────
function renderLog(entries) {
  const panels = [document.getElementById('log-panel'), document.getElementById('home-log-panel')];
  if (!entries || entries.length === 0) return;
  
  panels.forEach(panel => {
    if (!panel) return;
    panel.innerHTML = '';
    entries.forEach(e => {
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.innerHTML = `
        <span class="log-time">${e.time}</span>
        <span class="log-tag ${e.type}">${e.type === 'enter' ? 'ENTRY' : e.type === 'exit' ? 'EXIT' : 'SYS'}</span>
        <span class="log-msg">${e.message}</span>
      `;
      panel.appendChild(div);
    });
  });
}

// ── Pie chart (canvas) ─────────────────────────
function drawPie(avail, occ) {
  const canvas = document.getElementById('pieChart');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20;

  ctx.clearRect(0, 0, W, H);
  const total = avail + occ;
  if (total === 0) return;

  const data   = [avail, occ];
  const colors = ['#10b981', '#dc2626']; // Light theme color scheme matches: Emerald & Crimson
  let start    = -Math.PI / 2;

  data.forEach((val, i) => {
    const angle = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    start += angle;
  });

  // donut hole (White match new background)
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // center text
  ctx.fillStyle = '#0f172a'; // Slate 900
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.round((occ / total) * 100) + '%', cx, cy - 8);
  ctx.fillStyle = '#64748b'; // Slate 500
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('occupied', cx, cy + 12);

  // legend
  const legendEl = document.getElementById('chart-legend');
  legendEl.innerHTML = `
    <span><i style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;"></i> Available (${avail})</span>
    <span><i style="display:inline-block;width:10px;height:10px;background:#dc2626;border-radius:2px;"></i> Occupied (${occ})</span>
  `;
}

// ── Gate animation ─────────────────────────────
function openGate(type) {
  const arm    = document.getElementById(type + '-arm');
  const status = document.getElementById(type + '-status');
  if (arm.classList.contains('open')) return;
  arm.classList.add('open');
  status.innerHTML = `<span class="dot open"></span> Open`;
  setTimeout(() => {
    arm.classList.remove('open');
    status.innerHTML = `<span class="dot closed"></span> Closed`;
    api('/api/gate_close', 'POST');
  }, 2400);
}

// ── Flash slot ─────────────────────────────────
function flashSlot(slotId) {
  const el = document.getElementById('slot-' + slotId);
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 500);
}

// ── Actions ────────────────────────────────────
async function triggerEntry() {
  const d = await api('/api/entry', 'POST');
  if (!d) return;
  if (d.success) {
    openGate('entry');
    const status = await api('/api/status');
    if (status) renderSlots(status.slots);
    flashSlot(d.slot);
    renderMetrics(d.stats);
  }
  await refreshLog();
}

// Exit Trigger
async function triggerExit() {
  const d = await api('/api/exit', 'POST');
  if (!d) return;
  if (d.success) {
    openGate('exit');
    const status = await api('/api/status');
    if (status) renderSlots(status.slots);
    flashSlot(d.slot);
    renderMetrics(d.stats);
  }
  await refreshLog();
}

async function toggleSlot(id) {
  const d = await api('/api/toggle_slot/' + id, 'POST');
  if (!d || !d.success) return;
  const el = document.getElementById('slot-' + id);
  if (el) { el.className = 'slot ' + d.status; el.title = `Slot ${id}: ${d.status}`; }
  flashSlot(id);
  renderMetrics(d.stats);
  await refreshLog();
}

async function simulateRandom() {
  const d = await api('/api/simulate_random', 'POST');
  if (!d) return;
  renderSlots(d.slots);
  renderMetrics(d.stats);
  await refreshLog();
}

async function resetSystem() {
  const d = await api('/api/reset', 'POST');
  if (!d) return;
  renderSlots(d.slots);
  renderMetrics(d.stats);
  await refreshLog();
}

async function refreshLog() {
  const d = await api('/api/status');
  if (d) renderLog(d.log);
}

// ── Initial load ───────────────────────────────
async function init() {
  const d = await api('/api/status');
  if (!d) return;
  renderMetrics(d.stats);
  renderSlots(d.slots);
  renderLog(d.log);

  // Restore the active page from localStorage
  const savedPage = localStorage.getItem('activePage');
  if (savedPage) {
    switchPage(savedPage);
  }
}

// ── Auto-refresh every 5 s ─────────────────────
setInterval(async () => {
  const d = await api('/api/status');
  if (d) {
    renderMetrics(d.stats);
    renderSlots(d.slots);
    renderLog(d.log);
  }
}, 5000);

init();
