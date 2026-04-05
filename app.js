const formatNumber = (n) => new Intl.NumberFormat('en-US').format(Number.isFinite(n) ? n : 0);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

fetch('./sample-data.json')
  .then((res) => res.json())
  .then((data) => render(data || {}))
  .catch((error) => {
    console.error('Failed to load dashboard data:', error);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div style="position:fixed;bottom:16px;left:16px;padding:12px 14px;background:#ffffff;color:#183114;border:1px solid #dfe8c7;border-radius:16px;box-shadow:0 12px 30px rgba(101,134,61,.15)">Unable to load sample-data.json</div>'
    );
  });

function render(data) {
  const profile = data.profile || {};
  const overview = data.overview || {};
  const daily = data.dailyConversations || [];

  document.getElementById('profileName').textContent = profile.name || 'Susie';
  document.getElementById('primaryMode').textContent = profile.primaryMode || 'OpenClaw activity';
  document.getElementById('updatedAt').textContent = (data.meta && data.meta.updatedAt) || '—';

  const streak = computeStreak(daily);
  const todayCount = Number(overview.todayConversations) || 0;
  const weekCount = Number(overview.weekConversations) || 0;

  document.getElementById('heroMomentum').textContent = todayCount > 0
    ? `${formatNumber(todayCount)} chats today · momentum is real`
    : 'No chats yet today · easy win available';
  document.getElementById('heroStatus').textContent = todayCount > 0 ? 'Streak in motion' : 'Fresh start ready';
  document.getElementById('streakValue').textContent = streak > 0 ? `${streak}-day streak` : 'New streak';
  document.getElementById('streakCopy').textContent = streak > 0
    ? `You’ve shown up ${streak} day${streak === 1 ? '' : 's'} in a row. ${weekCount > 0 ? `${formatNumber(weekCount)} chats this week keeps the board warm.` : 'One more session makes the board happier.'}`
    : 'A single focused session today is enough to kick off the next streak.';

  renderKpis(overview);
  renderConversationChart(daily);
  renderQuotas(data.modelQuota || []);
  renderChips('keywords', data.keywords || [], 'No keywords yet');
  renderChips('tags', data.profileTags || [], 'No tags inferred yet');
  renderUseCases(data.useCases || []);
  renderSessions(data.recentSessions || []);
  renderInsights(data.insights || []);
  renderIdeas(data.automationIdeas || []);
}

function computeStreak(points) {
  const safePoints = Array.isArray(points) ? [...points] : [];
  let streak = 0;
  for (let i = safePoints.length - 1; i >= 0; i -= 1) {
    if ((Number(safePoints[i]?.count) || 0) > 0) streak += 1;
    else break;
  }
  return streak;
}

function renderKpis(overview) {
  const items = [
    ['Today', overview.todayConversations, 'Small wins count. Show up once, and the board lights up.'],
    ['This week', overview.weekConversations, 'A simple pulse-check for how active the workflow feels.'],
    ['Active days', overview.activeDays, 'Consistency beats intensity. This is the habit signal.'],
    ['Topics', overview.topicCount, 'A wider spread usually means richer, more useful AI support.']
  ];

  document.getElementById('kpis').innerHTML = items.map(([label, value, note], index) => {
    const numeric = Number(value) || 0;
    const percent = clamp(numeric * (index === 0 ? 22 : index === 1 ? 10 : index === 2 ? 18 : 8), 10, 100);
    return `
      <article class="kpi">
        <div class="label">${escapeHtml(label)}</div>
        <div class="value">${formatNumber(numeric)}</div>
        <div class="note">${escapeHtml(note)}</div>
        <div class="spark"><span style="width:${percent}%"></span></div>
      </article>
    `;
  }).join('');
}

function renderConversationChart(points) {
  const safePoints = Array.isArray(points) && points.length ? points : [{ day: '—', count: 0 }];
  const svg = document.getElementById('conversationChart');
  const width = 760;
  const height = 320;
  const left = 34;
  const right = 20;
  const top = 26;
  const bottom = 46;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxCount = Math.max(...safePoints.map((d) => Number(d.count) || 0), 1);
  const max = Math.max(4, Math.ceil(maxCount * 1.35));
  const step = innerWidth / Math.max(safePoints.length - 1, 1);
  const barWidth = Math.min(60, Math.max(24, innerWidth / Math.max(safePoints.length * 1.8, 2)));
  const toX = (i) => left + i * step;
  const toY = (v) => top + innerHeight - ((Number(v) || 0) / max) * innerHeight;
  const linePath = safePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.count)}`).join(' ');
  const areaPath = `${linePath} L ${toX(safePoints.length - 1)} ${top + innerHeight} L ${toX(0)} ${top + innerHeight} Z`;

  const gridLines = Array.from({ length: 4 }, (_, idx) => {
    const value = Math.round((max / 4) * (4 - idx));
    const y = top + (innerHeight / 4) * idx;
    return `
      <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#dfe8c7" stroke-width="1" stroke-dasharray="5 7"></line>
      <text x="${left - 10}" y="${y + 4}" text-anchor="end" fill="#8da184" font-size="11" font-weight="700">${formatNumber(value)}</text>
    `;
  }).join('');

  const bars = safePoints.map((point, index) => {
    const count = Number(point.count) || 0;
    const x = toX(index) - barWidth / 2;
    const y = toY(count);
    const heightValue = Math.max(8, top + innerHeight - y);
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${heightValue}" rx="16" fill="url(#barFill)"></rect>
      <text x="${toX(index)}" y="${height - 18}" text-anchor="middle" fill="#8da184" font-size="11" font-weight="700">${escapeHtml(point.day || point.date || '—')}</text>
      <text x="${toX(index)}" y="${Math.max(y - 10, top + 12)}" text-anchor="middle" fill="#3d5d34" font-size="12" font-weight="800">${formatNumber(count)}</text>
    `;
  }).join('');

  const pointsMarkup = safePoints.map((point, index) => `
    <circle cx="${toX(index)}" cy="${toY(point.count)}" r="6" fill="#ffffff" stroke="#58cc02" stroke-width="4"></circle>
  `).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a7ec6f"></stop>
        <stop offset="100%" stop-color="#58cc02"></stop>
      </linearGradient>
      <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(88, 204, 2, 0.28)"></stop>
        <stop offset="100%" stop-color="rgba(88, 204, 2, 0)"></stop>
      </linearGradient>
    </defs>
    ${gridLines}
    <path d="${areaPath}" fill="url(#lineFill)"></path>
    ${bars}
    <path d="${linePath}" fill="none" stroke="#2e9f00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
    ${pointsMarkup}
  `;
}

function renderQuotas(items) {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    document.getElementById('quotaList').innerHTML = '<div class="empty">No provider usage data found yet.</div>';
    return;
  }

  document.getElementById('quotaList').innerHTML = safeItems.map((item) => {
    const total = Number(item.total) || 100;
    const used = Number(item.usedPercent ?? item.used) || 0;
    const remaining = Number(item.remaining) || Math.max(0, total - used);
    const usedPercent = clamp(Math.round((used / total) * 100), 0, 100);
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
          <div class="quota-percent">${usedPercent}% used</div>
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
  document.getElementById('useCases').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="card">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join('')
    : '<article class="card"><h3>No patterns yet</h3><p>A few more sessions will make the mission map more interesting.</p></article>';
}

function renderSessions(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('sessions').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="session">
        <div class="session-top">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="session-time">${escapeHtml(item.time)}</span>
        </div>
        <p class="session-summary">${escapeHtml(item.summary)}</p>
        <div class="session-tags">${(item.tags || []).map((tag) => `<span class="session-tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </article>
    `).join('')
    : '<article class="session"><div class="session-top"><strong>No recent sessions</strong><span class="session-time">—</span></div><p class="session-summary">Transcript files were not found yet.</p></article>';
}

function renderInsights(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('insights').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="insight">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join('')
    : '<article class="insight"><strong>No insight yet</strong><p>More local history will make the coach notes smarter.</p></article>';
}

function renderIdeas(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('automationIdeas').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="card">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join('')
    : '<article class="card"><h3>No suggestions yet</h3><p>Run the generator after more usage data exists.</p></article>';
}
