const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n);

fetch('./sample-data.json')
  .then((res) => res.json())
  .then((data) => render(data))
  .catch((error) => {
    console.error('Failed to load dashboard data:', error);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div style="position:fixed;bottom:16px;left:16px;padding:12px 14px;background:#1a1a1a;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px">Unable to load sample-data.json</div>'
    );
  });

function render(data) {
  document.getElementById('profileName').textContent = data.profile.name;
  document.getElementById('primaryMode').textContent = data.profile.primaryMode;
  document.getElementById('updatedAt').textContent = data.meta.updatedAt;

  renderKpis(data.overview);
  renderConversationChart(data.dailyConversations);
  renderQuotas(data.modelQuota);
  renderChips('keywords', data.keywords);
  renderChips('tags', data.profileTags);
  renderUseCases(data.useCases);
  renderSessions(data.recentSessions);
  renderInsights(data.insights);
  renderIdeas(data.automationIdeas);
}

function renderKpis(overview) {
  const items = [
    ['Today', overview.todayConversations, 'today conversations'],
    ['This week', overview.weekConversations, '7-day total'],
    ['Active days', overview.activeDays, 'days active this month'],
    ['Topic count', overview.topicCount, 'clusters extracted']
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
  const svg = document.getElementById('conversationChart');
  const width = 700, height = 260, pad = 24;
  const max = Math.max(...points.map((d) => d.count)) * 1.15;
  const step = (width - pad * 2) / Math.max(points.length - 1, 1);
  const toX = (i) => pad + i * step;
  const toY = (v) => height - pad - (v / max) * (height - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.count)}`).join(' ');
  const area = `${line} L ${toX(points.length - 1)} ${height - pad} L ${toX(0)} ${height - pad} Z`;
  const labels = points.map((p, i) => `
    <text x="${toX(i)}" y="${height - 2}" text-anchor="middle" fill="rgba(245,245,247,0.55)" font-size="11">${p.day}</text>
    <circle cx="${toX(i)}" cy="${toY(p.count)}" r="4" fill="#f5f5f7"></circle>
    <text x="${toX(i)}" y="${toY(p.count) - 12}" text-anchor="middle" fill="rgba(245,245,247,0.75)" font-size="11">${p.count}</text>
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
  document.getElementById('quotaList').innerHTML = items.map((item) => {
    const used = Math.round((item.used / item.total) * 100);
    return `
      <div class="quota-item">
        <div class="quota-row">
          <div>
            <div class="quota-name">${item.model}</div>
            <div class="quota-meta">Used ${item.used} / ${item.total} · Remaining ${item.remaining}</div>
          </div>
          <div class="quota-meta">${used}%</div>
        </div>
        <div class="progress"><span style="width:${used}%"></span></div>
      </div>
    `;
  }).join('');
}

function renderChips(id, items) {
  document.getElementById(id).innerHTML = items.map((item) => `<span class="chip">${item}</span>`).join('');
}

function renderUseCases(items) {
  document.getElementById('useCases').innerHTML = items.map((item) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    </article>
  `).join('');
}

function renderSessions(items) {
  document.getElementById('sessions').innerHTML = items.map((item) => `
    <article class="session">
      <div class="session-top">
        <strong>${item.title}</strong>
        <small>${item.time}</small>
      </div>
      <small>${item.summary}</small>
      <div class="session-tags">${item.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
    </article>
  `).join('');
}

function renderInsights(items) {
  document.getElementById('insights').innerHTML = items.map((item) => `
    <article class="insight">
      <strong>${item.title}</strong>
      <p>${item.description}</p>
    </article>
  `).join('');
}

function renderIdeas(items) {
  document.getElementById('automationIdeas').innerHTML = items.map((item) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    </article>
  `).join('');
}

/*
Future data integration ideas for OpenClaw:
1. Replace sample-data.json with a generated export from session logs.
2. Pull /status-equivalent usage data into modelQuota.
3. Run keyword extraction over conversation transcripts and write keywords/profileTags.
4. Aggregate per-day message counts from chat/session history.
5. Push nightly snapshots to this repo via GitHub Actions or a local cron job.
*/
