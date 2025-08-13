import pandas as pd
import streamlit as st

def load_training_data():
    

    url = "https://sheetdb.io/api/v1/rpfzp6uq9dv4w"  # Your working API
    
    try:
        
        df = pd.read_json(url)

        # Debug columns (after df is created)
        st.write("DEBUG columns:", list(df.columns))

        # Normalize columns
        df.columns = df.columns.str.strip().str.lower()


        # Normalize columns
        df.columns = df.columns.str.strip().str.lower()

        # Normalize values for matching
        df["username"] = df["username"].astype(str).str.strip().str.lower()
        df["jobid"] = df["jobid"].astype(str).str.strip().str.upper()
        df["role"] = df["role"].astype(str).str.strip().str.lower()

        return df

    except Exception as e:
        raise Exception(f"Failed to load training data: {e}")
