// ── Clients module — Supabase ──────────────────────────────────────────────────
let clientsData = [];

async function loadClients() {
  const grid = document.getElementById('client-grid');
  grid.innerHTML = `<div style="grid-column:1/-1" class="empty"><div class="empty-icon">⌛</div><p class="empty-text">Loading clients…</p></div>`;

  try {
    if (!window.sb) throw new Error('Supabase not initialised');

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [{ data: clients, error: cErr }, { data: calls }] = await Promise.all([
      window.sb.from('Clients')
        .select('Client_UUID, Business_name, Owner_Name, Owner_Email, Business_Email, Vapi_Assistant_ID, is_admin, created_at')
        .eq('is_admin', false),
      window.sb.from('calls').select('Client_ID, Duration_seconds, cost, created_at')
    ]);

    if (cErr) throw cErr;

    const allCalls = calls || [];

    clientsData = (clients || []).map(c => {
      const cCalls    = allCalls.filter(x => x.Client_ID === c.Client_UUID);
      const monthCalls = cCalls.filter(x => x.created_at >= monthStart);
      const totalCost  = cCalls.reduce((a, b) => a + (parseFloat(b.cost) || 0), 0);
      const monthCost  = monthCalls.reduce((a, b) => a + (parseFloat(b.cost) || 0), 0);
      const lastCall   = [...cCalls].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return { ...c, status: 'active', allCalls: cCalls, monthCalls, totalCost, monthCost, lastCall };
    });

    // Cache for home stats
    lsSave(LS.clients, clientsData.map(c => ({ id: c.Client_UUID, status: 'active', monthly_value: c.monthCost })));

    const totalMonthCalls = clientsData.reduce((a,c) => a + c.monthCalls.length, 0);
    const totalMonthRev   = clientsData.reduce((a,c) => a + c.monthCost, 0);
    document.getElementById('cl-stat-total').textContent   = clientsData.length;
    document.getElementById('cl-stat-active').textContent  = clientsData.length;
    document.getElementById('cl-stat-revenue').textContent = '£' + totalMonthRev.toFixed(2);

    renderClientGrid(clientsData);
  } catch (e) {
    console.error('Clients load error:', e);
    grid.innerHTML = `<div style="grid-column:1/-1" class="empty"><div class="empty-icon">⚠</div><p class="empty-text">Could not load clients — ${esc(e.message)}</p></div>`;
  }
}

function renderClientGrid(data) {
  const grid = document.getElementById('client-grid');
  if (!data.length) {
    grid.innerHTML = `<div style="grid-column:1/-1" class="empty"><div class="empty-icon">♟</div><p class="empty-text">No clients found</p></div>`;
    return;
  }

  grid.innerHTML = data.map(c => {
    const monthCallCount = c.monthCalls?.length || 0;
    return `
      <div class="client-card" onclick="openClientPanel('${c.Client_UUID}')">
        <div class="client-card-header">
          <div>
            <div class="client-card-name">${esc(c.Business_name || 'Unnamed')}</div>
            <div class="client-card-owner">${esc(c.Owner_Name || '—')}</div>
          </div>
          <span class="badge ${monthCallCount > 0 ? 'badge-purple' : 'badge-ghost'}" style="font-size:10px">${monthCallCount} this month</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
          ${esc(c.Business_Email || c.Owner_Email || '—')}
        </div>
        <div class="client-stats-mini">
          <div class="csm-item">
            <div class="csm-val">${c.allCalls?.length || 0}</div>
            <div class="csm-lbl">Total Calls</div>
          </div>
          <div class="csm-item">
            <div class="csm-val">£${(c.totalCost||0).toFixed(0)}</div>
            <div class="csm-lbl">Total Spend</div>
          </div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--muted)">
          Last call: ${c.lastCall?.created_at ? timeAgo(c.lastCall.created_at) : 'Never'}
        </div>
      </div>`;
  }).join('');
}

function filterClients() {
  const q = document.getElementById('cl-search').value.toLowerCase();
  if (!q) { renderClientGrid(clientsData); return; }
  const filtered = clientsData.filter(c =>
    (c.Business_name||'').toLowerCase().includes(q) ||
    (c.Owner_Name||'').toLowerCase().includes(q) ||
    (c.Business_Email||'').toLowerCase().includes(q) ||
    (c.Owner_Email||'').toLowerCase().includes(q)
  );
  renderClientGrid(filtered);
}

// ── Client slide panel ────────────────────────────────────────────────────────
function openClientPanel(clientId) {
  const c = clientsData.find(x => x.Client_UUID === clientId);
  if (!c) return;

  let panel = document.getElementById('client-slide-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'client-slide-panel';
    panel.className = 'slide-panel';
    panel.innerHTML = `
      <div class="slide-panel-header">
        <h3 id="csp-title">Client</h3>
        <button class="modal-close" onclick="closeClientPanel()">✕</button>
      </div>
      <div class="slide-panel-body" id="csp-body"></div>`;
    document.body.appendChild(panel);
  }

  document.getElementById('csp-title').textContent = c.Business_name || 'Client';
  document.getElementById('csp-body').innerHTML = `
    <div class="stats-row" style="grid-template-columns:1fr 1fr;margin-bottom:20px">
      <div class="stat-card"><div class="stat-value">${c.allCalls?.length||0}</div><div class="stat-label">Total Calls</div></div>
      <div class="stat-card"><div class="stat-value">${c.monthCalls?.length||0}</div><div class="stat-label">This Month</div></div>
      <div class="stat-card"><div class="stat-value">£${(c.monthCost||0).toFixed(2)}</div><div class="stat-label">Monthly Cost</div></div>
      <div class="stat-card"><div class="stat-value">£${(c.totalCost||0).toFixed(2)}</div><div class="stat-label">Total Spend</div></div>
    </div>
    <div style="margin-bottom:20px">
      <div style="font-family:var(--syne);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Contact Details</div>
      <div style="display:flex;flex-direction:column;gap:7px;font-size:13px;color:var(--text2)">
        <div><strong style="color:var(--muted);font-size:11px">Owner: </strong>${esc(c.Owner_Name||'—')}</div>
        <div><strong style="color:var(--muted);font-size:11px">Email: </strong>${esc(c.Business_Email||c.Owner_Email||'—')}</div>
        <div><strong style="color:var(--muted);font-size:11px">Last Call: </strong>${c.lastCall ? fmtDate(c.lastCall.created_at) : 'Never'}</div>
        ${c.Vapi_Assistant_ID ? `<div><strong style="color:var(--muted);font-size:11px">Vapi ID: </strong><span style="font-family:monospace;font-size:11px">${esc(c.Vapi_Assistant_ID.substring(0,24))}…</span></div>` : ''}
      </div>
    </div>
    <a href="https://client.portal.evans-automation.com/admin.html" target="_blank" class="btn btn-ghost btn-full" style="text-align:center;display:block;padding:10px">
      Open Full Admin View ↗
    </a>`;

  panel.classList.add('open');

  let overlay = document.getElementById('panel-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'panel-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:40;background:rgba(0,0,0,0.4);backdrop-filter:blur(2px)';
    overlay.onclick = closeClientPanel;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'block';
}

function closeClientPanel() {
  document.getElementById('client-slide-panel')?.classList.remove('open');
  const overlay = document.getElementById('panel-overlay');
  if (overlay) overlay.style.display = 'none';
}
