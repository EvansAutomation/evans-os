// ── Cold Calls — localStorage, spreadsheet style ──────────────────────────────
let ccAllData = [];
let ccFilter  = 'all';
let ccQuery   = '';

// ── Load ──────────────────────────────────────────────────────────────────────
function loadColdCalls() {
  ccAllData = lsGet(LS.coldCalls);
  renderCcSheet();
  updateCcStats();
  updateCcBadge();
  checkFollowUps();
  initCcDropzone();
}

// ── Render sheet ──────────────────────────────────────────────────────────────
function renderCcSheet() {
  const tbody    = document.getElementById('cc-sheet-body');
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
    ['',          '— Not called'],
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
    <td><button class="cc-delete-btn" onclick="deleteCcRow('${r.id}',this.closest('tr'))" title="Delete">✕</button></td>
  </tr>`;
}

// ── Add blank row ─────────────────────────────────────────────────────────────
function addNewCcRow() {
  const record = { id: newId(), company_name: '', phone: '', email: '', contact_name: '', outcome: null, notes: '', created_at: new Date().toISOString() };
  ccAllData.unshift(record);
  lsSave(LS.coldCalls, ccAllData);

  const tbody   = document.getElementById('cc-sheet-body');
  const emptyRow = tbody.querySelector('.no-hover');
  if (emptyRow) emptyRow.remove();

  const tmp = document.createElement('tbody');
  tmp.innerHTML = makeCcRow(record, 0);
  tbody.insertBefore(tmp.firstElementChild, tbody.firstChild);
  tbody.querySelector('.cc-cell')?.focus();
  updateCcBadge();
  updateCcStats();
}

// ── Inline save ───────────────────────────────────────────────────────────────
function saveCcCell(id, field, value) {
  const rec = ccAllData.find(r => r.id === id);
  if (!rec) return;
  rec[field] = value || null;
  lsSave(LS.coldCalls, ccAllData);
}

function saveCcOutcome(id, value, rowEl) {
  rowEl.dataset.outcome = value;
  const rec = ccAllData.find(r => r.id === id);
  if (!rec) return;
  rec.outcome = value || null;
  lsSave(LS.coldCalls, ccAllData);
  updateCcStats();
  loadHomeStats();

  if (value === 'booked')    showToast('🎉 Booked!', 'success');
  else if (value === 'follow_up') showToast('Follow-up logged', 'info');
}

// ── Delete row ────────────────────────────────────────────────────────────────
function deleteCcRow(id, rowEl) {
  ccAllData = ccAllData.filter(r => r.id !== id);
  lsSave(LS.coldCalls, ccAllData);
  rowEl.style.cssText = 'opacity:0;transform:translateX(-10px);transition:all 220ms ease';
  setTimeout(() => { rowEl.remove(); updateCcBadge(); updateCcStats(); }, 220);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateCcStats() {
  const booked   = ccAllData.filter(r => r.outcome === 'booked').length;
  const followUp = ccAllData.filter(r => r.outcome === 'follow_up').length;
  const called   = ccAllData.filter(r => r.outcome).length;
  const conv     = called ? Math.round(booked / called * 100) : 0;
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = ccAllData.filter(r => new Date(r.created_at) >= weekAgo).length;

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
  const due   = ccAllData.filter(r => r.outcome === 'follow_up' && r.next_action_date && r.next_action_date <= today);
  const alertEl = document.getElementById('cc-callbacks-alert');
  if (!alertEl) return;
  if (due.length) {
    alertEl.style.display = 'flex';
    document.getElementById('cc-callbacks-count').textContent = `${due.length} follow-up${due.length > 1 ? 's' : ''} due`;
    document.getElementById('cc-callbacks-list').textContent  = due.slice(0, 4).map(r => r.company_name).join(', ');
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
      showToast('Use a .csv or .xlsx file', 'error'); return;
    }
    if (!rows.length) { showToast('No usable rows found', 'error'); return; }

    const now = new Date().toISOString();
    const records = rows.map(r => ({ ...r, id: newId(), outcome: null, created_at: now }));
    ccAllData = [...records, ...ccAllData];
    lsSave(LS.coldCalls, ccAllData);
    showToast(`Imported ${records.length} rows ✓`, 'success');
    loadColdCalls();
    loadHomeStats();
  } catch (e) {
    showToast('Import failed: ' + e.message, 'error');
  } finally {
    if (banner) banner.classList.remove('show');
  }
}

// ── Parsers ───────────────────────────────────────────────────────────────────
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { resolve([]); return; }
        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
        resolve(lines.slice(1).map(l => mapToRecord(headers, parseCsvLine(l))).filter(r => r.company_name));
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
        const wb  = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (raw.length < 2) { resolve([]); return; }
        const headers = raw[0].map(h => String(h||'').trim().toLowerCase());
        resolve(raw.slice(1).map(row => mapToRecord(headers, row.map(v => String(v==null?'':v).trim()))).filter(r => r.company_name));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function mapToRecord(headers, values) {
  const get = (...keys) => {
    for (const k of keys) {
      const idx = headers.findIndex(h => h.includes(k));
      if (idx !== -1 && values[idx]) return String(values[idx]).trim();
    }
    return null;
  };
  return {
    company_name: get('company','business','organisation','organization','name') || values[0] || null,
    phone:        get('phone','tel','mobile','number')  || values[1] || null,
    email:        get('email','e-mail','mail')           || values[2] || null,
    contact_name: get('owner','contact','person','full name') || values[3] || null,
  };
}
