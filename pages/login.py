# login.py — works with sheet: username | jobid | role (no user_id needed)

import os
import urllib.parse as up
import streamlit as st
from utils import load_training_data  # returns df with columns username, jobid, role

# === CONFIG ===
# You are serving from INSIDE 'frontend' on port 5501,
# so do NOT include '/frontend' in the base URL.
HTML_HOST = "127.0.0.1"
HTML_PORT = os.getenv("HTML_PORT", "5501")
LIVE_SERVER_BASE = f"http://{HTML_HOST}:{HTML_PORT}"   # <-- fixed (no /frontend)
LIVE_SERVER_ROOT = ""                                   # keep empty when server root == frontend/

# Role -> folder mapping (use exact folder names you have)
ROLE_TO_FOLDER = {
    "cashier": "cashier",
    "supervisor": "supervisor",
    "management": "management",
    "stock staff": "stock staff",   # keep the space; we'll encode it
    "admin": "management",          # admins see mgmt dashboard (change if needed)
}

# Page + basic styling
st.set_page_config(page_title="Login", layout="wide", initial_sidebar_state="collapsed")
st.markdown("""
<style>
  [data-testid="stSidebar"], [data-testid="collapsedControl"], footer { display: none !important; }
  html, body { background: #0f1117; color: white; }
</style>
""", unsafe_allow_html=True)

st.title("🔐 Login Portal")
username_input = st.text_input("Enter your username")
jobid_input    = st.text_input("Enter your job ID")

def _clean_username(x: str) -> str:
    return (x or "").strip().lower()

def _clean_jobid(x: str) -> str:
    return (x or "").strip().upper()

if st.button("Login"):
    try:
        # 1) Load data
        df = load_training_data()

        # 2) Normalize headers and values
        df = df.rename(columns={c: c.lower().strip() for c in df.columns})
        required = {"username", "jobid", "role"}
        missing = required - set(df.columns)
        if missing:
            st.error(f"⚠️ Missing columns in training data: {', '.join(sorted(missing))}")
            st.stop()

        df["username"] = df["username"].astype(str).str.strip().str.lower()
        df["jobid"]    = df["jobid"].astype(str).str.strip().str.upper()
        df["role"]     = df["role"].astype(str).str.strip()

        # 3) Clean inputs
        uname = _clean_username(username_input)
        jid   = _clean_jobid(jobid_input)

        # 4) Match
        row = df[(df["username"] == uname) & (df["jobid"] == jid)]
        if row.empty:
            st.error("❌ Invalid username or job ID.")
            st.stop()

        rec = row.iloc[0]
        name_display = rec["username"].title()
        role_raw     = str(rec["role"])      # e.g., "Admin", "Cashier", "Stock Staff"
        role_key     = role_raw.lower()
        folder       = ROLE_TO_FOLDER.get(role_key)

        if not folder and role_key != "admin":
            st.error(f"⚠️ Unknown role '{role_raw}'. Map it in ROLE_TO_FOLDER.")
            st.stop()

        user_id = rec["jobid"]

        # 5) Save session
        st.session_state["logged_in"]    = True
        st.session_state["username"]     = uname
        st.session_state["display_name"] = name_display
        st.session_state["user_id"]      = user_id
        st.session_state["role"]         = role_key

        # 6) Route
        if role_key == "admin":
            st.success("Welcome Admin! Redirecting…")
            st.switch_page("pages/dashboard.py")
        else:
            qs = up.urlencode({
                "user_id": user_id,
                "name": name_display,
                "role": role_raw,  # keep original case/spaces for UI
            })
            # Build path relative to server root (which is the 'frontend' folder)
            path = f"{LIVE_SERVER_ROOT}/{folder}/training_dashboard.html".lstrip("/")
            # Encode spaces etc. but keep slashes
            path_encoded = up.quote(path, safe="/")

            file_url = f"{LIVE_SERVER_BASE}/{path_encoded}?{qs}"
            st.success(f"Welcome {name_display}!")
            st.markdown(
                f"👉 [Click here to continue to your training dashboard]({file_url})",
                unsafe_allow_html=True
            )
            # Auto-redirect (uncomment if you want it)
            # st.markdown(f'<meta http-equiv="refresh" content="0; url={file_url}">', unsafe_allow_html=True)

    except Exception as e:
        st.error(f"⚠️ Login failed: {e}")
