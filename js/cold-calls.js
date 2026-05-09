// ── Cold Calls module ─────────────────────────────────────────────────────────
let coldCallsData = [];
let ccFilter = 'all';

async function loadColdCalls() {
  try {
    const { data, error } = await window.sb
      .from('cold_calls')
      .select('*')
      .order('called_at', { ascending: false });

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        showColdCallsSetup();
        return;
      }
      throw error;
    }

    coldCallsData = data || [];
    renderColdCallStats();
    renderColdCallTable(coldCallsData);
    renderCallbacksAlert();
  } catch (e) {
    console.error('Cold calls load error:', e);
  }
}

function showColdCallsSetup() {
  document.getElementById('cc-tbody').innerHTML = `
    <tr class="no-hover"><td colspan="7">
      <div class="empty">
        <div class="empty-icon">☎</div>
        <p class="empty-text">Cold calls table not yet created in Supabase.<br>
        <a href="#" onclick="showCreateTableSQL()" style="color:var(--purple-lt)">View setup SQL →</a></p>
      </div>
    </td></tr>`;
}

function renderColdCallStats() {
  const now = new Date();
  const weekStart  = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0,0,0,0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekCalls  = coldCallsData.filter(c => new Date(c.called_at) >= weekStart);
  const monthCalls = coldCallsData.filter(c => new Date(c.called_at) >= monthStart);

  const cbRate = monthCalls.length
    ? Math.round(monthCalls.filter(c => c.outcome === 'callback').length / monthCalls.length * 100)
    : 0;
  const intRate = monthCalls.length
    ? Math.round(monthCalls.filter(c => c.outcome === 'interested').length / monthCalls.length * 100)
    : 0;

  document.getElementById('cc-stat-week').textContent    = weekCalls.length;
  document.getElementById('cc-stat-month').textContent   = monthCalls.length;
  document.getElementById('cc-stat-cb-rate').textContent = cbRate + '%';
  document.getElementById('cc-stat-int-rate').textContent= intRate + '%';
}

function renderCallbacksAlert() {
  const today = new Date().toISOString().slice(0,10);
  const due = coldCallsData.filter(c =>
    c.outcome === 'callback' && c.next_action_date && c.next_action_date <= today
  );

  const alertEl = document.getElementById('cc-callbacks-alert');
  if (due.length) {
    alertEl.style.display = 'flex';
    document.getElementById('cc-callbacks-count').textContent =
      `${due.length} callback${due.length !== 1 ? 's' : ''} due today`;
    document.getElementById('cc-callbacks-list').textContent =
      due.map(c => c.company_name).join(', ');
  } else {
    alertEl.style.display = 'none';
  }
}

function renderColdCallTable(data) {
  const tbody = document.getElementById('cc-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr class="no-hover"><td colspan="7"><div class="empty"><div class="empty-icon">☎</div><p class="empty-text">No calls logged yet — click Log a Call</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr onclick="openEditCallModal('${c.id}')">
      <td class="bold">${esc(c.company_name||'—')}</td>
      <td>${esc(c.contact_name||'—')}</td>
      <td style="font-size:12px;white-space:nowrap">${fmtDateTime(c.called_at)}</td>
      <td><span class="outcome-pill outcome-${c.outcome}">${outcomeLabel(c.outcome)}</span></td>
      <td style="font-size:12px">${esc(c.next_action||'—')}${c.next_action_date ? `<br><span style="font-size:11px;color:var(--muted)">${c.next_action_date}</span>` : ''}</td>
      <td style="font-size:12px;color:var(--text2);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.notes||'—')}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteCall('${c.id}')">Delete</button>
      </td>
    </tr>`).join('');
}

function setCcFilter(f, el) {
  ccFilter = f;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  filterCalls();
}

function filterCalls() {
  const q    = (document.getElementById('cc-search').value || '').toLowerCase();
  const date = document.getElementById('cc-date-filter').value;

  let data = coldCallsData;
  if (ccFilter !== 'all') data = data.filter(c => c.outcome === ccFilter);
  if (q) data = data.filter(c => (c.company_name||'').toLowerCase().includes(q) || (c.contact_name||'').toLowerCase().includes(q));
  if (date) data = data.filter(c => c.called_at?.startsWith(date));

  renderColdCallTable(data);
}

// ── Log / Edit call modal ─────────────────────────────────────────────────────
let editCallId = null;

function openLogCallModal() {
  editCallId = null;
  clearAlert('cc-modal-alert');
  document.getElementById('cc-company').value    = '';
  document.getElementById('cc-contact').value    = '';
  document.getElementById('cc-phone').value      = '';
  document.getElementById('cc-outcome').value    = '';
  document.getElementById('cc-next-action').value= '';
  document.getElementById('cc-next-date').value  = '';
  document.getElementById('cc-notes').value      = '';
  // default datetime to now
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  document.getElementById('cc-datetime').value = local;
  openModal('log-call-modal');
}

function openEditCallModal(id) {
  const c = coldCallsData.find(x => x.id === id);
  if (!c) return;
  editCallId = id;
  clearAlert('cc-modal-alert');
  document.getElementById('cc-company').value    = c.company_name || '';
  document.getElementById('cc-contact').value    = c.contact_name || '';
  document.getElementById('cc-phone').value      = c.phone || '';
  document.getElementById('cc-outcome').value    = c.outcome || '';
  document.getElementById('cc-next-action').value= c.next_action || '';
  document.getElementById('cc-next-date').value  = c.next_action_date || '';
  document.getElementById('cc-notes').value      = c.notes || '';
  if (c.called_at) {
    const d = new Date(c.called_at);
    document.getElementById('cc-datetime').value =
      new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  }
  openModal('log-call-modal');
}

async function saveCall() {
  const company  = document.getElementById('cc-company').value.trim();
  const outcome  = document.getElementById('cc-outcome').value;
  const datetime = document.getElementById('cc-datetime').value;

  if (!company) { showAlert('cc-modal-alert', 'Company name is required.'); return; }
  if (!outcome) { showAlert('cc-modal-alert', 'Please select an outcome.'); return; }

  setLoading('save-call-btn', true);
  clearAlert('cc-modal-alert');

  const payload = {
    company_name:     company,
    contact_name:     document.getElementById('cc-contact').value.trim() || null,
    phone:            document.getElementById('cc-phone').value.trim() || null,
    called_at:        datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
    outcome,
    next_action:      document.getElementById('cc-next-action').value.trim() || null,
    next_action_date: document.getElementById('cc-next-date').value || null,
    notes:            document.getElementById('cc-notes').value.trim() || null,
  };

  try {
    let error;
    if (editCallId) {
      ({ error } = await window.sb.from('cold_calls').update(payload).eq('id', editCallId));
    } else {
      ({ error } = await window.sb.from('cold_calls').insert(payload));
    }
    if (error) throw error;

    closeModal('log-call-modal');
    showToast('Call logged ✓', 'success');
    await loadColdCalls();
    loadHomeStats();
  } catch (e) {
    showAlert('cc-modal-alert', 'Save failed: ' + e.message);
  }

  setLoading('save-call-btn', false);
}

async function deleteCall(id) {
  if (!confirm('Delete this call record?')) return;
  const { error } = await window.sb.from('cold_calls').delete().eq('id', id);
  if (!error) {
    coldCallsData = coldCallsData.filter(c => c.id !== id);
    renderColdCallStats();
    renderColdCallTable(coldCallsData);
    renderCallbacksAlert();
    loadHomeStats();
  }
}
