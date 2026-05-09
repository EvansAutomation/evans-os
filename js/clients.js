// ── Clients module — localStorage ─────────────────────────────────────────────
let clientsData = [];

function loadClients() {
  clientsData = lsGet(LS.clients);
  renderClientStats();
  renderClientGrid(clientsData);
}

function renderClientStats() {
  const active = clientsData.filter(c => c.status === 'active').length;
  document.getElementById('cl-stat-total').textContent   = clientsData.length;
  document.getElementById('cl-stat-active').textContent  = active;
  document.getElementById('cl-stat-revenue').textContent = '£' + clientsData.reduce((a,c) => a + (parseFloat(c.monthly_value)||0), 0).toFixed(0);
}

function renderClientGrid(data) {
  const grid = document.getElementById('client-grid');
  if (!data.length) {
    grid.innerHTML = `<div style="grid-column:1/-1" class="empty"><div class="empty-icon">♟</div><p class="empty-text">No clients yet — click Add Client to get started</p></div>`;
    return;
  }

  grid.innerHTML = data.map(c => `
    <div class="client-card" onclick="openClientPanel('${c.id}')">
      <div class="client-card-header">
        <div>
          <div class="client-card-name">${esc(c.business_name || 'Unnamed')}</div>
          <div class="client-card-owner">${esc(c.owner_name || '—')}</div>
        </div>
        <span class="badge ${c.status === 'active' ? 'badge-green' : c.status === 'paused' ? 'badge-amber' : 'badge-ghost'}" style="font-size:10px">${c.status || 'active'}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
        ${esc(c.business_email || c.owner_email || '—')}
      </div>
      <div class="client-stats-mini">
        <div class="csm-item">
          <div class="csm-val">£${(parseFloat(c.monthly_value)||0).toFixed(0)}</div>
          <div class="csm-lbl">Monthly</div>
        </div>
        <div class="csm-item">
          <div class="csm-val">${c.industry || '—'}</div>
          <div class="csm-lbl">Industry</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--muted)">
        Added ${fmtDate(c.created_at)}
      </div>
    </div>`).join('');
}

function filterClients() {
  const q = document.getElementById('cl-search').value.toLowerCase();
  if (!q) { renderClientGrid(clientsData); return; }
  const filtered = clientsData.filter(c =>
    (c.business_name||'').toLowerCase().includes(q) ||
    (c.owner_name||'').toLowerCase().includes(q) ||
    (c.business_email||'').toLowerCase().includes(q) ||
    (c.industry||'').toLowerCase().includes(q)
  );
  renderClientGrid(filtered);
}

// ── Add / Edit client modal ───────────────────────────────────────────────────
function openNewClientModal() {
  document.getElementById('cl-edit-id').value = '';
  document.getElementById('cl-modal-title').textContent = 'Add Client';
  ['cl-business-name','cl-owner-name','cl-business-email','cl-owner-email','cl-phone','cl-industry','cl-monthly-value','cl-vapi-id','cl-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('cl-status').value = 'active';
  clearAlert('cl-modal-alert');
  openModal('client-modal');
}

function openEditClient(id) {
  const c = clientsData.find(x => x.id === id);
  if (!c) return;
  document.getElementById('cl-edit-id').value = id;
  document.getElementById('cl-modal-title').textContent = 'Edit Client';
  document.getElementById('cl-business-name').value  = c.business_name || '';
  document.getElementById('cl-owner-name').value     = c.owner_name || '';
  document.getElementById('cl-business-email').value = c.business_email || '';
  document.getElementById('cl-owner-email').value    = c.owner_email || '';
  document.getElementById('cl-phone').value          = c.phone || '';
  document.getElementById('cl-industry').value       = c.industry || '';
  document.getElementById('cl-monthly-value').value  = c.monthly_value || '';
  document.getElementById('cl-vapi-id').value        = c.vapi_id || '';
  document.getElementById('cl-notes').value          = c.notes || '';
  document.getElementById('cl-status').value         = c.status || 'active';
  clearAlert('cl-modal-alert');
  openModal('client-modal');
}

function saveClient() {
  const name = document.getElementById('cl-business-name').value.trim();
  if (!name) { showAlert('cl-modal-alert', 'Business name is required.'); return; }

  const editId = document.getElementById('cl-edit-id').value;
  const payload = {
    business_name:  name,
    owner_name:     document.getElementById('cl-owner-name').value.trim() || null,
    business_email: document.getElementById('cl-business-email').value.trim() || null,
    owner_email:    document.getElementById('cl-owner-email').value.trim() || null,
    phone:          document.getElementById('cl-phone').value.trim() || null,
    industry:       document.getElementById('cl-industry').value.trim() || null,
    monthly_value:  parseFloat(document.getElementById('cl-monthly-value').value) || 0,
    vapi_id:        document.getElementById('cl-vapi-id').value.trim() || null,
    notes:          document.getElementById('cl-notes').value.trim() || null,
    status:         document.getElementById('cl-status').value || 'active',
  };

  if (editId) {
    const idx = clientsData.findIndex(c => c.id === editId);
    if (idx !== -1) clientsData[idx] = { ...clientsData[idx], ...payload };
  } else {
    clientsData.unshift({ id: newId(), ...payload, created_at: new Date().toISOString() });
  }

  lsSave(LS.clients, clientsData);
  closeModal('client-modal');
  showToast('Client saved ✓', 'success');
  renderClientStats();
  renderClientGrid(clientsData);
  loadHomeStats();
}

// ── Client detail panel ───────────────────────────────────────────────────────
let viewingClientId = null;

function openClientPanel(clientId) {
  const c = clientsData.find(x => x.id === clientId);
  if (!c) return;
  viewingClientId = clientId;

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

  document.getElementById('csp-title').textContent = c.business_name || 'Client';
  document.getElementById('csp-body').innerHTML = `
    <div class="stats-row" style="grid-template-columns:1fr 1fr;margin-bottom:20px">
      <div class="stat-card"><div class="stat-value">£${(parseFloat(c.monthly_value)||0).toFixed(0)}</div><div class="stat-label">Monthly Value</div></div>
      <div class="stat-card"><div class="stat-value"><span class="badge ${c.status === 'active' ? 'badge-green' : 'badge-ghost'}">${c.status||'active'}</span></div><div class="stat-label">Status</div></div>
    </div>

    <div style="margin-bottom:20px">
      <div style="font-family:var(--syne);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Contact Details</div>
      <div style="display:flex;flex-direction:column;gap:7px;font-size:13px;color:var(--text2)">
        <div><strong style="color:var(--muted);font-size:11px">Owner: </strong>${esc(c.owner_name||'—')}</div>
        <div><strong style="color:var(--muted);font-size:11px">Business Email: </strong>${esc(c.business_email||'—')}</div>
        <div><strong style="color:var(--muted);font-size:11px">Owner Email: </strong>${esc(c.owner_email||'—')}</div>
        <div><strong style="color:var(--muted);font-size:11px">Phone: </strong>${esc(c.phone||'—')}</div>
        <div><strong style="color:var(--muted);font-size:11px">Industry: </strong>${esc(c.industry||'—')}</div>
        ${c.vapi_id ? `<div><strong style="color:var(--muted);font-size:11px">Vapi ID: </strong><span style="font-family:monospace;font-size:11px">${esc(c.vapi_id.substring(0,24))}…</span></div>` : ''}
      </div>
    </div>

    ${c.notes ? `<div style="margin-bottom:20px"><div style="font-family:var(--syne);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Notes</div><div style="font-size:13px;color:var(--text2);line-height:1.6;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px">${esc(c.notes)}</div></div>` : ''}

    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-primary btn-sm" style="flex:1" onclick="closeClientPanel();openEditClient('${c.id}')">Edit Client</button>
      <button class="btn btn-ghost btn-sm" onclick="deleteClientFromPanel()">Delete</button>
    </div>`;

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

function deleteClientFromPanel() {
  if (!viewingClientId || !confirm('Delete this client?')) return;
  clientsData = clientsData.filter(c => c.id !== viewingClientId);
  lsSave(LS.clients, clientsData);
  closeClientPanel();
  showToast('Client deleted', 'info');
  renderClientStats();
  renderClientGrid(clientsData);
  loadHomeStats();
}
