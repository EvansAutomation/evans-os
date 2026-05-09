// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://mmyshrsccnrutqjxthty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teXNocnNjY25ydXRxanh0aHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkzOTMsImV4cCI6MjA4OTI0NTM5M30.ZUx38SQe_N4dtMdHJkGnfI4JhMtg2ww_o3Yx-R_ihxc';

const N8N_BASE          = 'https://n8n.evansautomation.tech/webhook';
const AI_CHAT_WEBHOOK   = N8N_BASE + '/evans-ai-chat';
const LEAD_SCRAPE_WEBHOOK  = N8N_BASE + '/evans-lead-scrape';
const LEAD_OUTREACH_WEBHOOK = N8N_BASE + '/evans-lead-outreach';
const IG_ANALYSE_WEBHOOK = N8N_BASE + '/evans-ig-analyse';

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Init ─────────────────────────────────────────────────────────────────────
function osInit() {
  // Greeting
  const now = new Date();
  const h = now.getHours();
  document.getElementById('greeting-time').textContent =
    h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  document.getElementById('greeting-name').textContent = 'Ethan';
  document.getElementById('greeting-date').textContent =
    now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Load home stats
  loadHomeStats();
}

// ── Navigation ───────────────────────────────────────────────────────────────
const sectionLoaded = {};

function navigate(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('sec-' + id)?.classList.add('active');
  document.getElementById('nav-' + id)?.classList.add('active');
  document.getElementById('mnav-' + id)?.classList.add('active');

  if (!sectionLoaded[id]) {
    sectionLoaded[id] = true;
    if (id === 'clients') loadClients();
    if (id === 'cold-calls') loadColdCalls();
    if (id === 'leads') loadLeads();
    if (id === 'instagram') loadInstagram();
    if (id === 'ai-chat') initChat();
  }
}

// ── Home stats ───────────────────────────────────────────────────────────────
async function loadHomeStats() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekStart  = (() => { const d = new Date(now); d.setDate(d.getDate() - 6); return d.toISOString(); })();

    const [{ data: clients }, { data: leads }, { data: calls }, { data: igPosts }] = await Promise.all([
      window.sb.from('Clients').select('Client_UUID').eq('is_admin', false),
      window.sb.from('leads').select('id, company_name, status, created_at').gte('created_at', monthStart).order('created_at', { ascending: false }),
      window.sb.from('cold_calls').select('id, company_name, contact_name, outcome, called_at, next_action, next_action_date').gte('called_at', weekStart).order('called_at', { ascending: false }),
      window.sb.from('instagram_posts').select('likes, comments, reach').limit(50)
    ]);

    // Stats
    document.getElementById('home-stat-clients').textContent = clients?.length ?? 0;
    document.getElementById('home-stat-leads').textContent   = leads?.length ?? 0;
    document.getElementById('home-stat-calls').textContent   = calls?.length ?? 0;

    // Instagram avg engagement
    if (igPosts?.length) {
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
    document.getElementById('leads-count-badge').textContent = leads?.length ?? 0;
    if (leads?.length) {
      leadsEl.innerHTML = leads.slice(0, 5).map(l => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${statusColor(l.status)}"></div>
          <div class="activity-text"><strong>${esc(l.company_name)}</strong> — <span class="badge ${statusBadgeClass(l.status)}" style="font-size:10px">${l.status}</span></div>
          <div class="activity-time">${timeAgo(l.created_at)}</div>
        </div>`).join('');
    }

    // Recent calls feed
    const callsEl = document.getElementById('home-recent-calls');
    document.getElementById('calls-count-badge').textContent = calls?.length ?? 0;
    if (calls?.length) {
      callsEl.innerHTML = calls.slice(0, 5).map(c => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${outcomeColor(c.outcome)}"></div>
          <div class="activity-text"><strong>${esc(c.company_name)}</strong> — <span class="outcome-pill outcome-${c.outcome}" style="font-size:10px">${outcomeLabel(c.outcome)}</span></div>
          <div class="activity-time">${timeAgo(c.called_at)}</div>
        </div>`).join('');
    }

    // Callbacks due today
    const today = new Date().toISOString().slice(0,10);
    const { data: allCalls } = await window.sb
      .from('cold_calls').select('id,company_name,contact_name,next_action,next_action_date')
      .eq('outcome', 'callback').lte('next_action_date', today).not('next_action_date', 'is', null);
    const callbacksEl = document.getElementById('home-callbacks');
    if (allCalls?.length) {
      callbacksEl.innerHTML = allCalls.slice(0,4).map(c => `
        <div class="activity-item">
          <div class="activity-dot dot-amber"></div>
          <div class="activity-text"><strong>${esc(c.company_name)}</strong>${c.contact_name ? ' — ' + esc(c.contact_name) : ''}${c.next_action ? '<br><span style="font-size:11px;color:var(--muted)">' + esc(c.next_action) + '</span>' : ''}</div>
          <div class="activity-time">${c.next_action_date}</div>
        </div>`).join('');
    }

    // Top Instagram posts
    const { data: topPosts } = await window.sb
      .from('instagram_posts').select('id,caption,likes,comments,reach').order('likes', { ascending: false }).limit(3);
    const topPostsEl = document.getElementById('home-top-posts');
    if (topPosts?.length) {
      topPostsEl.innerHTML = topPosts.map(p => {
        const eng = p.reach ? (((parseInt(p.likes)||0) + (parseInt(p.comments)||0)) / parseInt(p.reach) * 100).toFixed(1) : '—';
        return `<div class="activity-item">
          <div class="activity-dot dot-purple"></div>
          <div class="activity-text"><strong>${esc((p.caption||'Post').substring(0,40))}${(p.caption||'').length > 40 ? '…' : ''}</strong><br><span style="font-size:11px;color:var(--muted)">❤ ${p.likes||0} · 💬 ${p.comments||0} · ${eng}% eng</span></div>
        </div>`;
      }).join('');
    }

  } catch (e) {
    console.error('Home stats error:', e);
  }
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── Utility helpers ───────────────────────────────────────────────────────────
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
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function outcomeLabel(o) {
  return { interested:'Interested', callback:'Callback', not_interested:'Not Interested', no_answer:'No Answer' }[o] || o;
}

function outcomeColor(o) {
  return { interested:'var(--green)', callback:'var(--amber)', not_interested:'var(--error)', no_answer:'var(--muted)' }[o] || 'var(--muted)';
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

// ── Boot ──────────────────────────────────────────────────────────────────────
osInit();
