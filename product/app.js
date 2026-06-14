const app = document.getElementById("app");

const STORAGE_KEY = "achievement-box.records.v02";
const DRAFT_KEY = "achievement-box.draft.v02";
const LAST_RECORD_KEY = "achievement-box.last-record.v02";

const CATEGORIES = ["学习/工作", "生活自律", "情绪管理", "人际关系", "小幸运"];

const FEEDBACK_MESSAGES = [
  "每一次开始，都是未来的伏笔。",
  "这件小事已经被认真收藏了。",
  "今天的你，又向前走了一点。",
  "微小但真实的进步，也值得被看见。",
  "把它留下来，未来的你会感谢现在的你。"
];

const SUCCESS_MESSAGES = [
  "不是所有进步都要惊天动地。今天的你，已经认真向前走了一步。",
  "这份努力很小，也很真实。把它收藏起来，就是在认真看见自己。",
  "今天的光没有被错过。未来再回头看，它会成为你继续走下去的证据。",
  "你完成了一件值得庆祝的事。哪怕只是一步，也已经让今天变得不一样。",
  "这不是普通的一条记录，是你给自己的温柔确认。"
];

const state = {
  route: getRoute(),
  formMessage: "",
  historyFilter: "全部",
  dateMenuOpen: false,
  highlightedDate: "",
  reviewRecordId: null
};

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function icon(name, className = "icon") {
  const common = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    home: `<svg viewBox="0 0 24 24" ${common}><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 10.5V21h5.2v-6.2h4.6V21h5.2V10.5"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" ${common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    list: `<svg viewBox="0 0 24 24" ${common}><rect x="5" y="3.8" width="14" height="18" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>`,
    smile: `<svg viewBox="0 0 24 24" ${common}><circle cx="12" cy="12" r="9"/><path d="M8.2 14.2c1.1 1.3 2.3 1.9 3.8 1.9s2.7-.6 3.8-1.9"/><path d="M9 9.4h.01"/><path d="M15 9.4h.01"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.2" r="3.3"/><path d="M5 20c.8-4.2 3.2-6.2 7-6.2s6.2 2 7 6.2z"/></svg>`,
    book: `<svg viewBox="0 0 24 24" ${common}><path d="M5 5.5c2.8-.6 5-.1 7 1.5v13c-2-1.6-4.2-2.1-7-1.5z"/><path d="M12 7c2-1.6 4.2-2.1 7-1.5v13c-2.8-.6-5-.1-7 1.5z"/></svg>`,
    run: `<svg viewBox="0 0 24 24" ${common}><path d="M14 4.5a1.7 1.7 0 1 0 0 .1"/><path d="m10.5 8.2 3.8 1.4 1.9 3.2"/><path d="m9.6 11.6-2.5 3.2"/><path d="m12.4 13.1-1.7 5"/><path d="m15.6 14.5 3.6.6"/><path d="m8.5 19.2-3.5.3"/></svg>`,
    cup: `<svg viewBox="0 0 24 24" ${common}><path d="M5.5 8h11v8.5a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z"/><path d="M16.5 10h1.3a2.7 2.7 0 0 1 0 5.4h-1.3"/><path d="M8 5.2h7"/><path d="M10 3.5v2"/><path d="M14 3.5v2"/></svg>`,
    users: `<svg viewBox="0 0 24 24" ${common}><circle cx="9" cy="8.3" r="3"/><circle cx="16.2" cy="9.2" r="2.4"/><path d="M3.8 19c.7-3.6 2.8-5.3 6.2-5.3 3.2 0 5.2 1.7 6 5.3"/><path d="M14.5 14.4c2.8.1 4.6 1.7 5.2 4.6"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.2 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9z"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" ${common}><path d="M6 18v-5"/><path d="M12 18V7"/><path d="M18 18V4"/><path d="M4 20h16"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" ${common}><rect x="4" y="5.5" width="16" height="16" rx="2.5"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="M8.4 14h.01"/><path d="M12 14h.01"/><path d="M15.6 14h.01"/><path d="M8.4 17.4h.01"/><path d="M12 17.4h.01"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3.8h12v17l-6-3.6-6 3.6z"/></svg>`,
    notebook: `<svg viewBox="0 0 24 24" ${common}><path d="M8 4h10a2 2 0 0 1 2 2v16H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/><path d="M8 4v18"/><path d="M4.7 9H8"/><path d="M4.7 14H8"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 17.7 4 21l3.3-1 11-11-3.2-3.2z"/><path d="m16.2 4.7 1.2-1.2a1.8 1.8 0 0 1 2.5 0l.6.6a1.8 1.8 0 0 1 0 2.5l-1.2 1.2z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" ${common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.2 2"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" ${common}><path d="m9 5 7 7-7 7"/></svg>`,
    down: `<svg viewBox="0 0 24 24" ${common}><path d="m6 9 6 6 6-6"/></svg>`,
    check: `<svg viewBox="0 0 24 24" ${common}><path d="m5 12 4.5 4.5L19 7"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24" ${common}><path d="M8 4h8v4.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.8 4.8"/><path d="M16 6h2.5a2.5 2.5 0 0 1-2.8 4.8"/><path d="M12 13v4"/><path d="M8.5 21h7"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" ${common}><path d="M2.8 12s3.4-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.4 5.5-9.2 5.5S2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.5"/></svg>`,
    leaf: `<svg viewBox="0 0 24 24" ${common}><path d="M5 13c5.7-7.3 11.2-7 16-6-.5 5.2-3.5 9.4-9 9.4-2.7 0-4.8-1-7-3.4z"/><path d="M5 13c3 0 5.2.8 7 3.2"/><path d="M5 13v6"/></svg>`
  };
  return `<span class="${className}" aria-hidden="true">${icons[name] || icons.star}</span>`;
}

function getCategoryIcon(category) {
  const map = {
    "学习/工作": "book",
    "生活自律": "run",
    "情绪管理": "smile",
    "人际关系": "users",
    "小幸运": "star"
  };
  return map[category] || "star";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function localDateTimeString(date) {
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function enrichRecord(record) {
  const date = new Date(record.createdAt);
  return {
    id: record.id || `record_${date.getTime()}_${Math.random().toString(16).slice(2, 7)}`,
    content: record.content,
    category: record.category,
    createdAt: record.createdAt,
    date: dateKey(date),
    month: monthKey(date),
    year: String(date.getFullYear())
  };
}

function seedRecords() {
  return [
    ["坚持读完了 30 分钟的书", "学习/工作", "2026-06-08T21:30:00"],
    ["完成了一次 5 公里的慢跑", "生活自律", "2026-06-08T07:45:00"],
    ["学会了一道新菜，味道很棒", "生活自律", "2026-06-07T19:20:00"],
    ["今天开始整理产品想法了", "学习/工作", "2026-06-06T15:30:00"],
    ["没有因为小事一直内耗", "情绪管理", "2026-06-05T22:05:00"],
    ["主动和朋友说出了真实想法", "人际关系", "2026-06-04T20:10:00"],
    ["读完了一篇很难的论文", "学习/工作", "2026-06-03T13:20:00"],
    ["早起给自己做了早餐", "生活自律", "2026-06-02T09:40:00"],
    ["主动和同事沟通了想法", "人际关系", "2026-05-27T15:10:00"],
    ["情绪稳定，没有因为小事内耗", "情绪管理", "2026-05-26T22:05:00"],
    ["遇到一件小幸运的事", "小幸运", "2026-05-25T18:40:00"],
    ["我通过了水测啊啊啊", "学习/工作", "2026-05-23T20:10:00"]
  ].map(([content, category, createdAt], index) =>
    enrichRecord({ id: `seed_${index + 1}`, content, category, createdAt })
  );
}

function ensureSeedRecords() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRecords()));
  }
}

function loadRecords() {
  ensureSeedRecords();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return parsed
      .map(enrichRecord)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map(enrichRecord)));
}

function loadDraft() {
  try {
    return {
      content: "",
      category: CATEGORIES[0],
      ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}")
    };
  } catch {
    return { content: "", category: CATEGORIES[0] };
  }
}

function saveDraft(draft) {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      content: draft.content || "",
      category: CATEGORIES.includes(draft.category) ? draft.category : CATEGORIES[0]
    })
  );
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRoute() {
  const route = location.hash.replace(/^#\/?/, "") || "home";
  return ["home", "record", "completion", "history", "review", "badges"].includes(route) ? route : "home";
}

function navigate(route) {
  state.dateMenuOpen = false;
  if (getRoute() === route) {
    state.route = route;
    render();
    scrollToPageTop();
    return;
  }
  location.hash = `/${route}`;
}

function scrollToPageTop() {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function isToday(date) {
  return date === dateKey(new Date());
}

function isYesterday(date) {
  const current = new Date();
  current.setDate(current.getDate() - 1);
  return date === dateKey(current);
}

function displayDate(date) {
  if (isToday(date)) return "今天";
  if (isYesterday(date)) return "昨天";
  const [year, month, day] = date.split("-");
  return `${year}年${month}月${day}日`;
}

function displayDateShort(date) {
  const [year, month, day] = date.split("-");
  return `${year}.${month}.${day}`;
}

function timeOf(record) {
  return record.createdAt.slice(11, 16);
}

function relativeTime(record) {
  if (isToday(record.date)) return `今天 ${timeOf(record)}`;
  if (isYesterday(record.date)) return `昨天 ${timeOf(record)}`;
  return `${displayDateShort(record.date)} ${timeOf(record)}`;
}

function groupByDate(records) {
  return records.reduce((groups, record) => {
    if (!groups[record.date]) groups[record.date] = [];
    groups[record.date].push(record);
    return groups;
  }, {});
}

function currentMonthStats(records) {
  const month = monthKey(new Date());
  const monthRecords = records.filter((record) => record.month === month);
  const categoryCounts = CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});
  monthRecords.forEach((record) => {
    categoryCounts[record.category] = (categoryCounts[record.category] || 0) + 1;
  });

  const max = Math.max(0, ...Object.values(categoryCounts));
  const tied = CATEGORIES.filter((category) => categoryCounts[category] === max && max > 0);
  let topCategory = "暂无";
  if (tied.length) {
    const progress = CATEGORIES.reduce((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {});
    const ascending = [...monthRecords].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const reached = ascending.find((record) => {
      progress[record.category] += 1;
      return tied.includes(record.category) && progress[record.category] === max;
    });
    topCategory = reached ? reached.category : tied[0];
  }

  return {
    count: monthRecords.length,
    topCategory,
    topCategoryCount: max,
    streak: continuousDays(records)
  };
}

function continuousDays(records) {
  const dates = new Set(records.map((record) => record.date));
  const cursor = new Date();
  let count = 0;
  while (dates.has(dateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function badgeDefinitions(records) {
  const emotionCount = records.filter((record) => record.category === "情绪管理").length;
  const luckCount = records.filter((record) => record.category === "小幸运").length;
  const streak = continuousDays(records);
  return [
    {
      name: "第一枚小星星",
      description: "记录 1 件成就",
      icon: "star",
      unlocked: records.length >= 1
    },
    {
      name: "七日收藏家",
      description: "连续记录 7 天",
      icon: "calendar",
      unlocked: streak >= 7
    },
    {
      name: "生活观察家",
      description: "记录 30 件成就",
      icon: "eye",
      unlocked: records.length >= 30
    },
    {
      name: "成长见证者",
      description: "记录 100 件成就",
      icon: "trophy",
      unlocked: records.length >= 100
    },
    {
      name: "情绪整理师",
      description: "照顾自己的感受",
      icon: "smile",
      unlocked: emotionCount >= 5
    },
    {
      name: "小幸运收集者",
      description: "看见生活里的好",
      icon: "leaf",
      unlocked: luckCount >= 5
    }
  ];
}

function pickRandomRecord(records, exceptId) {
  if (!records.length) return null;
  const candidates = records.length > 1 ? records.filter((record) => record.id !== exceptId) : records;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function feedbackFor(record) {
  if (!record) return FEEDBACK_MESSAGES[0];
  const code = [...record.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FEEDBACK_MESSAGES[code % FEEDBACK_MESSAGES.length];
}

function successMessageFor(record) {
  if (!record) return SUCCESS_MESSAGES[0];
  const source = `${record.id}${record.content}${record.createdAt}`;
  const code = [...source].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SUCCESS_MESSAGES[code % SUCCESS_MESSAGES.length];
}

function pageHeader(title, kicker, dark = false) {
  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">${title}</h1>
        <p class="page-kicker">${kicker}</p>
      </div>
      <div class="avatar ${dark ? "is-dark" : ""}">${icon("user")}</div>
    </header>
  `;
}

function nav(active) {
  const activeRoute = active === "completion" ? "home" : active === "badges" ? "review" : active;
  const items = [
    ["home", "home", "首页"],
    ["record", "plus", "记录"],
    ["history", "list", "历史"],
    ["review", "smile", "回顾"]
  ];
  return `
    <nav class="bottom-nav" aria-label="底部导航">
      ${items
        .map(
          ([route, iconName, label]) => `
            <button class="nav-item ${activeRoute === route ? "is-active" : ""}" data-route="${route}" type="button">
              ${icon(iconName)}
              <span>${label}</span>
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

function renderBadgeCards(records, options = {}) {
  const { limit = null } = options;
  const badges = badgeDefinitions(records);
  const unlocked = badges.filter((badge) => badge.unlocked);
  const locked = badges.filter((badge) => !badge.unlocked);
  const ordered = [...unlocked, ...locked];
  return ordered
    .slice(0, limit || ordered.length)
    .map(
      (badge) => `
        <article class="badge-card ${badge.unlocked ? "is-unlocked" : "is-locked"}">
          <span class="badge-icon">${icon(badge.icon)}</span>
          <strong>${badge.name}</strong>
          <p>${badge.description}</p>
          <span class="badge-status">${badge.unlocked ? "已解锁" : "未解锁"}</span>
        </article>
      `
    )
    .join("");
}

function roundCategoryIcon(category) {
  return `<span class="round-icon is-blue">${icon(getCategoryIcon(category))}</span>`;
}

function renderRecordRows(records, limit = records.length) {
  if (!records.length) {
    return `<div class="empty">这里还空着。从第一件小事开始，慢慢收藏自己的闪光时刻吧。</div>`;
  }
  return `
    <div class="record-list">
      ${records
        .slice(0, limit)
        .map(
          (record) => `
            <div class="record-row">
              ${roundCategoryIcon(record.category)}
              <div class="record-content" title="${escapeHtml(record.content)}">${escapeHtml(record.content)}</div>
              <div class="record-time">${relativeTime(record)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHome(records) {
  const stats = currentMonthStats(records);
  return `
    <section class="page">
      ${pageHeader("成就盒子", "记录每一件值得庆祝的小事")}

      <section class="card hero-card">
        <span class="tag-string" aria-hidden="true"></span>
        <span class="paper-tag" aria-hidden="true"></span>
        <h2 class="hero-title">今天有什么<br />值得庆祝的小事？</h2>
        <p class="hero-copy">每一个小成就，都让你更靠近理想的自己</p>
        <button class="primary-btn" data-route="record" type="button">
          ${icon("plus")}
          <span>记录今天的小成就</span>
        </button>
      </section>

      <section class="card stats-card">
        <span class="round-icon">${icon("chart")}</span>
        <div>
          <p class="stat-label">本月已记录</p>
          <p class="stat-number"><strong>${stats.count}</strong><span>件</span></p>
        </div>
        <span style="color:#cdb8a0">${icon("calendar")}</span>
      </section>

      <section class="card recent-card">
        <div class="card-title-row">
          <h2 class="section-title">最近记录</h2>
          <button class="ghost-btn" data-route="history" type="button">查看全部 ${icon("chevron")}</button>
        </div>
        ${renderRecordRows(records, 3)}
      </section>

      <button class="card memory-link" data-action="random-review" type="button">
        <span style="color:var(--red)">${icon("bookmark")}</span>
        <span>
          <strong>随机回忆</strong>
          <span>回顾过去的自己，看看那些被记录的闪光时刻。</span>
        </span>
        <span style="color:#bfa992">${icon("notebook")}</span>
        <span style="color:#7d776f">${icon("chevron")}</span>
      </button>
    </section>
    ${nav("home")}
  `;
}

function renderRecordPage() {
  const draft = loadDraft();
  return `
    <section class="page">
      ${pageHeader("记录小成就", "把今天值得庆祝的小事收藏起来")}
      <section class="card record-form-card">
        ${state.formMessage ? `<p class="toast">${state.formMessage}</p>` : ""}
        <h2 class="field-title">今天发生了什么值得庆祝的小事？</h2>
        <div class="textarea-wrap">
          <textarea class="achievement-textarea" data-field="content" placeholder="写下这件值得庆祝的小事……">${escapeHtml(draft.content)}</textarea>
          <span class="counter" id="content-count">${[...draft.content].length}/200</span>
        </div>

        <h2 class="category-title">分类</h2>
        <div class="category-row" role="radiogroup" aria-label="分类">
          ${CATEGORIES.map(
            (category) => `
              <button class="pill ${draft.category === category ? "is-blue" : ""}" data-form-category="${category}" type="button" role="radio" aria-checked="${draft.category === category}">
                ${category}
              </button>
            `
          ).join("")}
        </div>

        <div class="time-note">
          ${icon("clock")}
          <span>系统将自动记录时间</span>
        </div>

        <div class="form-actions">
          <button class="primary-btn" data-action="save-record" type="button">
            ${icon("plus")}
            <span>收藏这份小成就</span>
          </button>
          <button class="outline-btn" data-action="save-draft" type="button">暂存草稿</button>
        </div>
      </section>
    </section>
    ${nav("record")}
  `;
}

function renderCompletion(records) {
  const lastId = localStorage.getItem(LAST_RECORD_KEY);
  const record = records.find((item) => item.id === lastId) || records[0];
  return `
    <section class="page">
      ${pageHeader("成就盒子", "记录每一件值得庆祝的小事", true)}
      <h2 class="page-title" style="margin: 12px 4px 20px; font-size: 34px;">记录完成</h2>
      <div class="completion-steps" aria-hidden="true">
        <span class="step-dot">${icon("check")}</span>
        <span class="step-line"></span>
        <span class="step-dot">${icon("check")}</span>
        <span class="step-line"></span>
        <span class="step-dot is-done">${icon("check")}</span>
      </div>

      <section class="card success-card">
        <div class="success-burst">${icon("smile")}</div>
        <h2 class="success-title">已收藏一枚今日成就</h2>
        <p class="success-copy">${successMessageFor(record)}</p>
        ${
          record
            ? `
              <div class="summary-card">
                ${roundCategoryIcon(record.category)}
                <div>
                  <strong title="${escapeHtml(record.content)}">${escapeHtml(record.content)}</strong>
                  <small>${record.category}</small>
                </div>
                <span class="record-time">${relativeTime(record)}</span>
              </div>
            `
            : ""
        }
      </section>

      <div class="completion-actions">
        <button class="primary-btn" data-route="home" type="button">
          ${icon("home")}
          <span>返回首页</span>
        </button>
        <button class="secondary-btn" data-route="record" type="button">
          ${icon("plus")}
          <span>再记一条</span>
        </button>
        <button class="outline-btn" data-route="history" type="button">
          ${icon("list")}
          <span>查看历史记录</span>
        </button>
      </div>
    </section>
    ${nav("completion")}
  `;
}

function renderHistory(records) {
  const filtered = state.historyFilter === "全部"
    ? records
    : records.filter((record) => record.category === state.historyFilter);
  const groups = groupByDate(filtered);
  const dates = Object.keys(groups).sort((a, b) => new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`));

  return `
    <section class="page">
      ${pageHeader("历史记录", "回看那些被认真收藏的小成就")}
      <div class="history-toolbar">
        <div class="filter-row" role="tablist" aria-label="分类筛选">
          ${["全部", ...CATEGORIES]
            .map(
              (category) => `
                <button class="pill ${state.historyFilter === category ? "is-active" : ""}" data-filter="${category}" type="button" role="tab" aria-selected="${state.historyFilter === category}">
                  ${category}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="date-picker-wrap">
          <button class="date-button" data-action="toggle-date-menu" type="button" ${dates.length ? "" : "disabled"}>
            ${icon("calendar")}
            <span>按日期定位</span>
            ${icon("down")}
          </button>
          <div class="date-menu ${state.dateMenuOpen ? "is-open" : ""}" role="menu">
            ${dates
              .map(
                (date) => `
                  <button class="date-option" data-date-option="${date}" type="button" role="menuitem">
                    ${displayDate(date)} · ${groups[date].length} 件
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </div>

      ${
        filtered.length
          ? `
            <div class="timeline">
              ${dates
                .map(
                  (date) => `
                    <section class="timeline-group ${state.highlightedDate === date ? "is-highlighted" : ""}" data-date-group="${date}">
                      <h2 class="timeline-date">${displayDate(date)}</h2>
                      ${groups[date]
                        .map(
                          (record) => `
                            <article class="history-item">
                              ${roundCategoryIcon(record.category)}
                              <div class="history-main">
                                <p class="history-content" title="${escapeHtml(record.content)}">${escapeHtml(record.content)}</p>
                              </div>
                              <div class="history-meta">
                                <span class="category-badge">${record.category}</span>
                                <span class="record-time">${timeOf(record)}</span>
                              </div>
                            </article>
                          `
                        )
                        .join("")}
                    </section>
                  `
                )
                .join("")}
            </div>
          `
          : `<div class="empty">这个分类下还没有小成就。等下一次，它也许就会被点亮。</div>`
      }
    </section>
    ${nav("history")}
  `;
}

function renderReview(records) {
  const stats = currentMonthStats(records);
  if (!state.reviewRecordId && records.length) {
    state.reviewRecordId = pickRandomRecord(records)?.id || null;
  }
  const memory = records.find((record) => record.id === state.reviewRecordId) || records[0];
  return `
    <section class="page">
      ${pageHeader("回顾", "重新看见过去的自己")}

      <section class="card review-memory">
        <div class="review-heading">
          <span style="color:var(--red)">${icon("bookmark")}</span>
          <strong>随机回忆</strong>
        </div>
        ${
          memory
            ? `
              <div class="quote-box">
                <p class="quote-date">你曾在 ${displayDateShort(memory.date)} 记录：</p>
                <p class="quote-content">${escapeHtml(memory.content)}</p>
                <p class="quote-copy">${feedbackFor(memory)}</p>
              </div>
              <button class="primary-btn" data-action="random-again" type="button">
                <span>看看过去的自己</span>
                ${icon("chevron")}
              </button>
            `
            : `
              <div class="empty">你还没有收藏小成就。先记录第一件属于你的闪光时刻吧。</div>
              <button class="primary-btn" data-route="record" type="button" style="margin-top:18px">
                ${icon("plus")}
                <span>记录第一件小成就</span>
              </button>
            `
        }
      </section>

      <section class="card month-card">
        <div class="review-heading">
          <span class="round-icon">${icon("chart")}</span>
          <div>
            <h2 class="section-title">本月回顾</h2>
            <p class="page-kicker" style="font-size:15px">你的本月成就一览</p>
          </div>
        </div>
        <div class="month-grid">
          <div class="month-stat">
            <span>本月记录</span>
            <strong>${stats.count}</strong>
            <small>件</small>
          </div>
          <div class="month-stat">
            <span>最多分类</span>
            <strong style="font-size:24px">${stats.topCategory}</strong>
            <small>${stats.topCategoryCount ? `共 ${stats.topCategoryCount} 件` : "暂无记录"}</small>
          </div>
          <div class="month-stat">
            <span>连续记录</span>
            <strong>${stats.streak}</strong>
            <small>天</small>
          </div>
        </div>
      </section>

      <section class="card badges-card">
        <div class="card-title-row">
          <div>
            <h2 class="section-title">成就徽章</h2>
            <p class="page-kicker" style="font-size:15px">记录你的坚持与成长</p>
          </div>
          <button class="ghost-btn" data-route="badges" type="button">查看全部 ${icon("chevron")}</button>
        </div>
        <div class="badges-strip">
          ${renderBadgeCards(records, { limit: 4 })}
        </div>
      </section>
    </section>
    ${nav("review")}
  `;
}

function renderBadgesPage(records) {
  return `
    <section class="page">
      ${pageHeader("成就徽章", "记录你的坚持与成长")}
      <section class="card badges-card all-badges-card">
        <div class="badges-grid">
          ${renderBadgeCards(records)}
        </div>
      </section>
    </section>
    ${nav("badges")}
  `;
}

function render() {
  const records = loadRecords();
  state.route = getRoute();
  const pages = {
    home: () => renderHome(records),
    record: () => renderRecordPage(),
    completion: () => renderCompletion(records),
    history: () => renderHistory(records),
    review: () => renderReview(records),
    badges: () => renderBadgesPage(records)
  };
  app.innerHTML = pages[state.route]();
}

function updateDraftFromForm(extra = {}) {
  const textarea = app.querySelector("[data-field='content']");
  const current = loadDraft();
  const next = {
    ...current,
    content: textarea ? textarea.value : current.content,
    ...extra
  };
  saveDraft(next);
  return next;
}

function handleSaveRecord() {
  const draft = updateDraftFromForm();
  const content = draft.content.trim();
  if (!content) {
    state.formMessage = "先写下一件值得庆祝的小事吧。";
    render();
    return;
  }
  if ([...content].length > 200) {
    state.formMessage = "内容有点长，可以稍微简短一点。";
    render();
    return;
  }
  const now = new Date();
  const record = enrichRecord({
    content,
    category: draft.category || CATEGORIES[0],
    createdAt: localDateTimeString(now)
  });
  const records = loadRecords();
  saveRecords([record, ...records]);
  localStorage.setItem(LAST_RECORD_KEY, record.id);
  clearDraft();
  state.formMessage = "";
  navigate("completion");
}

function handleClick(event) {
  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) {
    navigate(routeTarget.dataset.route);
    return;
  }

  const filterTarget = event.target.closest("[data-filter]");
  if (filterTarget) {
    state.historyFilter = filterTarget.dataset.filter;
    state.dateMenuOpen = false;
    render();
    return;
  }

  const categoryTarget = event.target.closest("[data-form-category]");
  if (categoryTarget) {
    state.formMessage = "";
    updateDraftFromForm({ category: categoryTarget.dataset.formCategory });
    render();
    return;
  }

  const dateTarget = event.target.closest("[data-date-option]");
  if (dateTarget) {
    const date = dateTarget.dataset.dateOption;
    state.dateMenuOpen = false;
    state.highlightedDate = date;
    render();
    window.setTimeout(() => {
      app.querySelector(`[data-date-group="${date}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    window.setTimeout(() => {
      if (state.highlightedDate === date) {
        state.highlightedDate = "";
        render();
      }
    }, 1500);
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action === "save-record") {
    handleSaveRecord();
  }
  if (action === "save-draft") {
    updateDraftFromForm();
    state.formMessage = "已暂存，等你准备好了再收藏。";
    render();
  }
  if (action === "toggle-date-menu") {
    state.dateMenuOpen = !state.dateMenuOpen;
    render();
  }
  if (action === "random-review") {
    const record = pickRandomRecord(loadRecords(), state.reviewRecordId);
    state.reviewRecordId = record?.id || null;
    navigate("review");
  }
  if (action === "random-again") {
    const record = pickRandomRecord(loadRecords(), state.reviewRecordId);
    state.reviewRecordId = record?.id || null;
    render();
  }
}

function handleInput(event) {
  if (!event.target.matches("[data-field='content']")) return;
  const value = event.target.value;
  const counter = app.querySelector("#content-count");
  if (counter) {
    counter.textContent = `${[...value].length}/200`;
    counter.style.color = [...value].length > 200 ? "var(--red)" : "";
  }
  updateDraftFromForm({ content: value });
}

window.addEventListener("hashchange", () => {
  state.formMessage = "";
  state.dateMenuOpen = false;
  render();
  scrollToPageTop();
});

app.addEventListener("click", handleClick);
app.addEventListener("input", handleInput);

render();
scrollToPageTop();
