// ── Supabase (clients only) ────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://mmyshrsccnrutqjxthty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teXNocnNjY25ydXRxanh0aHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkzOTMsImV4cCI6MjA4OTI0NTM5M30.ZUx38SQe_N4dtMdHJkGnfI4JhMtg2ww_o3Yx-R_ihxc';

// ── n8n webhooks ──────────────────────────────────────────────────────────────
const N8N_BASE              = 'https://n8n.evansautomation.tech/webhook';
const AI_CHAT_WEBHOOK       = N8N_BASE + '/evans-ai-chat';
const LEAD_SCRAPE_WEBHOOK   = N8N_BASE + '/evans-lead-scrape';
const LEAD_OUTREACH_WEBHOOK = N8N_BASE + '/evans-lead-outreach';
const IG_ANALYSE_WEBHOOK    = N8N_BASE + '/evans-ig-analyse';
const CC_VOICEMAIL_WEBHOOK  = N8N_BASE + '/evans-cc-voicemail';

// ── localStorage keys ─────────────────────────────────────────────────────────
const LS = {
  coldCalls: 'ea_cold_calls',
  leads:     'ea_leads',
  igPosts:   'ea_ig_posts',
  clients:   'ea_clients',
};

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}

function lsSave(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error('Storage full?', e); }
}

function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

// ── Boot ──────────────────────────────────────────────────────────────────────
// Supabase client — only used by clients.js
window.sb = null;
document.addEventListener('DOMContentLoaded', () => {
  if (typeof supabase !== 'undefined') {
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
function osInit() {
  const now = new Date();
  const h   = now.getHours();
  document.getElementById('greeting-time').textContent =
    h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  document.getElementById('greeting-name').textContent = 'Ethan';
  document.getElementById('greeting-date').textContent =
    now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  loadHomeStats();
}

// ── Navigation ────────────────────────────────────────────────────────────────
const sectionLoaded = {};

function navigate(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('sec-' + id)?.classList.add('active');
  document.getElementById('nav-' + id)?.classList.add('active');
  document.getElementById('mnav-' + id)?.classList.add('active');

  if (id === 'booked') {
    renderBookedSection();  // always re-render so new bookings appear
  } else if (!sectionLoaded[id]) {
    sectionLoaded[id] = true;
    if (id === 'clients')    loadClients();
    if (id === 'cold-calls') loadColdCalls();
    if (id === 'leads')      loadLeads();
    if (id === 'instagram')  loadInstagram();
    if (id === 'ai-chat')    initChat();
  }
}

// ── Home stats ────────────────────────────────────────────────────────────────
function loadHomeStats() {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart  = new Date(now); weekStart.setDate(weekStart.getDate() - 6);

    const clients = lsGet(LS.clients).filter(c => c.status === 'active');
    const leads   = lsGet(LS.leads);
    const calls   = lsGet(LS.coldCalls);
    const igPosts = lsGet(LS.igPosts).slice(0, 50);

    const leadsMonth = leads.filter(l => new Date(l.created_at) >= monthStart);
    const callsWeek  = calls.filter(c => new Date(c.created_at) >= weekStart);

    countUp(document.getElementById('home-stat-clients'), clients.length);
    countUp(document.getElementById('home-stat-leads'),   leadsMonth.length);
    countUp(document.getElementById('home-stat-calls'),   callsWeek.length);

    if (igPosts.length) {
      const avgEng = igPosts.reduce((a, p) => {
        const reach = parseInt(p.reach) || 1;
        return a + ((parseInt(p.likes)||0) + (parseInt(p.comments)||0)) / reach;
      }, 0) / igPosts.length;
      document.getElementById('home-stat-ig').textContent = (avgEng * 100).toFixed(1) + '%';
    } else {
      document.getElementById('home-stat-ig').textContent = '—';
    }

    // Recent leads feed
    const leadsEl = document.getElementById('home-recent-leads');
    document.getElementById('leads-count-badge').textContent = leadsMonth.length;
    const recentLeads = [...leads].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (recentLeads.length) {
      leadsEl.innerHTML = recentLeads.slice(0,5).map(l => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${statusColor(l.status)}"></div>
          <div class="activity-text"><strong>${esc(l.company_name)}</strong> — <span class="badge ${statusBadgeClass(l.status)}" style="font-size:10px">${l.status||'new'}</span></div>
          <div class="activity-time">${timeAgo(l.created_at)}</div>
        </div>`).join('');
    }

    // Recent calls feed
    const callsEl = document.getElementById('home-recent-calls');
    document.getElementById('calls-count-badge').textContent = callsWeek.length;
    const recentCalls = [...calls].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (recentCalls.length) {
      callsEl.innerHTML = recentCalls.slice(0,5).map(c => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${outcomeColor(c.outcome)}"></div>
          <div class="activity-text"><strong>${esc(c.company_name)}</strong> — <span class="outcome-pill outcome-${c.outcome||'none'}" style="font-size:10px">${outcomeLabel(c.outcome)}</span></div>
          <div class="activity-time">${timeAgo(c.created_at)}</div>
        </div>`).join('');
    }

    // Follow-ups due
    const today = new Date().toISOString().slice(0,10);
    const dueCalls = calls.filter(c => c.outcome === 'follow_up' && c.next_action_date && c.next_action_date <= today);
    const callbacksEl = document.getElementById('home-callbacks');
    if (dueCalls.length) {
      callbacksEl.innerHTML = dueCalls.slice(0,4).map(c => `
        <div class="activity-item">
          <div class="activity-dot dot-amber"></div>
          <div class="activity-text"><strong>${esc(c.company_name)}</strong>${c.contact_name ? ' — ' + esc(c.contact_name) : ''}</div>
          <div class="activity-time">${c.next_action_date}</div>
        </div>`).join('');
    }

    // Top Instagram posts
    const topPosts = [...lsGet(LS.igPosts)].sort((a,b) => (parseInt(b.likes)||0) - (parseInt(a.likes)||0)).slice(0,3);
    const topPostsEl = document.getElementById('home-top-posts');
    if (topPosts.length) {
      topPostsEl.innerHTML = topPosts.map(p => {
        const eng = p.reach ? (((parseInt(p.likes)||0)+(parseInt(p.comments)||0))/parseInt(p.reach)*100).toFixed(1) : '—';
        return `<div class="activity-item">
          <div class="activity-dot dot-purple"></div>
          <div class="activity-text"><strong>${esc((p.caption||'Post').substring(0,40))}${(p.caption||'').length>40?'…':''}</strong><br>
          <span style="font-size:11px;color:var(--muted)">❤ ${p.likes||0} · 💬 ${p.comments||0} · ${eng}% eng</span></div>
        </div>`;
      }).join('');
    }
  } catch (e) {
    console.error('Home stats error:', e);
  }
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ── Utilities ─────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function outcomeLabel(o) {
  return { booked:'Booked', follow_up:'Follow Up', voicemail:'Voicemail', hung_up:'Hung Up' }[o] || (o ? o : 'Not Called');
}

function outcomeColor(o) {
  return { booked:'var(--green)', follow_up:'var(--amber)', hung_up:'var(--error)', voicemail:'var(--blue)' }[o] || 'var(--muted)';
}

function statusColor(s) {
  return { new:'var(--purple-hi)', contacted:'var(--amber)', converted:'var(--green)', dead:'var(--muted)' }[s] || 'var(--muted)';
}

function statusBadgeClass(s) {
  return { new:'badge-purple', contacted:'badge-amber', converted:'badge-green', dead:'badge-ghost' }[s] || 'badge-ghost';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

function showAlert(elId, msg, type = 'error') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
}

function clearAlert(elId) {
  const el = document.getElementById(elId);
  if (el) el.className = 'alert';
}

// ── Count-up animation ────────────────────────────────────────────────────────
function countUp(el, target, duration = 900, suffix = '') {
  if (!el || typeof target !== 'number' || isNaN(target)) {
    if (el) el.textContent = (target ?? '—') + suffix;
    return;
  }
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * ease) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const icons = { success:'✓', error:'✕', info:'✦' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'·'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
osInit();
