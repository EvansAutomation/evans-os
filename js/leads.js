// ── Leads module ──────────────────────────────────────────────────────────────
let leadsData = [];
let leadsFilter = 'all';
let viewingLeadId = null;

async function loadLeads() {
  try {
    const { data, error } = await window.sb
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        document.getElementById('leads-list').innerHTML = `
          <div class="empty">
            <div class="empty-icon">◉</div>
            <p class="empty-text">Leads table not yet created in Supabase.</p>
          </div>`;
        return;
      }
      throw error;
    }

    leadsData = data || [];
    renderLeads(leadsData);
  } catch (e) {
    console.error('Leads load error:', e);
  }
}

function renderLeads(data) {
  const container = document.getElementById('leads-list');
  if (!data.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">◉</div><p class="empty-text">No leads yet — click New Lead to add one</p></div>`;
    return;
  }

  container.innerHTML = data.map(l => `
    <div class="lead-card" onclick="openLeadDetail('${l.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div class="lead-card-name">${esc(l.company_name||'Unnamed')}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${statusBadgeClass(l.status)}">${l.status||'new'}</span>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openEditLead('${l.id}')">Edit</button>
        </div>
      </div>
      <div class="lead-card-meta">
        ${l.contact_name ? `<span>👤 ${esc(l.contact_name)}</span>` : ''}
        ${l.email ? `<span>✉ ${esc(l.email)}</span>` : ''}
        ${l.phone ? `<span>📞 ${esc(l.phone)}</span>` : ''}
        ${l.website ? `<span>🌐 ${esc(shortenUrl(l.website))}</span>` : ''}
        <span style="color:var(--muted)">${timeAgo(l.created_at)}</span>
      </div>
      ${l.ai_outreach_message ? `<div style="margin-top:8px;font-size:11px;color:var(--purple-lt);display:flex;align-items:center;gap:4px"><span>✦</span> Outreach message ready</div>` : ''}
    </div>`).join('');
}

function setLeadFilter(f, el) {
  leadsFilter = f;
  document.querySelectorAll('.lead-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  filterLeads();
}

function filterLeads() {
  const q = (document.getElementById('leads-search').value || '').toLowerCase();
  let data = leadsData;
  if (leadsFilter !== 'all') data = data.filter(l => l.status === leadsFilter);
  if (q) data = data.filter(l =>
    (l.company_name||'').toLowerCase().includes(q) ||
    (l.contact_name||'').toLowerCase().includes(q) ||
    (l.email||'').toLowerCase().includes(q)
  );
  renderLeads(data);
}

// ── New / Edit lead modal ─────────────────────────────────────────────────────
function openNewLeadModal() {
  document.getElementById('lead-edit-id').value = '';
  document.getElementById('lead-modal-title').textContent = 'New Lead';
  document.getElementById('lead-company').value   = '';
  document.getElementById('lead-website').value   = '';
  document.getElementById('lead-contact').value   = '';
  document.getElementById('lead-email').value     = '';
  document.getElementById('lead-phone').value     = '';
  document.getElementById('lead-status').value    = 'new';
  document.getElementById('lead-instagram').value = '';
  document.getElementById('lead-linkedin').value  = '';
  document.getElementById('lead-notes').value     = '';
  document.getElementById('lead-outreach').value  = '';
  document.getElementById('lead-scrape-url').value= '';
  document.getElementById('copy-outreach-btn').style.display = 'none';
  document.getElementById('scrape-progress').classList.remove('show');
  document.getElementById('post-analysis-box') && (document.getElementById('post-analysis-box').style.display = 'none');
  clearAlert('lead-modal-alert');
  openModal('new-lead-modal');
}

function openEditLead(id) {
  const l = leadsData.find(x => x.id === id);
  if (!l) return;
  document.getElementById('lead-edit-id').value   = id;
  document.getElementById('lead-modal-title').textContent = 'Edit Lead';
  document.getElementById('lead-company').value   = l.company_name || '';
  document.getElementById('lead-website').value   = l.website || '';
  document.getElementById('lead-contact').value   = l.contact_name || '';
  document.getElementById('lead-email').value     = l.email || '';
  document.getElementById('lead-phone').value     = l.phone || '';
  document.getElementById('lead-status').value    = l.status || 'new';
  document.getElementById('lead-instagram').value = l.instagram_url || '';
  document.getElementById('lead-linkedin').value  = l.linkedin_url || '';
  document.getElementById('lead-notes').value     = l.notes || '';
  document.getElementById('lead-outreach').value  = l.ai_outreach_message || '';
  document.getElementById('lead-scrape-url').value= l.website || '';
  document.getElementById('copy-outreach-btn').style.display = l.ai_outreach_message ? 'inline-flex' : 'none';
  document.getElementById('scrape-progress').classList.remove('show');
  clearAlert('lead-modal-alert');
  openModal('new-lead-modal');
}

// ── Scrape lead data ──────────────────────────────────────────────────────────
async function scrapeLeadData() {
  const url = document.getElementById('lead-scrape-url').value.trim();
  if (!url) { showAlert('lead-modal-alert', 'Enter a website URL first.'); return; }

  setLoading('scrape-btn', true);
  clearAlert('lead-modal-alert');

  const progress = document.getElementById('scrape-progress');
  progress.classList.add('show');

  const steps = ['scrape-step-1','scrape-step-2','scrape-step-3','scrape-step-4'];
  const stepLabels = ['Scraping website…','Extracting contacts…','Enriching with Apify…','Compiling results…'];

  steps.forEach((id,i) => {
    document.getElementById(id).textContent = `◦ ${stepLabels[i]}`;
    document.getElementById(id).className = 'scrape-step';
  });

  // Animate steps with delays to show progress
  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    if (stepIdx > 0) {
      document.getElementById(steps[stepIdx-1]).textContent = `✓ ${stepLabels[stepIdx-1]}`;
      document.getElementById(steps[stepIdx-1]).className = 'scrape-step done';
    }
    if (stepIdx < steps.length) {
      document.getElementById(steps[stepIdx]).className = 'scrape-step running';
    }
    stepIdx++;
    if (stepIdx >= steps.length) clearInterval(stepTimer);
  }, 1500);

  try {
    const res = await fetch(LEAD_SCRAPE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, website: url })
    });

    clearInterval(stepTimer);
    steps.forEach((id,i) => {
      document.getElementById(id).textContent = `✓ ${stepLabels[i]}`;
      document.getElementById(id).className = 'scrape-step done';
    });

    if (!res.ok) throw new Error('Scraper returned ' + res.status);

    const data = await res.json();

    // Auto-fill form fields with scraped data
    if (data.company_name || data.companyName)
      document.getElementById('lead-company').value = data.company_name || data.companyName;
    if (data.contact_name || data.contactName)
      document.getElementById('lead-contact').value = data.contact_name || data.contactName;
    if (data.email)
      document.getElementById('lead-email').value = data.email;
    if (data.phone)
      document.getElementById('lead-phone').value = data.phone;
    if (data.website)
      document.getElementById('lead-website').value = data.website;
    if (data.instagram_url || data.instagram)
      document.getElementById('lead-instagram').value = data.instagram_url || data.instagram;
    if (data.linkedin_url || data.linkedin)
      document.getElementById('lead-linkedin').value = data.linkedin_url || data.linkedin;
    if (data.description || data.about)
      document.getElementById('lead-notes').value = data.description || data.about;

    showAlert('lead-modal-alert', '✓ Lead data populated from research!', 'success');
  } catch (e) {
    clearInterval(stepTimer);
    showAlert('lead-modal-alert', 'Research failed: ' + e.message + '. You can still fill in details manually.');
  }

  setLoading('scrape-btn', false);
}

// ── Generate outreach ─────────────────────────────────────────────────────────
async function generateOutreach() {
  const company  = document.getElementById('lead-company').value.trim();
  const website  = document.getElementById('lead-website').value.trim();
  const contact  = document.getElementById('lead-contact').value.trim();
  const notes    = document.getElementById('lead-notes').value.trim();
  const instagram= document.getElementById('lead-instagram').value.trim();

  if (!company) { showAlert('lead-modal-alert', 'Add a company name first.'); return; }

  setLoading('gen-outreach-btn', true);
  clearAlert('lead-modal-alert');

  try {
    const res = await fetch(LEAD_OUTREACH_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: company, website, contact_name: contact, notes, instagram_url: instagram })
    });

    if (!res.ok) throw new Error('Outreach AI returned ' + res.status);

    const data = await res.json();
    const msg = data.message || data.outreach || data.text || data.reply || '';
    document.getElementById('lead-outreach').value = msg;
    document.getElementById('copy-outreach-btn').style.display = msg ? 'inline-flex' : 'none';
    showAlert('lead-modal-alert', '✓ Outreach message generated!', 'success');
  } catch (e) {
    showAlert('lead-modal-alert', 'Failed to generate outreach: ' + e.message);
  }

  setLoading('gen-outreach-btn', false);
}

function copyOutreach() {
  const msg = document.getElementById('lead-outreach').value;
  if (!msg) return;
  navigator.clipboard.writeText(msg).then(() => {
    const btn = document.getElementById('copy-outreach-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '⎘ Copy message'; }, 2000);
  });
}

// ── Save lead ─────────────────────────────────────────────────────────────────
async function saveLead() {
  const company = document.getElementById('lead-company').value.trim();
  if (!company) { showAlert('lead-modal-alert', 'Company name is required.'); return; }

  setLoading('save-lead-btn', true);
  clearAlert('lead-modal-alert');

  const editId = document.getElementById('lead-edit-id').value;
  const payload = {
    company_name:        company,
    website:             document.getElementById('lead-website').value.trim() || null,
    contact_name:        document.getElementById('lead-contact').value.trim() || null,
    email:               document.getElementById('lead-email').value.trim() || null,
    phone:               document.getElementById('lead-phone').value.trim() || null,
    status:              document.getElementById('lead-status').value || 'new',
    instagram_url:       document.getElementById('lead-instagram').value.trim() || null,
    linkedin_url:        document.getElementById('lead-linkedin').value.trim() || null,
    notes:               document.getElementById('lead-notes').value.trim() || null,
    ai_outreach_message: document.getElementById('lead-outreach').value.trim() || null,
  };

  try {
    let error;
    if (editId) {
      ({ error } = await window.sb.from('leads').update(payload).eq('id', editId));
    } else {
      ({ error } = await window.sb.from('leads').insert(payload));
    }
    if (error) throw error;

    closeModal('new-lead-modal');
    showToast('Lead saved ✓', 'success');
    await loadLeads();
    loadHomeStats();
  } catch (e) {
    showAlert('lead-modal-alert', 'Save failed: ' + e.message);
  }

  setLoading('save-lead-btn', false);
}

// ── Lead detail panel ─────────────────────────────────────────────────────────
function openLeadDetail(id) {
  const l = leadsData.find(x => x.id === id);
  if (!l) return;
  viewingLeadId = id;

  document.getElementById('ld-modal-company').textContent = l.company_name || 'Lead Detail';

  const socials = [
    l.instagram_url ? `<a href="${esc(l.instagram_url)}" target="_blank" class="btn btn-ghost btn-sm">Instagram ↗</a>` : '',
    l.linkedin_url  ? `<a href="${esc(l.linkedin_url)}"  target="_blank" class="btn btn-ghost btn-sm">LinkedIn ↗</a>`  : '',
    l.website       ? `<a href="${esc(l.website)}"       target="_blank" class="btn btn-ghost btn-sm">Website ↗</a>`   : '',
  ].filter(Boolean).join('');

  document.getElementById('ld-modal-body').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap">
      <span class="badge ${statusBadgeClass(l.status)}">${l.status||'new'}</span>
      <span style="font-size:12px;color:var(--muted)">Added ${fmtDate(l.created_at)}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:13px">
      <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Contact</div><div style="color:var(--text)">${esc(l.contact_name||'—')}</div></div>
      <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Email</div><div style="color:var(--text)">${esc(l.email||'—')}</div></div>
      <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Phone</div><div style="color:var(--text)">${esc(l.phone||'—')}</div></div>
      <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Website</div><div style="color:var(--text);font-size:12px;word-break:break-all">${esc(l.website||'—')}</div></div>
    </div>

    ${socials ? `<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">${socials}</div>` : ''}

    ${l.notes ? `
      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Notes</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px">${esc(l.notes)}</div>
      </div>` : ''}

    ${l.ai_outreach_message ? `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:10px;color:var(--purple-lt);text-transform:uppercase;letter-spacing:.06em;font-family:var(--syne);font-weight:600">✦ AI Outreach Message</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('ld-outreach-text').textContent).then(()=>{this.textContent='✓ Copied!'})">⎘ Copy</button>
        </div>
        <div class="outreach-box" id="ld-outreach-text">${esc(l.ai_outreach_message)}</div>
      </div>` : ''}`;

  openModal('lead-detail-modal');
}

function editLeadFromDetail() {
  closeModal('lead-detail-modal');
  if (viewingLeadId) openEditLead(viewingLeadId);
}

async function deleteLead() {
  if (!viewingLeadId || !confirm('Delete this lead permanently?')) return;
  const { error } = await window.sb.from('leads').delete().eq('id', viewingLeadId);
  if (!error) {
    closeModal('lead-detail-modal');
    leadsData = leadsData.filter(l => l.id !== viewingLeadId);
    renderLeads(leadsData);
    loadHomeStats();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortenUrl(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}
