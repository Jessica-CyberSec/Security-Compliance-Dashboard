
// ======= CONFIG =======
const SHEETDB_URL = "https://sheetdb.io/api/v1/avv2xl4lw5vfy"; // <-- change if needed
const ROLE = "Cashier";
const LOCAL_KEY = "completedTrainings";
const POINTS = { base: 10, perScore: 1 };

// Training catalog (titles must EXACTLY match what your quiz sends as module=...)
const trainingItems = [
  { title: "Phishing Awareness", url: "phishing-awareness.html", minutes: 10 },
  { title: "Password Hygiene",   url: "password-hygiene.html",   minutes: 8  },
  { title: "Retail Data Privacy", url: "retail-privacy.html",     minutes: 12 },
];

// ======= Helpers =======
function setLoginFromQuery() {
  const p = new URLSearchParams(location.search);
  const uid  = p.get("user_id");
  const name = p.get("name");
  const role = p.get("role");
  if (uid && name && role) {
    localStorage.setItem("user_id", uid);
    localStorage.setItem("name", name);
    localStorage.setItem("role", role);
  }
}
function getCurrentUser() {
  const name = localStorage.getItem("name") || localStorage.getItem("currentUserName") || "Unknown User";
  const dept = localStorage.getItem("currentUserDepartment") || "Frontline";
  const risk = localStorage.getItem("currentUserRiskTier") || "Medium";
  return { Name: name, Role: ROLE, Department: dept, RiskTier: risk };
}
function addLocalCompletion(title) {
  const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  if (!list.includes(title)) {
    list.push(title);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  }
}
function badgeFrom(points) {
  if (points >= 150) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}
function makeRow({ Name, Role, Department, RiskTier }, trainingTitle, score, status="Complete") {
  const now = new Date().toISOString().slice(0,10);
  const pts = POINTS.base + (isNaN(score) ? 0 : (POINTS.perScore * Number(score)));
  return { Name, Role, Department, RiskTier, TrainingTitle: trainingTitle, Status: status,
           Score: String(score ?? ""), Points: String(pts), Date: now };
}
async function syncCompletionToSheet(row) {
  try {
    const res = await fetch(SHEETDB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [row] })
    });
    if (!res.ok) console.error("SheetDB POST failed:", await res.text());
  } catch (e) {
    console.error("SheetDB sync failed:", e);
  }
}
async function recordCompletion(trainingTitle, score) {
  addLocalCompletion(trainingTitle);
  const user = getCurrentUser();
  const row = makeRow(user, trainingTitle, score);
  await syncCompletionToSheet(row);
}

// Chart handle (single instance)
let completionChart = null;

// ======= UI Build =======
const trainingListEl = document.getElementById("trainingList");
const leaderboardEl  = document.getElementById("leaderboard");
const alertsEl       = document.getElementById("alertList");
const completionText = document.getElementById("completionText");

function renderTrainingList() {
  const completed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  trainingListEl.innerHTML = "";
  trainingItems.forEach(item => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    const btn = document.createElement("button");

    if (completed.includes(item.title)) li.classList.add("completed");

    link.href = item.url; link.innerText = item.title; link.className = "training-link"; link.target = "_blank";
    btn.innerText = completed.includes(item.title) ? "✓ Completed" : "Mark as Done";
    btn.className = completed.includes(item.title) ? "complete-btn done" : "complete-btn";
    if (completed.includes(item.title)) { btn.style.backgroundColor = "#6c757d"; btn.disabled = true; }

    btn.onclick = async () => {
      const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      if (!cur.includes(item.title)) {
        cur.push(item.title); localStorage.setItem(LOCAL_KEY, JSON.stringify(cur));
      }
      li.classList.add("completed"); btn.innerText = "✓ Completed"; btn.style.backgroundColor = "#6c757d"; btn.disabled = true;
      await recordCompletion(item.title);
      await fetchAndRender(); // refresh leaderboard & pie
    };

    li.appendChild(link); li.appendChild(btn); trainingListEl.appendChild(li);
  });
}

function hookFilters() {
  document.getElementById("departmentFilter").onchange = fetchAndRender;
  document.getElementById("riskFilter").onchange = fetchAndRender;
  document.getElementById("timeFilter").onchange = fetchAndRender;
}

// ======= Data + Rendering =======
async function fetchSheetRows() {
  try {
    const res = await fetch(SHEETDB_URL);
    if (!res.ok) { console.error("SheetDB GET failed:", await res.text()); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("GET error:", e); return [];
  }
}

function val(row, ...names) {
  for (const n of names) {
    if (row[n] != null && row[n] !== "") return row[n];
    const k = Object.keys(row).find(k => k.toLowerCase() === n.toLowerCase());
    if (k) return row[k];
  }
  return "";
}

function computeLeaderboard(rows) {
  const users = {};
  for (const row of rows) {
    const name = val(row, "Name");
    const status = String(val(row, "Status")).toLowerCase();
    if (status !== "complete") continue;
    const pts = Number(val(row, "Points")) || 0;
    if (!users[name]) users[name] = { count: 0, points: 0 };
    users[name].count += 1;
    users[name].points += pts;
  }
  // Local overlay for instant feedback
  const mineLocal = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  const me = getCurrentUser();
  if (mineLocal.length > 0) {
    const extra = mineLocal.length * POINTS.base;
    if (!users[me.Name]) users[me.Name] = { count: 0, points: 0 };
    users[me.Name].count = Math.max(users[me.Name].count, mineLocal.length);
    users[me.Name].points = Math.max(users[me.Name].points, extra);
  }
  return Object.entries(users).map(([name,v]) => ({name, ...v}))
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

  const data = {
    labels: ["Completed", "Incomplete"],
    datasets: [{ data: [completedCount, incomplete], backgroundColor: ["#28a745", "#dc3545"] }]
  };

  if (!completionChart) {
    completionChart = new Chart(ctx, { type: "pie", data, options: { responsive: true } });
  } else {
    completionChart.data = data;
    completionChart.update();
  }
}

async function fetchAndRender() {
  const rows = await fetchSheetRows();

  // Filters
  const dept = document.getElementById("departmentFilter").value;
  const risk = document.getElementById("riskFilter").value;
  const days = document.getElementById("timeFilter").value;
  const now = new Date();

  const filtered = rows.filter(row => {
    const matchDept = dept === "All" || val(row, "Department") === dept;
    const matchRisk = risk === "All" || val(row, "RiskTier") === risk;
    const dateStr = val(row, "Date");
    const matchTime = days === "All" || (now - new Date(dateStr)) / (1000*60*60*24) <= parseInt(days);
    return matchDept && matchRisk && matchTime;
  });

  // Alerts
  alertsEl.innerHTML = "";
  filtered.forEach(row => {
    const status = String(val(row, "Status")).toLowerCase();
    const title  = val(row, "TrainingTitle");
    const name   = val(row, "Name");
    const score  = Number(val(row, "Score")) || 0;
    if (status === "incomplete") {
      alertsEl.insertAdjacentHTML("beforeend", `<li>${name} missed ${title}. Retraining scheduled.</li>`);
    } else if (score < 60) {
      alertsEl.insertAdjacentHTML("beforeend", `<li>${name} scored low on ${title}. Nudge sent.</li>`);
    }
  });

  // Leaderboard
  const board = computeLeaderboard(filtered);
  renderLeaderboard(board);

  // Pie chart (for current user vs catalog)
  const me = getCurrentUser();
  const mineFromSheet = filtered.filter(r => String(val(r,"Name")) === me.Name && String(val(r,"Status")).toLowerCase() === "complete");
  const completedSet = new Set(mineFromSheet.map(r => val(r,"TrainingTitle")).filter(Boolean));
  JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]").forEach(t => completedSet.add(t));
  drawOrUpdatePieChart(completedSet.size, trainingItems.length);
}

// ======= Param handler (from results.html) =======
async function handleCompletionParams() {
  const p = new URLSearchParams(location.search);
  // Accept module= OR completed= OR title=
  const mod = p.get("module") || p.get("completed") || p.get("title");
  const score = p.get("score");
  if (mod) {
    addLocalCompletion(mod);
    await recordCompletion(mod, score);
    // Clear params so refresh doesn't double-post
    history.replaceState({}, document.title, location.pathname);
  }
}

// ======= Boot =======
(async function boot() {
  setLoginFromQuery();
  renderTrainingList();
  hookFilters();
  await handleCompletionParams();
  await fetchAndRender();
  // Auto-refresh every 20s
  setInterval(fetchAndRender, 20000);
})();
// On quiz finish:
const params = new URLSearchParams({
  user_id,                // from dashboard/login
  name,                   // from dashboard/login
  role,                   // from dashboard/login
  module: moduleTitle,    // e.g., "Phishing Basics"
  score: String(score)
});
location.href = `/cashier/results.html?${params.toString()}`; // or the right folder for the role
