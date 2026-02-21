@echo off
chcp 65001 >nul
title SABIA EMPRENDE - Instalador Demo
color 0A

echo.
echo  ============================================
echo       SABIA EMPRENDE - Demo Interactiva
echo       Tu Aliado Estratégico para Panama
echo  ============================================
echo.

:: ---- Verificar Python ----
echo  [1/4] Verificando Python...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: Python no esta instalado.
    echo.
    echo  Descargalo aqui: https://www.python.org/downloads/
    echo.
    echo  IMPORTANTE: Al instalar, marca la casilla
    echo  "Add python.exe to PATH"
    echo.
    echo  Despues de instalar, cierra esta ventana y
    echo  ejecuta este archivo de nuevo.
    echo.
    pause
    exit /b 1
)
echo         Python encontrado OK

:: ---- Ir a la carpeta demo ----
echo  [2/4] Preparando carpeta...
cd /d "%~dp0demo"
if %ERRORLEVEL% NEQ 0 (
    echo  ERROR: No se encontro la carpeta demo
    pause
    exit /b 1
)
echo         Carpeta demo OK

:: ---- Instalar dependencias ----
echo  [3/4] Instalando dependencias (primera vez tarda ~1 min)...
python -m pip install -r requirements.txt --quiet >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo         Reintentando instalacion...
    python -m pip install streamlit plotly --quiet
)
echo         Dependencias instaladas OK

:: ---- Lanzar app ----
echo  [4/4] Abriendo SABIA EMPRENDE en tu navegador...
echo.
echo  ============================================
echo    La app se abrira en: http://localhost:8501
echo    Para cerrar: presiona Ctrl+C en esta ventana
echo  ============================================
echo.

python -m streamlit run app.py --server.headless true

pause
