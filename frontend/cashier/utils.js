
/* === CONFIG (edit as needed) === */
const SHEETDB_URL = "https://sheetdb.io/api/v1/avv2xl4lw5vfy"; // <-- your API
const ROLE = "Cashier";
const DEPARTMENT_DEFAULT = "Frontline";
const RISK_TIER_DEFAULT = "Medium";
const LOCAL_KEY = "completedTrainings"; // Cashier

// Points model
const POINTS = { base: 10, perScore: 1 };

// Training catalog for Cashier (edit titles to match your quiz redirects)
const trainingItems = [
  { title: "Phishing Awareness", minutes: 10 },
  { title: "Password Hygiene", minutes: 8 },
  { title: "POS Security Basics", minutes: 12 },
  { title: "Data Handling at Checkout", minutes: 10 },
  { title: "Social Engineering in Retail", minutes: 10 }
];

function getCurrentUser() {
  const name = localStorage.getItem("currentUserName") || "Unknown User";
  const dept = localStorage.getItem("currentUserDepartment") || DEPARTMENT_DEFAULT;
  const risk = localStorage.getItem("currentUserRiskTier") || RISK_TIER_DEFAULT;
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
  return {
    Name, Role, Department, RiskTier,
    TrainingTitle: trainingTitle,
    Status: status,
    Score: String(score ?? ""),
    Points: String(pts),
    Date: now
  };
}

async function syncCompletionToSheet(row) {
  try {
    const res = await fetch(SHEETDB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [row] })
    });
    if (!res.ok) {
      console.error("SheetDB POST failed", await res.text());
    }
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
