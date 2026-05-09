// ── Cold Calls — spreadsheet with file import ─────────────────────────────────
let ccAllData  = [];
let ccFilter   = 'all';
let ccQuery    = '';

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadColdCalls() {
  try {
    const { data, error } = await window.sb
      .from('cold_calls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        document.getElementById('cc-sheet-body').innerHTML =
          '<tr class="no-hover"><td colspan="8"><div class="empty"><div class="empty-icon">☎</div>' +
          '<p class="empty-text">Run SUPABASE_SETUP.sql to create the cold_calls table</p></div></td></tr>';
        return;
      }
      throw error;
    }

    ccAllData = data || [];
    renderCcSheet();
    updateCcStats();
    updateCcBadge();
    checkFollowUps();
    initCcDropzone();
  } catch (e) {
    console.error('Cold calls error:', e);
  }
}

// ── Render sheet ──────────────────────────────────────────────────────────────
function renderCcSheet() {
  const tbody = document.getElementById('cc-sheet-body');
  const filtered = getFilteredCc();

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="no-hover"><td colspan="8">' +
      '<div class="empty"><div class="empty-icon">☎</div>' +
      '<p class="empty-text">No entries yet — drop a CSV/spreadsheet above or click + Add Row</p>' +
      '</div></td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((r, i) => makeCcRow(r, i)).join('');
}

function getFilteredCc() {
  return ccAllData.filter(r => {
    const matchFilter =
      ccFilter === 'all' ? true :
      ccFilter === ''    ? !r.outcome :
      r.outcome === ccFilter;
    const matchQ = !ccQuery ||
      (r.company_name  || '').toLowerCase().includes(ccQuery) ||
      (r.contact_name  || '').toLowerCase().includes(ccQuery) ||
      (r.phone         || '').includes(ccQuery) ||
      (r.email         || '').toLowerCase().includes(ccQuery);
    return matchFilter && matchQ;
  });
}

function makeCcRow(r, idx) {
  const opts = [
    ['', '— Not called'],
    ['booked',    '✓  Booked'],
    ['follow_up', '↻  Follow Up'],
    ['voicemail', '📩  Voicemail'],
    ['hung_up',   '✕  Hung Up'],
  ].map(([v, l]) => `<option value="${v}"${r.outcome===v?' selected':''}>${l}</option>`).join('');

  return `<tr class="cc-row" data-id="${r.id}" data-outcome="${r.outcome||''}">
    <td class="cc-td-num">${idx + 1}</td>
    <td><input class="cc-cell" type="text"  value="${esc(r.company_name||'')}"  placeholder="Company name…"  onblur="saveCcCell('${r.id}','company_name',this.value)"></td>
    <td><input class="cc-cell" type="tel"   value="${esc(r.phone||'')}"         placeholder="Phone…"         onblur="saveCcCell('${r.id}','phone',this.value)"></td>
    <td><input class="cc-cell" type="email" value="${esc(r.email||'')}"         placeholder="Email…"         onblur="saveCcCell('${r.id}','email',this.value)"></td>
    <td><input class="cc-cell" type="text"  value="${esc(r.contact_name||'')}"  placeholder="Owner name…"    onblur="saveCcCell('${r.id}','contact_name',this.value)"></td>
    <td class="cc-outcome-cell">
      <select class="cc-outcome-select" onchange="saveCcOutcome('${r.id}',this.value,this.closest('tr'))">${opts}</select>
    </td>
    <td><input class="cc-cell" type="text"  value="${esc(r.notes||'')}"         placeholder="Notes…"         onblur="saveCcCell('${r.id}','notes',this.value)"></td>
    <td><button class="cc-delete-btn" onclick="deleteCcRow('${r.id}',this.closest('tr'))" title="Delete row">✕</button></td>
  </tr>`;
}

// ── Add blank row ─────────────────────────────────────────────────────────────
async function addNewCcRow() {
  try {
    const { data, error } = await window.sb
      .from('cold_calls').insert({ company_name: '' }).select().single();
    if (error) throw error;

    ccAllData.unshift(data);
    const tbody = document.getElementById('cc-sheet-body');
    const emptyRow = tbody.querySelector('.no-hover');
    if (emptyRow) emptyRow.remove();

    const tmp = document.createElement('tbody');
    tmp.innerHTML = makeCcRow(data, 0);
    const newRow = tmp.firstElementChild;
    tbody.insertBefore(newRow, tbody.firstChild);
    newRow.querySelector('.cc-cell')?.focus();
    updateCcBadge();
    updateCcStats();
  } catch (e) {
    showToast('Failed to add row: ' + e.message, 'error');
  }
}

// ── Inline save ───────────────────────────────────────────────────────────────
async function saveCcCell(id, field, value) {
  try {
    const { error } = await window.sb
      .from('cold_calls').update({ [field]: value || null }).eq('id', id);
    if (error) throw error;
    const rec = ccAllData.find(r => r.id === id);
    if (rec) rec[field] = value || null;
  } catch (e) {
    showToast('Save failed', 'error');
  }
}

async function saveCcOutcome(id, value, rowEl) {
  rowEl.dataset.outcome = value;
  try {
    const { error } = await window.sb
      .from('cold_calls').update({ outcome: value || null }).eq('id', id);
    if (error) throw error;
    const rec = ccAllData.find(r => r.id === id);
    if (rec) rec.outcome = value || null;
    updateCcStats();

    if (value === 'booked') showToast('🎉 Booked!', 'success');
    else if (value === 'follow_up') showToast('Follow-up logged', 'info');
  } catch (e) {
    showToast('Save failed', 'error');
  }
}

// ── Delete row ────────────────────────────────────────────────────────────────
async function deleteCcRow(id, rowEl) {
  try {
    const { error } = await window.sb.from('cold_calls').delete().eq('id', id);
    if (error) throw error;
    ccAllData = ccAllData.filter(r => r.id !== id);
    rowEl.style.cssText = 'opacity:0;transform:translateX(-10px);transition:all 220ms ease';
    setTimeout(() => { rowEl.remove(); updateCcBadge(); updateCcStats(); }, 220);
  } catch (e) {
    showToast('Delete failed', 'error');
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateCcStats() {
  const booked   = ccAllData.filter(r => r.outcome === 'booked').length;
  const followUp = ccAllData.filter(r => r.outcome === 'follow_up').length;
  const called   = ccAllData.filter(r => r.outcome).length;
  const conv     = called ? Math.round(booked / called * 100) : 0;
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = ccAllData.filter(r => r.created_at && new Date(r.created_at) >= weekAgo).length;

  countUp(document.getElementById('cc-stat-week'),   thisWeek);
  countUp(document.getElementById('cc-stat-booked'), booked);
  countUp(document.getElementById('cc-stat-follow'),  followUp);
  document.getElementById('cc-stat-conv').textContent = conv + '%';
}

function updateCcBadge() {
  const el = document.getElementById('cc-count-badge');
  if (el) el.textContent = ccAllData.length;
}

function checkFollowUps() {
  const today = new Date().toISOString().slice(0, 10);
  const due = ccAllData.filter(r =>
    r.outcome === 'follow_up' && r.next_action_date && r.next_action_date <= today
  );
  const alertEl = document.getElementById('cc-callbacks-alert');
  if (!alertEl) return;
  if (due.length) {
    alertEl.style.display = 'flex';
    document.getElementById('cc-callbacks-count').textContent =
      `${due.length} follow-up${due.length > 1 ? 's' : ''} due`;
    document.getElementById('cc-callbacks-list').textContent =
      due.slice(0, 4).map(r => r.company_name).join(', ');
  } else {
    alertEl.style.display = 'none';
  }
}

// ── Filter / search ───────────────────────────────────────────────────────────
function setCcFilter(value, btn) {
  ccFilter = value;
  document.querySelectorAll('#sec-cold-calls .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderCcSheet();
}

function filterCalls() {
  ccQuery = (document.getElementById('cc-search')?.value || '').toLowerCase();
  renderCcSheet();
}

// ── Dropzone ──────────────────────────────────────────────────────────────────
function initCcDropzone() {
  const zone = document.getElementById('cc-dropzone');
  if (!zone || zone._init) return;
  zone._init = true;

  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processImportFile(file);
  });
}

function handleCcFileSelect(e) {
  const file = e.target.files[0];
  if (file) processImportFile(file);
  e.target.value = '';
}

async function processImportFile(file) {
  const banner = document.getElementById('cc-import-banner');
  if (banner) { banner.textContent = `Importing ${file.name}…`; banner.classList.add('show'); }

  try {
    let rows = [];
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv') || file.type === 'text/csv') {
      rows = await parseCsvFile(file);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      rows = await parseXlsxFile(file);
    } else {
      showToast('Please use a .csv or .xlsx file', 'error');
      return;
    }

    if (!rows.length) { showToast('No usable rows found in file', 'error'); return; }

    if (banner) banner.textContent = `Saving ${rows.length} rows…`;
    await importCcRows(rows);
    showToast(`Imported ${rows.length} rows ✓`, 'success');
    await loadColdCalls();
  } catch (e) {
    showToast('Import failed: ' + e.message, 'error');
  } finally {
    if (banner) banner.classList.remove('show');
  }
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { resolve([]); return; }
        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
        const rows = lines.slice(1)
          .map(l => mapToRecord(headers, parseCsvLine(l)))
          .filter(r => r.company_name);
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function parseCsvLine(line) {
  const vals = []; let cur = ''; let inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  vals.push(cur.trim());
  return vals;
}

// ── Excel parser ──────────────────────────────────────────────────────────────
async function parseXlsxFile(file) {
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (raw.length < 2) { resolve([]); return; }
        const headers = raw[0].map(h => String(h || '').trim().toLowerCase());
        const rows = raw.slice(1)
          .map(row => mapToRecord(headers, row.map(v => String(v == null ? '' : v).trim())))
          .filter(r => r.company_name);
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Column mapper (flexible header matching) ──────────────────────────────────
function mapToRecord(headers, values) {
  const get = (...keys) => {
    for (const k of keys) {
      const idx = headers.findIndex(h => h.includes(k));
      if (idx !== -1 && values[idx]) return String(values[idx]).trim();
    }
    return null;
  };
  // Positional fallback if no headers matched
  return {
    company_name: get('company', 'business', 'organisation', 'organization', 'name') || values[0] || null,
    phone:        get('phone', 'tel', 'mobile', 'number', 'contact number')          || values[1] || null,
    email:        get('email', 'e-mail', 'mail')                                     || values[2] || null,
    contact_name: get('owner', 'contact', 'person', 'full name', 'first name')       || values[3] || null,
    outcome:      null,
  };
}

// ── Bulk insert ───────────────────────────────────────────────────────────────
async function importCcRows(rows) {
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await window.sb.from('cold_calls').insert(rows.slice(i, i + 50));
    if (error) throw error;
  }
}
