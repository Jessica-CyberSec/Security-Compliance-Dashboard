@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
chcp 65001 >nul
title Teju Capstone Launcher

REM ====== config ======
set "PROJECT_DIR=C:\Users\jessi\OneDrive\Desktop\Teju Capstone\Project Files\Teju-Project"
set "STREAMLIT_PORT=8501"
set "FRONTEND_PORT=5501"
set "LOGIN_FILE=login.html"
REM ====================

echo 🚀 Starting Teju Capstone Project...
if not exist "%PROJECT_DIR%" (
  echo [ERROR] Project folder not found: "%PROJECT_DIR%"
  pause
  exit /b 1
)

pushd "%PROJECT_DIR%" >nul

echo 🔧 Activating virtual environment...
if exist ".venv\Scripts\activate.bat" (
  call ".venv\Scripts\activate.bat"
) else (
  echo [INFO] No venv found — creating one...
  py -3 -m venv .venv || (echo [ERROR] Could not create .venv & goto :end)
  call ".venv\Scripts\activate.bat"
  if exist "requirements.txt" (
    pip install --upgrade pip
    pip install -r requirements.txt
  )
)

REM --- Launch Streamlit Admin Dashboard ---
if exist "%PROJECT_DIR%\index.py" (
  echo 📊 Launching Streamlit Admin on port %STREAMLIT_PORT%...
  start "Streamlit Admin" cmd /k ^
  ""%PROJECT_DIR%\.venv\Scripts\python.exe" -m streamlit run "%PROJECT_DIR%\index.py" --server.port %STREAMLIT_PORT% --server.address 127.0.0.1 --server.headless true"
) else (
  echo [WARN] index.py not found in %PROJECT_DIR%.
)

REM --- Launch HTML Training Server ---
if exist "%PROJECT_DIR%\frontend" (
  echo 🌐 Launching HTML Training Server on port %FRONTEND_PORT%...
  start "Training HTML" cmd /k ^
  "pushd "%PROJECT_DIR%\frontend" && "%PROJECT_DIR%\.venv\Scripts\python.exe" -m http.server %FRONTEND_PORT%"
) else (
  echo [WARN] 'frontend' folder not found in %PROJECT_DIR%.
)

REM --- Wait for both ports to start ---
powershell -NoProfile -Command "while(-not(Test-NetConnection 127.0.0.1 -Port %FRONTEND_PORT% -InformationLevel Quiet)){Start-Sleep 1}"
powershell -NoProfile -Command "while(-not(Test-NetConnection 127.0.0.1 -Port %STREAMLIT_PORT% -InformationLevel Quiet)){Start-Sleep 1}"

REM --- Open browser tabs ---
start "" "http://127.0.0.1:%STREAMLIT_PORT%/"
start "" "http://127.0.0.1:%FRONTEND_PORT%/"

echo ✅ All systems up! You can now use the app.
popd >nul
pause



