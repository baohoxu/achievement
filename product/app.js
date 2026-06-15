const app = document.getElementById("app");

const DRAFT_KEY = "achievement-box.draft.v02";
const LAST_RECORD_KEY = "achievement-box.last-record.v02";
const API_BASE = window.ACHIEVEMENT_API_BASE || getDefaultApiBase();

const CATEGORIES = ["学习/工作", "生活自律", "情绪管理", "人际关系", "小幸运"];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const AUTH_ROUTES = ["login", "register"];

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

function getDefaultApiBase() {
  const { protocol, hostname } = window.location;
  if ((protocol === "http:" || protocol === "https:") && (hostname === "localhost" || hostname === "127.0.0.1")) {
    return `${protocol}//${hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

const state = {
  route: getRoute(),
  formMessage: "",
  historyFilter: "全部",
  dateMenuOpen: false,
  calendarMonth: "",
  highlightedDate: "",
  reviewRecordId: null,
  detailBackRoute: "",
  currentUser: null,
  authChecked: false,
  authMode: "login",
  authMessage: "",
  authBusy: false,
  records: [],
  recordsLoading: false,
  dataMessage: "",
  lastRecordId: localStorage.getItem(LAST_RECORD_KEY) || ""
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
    back: `<svg viewBox="0 0 24 24" ${common}><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>`,
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
  const createdAt = String(record.createdAt || record.created_at || localDateTimeString(new Date())).slice(0, 19);
  const date = new Date(createdAt);
  return {
    id: String(record.id || `record_${date.getTime()}_${Math.random().toString(16).slice(2, 7)}`),
    content: record.content,
    category: record.category,
    createdAt,
    date: dateKey(date),
    month: monthKey(date),
    year: String(date.getFullYear())
  };
}

function loadRecords() {
  return state.records;
}

function setRecords(records) {
  state.records = records
    .map(enrichRecord)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function setCurrentUser(user) {
  state.currentUser = user
    ? {
        id: String(user.id),
        username: user.username,
        nickname: user.nickname || ""
      }
    : null;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data.detail || "请求失败，请稍后再试。");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getCurrentUser() {
  const data = await apiFetch("/api/auth/me");
  return data.user;
}

async function login(username, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  return data.user;
}

async function register(username, password, nickname) {
  const data = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, nickname })
  });
  return data.user;
}

async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" });
}

async function fetchAchievements(category = "") {
  const query = category && category !== "全部" ? `?category=${encodeURIComponent(category)}` : "";
  const data = await apiFetch(`/api/achievements${query}`);
  return data.records || [];
}

async function createAchievement(payload) {
  const data = await apiFetch("/api/achievements", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return data.record;
}

async function fetchAchievementDetail(id) {
  const data = await apiFetch(`/api/achievements/${encodeURIComponent(id)}`);
  return data.record;
}

async function refreshRecords() {
  if (!state.currentUser) {
    setRecords([]);
    return;
  }
  state.recordsLoading = true;
  state.dataMessage = "";
  try {
    setRecords(await fetchAchievements());
  } catch (error) {
    if (error.status === 401) {
      setCurrentUser(null);
      setRecords([]);
      state.authMessage = "登录已失效，请重新登录。";
      navigate("login");
    } else {
      state.dataMessage = error.message;
    }
  } finally {
    state.recordsLoading = false;
  }
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

function getRoutePath() {
  const route = location.hash.replace(/^#\/?/, "") || "home";
  return route.replace(/^\/+/, "") || "home";
}

function getRoute() {
  const [route] = getRoutePath().split("/");
  if (route === "detail" && getDetailRecordId()) return "detail";
  return ["home", "record", "completion", "history", "review", "badges", "login", "register"].includes(route) ? route : "home";
}

function getDetailRecordId() {
  const [route, ...parts] = getRoutePath().split("/");
  if (route !== "detail" || !parts.length) return "";
  try {
    return decodeURIComponent(parts.join("/"));
  } catch {
    return "";
  }
}

function navigate(route) {
  state.dateMenuOpen = false;
  if (getRoutePath() === route) {
    state.route = getRoute();
    render();
    scrollToPageTop();
    return;
  }
  location.hash = `/${route}`;
}

function isAuthRoute(route) {
  return AUTH_ROUTES.includes(route);
}

function displayUserName() {
  if (!state.currentUser) return "";
  return state.currentUser.nickname || state.currentUser.username;
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

function compareMonth(monthA, monthB) {
  return monthA.localeCompare(monthB);
}

function monthLabel(month) {
  const [year, monthNumber] = month.split("-");
  return `${year}年${monthNumber}月`;
}

function shiftMonth(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + offset, 1));
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function firstWeekdayOfMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).getDay();
}

function normalizeCalendarMonth(dates) {
  const months = [...new Set(dates.map((date) => date.slice(0, 7)))].sort();
  if (!months.length) {
    state.calendarMonth = "";
    return {
      currentMonth: "",
      minMonth: "",
      maxMonth: ""
    };
  }

  const minMonth = months[0];
  const maxMonth = months[months.length - 1];
  if (!state.calendarMonth || compareMonth(state.calendarMonth, minMonth) < 0 || compareMonth(state.calendarMonth, maxMonth) > 0) {
    state.calendarMonth = maxMonth;
  }

  return {
    currentMonth: state.calendarMonth,
    minMonth,
    maxMonth
  };
}

function renderCalendarMonth(month, groups) {
  if (!month) return "";
  const blanks = Array.from({ length: firstWeekdayOfMonth(month) }, () => `<span class="calendar-empty" aria-hidden="true"></span>`).join("");
  const days = Array.from({ length: daysInMonth(month) }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${pad(day)}`;
    const count = groups[date]?.length || 0;
    const isSelected = state.highlightedDate === date;
    return `
      <button
        class="calendar-day ${count ? "has-record" : "is-disabled"} ${isSelected ? "is-selected" : ""}"
        ${count ? `data-date-option="${date}"` : "disabled"}
        type="button"
        aria-label="${monthLabel(month)}${day}日${count ? `，${count}件记录` : "，没有记录"}"
      >
        <span>${day}</span>
        <small>${count ? `${count}件` : ""}</small>
      </button>
    `;
  }).join("");

  return `
    <div class="calendar-weekdays" aria-hidden="true">
      ${WEEKDAYS.map((day) => `<span>${day}</span>`).join("")}
    </div>
    <div class="calendar-grid">
      ${blanks}${days}
    </div>
  `;
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
      ${
        state.currentUser
          ? `
            <div class="user-area">
              <span class="user-name">${escapeHtml(displayUserName())}</span>
              <button class="avatar ${dark ? "is-dark" : ""}" data-action="logout" type="button" aria-label="退出登录" title="退出登录">
                ${icon("user")}
              </button>
            </div>
          `
          : `<button class="avatar ${dark ? "is-dark" : ""}" data-route="login" type="button" aria-label="登录">${icon("user")}</button>`
      }
    </header>
  `;
}

function nav(active) {
  const activeRoute = active === "completion" ? "home" : active === "badges" ? "review" : active === "detail" ? "history" : active;
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

function renderLoadingPage() {
  return `
    <section class="page auth-page">
      ${pageHeader("成就盒子", "正在连接你的成就数据")}
      <section class="card auth-card">
        <div class="loading-state">
          <span class="round-icon">${icon("clock")}</span>
          <p>加载中...</p>
        </div>
      </section>
    </section>
  `;
}

function renderAuthPage(mode = "login") {
  const isRegister = mode === "register";
  state.authMode = mode;
  return `
    <section class="page auth-page">
      ${pageHeader("成就盒子", isRegister ? "创建账号，开始收藏自己的小成就" : "登录账号，继续回看你的闪光时刻")}
      <section class="card auth-card">
        ${state.authMessage ? `<p class="toast">${escapeHtml(state.authMessage)}</p>` : ""}
        <div class="auth-tabs" role="tablist" aria-label="账号操作">
          <button class="pill ${!isRegister ? "is-active" : ""}" data-route="login" type="button" role="tab" aria-selected="${!isRegister}">登录</button>
          <button class="pill ${isRegister ? "is-active" : ""}" data-route="register" type="button" role="tab" aria-selected="${isRegister}">注册</button>
        </div>
        <div class="auth-fields">
          <label class="auth-field">
            <span>账号</span>
            <input data-auth-field="username" autocomplete="username" maxlength="40" placeholder="3-40 位字母、数字或下划线" />
          </label>
          ${
            isRegister
              ? `
                <label class="auth-field">
                  <span>昵称</span>
                  <input data-auth-field="nickname" autocomplete="nickname" maxlength="40" placeholder="可以之后再想" />
                </label>
              `
              : ""
          }
          <label class="auth-field">
            <span>密码</span>
            <input data-auth-field="password" autocomplete="${isRegister ? "new-password" : "current-password"}" type="password" maxlength="72" placeholder="至少 6 位" />
          </label>
        </div>
        <button class="primary-btn" data-action="auth-submit" type="button" ${state.authBusy ? "disabled" : ""}>
          ${icon(isRegister ? "plus" : "user")}
          <span>${state.authBusy ? "处理中..." : isRegister ? "注册并登录" : "登录"}</span>
        </button>
      </section>
    </section>
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
            <button class="record-row" data-route="detail/${encodeURIComponent(record.id)}" type="button">
              ${roundCategoryIcon(record.category)}
              <div class="record-content" title="${escapeHtml(record.content)}">${escapeHtml(record.content)}</div>
              <div class="record-time">${relativeTime(record)}</div>
            </button>
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
      ${state.dataMessage ? `<p class="toast">${escapeHtml(state.dataMessage)}</p>` : ""}

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
  const lastId = state.lastRecordId || localStorage.getItem(LAST_RECORD_KEY);
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
  const { currentMonth, minMonth, maxMonth } = normalizeCalendarMonth(dates);
  const canGoPrevMonth = currentMonth && compareMonth(currentMonth, minMonth) > 0;
  const canGoNextMonth = currentMonth && compareMonth(currentMonth, maxMonth) < 0;

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
          <div class="date-menu ${state.dateMenuOpen ? "is-open" : ""}" role="dialog" aria-label="日期定位月历">
            ${
              currentMonth
                ? `
                  <div class="calendar-header">
                    <button class="calendar-nav" data-action="calendar-prev-month" type="button" aria-label="上个月" ${canGoPrevMonth ? "" : "disabled"}>
                      ${icon("back")}
                    </button>
                    <strong>${monthLabel(currentMonth)}</strong>
                    <button class="calendar-nav" data-action="calendar-next-month" type="button" aria-label="下个月" ${canGoNextMonth ? "" : "disabled"}>
                      ${icon("chevron")}
                    </button>
                  </div>
                  ${renderCalendarMonth(currentMonth, groups)}
                `
                : `<div class="calendar-empty-note">还没有可以定位的日期。</div>`
            }
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
                              <button class="history-link" data-route="detail/${encodeURIComponent(record.id)}" type="button">
                                ${roundCategoryIcon(record.category)}
                                <span class="history-main">
                                  <span class="history-content" title="${escapeHtml(record.content)}">${escapeHtml(record.content)}</span>
                                </span>
                                <span class="history-meta">
                                  <span class="category-badge">${record.category}</span>
                                  <span class="record-time">${timeOf(record)}</span>
                                </span>
                              </button>
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

function renderRecordDetail(records) {
  const recordId = getDetailRecordId();
  const record = records.find((item) => item.id === recordId);
  return `
    <section class="page">
      <div class="detail-topbar">
        <button class="back-button" data-action="detail-back" type="button">
          ${icon("back")}
          <span>返回</span>
        </button>
      </div>
      ${pageHeader("成就详情", "完整看见这件值得庆祝的小事")}
      ${
        record
          ? `
            <article class="card detail-card">
              <div class="detail-heading">
                ${roundCategoryIcon(record.category)}
                <div>
                  <p class="detail-kicker">${record.category}</p>
                  <h2 class="detail-title">这是一件值得庆祝的小事</h2>
                </div>
              </div>
              <p class="detail-content">${escapeHtml(record.content)}</p>
              <div class="detail-meta-grid">
                <div class="detail-meta-item">
                  <span>记录日期</span>
                  <strong>${displayDate(record.date)}</strong>
                </div>
                <div class="detail-meta-item">
                  <span>记录时间</span>
                  <strong>${timeOf(record)}</strong>
                </div>
                <div class="detail-meta-item is-wide">
                  <span>完整时间</span>
                  <strong>${displayDateShort(record.date)} ${timeOf(record)}</strong>
                </div>
              </div>
            </article>
          `
          : `
            <section class="card detail-empty-card">
              <span class="round-icon">${icon("notebook")}</span>
              <h2>没有找到这条记录</h2>
              <p>它可能已经不在当前设备的记录里了。</p>
              <button class="primary-btn" data-route="history" type="button">
                ${icon("list")}
                <span>回到历史记录</span>
              </button>
            </section>
          `
      }
    </section>
    ${nav("detail")}
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
  state.route = getRoute();
  if (!state.authChecked) {
    app.innerHTML = renderLoadingPage();
    return;
  }
  if (!state.currentUser && !isAuthRoute(state.route)) {
    app.innerHTML = renderAuthPage("login");
    return;
  }
  if (state.currentUser && isAuthRoute(state.route)) {
    navigate("home");
    return;
  }
  const records = loadRecords();
  const pages = {
    home: () => renderHome(records),
    record: () => renderRecordPage(),
    completion: () => renderCompletion(records),
    history: () => renderHistory(records),
    detail: () => renderRecordDetail(records),
    review: () => renderReview(records),
    badges: () => renderBadgesPage(records),
    login: () => renderAuthPage("login"),
    register: () => renderAuthPage("register")
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

async function handleSaveRecord() {
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
  try {
    const record = enrichRecord(await createAchievement({ content, category: draft.category || CATEGORIES[0] }));
    setRecords([record, ...state.records]);
    state.lastRecordId = record.id;
    localStorage.setItem(LAST_RECORD_KEY, record.id);
    clearDraft();
    state.formMessage = "";
    navigate("completion");
  } catch (error) {
    if (error.status === 401) {
      setCurrentUser(null);
      setRecords([]);
      state.authMessage = "登录已失效，请重新登录。";
      navigate("login");
      return;
    }
    state.formMessage = error.message;
    render();
  }
}

function getAuthField(name) {
  return app.querySelector(`[data-auth-field="${name}"]`)?.value.trim() || "";
}

async function handleAuthSubmit() {
  const mode = state.route === "register" ? "register" : "login";
  const username = getAuthField("username");
  const password = getAuthField("password");
  const nickname = getAuthField("nickname");
  state.authMessage = "";

  if (!username || !password) {
    state.authMessage = "请填写账号和密码。";
    render();
    return;
  }

  state.authBusy = true;
  render();
  let succeeded = false;
  try {
    const user = mode === "register"
      ? await register(username, password, nickname)
      : await login(username, password);
    setCurrentUser(user);
    await refreshRecords();
    state.authMessage = "";
    succeeded = true;
    navigate("home");
  } catch (error) {
    state.authMessage = error.message;
  } finally {
    state.authBusy = false;
    if (!succeeded) {
      render();
    }
  }
}

async function handleLogout() {
  try {
    await logout();
  } catch {
    // Local logout should still clear the UI if the server is unreachable.
  }
  setCurrentUser(null);
  setRecords([]);
  state.reviewRecordId = null;
  state.lastRecordId = "";
  localStorage.removeItem(LAST_RECORD_KEY);
  state.authMessage = "已退出登录。";
  navigate("login");
}

async function handleClick(event) {
  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) {
    const nextRoute = routeTarget.dataset.route;
    if (isAuthRoute(nextRoute)) {
      state.authMessage = "";
    }
    if (nextRoute.startsWith("detail/")) {
      state.detailBackRoute = state.route && state.route !== "detail" ? getRoutePath() : "history";
    }
    navigate(nextRoute);
    return;
  }

  const filterTarget = event.target.closest("[data-filter]");
  if (filterTarget) {
    state.historyFilter = filterTarget.dataset.filter;
    state.dateMenuOpen = false;
    state.calendarMonth = "";
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
    await handleSaveRecord();
  }
  if (action === "save-draft") {
    updateDraftFromForm();
    state.formMessage = "已暂存，等你准备好了再收藏。";
    render();
  }
  if (action === "auth-submit") {
    await handleAuthSubmit();
  }
  if (action === "logout") {
    await handleLogout();
  }
  if (action === "toggle-date-menu") {
    state.dateMenuOpen = !state.dateMenuOpen;
    render();
  }
  if (action === "calendar-prev-month" && state.calendarMonth) {
    state.calendarMonth = shiftMonth(state.calendarMonth, -1);
    render();
  }
  if (action === "calendar-next-month" && state.calendarMonth) {
    state.calendarMonth = shiftMonth(state.calendarMonth, 1);
    render();
  }
  if (action === "detail-back") {
    const backRoute = state.detailBackRoute || "history";
    state.detailBackRoute = "";
    navigate(backRoute);
  }
  if (action === "random-review") {
    const record = pickRandomRecord(state.records, state.reviewRecordId);
    state.reviewRecordId = record?.id || null;
    navigate("review");
  }
  if (action === "random-again") {
    const record = pickRandomRecord(state.records, state.reviewRecordId);
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
  if (getRoute() !== "detail") {
    state.detailBackRoute = "";
  }
  render();
  scrollToPageTop();
});

app.addEventListener("click", handleClick);
app.addEventListener("input", handleInput);

async function initializeApp() {
  render();
  try {
    setCurrentUser(await getCurrentUser());
    await refreshRecords();
  } catch (error) {
    setCurrentUser(null);
    setRecords([]);
    if (error.status !== 401) {
      state.authMessage = "无法连接后端服务，请确认 FastAPI 已启动。";
    }
  } finally {
    state.authChecked = true;
    render();
    scrollToPageTop();
  }
}

initializeApp();
