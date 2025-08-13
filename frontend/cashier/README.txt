
Cashier Dashboard — Updated
===========================

What changed
------------
1) `training_dashboard1.html` now uses **cashier_dashboard.js** for all logic.
2) `cashier_dashboard.js`:
   - Accepts `?module=` or `?completed=` (and `&score=`) and **POSTs** one row to SheetDB.
   - Instantly overlays local completions so your **leaderboard** and **pie** reflect progress immediately.
   - Maintains a **single Chart.js instance** and updates its dataset instead of recreating it (fixes pie not refreshing).
   - Keeps your filters (department, risk, time) and applies them to the fetched rows.
3) Added a tolerant `results.html` that returns to `training_dashboard1.html` with the right params.

How to use
----------
- Serve this folder (or drop on GitHub Pages). For local testing:
    python -m http.server 5500
  Open http://localhost:5500/training_dashboard1.html

- From your quiz page, redirect to:
    results.html?module=Phishing%20Awareness&score=82&back=training_dashboard1.html
  The Return button will send:
    training_dashboard1.html?completed=Phishing%20Awareness&score=82

- Ensure your SheetDB API ID is correct in cashier_dashboard.js at SHEETDB_URL.
