// ── Cold Calls — localStorage ─────────────────────────────────────────────────
let ccAllData = [];
let ccFilter  = 'all';
let ccQuery   = '';
let vmRecordId = null;

// ── Load ──────────────────────────────────────────────────────────────────────
function loadColdCalls() {
  ccAllData = lsGet(LS.coldCalls);
  if (!ccAllData.length) seedTestData();
  renderCcSheet();
  updateCcStats();
  updateCcBadge();
  checkFollowUps();
  initCcDropzone();
}

// ── Test data seed (first load only) ─────────────────────────────────────────
function seedTestData() {
  const now = new Date().toISOString();
  ccAllData = [
    { id: newId(), company_name: 'Acme Plumbing Ltd',         phone: '01234 567890', email: 'info@acmeplumbing.co.uk',     contact_name: 'John Smith',    website: 'https://acmeplumbing.co.uk',     outcome: null,        notes: '',                             scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
    { id: newId(), company_name: 'Bright Sparks Electrical',  phone: '07911 123456', email: 'admin@brightsparks.co.uk',    contact_name: 'Sarah Connor',  website: 'https://brightsparks.co.uk',    outcome: 'voicemail', notes: 'Left message at 2pm',          scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
    { id: newId(), company_name: 'Green Leaf Landscaping',    phone: '01482 334455', email: 'hello@greenleaf.co.uk',       contact_name: 'Mike Green',    website: 'https://greenleaflandscaping.co.uk', outcome: 'follow_up', notes: 'Interested, call back Thursday', scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
    { id: newId(), company_name: 'Premier Builders Ltd',      phone: '07800 900123', email: 'office@premierbuilders.co.uk',contact_name: 'Dave Wilson',   website: 'https://premierbuilders.co.uk', outcome: 'booked',    notes: 'Discovery call booked for Monday 10am', scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
    { id: newId(), company_name: 'Swift HVAC Services',       phone: '01772 987654', email: 'info@swifthvac.co.uk',        contact_name: 'James Taylor',  website: 'https://swifthvac.co.uk',       outcome: 'hung_up',   notes: '',                             scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
    { id: newId(), company_name: 'Diamond Windows & Doors',   phone: '07999 654321', email: 'sales@diamondwindows.co.uk', contact_name: 'Lisa Thompson', website: '',                               outcome: null,        notes: '',                             scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
    { id: newId(), company_name: 'Prestige Roofing UK',       phone: '01614 223344', email: 'contact@prestigeroofing.co.uk', contact_name: 'Tom Harris', website: 'https://prestigeroofing.co.uk', outcome: 'voicemail', notes: '', scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
    { id: newId(), company_name: 'Clear View Glazing',        phone: '07722 111222', email: '',                            contact_name: '',              website: '',                               outcome: null,        notes: '',                             scraped_data: null, ai_email_message: null, ai_social_message: null, created_at: now },
  ];
  lsSave(LS.coldCalls, ccAllData);
}

// ── Render sheet ──────────────────────────────────────────────────────────────
function renderCcSheet() {
  const tbody    = document.getElementById('cc-sheet-body');
  const filtered = getFilteredCc();

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="no-hover"><td colspan="9">' +
      '<div class="empty"><div class="empty-icon">☎</div>' +
      '<p class="empty-text">No entries — drop a CSV/spreadsheet above or click + Add Row</p>' +
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

  const hasOutreach = r.ai_email_message || r.ai_social_message;

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
    <td style="text-align:center">${hasOutreach ? `<button class="btn btn-ghost btn-sm" style="font-size:10px;padding:3px 7px" onclick="viewOutreach('${r.id}')">✦ View</button>` : ''}</td>
    <td><button class="cc-delete-btn" onclick="deleteCcRow('${r.id}',this.closest('tr'))" title="Delete">✕</button></td>
  </tr>`;
}

// ── Add blank row ─────────────────────────────────────────────────────────────
function addNewCcRow() {
  const record = {
    id: newId(), company_name: '', phone: '', email: '', contact_name: '',
    website: null, outcome: null, notes: '',
    scraped_data: null, ai_email_message: null, ai_social_message: null,
    created_at: new Date().toISOString()
  };
  ccAllData.unshift(record);
  lsSave(LS.coldCalls, ccAllData);

  const tbody    = document.getElementById('cc-sheet-body');
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

  if (value === 'booked') {
    showToast('🎉 Booked!', 'success');
    // Navigate to booked section and highlight this record
    setTimeout(() => { navigate('booked'); }, 400);
  } else if (value === 'follow_up') {
    showToast('Follow-up logged', 'info');
  } else if (value === 'voicemail') {
    showToast('Voicemail logged', 'info');
    setTimeout(() => openVoicemailModal(rec), 300);
  }
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
    const records = rows.map(r => ({
      ...r, id: newId(), outcome: null,
      website: r.website || null, scraped_data: null,
      ai_email_message: null, ai_social_message: null,
      created_at: now
    }));
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
    website:      get('website','url','web','site')     || null,
    notes:        get('notes','note','comments')        || null,
  };
}

// ── Voicemail outreach modal ──────────────────────────────────────────────────
function openVoicemailModal(rec) {
  vmRecordId = rec.id;
  document.getElementById('vm-company-name').textContent = rec.company_name || 'this company';
  document.getElementById('vm-contact').textContent = [rec.contact_name, rec.email].filter(Boolean).join(' · ') || '—';
  document.getElementById('vm-website').value = rec.website || '';
  document.getElementById('vm-progress').style.display = 'none';
  document.getElementById('vm-results').style.display = 'none';
  clearAlert('vm-alert');
  // Reset steps
  ['vm-step-1','vm-step-2','vm-step-3','vm-step-4'].forEach((id,i) => {
    const labels = ['Scraping website…','Finding socials…','Crafting AI message…','Sending email…'];
    const el = document.getElementById(id);
    if (el) { el.textContent = `◦ ${labels[i]}`; el.className = 'scrape-step'; }
  });
  openModal('voicemail-modal');
}

async function runVoicemailOutreach() {
  const rec = ccAllData.find(r => r.id === vmRecordId);
  if (!rec) return;

  // Save website if entered
  const websiteInput = document.getElementById('vm-website').value.trim();
  if (websiteInput) { rec.website = websiteInput; lsSave(LS.coldCalls, ccAllData); }

  setLoading('vm-run-btn', true);
  clearAlert('vm-alert');

  const progress  = document.getElementById('vm-progress');
  const steps     = ['vm-step-1','vm-step-2','vm-step-3','vm-step-4'];
  const stepLabels= ['Scraping website…','Finding socials…','Crafting AI message…','Sending email…'];
  progress.style.display = 'block';
  steps.forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = `◦ ${stepLabels[i]}`; el.className = 'scrape-step'; }
  });

  let stepIdx = 0;
  const timer = setInterval(() => {
    if (stepIdx > 0) {
      const prev = document.getElementById(steps[stepIdx-1]);
      if (prev) { prev.textContent = `✓ ${stepLabels[stepIdx-1]}`; prev.className = 'scrape-step done'; }
    }
    if (stepIdx < steps.length) {
      const cur = document.getElementById(steps[stepIdx]);
      if (cur) cur.className = 'scrape-step running';
    }
    stepIdx++;
    if (stepIdx >= steps.length) clearInterval(timer);
  }, 1800);

  try {
    const res = await fetch(CC_VOICEMAIL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name:  rec.company_name,
        contact_name:  rec.contact_name,
        phone:         rec.phone,
        email:         rec.email,
        website:       rec.website || websiteInput,
        notes:         rec.notes,
      })
    });

    clearInterval(timer);
    steps.forEach((id,i) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = `✓ ${stepLabels[i]}`; el.className = 'scrape-step done'; }
    });

    if (!res.ok) throw new Error('Webhook returned ' + res.status);
    const data = await res.json();

    // Store results on the record
    rec.scraped_data      = data.scraped || data.company_info || null;
    rec.ai_email_message  = data.email_message || data.message || '';
    rec.ai_social_message = data.social_message || data.outreach || data.email_message || '';
    rec.email_sent        = data.email_sent || false;
    lsSave(LS.coldCalls, ccAllData);

    // Show results
    const emailMsg  = rec.ai_email_message  || '';
    const socialMsg = rec.ai_social_message || '';
    document.getElementById('vm-email-message').textContent  = emailMsg;
    document.getElementById('vm-social-message').textContent = socialMsg;

    const emailSentNote = document.getElementById('vm-email-sent');
    if (emailSentNote) emailSentNote.style.display = rec.email_sent ? 'block' : 'none';

    // Populate social links from scraped data
    const scraped = rec.scraped_data || {};
    const igLink  = document.getElementById('vm-ig-link');
    const liLink  = document.getElementById('vm-li-link');
    if (igLink)  igLink.href    = scraped.instagram_url || scraped.instagram || '#';
    if (liLink)  liLink.href    = scraped.linkedin_url  || scraped.linkedin  || '#';
    if (igLink)  igLink.style.display = (scraped.instagram_url || scraped.instagram)  ? 'inline-flex' : 'none';
    if (liLink)  liLink.style.display = (scraped.linkedin_url  || scraped.linkedin)   ? 'inline-flex' : 'none';

    document.getElementById('vm-results').style.display = 'block';
    showAlert('vm-alert', rec.email_sent ? '✓ Email sent automatically!' : '✓ Messages generated — email address not found, send manually.', 'success');

    // Refresh sheet row so "✦ View" button appears
    renderCcSheet();

  } catch (e) {
    clearInterval(timer);
    showAlert('vm-alert', 'Failed: ' + e.message + '. Check the webhook is live in n8n.');
  }

  setLoading('vm-run-btn', false);
}

function copyVmMessage(which) {
  const text = which === 'email'
    ? document.getElementById('vm-email-message').textContent
    : document.getElementById('vm-social-message').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied ✓', 'success'));
}

// ── View stored outreach ──────────────────────────────────────────────────────
function viewOutreach(id) {
  const rec = ccAllData.find(r => r.id === id);
  if (!rec) return;
  openVoicemailModal(rec);

  // Pre-fill results if already fetched
  if (rec.ai_email_message || rec.ai_social_message) {
    setTimeout(() => {
      document.getElementById('vm-email-message').textContent  = rec.ai_email_message  || '';
      document.getElementById('vm-social-message').textContent = rec.ai_social_message || '';
      document.getElementById('vm-results').style.display = 'block';

      const scraped = rec.scraped_data || {};
      const igLink  = document.getElementById('vm-ig-link');
      const liLink  = document.getElementById('vm-li-link');
      if (igLink) { igLink.href = scraped.instagram_url || '#'; igLink.style.display = scraped.instagram_url ? 'inline-flex' : 'none'; }
      if (liLink) { liLink.href = scraped.linkedin_url  || '#'; liLink.style.display = scraped.linkedin_url  ? 'inline-flex' : 'none'; }

      const emailSentNote = document.getElementById('vm-email-sent');
      if (emailSentNote) emailSentNote.style.display = rec.email_sent ? 'block' : 'none';
    }, 100);
  }
}

// ── Booked section ────────────────────────────────────────────────────────────
function renderBookedSection() {
  ccAllData = lsGet(LS.coldCalls);
  const booked = ccAllData.filter(r => r.outcome === 'booked');
  const grid   = document.getElementById('booked-grid');
  if (!grid) return;

  const badge = document.getElementById('booked-count-badge');
  if (badge) badge.textContent = booked.length;

  if (!booked.length) {
    grid.innerHTML = `<div style="grid-column:1/-1" class="empty"><div class="empty-icon">📅</div><p class="empty-text">No booked calls yet — mark a call as Booked in Cold Calls to see it here</p></div>`;
    return;
  }

  grid.innerHTML = booked.map(r => {
    const scraped = r.scraped_data || {};
    const socials = [
      scraped.instagram_url ? `<a href="${esc(scraped.instagram_url)}" target="_blank" class="btn btn-ghost btn-sm">Instagram ↗</a>` : '',
      scraped.linkedin_url  ? `<a href="${esc(scraped.linkedin_url)}"  target="_blank" class="btn btn-ghost btn-sm">LinkedIn ↗</a>`  : '',
      r.website             ? `<a href="${esc(r.website)}"             target="_blank" class="btn btn-ghost btn-sm">Website ↗</a>`   : '',
    ].filter(Boolean).join('');

    return `
      <div class="booked-card">
        <div class="booked-card-header">
          <div>
            <div class="booked-card-company">${esc(r.company_name || 'Unnamed')}</div>
            ${r.contact_name ? `<div class="booked-card-owner">👤 ${esc(r.contact_name)}</div>` : ''}
          </div>
          <span class="badge badge-green" style="font-size:11px">✓ Booked</span>
        </div>

        <div class="booked-contact-row">
          ${r.phone ? `<span>📞 ${esc(r.phone)}</span>` : ''}
          ${r.email ? `<span>✉ ${esc(r.email)}</span>` : ''}
        </div>

        ${scraped.description ? `
          <div class="booked-section-label">About</div>
          <div class="booked-bio">${esc(scraped.description)}</div>` : ''}

        ${r.notes ? `
          <div class="booked-section-label">Notes</div>
          <div class="booked-bio">${esc(r.notes)}</div>` : ''}

        ${socials ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">${socials}</div>` : ''}

        ${r.ai_email_message ? `
          <div class="booked-section-label" style="color:var(--purple-lt)">✦ AI Outreach Message</div>
          <div class="outreach-box" style="font-size:12px">${esc(r.ai_email_message)}</div>
          <button class="copy-btn" style="margin-top:6px" onclick="navigator.clipboard.writeText(${JSON.stringify(r.ai_email_message)}).then(()=>showToast('Copied ✓','success'))">⎘ Copy message</button>` : ''}

        <div style="margin-top:12px;font-size:11px;color:var(--muted)">Added ${timeAgo(r.created_at)}</div>
      </div>`;
  }).join('');
}
