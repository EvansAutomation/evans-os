// ── Instagram module — localStorage ───────────────────────────────────────────
let igPosts = [];
let igEngChart = null;
let igBreakChart = null;

function loadInstagram() {
  igPosts = lsGet(LS.igPosts);
  renderIgStats();
  renderIgCharts();
  renderPostGrid(igPosts);
}

function renderIgStats() {
  const count = igPosts.length;
  const avgLikes    = count ? Math.round(igPosts.reduce((a,p) => a + (parseInt(p.likes)||0), 0) / count) : 0;
  const avgComments = count ? Math.round(igPosts.reduce((a,p) => a + (parseInt(p.comments)||0), 0) / count) : 0;
  const avgEng = count ? (() => {
    const total = igPosts.reduce((a,p) => {
      const reach = parseInt(p.reach) || 1;
      return a + ((parseInt(p.likes)||0) + (parseInt(p.comments)||0)) / reach;
    }, 0);
    return (total / count * 100).toFixed(1) + '%';
  })() : '0%';

  document.getElementById('ig-stat-posts').textContent         = count;
  document.getElementById('ig-stat-avg-likes').textContent     = avgLikes;
  document.getElementById('ig-stat-avg-comments').textContent  = avgComments;
  document.getElementById('ig-stat-eng').textContent           = avgEng;
}

function renderIgCharts() {
  const sorted = [...igPosts].sort((a,b) => new Date(a.posted_at) - new Date(b.posted_at)).slice(-20);
  const labels = sorted.map(p => fmtDate(p.posted_at));
  const engData = sorted.map(p => {
    const reach = parseInt(p.reach) || 1;
    return (((parseInt(p.likes)||0) + (parseInt(p.comments)||0)) / reach * 100).toFixed(2);
  });

  const chartDefaults = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color:'#6b6490', font: { size: 10 } }, grid: { color:'rgba(255,255,255,0.04)' } },
      y: { ticks: { color:'#6b6490', font: { size: 10 } }, grid: { color:'rgba(255,255,255,0.04)' } }
    }
  };

  const engCtx = document.getElementById('ig-chart-engagement')?.getContext('2d');
  if (engCtx) {
    if (igEngChart) igEngChart.destroy();
    igEngChart = new Chart(engCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: engData,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168,85,247,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#a855f7',
          pointRadius: 3
        }]
      },
      options: { ...chartDefaults, plugins: { legend: { display: false } } }
    });
  }

  const brkCtx = document.getElementById('ig-chart-breakdown')?.getContext('2d');
  if (brkCtx) {
    if (igBreakChart) igBreakChart.destroy();
    igBreakChart = new Chart(brkCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'Likes', data: sorted.map(p => parseInt(p.likes)||0), backgroundColor:'rgba(168,85,247,0.6)', borderRadius:4 },
          { label:'Comments', data: sorted.map(p => parseInt(p.comments)||0), backgroundColor:'rgba(96,165,250,0.6)', borderRadius:4 }
        ]
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { display: true, labels: { color:'#b8b0d8', font: { size: 11 } } } }
      }
    });
  }
}

function renderPostGrid(data) {
  const grid = document.getElementById('ig-post-grid');
  if (!data.length) {
    grid.innerHTML = `<div style="grid-column:1/-1" class="empty"><div class="empty-icon">◈</div><p class="empty-text">No posts yet — add your first one</p></div>`;
    return;
  }

  grid.innerHTML = data.map(p => {
    const eng = p.reach
      ? (((parseInt(p.likes)||0) + (parseInt(p.comments)||0)) / parseInt(p.reach) * 100).toFixed(1)
      : '—';
    const typeIcon = { video:'🎥', carousel:'🖼', image:'📷' }[p.media_type] || '📷';

    return `
      <div class="ig-post-card" onclick="openAddPostModal('${p.id}')">
        <div class="ig-post-img">${typeIcon}</div>
        <div class="ig-post-body">
          <div class="ig-post-caption">${esc(p.caption||'No caption')}</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${fmtDate(p.posted_at)}</div>
          <div class="ig-post-stats">
            <div class="ig-stat">❤ <strong>${p.likes||0}</strong></div>
            <div class="ig-stat">💬 <strong>${p.comments||0}</strong></div>
            <div class="ig-stat">📊 <strong>${eng}%</strong></div>
          </div>
          ${p.ai_analysis ? `<div style="margin-top:8px;font-size:10px;color:var(--purple-lt)">✦ AI analysed</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function filterPosts() {
  const q = (document.getElementById('ig-search').value || '').toLowerCase();
  const filtered = q ? igPosts.filter(p => (p.caption||'').toLowerCase().includes(q)) : igPosts;
  renderPostGrid(filtered);
}

// ── Add / Edit post modal ─────────────────────────────────────────────────────
function openAddPostModal(postId) {
  const editId = postId || null;
  document.getElementById('post-edit-id').value = editId || '';
  document.getElementById('post-modal-title').textContent = editId ? 'Edit Post' : 'Add Instagram Post';

  if (editId) {
    const p = igPosts.find(x => x.id === editId);
    if (p) {
      document.getElementById('post-url').value         = p.post_url || '';
      document.getElementById('post-caption').value     = p.caption || '';
      document.getElementById('post-date').value        = p.posted_at?.slice(0,10) || '';
      document.getElementById('post-type').value        = p.media_type || 'image';
      document.getElementById('post-likes').value       = p.likes || '';
      document.getElementById('post-comments').value    = p.comments || '';
      document.getElementById('post-reach').value       = p.reach || '';
      document.getElementById('post-impressions').value = p.impressions || '';
      document.getElementById('post-saves').value       = p.saves || '';
    }
  } else {
    ['post-url','post-caption','post-date','post-likes','post-comments','post-reach','post-impressions','post-saves']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('post-type').value = 'image';
  }

  const box = document.getElementById('post-analysis-box');
  if (box) box.style.display = 'none';
  const delBtn = document.getElementById('delete-post-btn');
  if (delBtn) delBtn.style.display = editId ? 'inline-flex' : 'none';
  clearAlert('post-modal-alert');
  openModal('add-post-modal');
}

function savePost() {
  const date = document.getElementById('post-date').value;
  if (!date) { showAlert('post-modal-alert', 'Date is required.'); return; }

  setLoading('save-post-btn', true);
  clearAlert('post-modal-alert');

  const editId = document.getElementById('post-edit-id').value;
  const payload = {
    post_url:    document.getElementById('post-url').value.trim() || null,
    caption:     document.getElementById('post-caption').value.trim() || null,
    posted_at:   new Date(date).toISOString(),
    media_type:  document.getElementById('post-type').value,
    likes:       parseInt(document.getElementById('post-likes').value) || 0,
    comments:    parseInt(document.getElementById('post-comments').value) || 0,
    reach:       parseInt(document.getElementById('post-reach').value) || 0,
    impressions: parseInt(document.getElementById('post-impressions').value) || 0,
    saves:       parseInt(document.getElementById('post-saves').value) || 0,
  };

  if (editId) {
    const idx = igPosts.findIndex(p => p.id === editId);
    if (idx !== -1) igPosts[idx] = { ...igPosts[idx], ...payload };
  } else {
    igPosts.unshift({ id: newId(), ...payload, created_at: new Date().toISOString() });
  }

  lsSave(LS.igPosts, igPosts);
  closeModal('add-post-modal');
  showToast('Post saved ✓', 'success');
  renderIgStats();
  renderIgCharts();
  renderPostGrid(igPosts);
  loadHomeStats();

  setLoading('save-post-btn', false);
}

function deletePost() {
  const editId = document.getElementById('post-edit-id').value;
  if (!editId || !confirm('Delete this post?')) return;
  igPosts = igPosts.filter(p => p.id !== editId);
  lsSave(LS.igPosts, igPosts);
  closeModal('add-post-modal');
  showToast('Post deleted', 'info');
  renderIgStats();
  renderIgCharts();
  renderPostGrid(igPosts);
  loadHomeStats();
}

// ── AI analysis ───────────────────────────────────────────────────────────────
async function analysePost() {
  const caption    = document.getElementById('post-caption').value.trim();
  const likes      = document.getElementById('post-likes').value;
  const comments   = document.getElementById('post-comments').value;
  const reach      = document.getElementById('post-reach').value;
  const media_type = document.getElementById('post-type').value;

  setLoading('analyse-post-btn', true);
  clearAlert('post-modal-alert');

  try {
    const res = await fetch(IG_ANALYSE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, likes, comments, reach, media_type,
        all_posts_avg_likes: igPosts.length ? Math.round(igPosts.reduce((a,p)=>a+(parseInt(p.likes)||0),0)/igPosts.length) : 0,
        total_posts: igPosts.length
      })
    });
    if (!res.ok) throw new Error('AI returned ' + res.status);
    const data = await res.json();
    const analysis = data.analysis || data.text || data.reply || '';
    const box = document.getElementById('post-analysis-box');
    box.style.display = 'block';
    box.textContent = analysis;

    // Save analysis to the post if editing
    const editId = document.getElementById('post-edit-id').value;
    if (editId) {
      const idx = igPosts.findIndex(p => p.id === editId);
      if (idx !== -1) { igPosts[idx].ai_analysis = analysis; lsSave(LS.igPosts, igPosts); }
    }
  } catch (e) {
    showAlert('post-modal-alert', 'Analysis failed: ' + e.message);
  }

  setLoading('analyse-post-btn', false);
}
