
Supervisor Dashboard — Drop‑in Bundle
====================================

What this does
--------------
- Mirrors the Cashier logic for **Supervisor** with ROLE-specific keys.
- Posts rows to your **training_log** Google Sheet via SheetDB using your exact headers:
  user_id, username, role, training, training_title, completed, score, submitted_at, source
- Auto-updates **leaderboard** and **pie chart** instantly (local overlay + SheetDB refresh).
- Tolerant results flow: accepts module/completed/title and routes back correctly.

How to use
----------
1) Open `supervisor/training_dashboard_supervisor.html` from a local server or GitHub Pages.
   - Local quick server:
       python -m http.server 5500
     Then visit: http://localhost:5500/supervisor/training_dashboard_supervisor.html

2) Set your SheetDB API in `supervisor_dashboard.js`:
   const SHEETDB_URL = "https://sheetdb.io/api/v1/YOUR_API_ID";

3) Ensure login writes (once):
   localStorage.setItem("user_id", "C0938727");
   localStorage.setItem("name", "Jessica Nagpal");
   localStorage.setItem("role", "Supervisor"); // important for training_log.role

4) From your quiz, redirect to:
   supervisor/results.html?module=RBAC%20%26%20Permissions&score=87&back=training_dashboard_supervisor.html

   The Return button will open:
   training_dashboard_supervisor.html?completed=RBAC%20%26%20Permissions&score=87
   → Dashboard records row to Sheet and refreshes UI.
