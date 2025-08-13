// ===== CONFIG =====
const SHEETDB_URL = "https://sheetdb.io/api/v1/avv2xl4lw5vfy"; // <-- set your SheetDB API URL
const ROLE = "Supervisor";
const LOCAL_KEY = "completedTrainingsSupervisor";
const POINTS = { base: 10, perScore: 1 };

// Trainings — titles must match what your quizzes send as ?module=
const trainingItems = [
  { title: "RBAC & Permissions",          url: "role-based-access-training-supervisor.html", minutes: 12 },
  { title: "Incident Monitoring Basics",  url: "incident-response-training-supervisor.html",  minutes: 10 }
];

// ===== Helpers =====
function getCurrentUser() {
  const user_id   = localStorage.getItem("user_id") || "";
  const username  = localStorage.getItem("name") || localStorage.getItem("currentUserName") || "Unknown User";
  const role      = ROLE;
  const department= localStorage.getItem("currentUserDepartment") || "Frontline";
  const risk      = localStorage.getItem("currentUserRiskTier") || "Medium";
  return { user_id, username, role, department, risk };
}

function addLocalCompletion(title) {
  const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  if (!list.includes(title)) { list.push(title); localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); }
}

function badgeFrom(points) {
  if (points >= 150) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

function makeTrainingLogRow(user, training_title, score, completed=true, source="Dashboard") {
  return {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    training: user.role + " Training",
    training_title: training_title,
    completed: completed ? "TRUE" : "FALSE",
    score: String(score ?? ""),
    submitted_at: new Date().toISOString(),
    source: source
  };
}

async function postTrainingLogRow(row) {
  try {
    const res = await fetch(SHEETDB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [row] })
    });
    if (!res.ok) console.error("SheetDB POST failed:", await res.text());
  } catch (e) { console.error("SheetDB POST error:", e); }
}

async function recordCompletion(training_title, score, source="Dashboard") {
  addLocalCompletion(training_title);
  const user = getCurrentUser();
  const row = makeTrainingLogRow(user, training_title, score, true, source);
  await postTrainingLogRow(row);
}

// ===== DOM
const leaderboardEl  = document.getElementById("leaderboard");
const trainingListEl = document.getElementById("trainingList");
const alertsEl       = document.getElementById("alertList");
const completionText = document.getElementById("completionText");
const whoamiEl       = document.getElementById("whoami");
let completionChart = null;

// ===== Instant overlay for snappy UX
function localCompletedCount() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]").length;
}
function forceImmediateUIUpdate() {
  drawOrUpdatePieChart(localCompletedCount(), trainingItems.length);
  const me = getCurrentUser();
  const mine = localCompletedCount();
  if (mine > 0) {
    const points = mine * POINTS.base;
    leaderboardEl.innerHTML = `<tr>
      <td>${me.username}</td><td>${mine}</td><td>${points}</td><td><span class="badge">${badgeFrom(points)}</span></td>
    </tr>`;
  }
}

// ===== Training list
function renderTrainingList() {
  const completed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  trainingListEl.innerHTML = "";
  trainingItems.forEach(item => {
    const li = document.createElement("li");

    const left = document.createElement("div");
    left.innerHTML = `<strong>${item.title}</strong><div class="muted">${item.minutes} min</div>`;

    const btn = document.createElement("button");
    const isDone = completed.includes(item.title);
    btn.className = isDone ? "btn done" : "btn primary";
    btn.textContent = isDone ? "✓ Completed" : "Mark as Done";
    if (isDone) btn.disabled = true;

    btn.onclick = async () => {
      const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      if (!cur.includes(item.title)) { cur.push(item.title); localStorage.setItem(LOCAL_KEY, JSON.stringify(cur)); }
      btn.className = "btn done"; btn.textContent = "✓ Completed"; btn.disabled = true;
      li.classList.add("completed");
      forceImmediateUIUpdate();
      await recordCompletion(item.title, "", "Dashboard");
      await fetchAndRender();
    };

    // clickable title -> open module preserving context
    left.style.cursor = 'pointer';
    left.addEventListener('click', () => {
      const me = getCurrentUser();
      const qp = new URLSearchParams({ username: me.username, jobid: me.user_id, role: me.role }).toString();
      window.location.href = `${item.url}?${qp}`;
    });

    li.appendChild(left);
    li.appendChild(btn);
    trainingListEl.appendChild(li);
  });
}

// ===== Filters and fetching =====
function hookFilters() {
  ["departmentFilter","riskFilter","timeFilter"].forEach(id => {
    document.getElementById(id).onchange = fetchAndRender;
  });
}

async function fetchSheetRows() {
  try {
    const res = await fetch(SHEETDB_URL);
    if (!res.ok) { console.error("SheetDB GET failed:", await res.text()); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) { console.error("GET error:", e); return []; }
}

function val(row, key) {
  const k = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
  return k ? row[k] : "";
}

function computeLeaderboard(rows) {
  const users = {};
  rows.forEach(r => {
    const completed = String(val(r,"completed")).toLowerCase() === "true";
    if (!completed) return;
    const name = val(r,"username") || "Unknown";
    const score = Number(val(r,"score")) || 0;
    const points =  POINTS.base + (isNaN(score) ? 0 : POINTS.perScore * score);
    if (!users[name]) users[name] = { count: 0, points: 0 };
    users[name].count += 1;
    users[name].points += points;
  });

  const mineLocal = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  const me = getCurrentUser();
  if (mineLocal.length > 0) {
    const extra = mineLocal.length * POINTS.base;
    if (!users[me.username]) users[me.username] = { count: 0, points: 0 };
    users[me.username].count = Math.max(users[me.username].count, mineLocal.length);
    users[me.username].points = Math.max(users[me.username].points, extra);
  }

  return Object.entries(users).map(([name, v]) => ({ name, ...v }))
    .sort((a,b) => b.points - a.points || b.count - a.count);
}

function renderLeaderboard(list) {
  leaderboardEl.innerHTML = "";
  list.forEach(u => {
    const badge = badgeFrom(u.points);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${u.name}</td><td>${u.count}</td><td>${u.points}</td><td><span class="badge">${badge}</span></td>`;
    leaderboardEl.appendChild(tr);
  });
}

function drawOrUpdatePieChart(completedCount, totalCount) {
  const ctx = document.getElementById("completionChart").getContext("2d");
  const incomplete = Math.max(0, totalCount - completedCount);
  const pct = Math.round((completedCount / Math.max(1,totalCount)) * 100);
  completionText.textContent = `${completedCount}/${totalCount} completed · ${pct}%`;

  const data = { labels: ["Completed", "Incomplete"], datasets: [{ data: [completedCount, incomplete] }] };
  if (!completionChart) {
    completionChart = new Chart(ctx, { type: "pie", data, options: { responsive: true } });
  } else {
    completionChart.data = data;
    completionChart.update();
  }
}

async function fetchAndRender() {
  const me = getCurrentUser();
  whoamiEl.textContent = `Logged in as ${me.username} · Role: ${me.role} · Dept: ${me.department} · Risk: ${me.risk}`;
  const rows = await fetchSheetRows();

  const dept = document.getElementById("departmentFilter").value;
  const risk = document.getElementById("riskFilter").value;
  const days = document.getElementById("timeFilter").value;
  const now = new Date();

  const filtered = rows.filter(r => {
    const rowDept = val(r,"department") || me.department;
    const rowRisk = val(r,"risktier") || me.risk;
    const dateStr = val(r,"submitted_at");
    const matchDept = dept === "All" || rowDept === dept;
    const matchRisk = risk === "All" || rowRisk === risk;
    const matchTime = days === "All" || (now - new Date(dateStr)) / 86400000 <= parseInt(days);
    return matchDept && matchRisk && matchTime;
  });

  alertsEl.innerHTML = "";
  filtered.forEach(r => {
    const name = val(r,"username");
    const title = val(r,"training_title");
    const completed = String(val(r,"completed")).toLowerCase() === "true";
    const score = Number(val(r,"score")) || 0;
    if (!completed) alertsEl.insertAdjacentHTML("beforeend", `<li>${name} missed ${title}. Retraining scheduled.</li>`);
    else if (score < 60) alertsEl.insertAdjacentHTML("beforeend", `<li>${name} scored low on ${title}. Nudge sent.</li>`);
  });

  const board = computeLeaderboard(filtered);
  renderLeaderboard(board);

  // pie uses union of local and sheet completions
  const myRows = filtered.filter(r => String(val(r,"username")) === me.username && String(val(r,"completed")).toLowerCase() === "true");
  const completedSet = new Set(myRows.map(r => val(r,"training_title")).filter(Boolean));
  JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]").forEach(t => completedSet.add(t));
  drawOrUpdatePieChart(completedSet.size, trainingItems.length);
}

// Listen for results.html return (?completed=...)
window.addEventListener("module-completed", async (ev) => {
  const { title, score } = ev.detail || {};
  if (!title) return;
  addLocalCompletion(title);
  forceImmediateUIUpdate();
  await recordCompletion(title, score, "Results");
  await fetchAndRender();
});

// boot
(function(){
  renderTrainingList();
  hookFilters();
  fetchAndRender();
})();
