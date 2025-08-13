import requests
import pandas as pd

SHEETDB_URL = "https://sheetdb.io/api/v1/u2anbwy6fqcvb"  # ← Replace with your real one

def load_training_data():
    res = requests.get(SHEETDB_URL)
    df = pd.DataFrame(res.json())
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    return df
