import datetime
import streamlit as st
from streamlit_autorefresh import st_autorefresh

# 🔄 Auto-refresh (optional)
st_autorefresh(interval=1000, limit=None, key="refresh")

# 🧭 Streamlit config
st.set_page_config(
    page_title="Security Compliance Tracker",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# —— SETTINGS ——
# Directly use Streamlit's /login route for pages/login.py
LOGIN_URL = "/login"

# 🎨 Styles + layout
st.markdown("""
<style>
  [data-testid="stSidebar"], [data-testid="collapsedControl"], footer { display:none !important; }
  .center {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    min-height:100vh; color:#fff; text-align:center;
    background: linear-gradient(to right, #00c6ff, #0072ff);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  .center h1 {
    font-size:60px; font-weight:700; margin:0 0 10px;
    text-shadow:2px 2px 4px rgba(0,0,0,.3);
  }
  .subtitle { font-size:22px; opacity:.9; }
  .clock { font-size:18px; margin-top:14px; color:#dbe9f4; }
  .get-started {
    position:absolute; bottom:30px; right:40px; background:#fff; color:#0072ff;
    font-weight:700; padding:12px 20px; border-radius:30px; text-decoration:none;
    box-shadow:2px 4px 10px rgba(0,0,0,.2); transition:all .2s ease-in-out;
  }
  .get-started:hover { background:#e6f0ff; transform: translateY(-2px); }
</style>
""", unsafe_allow_html=True)

# Current time
now = datetime.datetime.now().strftime('%H:%M:%S')

# 🧠 Main block
st.markdown(f'''
<div class="center">
  <h1>Security Compliance Tracker</h1>
  <div class="subtitle">Ensuring organization-wide awareness and accountability</div>
  <div class="clock">{now}</div>
  <a href="{LOGIN_URL}" class="get-started">Get Started →</a>
</div>
''', unsafe_allow_html=True)

# 🔁 Auto-redirect to the Streamlit login page after 5 seconds
st.markdown(f"""
<script>
  setTimeout(function() {{
    window.location.pathname = "{LOGIN_URL}";
  }}, 5000);
</script>
""", unsafe_allow_html=True)

# Optional: clickable button
if st.button("Go to Login now"):
    st.markdown(f'<meta http-equiv="refresh" content="0; url={LOGIN_URL}">', unsafe_allow_html=True)

