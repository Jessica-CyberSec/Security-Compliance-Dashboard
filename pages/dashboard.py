import streamlit as st
from utils2 import load_training_data
from fpdf import FPDF
import pandas as pd
import re
import os

# ✅ Page Config (set only once)
st.set_page_config(page_title="📊 Dashboard", layout="wide", initial_sidebar_state="collapsed")

# ✅ Hide sidebar + other elements
st.markdown("""
    <style>
    [data-testid="stSidebar"] { display: none; }
    #MainMenu, header, footer {visibility: hidden;}
    </style>
""", unsafe_allow_html=True)

# ✅ Auth Check (Use single source of truth: "logged_in" and "user")
if "logged_in" not in st.session_state or not st.session_state["logged_in"]:
    st.error("Please login first.")
    st.stop()

user = st.session_state.get("user", {})
username = user.get("username", "")
role = user.get("role", "")

# ✅ Dashboard Header
st.markdown(f"""
    <div style='text-align: center; padding-top: 10px; padding-bottom: 0px'>
        <h1>📊 Security Compliance Dashboard</h1>
        <h4>Welcome, Jessica Nagpal - Admin)</h4>
    </div>
""", unsafe_allow_html=True)

# ✅ Load Training Data
df = load_training_data()

# ✅ Role Filter
role_filter = st.selectbox("🔍 Filter by Role", ["All"] + sorted(df["role"].unique()))
filtered_df = df[df["role"] == role_filter] if role_filter != "All" else df

# ✅ Alerts
st.subheader("🚨 Alerts")
for _, row in filtered_df.iterrows():
    if row["training_completed"].strip().lower() == "no":
        st.warning(f"{row['name']} missed training!")

# ✅ Compliance Overview
st.subheader("📈 Compliance Overview")
chart_data = pd.DataFrame({
    "Status": ["Compliant", "Non-Compliant"],
    "Count": [
        len(filtered_df[filtered_df["training_completed"].str.lower() == "yes"]),
        len(filtered_df[filtered_df["training_completed"].str.lower() != "yes"])
    ]
})
st.bar_chart(chart_data.set_index("Status"))

# ✅ Training Link
frontend_path = "frontend"
role_links = {
    "Cashier": f"{frontend_path}/cashier/training_dashboard.html",
    "Supervisor": f"{frontend_path}/supervisor/training_dashboard.html",
    "Stock Staff": f"{frontend_path}/stock_staff/training_dashboard.html",
    "Head Office": f"{frontend_path}/management/training_dashboard.html",
}
link = role_links.get(role)
if link:
    file_url = f"file://{os.path.abspath(link)}"
    st.markdown(f"[🔗 Open your training]({file_url})", unsafe_allow_html=True)

# ✅ Leaderboard
st.subheader("🏆 Leaderboard")
leaderboard = filtered_df.sort_values("quiz_score", ascending=False)[["name", "role", "quiz_score", "points", "badge"]]
st.dataframe(leaderboard, use_container_width=True)

# ✅ Export
def remove_emojis(text):
    if isinstance(text, str):
        return re.sub(r'[^\x00-\x7F]+', '', text)
    return text

def export_pdf(data):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    for _, row in data.iterrows():
        clean_row = {k: remove_emojis(str(v)) for k, v in row.items()}
        pdf.cell(200, 10, txt=str(clean_row), ln=True)
    return pdf.output(dest="S").encode("latin1")

st.subheader("📤 Export Report")
csv_data = filtered_df.to_csv(index=False).encode("utf-8")
pdf_data = export_pdf(filtered_df)

st.download_button("📥 Download CSV", csv_data, "report.csv", "text/csv")
st.download_button("📄 Download PDF", pdf_data, "report.pdf", "application/pdf")
