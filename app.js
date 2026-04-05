const formatNumber = (n) => new Intl.NumberFormat('en-US').format(Number.isFinite(n) ? n : 0);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const UI_COPY = {
  kpis: [
    {
      en: 'Today',
      zh: '今日会话',
      note: 'Small wins count. Show up once, and the board lights up.',
      noteZh: '小步前进也算数。只要出现一次，整块面板就亮起来。'
    },
    {
      en: 'This week',
      zh: '本周累计',
      note: 'A simple pulse-check for how active the workflow feels.',
      noteZh: '快速判断这一周的工作流是否保持活跃。'
    },
    {
      en: 'Active days',
      zh: '活跃天数',
      note: 'Consistency beats intensity. This is the habit signal.',
      noteZh: '稳定比爆发更重要，这是习惯正在形成的信号。'
    },
    {
      en: 'Topics',
      zh: '主题数量',
      note: 'A wider spread usually means richer, more useful AI support.',
      noteZh: '主题越丰富，通常意味着 AI 支持也更立体。'
    }
  ],
  keywordsEmpty: { en: 'No keywords yet', zh: '还没有关键词' },
  tagsEmpty: { en: 'No tags inferred yet', zh: '暂未推断出标签' },
  quotaEmpty: {
    en: 'No provider usage data found yet.',
    zh: '还没有发现可展示的额度数据。'
  },
  sessionsEmpty: {
    title: { en: 'No recent sessions', zh: '最近暂无会话' },
    text: { en: 'Transcript files were not found yet.', zh: '还没有找到可读取的转录记录。' }
  },
  insightsEmpty: {
    title: { en: 'No insight yet', zh: '暂时没有洞察' },
    text: { en: 'More local history will make the coach notes smarter.', zh: '更多本地历史会让这张教练卡更聪明。' }
  },
  ideasEmpty: {
    title: { en: 'No suggestions yet', zh: '还没有建议' },
    text: { en: 'Run the generator after more usage data exists.', zh: '等积累更多数据后再运行生成脚本。' }
  },
  useCasesEmpty: {
    title: { en: 'No patterns yet', zh: '还没有明显模式' },
    text: { en: 'A few more sessions will make the mission map more interesting.', zh: '再积累几次会话，这张任务地图会更有意思。' }
  }
};

const CHIP_TRANSLATIONS = {
  github: 'GitHub',
  susie: 'Susie',
  messaging: '消息',
  automation: '自动化',
  direct: '直接提问',
  coding: '编码',
  'Builder on GitHub': 'GitHub 构建者',
  'Bilingual workflow': '双语工作流',
  'System thinker': '系统化思考',
  'Workflow designer': '流程设计者',
  'AI-native operator': 'AI 原生操作者',
  '你在这个群里的身份是': '群聊身份设定',
  缘缘: '缘缘',
  风格: '风格',
  生活版: '生活版',
  '主要负责和我聊生活': '生活陪伴',
  日常安排: '日常安排',
  情绪支持: '情绪支持',
  消费建议: '消费建议',
  旅行: '旅行',
  美食: '美食'
};

const CARD_TRANSLATIONS = {
  'GitHub shipping': 'GitHub 出货节奏',
  'Workflow automation': '工作流自动化',
  'Lightweight code delivery': '轻量代码交付',
  'Weekly board refresh': '每周面板刷新',
  'Keyword digest': '关键词摘要',
  'Repo activity join-up': '仓库活动联动',
  'Quota alert card': '额度提醒卡',
  Session: '会话',
  可以: '确认 / OK',
  'OpenClaw is part of the weekly workflow': 'OpenClaw 已进入周常工作流'
};

const TAG_TRANSLATIONS = {
  coding: '编码',
  github: 'GitHub',
  automation: '自动化',
  messaging: '消息',
  direct: '直接提问'
};

const KICKERS = {
  useCase: 'Power-up ｜ 能力加成',
  idea: 'Quest ｜ 下一关',
  insight: 'Coach note ｜ 教练提示'
};

fetch('./sample-data.json')
  .then((res) => res.json())
  .then((data) => render(data || {}))
  .catch((error) => {
    console.error('Failed to load dashboard data:', error);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div style="position:fixed;bottom:16px;left:16px;padding:12px 14px;background:#ffffff;color:#183114;border:1px solid #dfe8c7;border-radius:16px;box-shadow:0 12px 30px rgba(101,134,61,.15)"><strong>Unable to load sample-data.json</strong><div style="margin-top:6px;color:#64815e;font-size:13px">无法加载 sample-data.json</div></div>'
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
    ? `${formatNumber(todayCount)} chats today ｜ 今日 ${formatNumber(todayCount)} 次对话`
    : 'No chats yet today ｜ 今天还没开始对话';
  document.getElementById('heroStatus').textContent = todayCount > 0 ? 'Streak in motion ｜ 连胜进行中' : 'Fresh start ready ｜ 准备重新开局';
  document.getElementById('streakValue').textContent = streak > 0 ? `${streak}-day streak ｜ ${streak} 天连胜` : 'New streak ｜ 新连胜';
  document.getElementById('streakCopy').innerHTML = streak > 0
    ? `${escapeHtml(`You’ve shown up ${streak} day${streak === 1 ? '' : 's'} in a row.`)}<br><span class="copy-support">${escapeHtml(weekCount > 0 ? `本周已有 ${formatNumber(weekCount)} 次对话，面板热度稳稳在线。` : '再来一次专注会话，面板会更亮。')}</span>`
    : 'A single focused session today is enough to kick off the next streak.<br><span class="copy-support">今天只要完成一次专注对话，就能重新起势。</span>';

  renderKpis(overview);
  renderConversationChart(daily);
  renderQuotas(data.modelQuota || []);
  renderChips('keywords', data.keywords || [], UI_COPY.keywordsEmpty, CHIP_TRANSLATIONS);
  renderChips('tags', data.profileTags || [], UI_COPY.tagsEmpty, CHIP_TRANSLATIONS);
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
  const values = [overview.todayConversations, overview.weekConversations, overview.activeDays, overview.topicCount];

  document.getElementById('kpis').innerHTML = UI_COPY.kpis.map((item, index) => {
    const numeric = Number(values[index]) || 0;
    const percent = clamp(numeric * (index === 0 ? 22 : index === 1 ? 10 : index === 2 ? 18 : 8), 10, 100);
    return `
      <article class="kpi">
        <div class="label">${escapeHtml(item.en)}</div>
        <div class="subvalue">${escapeHtml(item.zh)}</div>
        <div class="value">${formatNumber(numeric)}</div>
        <div class="note">${escapeHtml(item.note)}</div>
        <div class="copy-support">${escapeHtml(item.noteZh)}</div>
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
    document.getElementById('quotaList').innerHTML = emptyState(UI_COPY.quotaEmpty.en, UI_COPY.quotaEmpty.zh);
    return;
  }

  document.getElementById('quotaList').innerHTML = safeItems.map((item) => {
    const total = Number(item.total) || 100;
    const used = Number(item.usedPercent ?? item.used) || 0;
    const remaining = Number(item.remaining) || Math.max(0, total - used);
    const usedPercent = clamp(Math.round((used / total) * 100), 0, 100);
    const metaBits = [
      `Used ${formatNumber(used)} / ${formatNumber(total)} ｜ 已用 ${formatNumber(used)} / ${formatNumber(total)}`,
      `Remaining ${formatNumber(remaining)} ｜ 剩余 ${formatNumber(remaining)}`,
      item.resetLabel ? `Reset ${escapeHtml(item.resetLabel)} ｜ 重置 ${escapeHtml(item.resetLabel)}` : '',
      item.plan ? `${escapeHtml(item.plan)} ｜ 套餐` : ''
    ].filter(Boolean);

    return `
      <div class="quota-item">
        <div class="quota-row">
          <div>
            <div class="quota-name">${escapeHtml(item.model || 'Usage window')}</div>
            <div class="quota-meta">${metaBits.join(' · ')}</div>
          </div>
          <div class="quota-percent">${usedPercent}% used ｜ 已用 ${usedPercent}%</div>
        </div>
        <div class="progress"><span style="width:${usedPercent}%"></span></div>
      </div>
    `;
  }).join('');
}

function renderChips(id, items, emptyText, translations = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById(id).innerHTML = safeItems.length
    ? safeItems.map((item) => {
      const zh = translations[item];
      return `<span class="chip"><span>${escapeHtml(item)}</span>${zh ? `<span class="chip-sub">${escapeHtml(zh)}</span>` : ''}</span>`;
    }).join('')
    : `<span class="chip"><span>${escapeHtml(emptyText.en)}</span><span class="chip-sub">${escapeHtml(emptyText.zh)}</span></span>`;
}

function renderUseCases(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('useCases').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="card">
        <div class="card-kicker">${KICKERS.useCase}</div>
        <h3>${escapeHtml(item.title)}</h3>
        ${CARD_TRANSLATIONS[item.title] ? `<p class="card-support">${escapeHtml(CARD_TRANSLATIONS[item.title])}</p>` : ''}
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join('')
    : `<article class="card"><div class="card-kicker">${KICKERS.useCase}</div><h3>${escapeHtml(UI_COPY.useCasesEmpty.title.en)}</h3><p class="card-support">${escapeHtml(UI_COPY.useCasesEmpty.title.zh)}</p><p>${escapeHtml(UI_COPY.useCasesEmpty.text.en)}</p><p class="card-support">${escapeHtml(UI_COPY.useCasesEmpty.text.zh)}</p></article>`;
}

function renderSessions(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('sessions').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="session">
        <div class="session-top">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            ${CARD_TRANSLATIONS[item.title] ? `<div class="session-subline">${escapeHtml(CARD_TRANSLATIONS[item.title])}</div>` : ''}
          </div>
          <span class="session-time">${escapeHtml(item.time)}</span>
        </div>
        <p class="session-summary">${escapeHtml(item.summary)}</p>
        <div class="session-tags">${(item.tags || []).map((tag) => `<span class="session-tag">${escapeHtml(tag)}${TAG_TRANSLATIONS[tag] ? ` ｜ ${escapeHtml(TAG_TRANSLATIONS[tag])}` : ''}</span>`).join('')}</div>
      </article>
    `).join('')
    : `<article class="session"><div class="session-top"><div><strong>${escapeHtml(UI_COPY.sessionsEmpty.title.en)}</strong><div class="session-subline">${escapeHtml(UI_COPY.sessionsEmpty.title.zh)}</div></div><span class="session-time">—</span></div><p class="session-summary">${escapeHtml(UI_COPY.sessionsEmpty.text.en)}</p><div class="session-subline">${escapeHtml(UI_COPY.sessionsEmpty.text.zh)}</div></article>`;
}

function renderInsights(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('insights').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="insight">
        <div class="card-kicker">${KICKERS.insight}</div>
        <strong>${escapeHtml(item.title)}</strong>
        ${CARD_TRANSLATIONS[item.title] ? `<p class="card-support">${escapeHtml(CARD_TRANSLATIONS[item.title])}</p>` : ''}
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join('')
    : `<article class="insight"><div class="card-kicker">${KICKERS.insight}</div><strong>${escapeHtml(UI_COPY.insightsEmpty.title.en)}</strong><p class="card-support">${escapeHtml(UI_COPY.insightsEmpty.title.zh)}</p><p>${escapeHtml(UI_COPY.insightsEmpty.text.en)}</p><p class="card-support">${escapeHtml(UI_COPY.insightsEmpty.text.zh)}</p></article>`;
}

function renderIdeas(items) {
  const safeItems = Array.isArray(items) ? items : [];
  document.getElementById('automationIdeas').innerHTML = safeItems.length
    ? safeItems.map((item) => `
      <article class="card">
        <div class="card-kicker">${KICKERS.idea}</div>
        <h3>${escapeHtml(item.title)}</h3>
        ${CARD_TRANSLATIONS[item.title] ? `<p class="card-support">${escapeHtml(CARD_TRANSLATIONS[item.title])}</p>` : ''}
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join('')
    : `<article class="card"><div class="card-kicker">${KICKERS.idea}</div><h3>${escapeHtml(UI_COPY.ideasEmpty.title.en)}</h3><p class="card-support">${escapeHtml(UI_COPY.ideasEmpty.title.zh)}</p><p>${escapeHtml(UI_COPY.ideasEmpty.text.en)}</p><p class="card-support">${escapeHtml(UI_COPY.ideasEmpty.text.zh)}</p></article>`;
}

function emptyState(en, zh) {
  return `<div class="empty"><strong>${escapeHtml(en)}</strong><div class="copy-support">${escapeHtml(zh)}</div></div>`;
}
