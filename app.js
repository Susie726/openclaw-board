const formatNumber = (n) => new Intl.NumberFormat('en-US').format(Number.isFinite(n) ? n : 0);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

fetch('./sample-data.json')
  .then((res) => res.json())
  .then((data) => render(data || {}))
  .catch((error) => {
    console.error('Failed to load dashboard data:', error);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div style="position:fixed;bottom:16px;left:16px;padding:12px 14px;background:#1a1a1a;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px">Unable to load sample-data.json</div>'
    );
  });

function render(data) {
  const profile = data.profile || {};
  document.getElementById('profileName').textContent = profile.name || 'Susie';
  document.getElementById('primaryMode').textContent = profile.primaryMode || 'OpenClaw activity';
  document.getElementById('updatedAt').textContent = (data.meta && data.meta.updatedAt) || '—';

  renderKpis(data.overview || {});
  renderConversationChart(data.dailyConversations || []);
  renderQuotas(data.modelQuota || []);
  renderChips('keywords', data.keywords || [], 'No keywords yet');
  renderChips('tags', data.profileTags || [], 'No tags inferred yet');
  renderUseCases(data.useCases || []);
  renderSessions(data.recentSessions || []);
  renderInsights(data.insights || []);
  renderIdeas(data.automationIdeas || []);
}

function renderKpis(overview) {
  const items = [
    ['Today', overview.todayConversations, 'today conversations'],
    ['This week', overview.weekConversations, '7-day total'],
    ['Active days', overview.activeDays, 'days active in last 30'],
    ['Topic count', overview.topicCount, 'distinct topics / keywords']
  ];
  document.getElementById('kpis').innerHTML = items.map(([label, value, note]) => `
    <article class="kpi glass">
      <div class="label">${label}</div>
      <div class="value">${formatNumber(value)}</div>
      <div class="note">${note}</div>
    </article>
  `).join('');
}

function renderConversationChart(points) {
  const safePoints = Array.isArray(points) && points.length ? points : [{ day: '—', count: 0 }];
  const svg = document.getElementById('conversationChart');
  const width = 700, height = 260, pad = 24;
  const maxCount = Math.max(...safePoints.map((d) => Number(d.count) || 0), 1);
  const max = maxCount * 1.15;
  const step = (width - pad * 2) / Math.max(safePoints.length - 1, 1);
  const toX = (i) => pad + i * step;
  const toY = (v) => height - pad - ((Number(v) || 0) / max) * (height - pad * 2);
  const line = safePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.count)}`).join(' ');
  const area = `${line} L ${toX(safePoints.length - 1)} ${height - pad} L ${toX(0)} ${height - pad} Z`;
  const labels = safePoints.map((p, i) => `
    <text x="${toX(i)}" y="${height - 2}" text-anchor="middle" fill="rgba(245,245,247,0.55)" font-size="11">${escapeHtml(p.day || p.date || '—')}</text>
    <circle cx="${toX(i)}" cy="${toY(p.count)}" r="4" fill="#f5f5f7"></circle>
    <text x="${toX(i)}" y="${toY(p.count) - 12}" text-anchor="middle" fill="rgba(245,245,247,0.75)" font-size="11">${formatNumber(p.count)}</text>
  `).join('');
  svg.innerHTML = `
    <defs>
      <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f5f5f7" />
        <stop offset="100%" stop-color="#8ab4ff" />
      </linearGradient>
      <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(138,180,255,0.35)" />
        <stop offset="100%" stop-color="rgba(138,180,255,0.02)" />
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#areaGlow)"></path>
    <path d="${line}" fill="none" stroke="url(#lineGlow)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
    ${labels}
  `;
}

function renderQuotas(items) {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    document.getElementById('quotaList').innerHTML = '<div class="quota-item"><div class="quota-meta">No provider usage data found.</div></div>';
    return;
  }
  document.getElementById('quotaList').innerHTML = safeItems.map((item) => {
    const total = Number(item.total) || 100;
    const used = Number(item.usedPercent ?? item.used) || 0;
    const remaining = Number(item.remaining) || Math.max(0, total - used);
    const usedPercent = Math.max(0, Math.min(100, Math.round((used / total) * 100)));
    const metaBits = [
      `Used ${formatNumber(used)} / ${formatNumber(total)}`,
      `Remaining ${formatNumber(remaining)}`,
      item.resetLabel ? `Reset ${escapeHtml(item.resetLabel)}` : '',
      item.plan ? escapeHtml(item.plan) : ''
    ].filter(Boolean);
    return `
      <div class="quota-item">
        <div class="quota-row">
          <div>
            <div class="quota-name">${escapeHtml(item.model || 'Usage window')}</div>
            <div class="quota-meta">${metaBits.join(' · ')}</div>
          </div>
          <div class="quota-meta">${usedPercent}%</div>
        </div>
        <div class="progress"><span style="width:${usedPercent}%"></span></div>
      </div>
    `;
  }).join('');
}

function renderChips(id, items, emptyText) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById(id).innerHTML = safeItems.length
    ? safeItems.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')
    : `<span class="chip">${escapeHtml(emptyText)}</span>`;
}

function renderUseCases(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('useCases').innerHTML = safeItems.length ? safeItems.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join('') : '<article class="card"><h3>No patterns yet</h3><p>Generate fresh data after a few more sessions.</p></article>';
}

function renderSessions(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('sessions').innerHTML = safeItems.length ? safeItems.map((item) => `
    <article class="session">
      <div class="session-top">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.time)}</small>
      </div>
      <small>${escapeHtml(item.summary)}</small>
      <div class="session-tags">${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    </article>
  `).join('') : '<article class="session"><div class="session-top"><strong>No recent sessions</strong><small>—</small></div><small>Transcript files were not found yet.</small></article>';
}

function renderInsights(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('insights').innerHTML = safeItems.length ? safeItems.map((item) => `
    <article class="insight">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join('') : '<article class="insight"><strong>No insight yet</strong><p>More local history will make the interpretation richer.</p></article>';
}

function renderIdeas(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('automationIdeas').innerHTML = safeItems.length ? safeItems.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join('') : '<article class="card"><h3>No suggestions yet</h3><p>Run the generator after more usage data exists.</p></article>';
}
