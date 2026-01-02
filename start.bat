@echo off
echo ========================================
echo   Manager Plikow - Launcher
echo ========================================
echo.
echo Uruchamianie serwera i frontendu...
echo.

cd /d "%~dp0"

REM Uruchom npm dev w nowym oknie
start "Manager Plikow - Server & Client" cmd /k npm run dev

REM Poczekaj 5 sekund na start serwerów
timeout /t 5 /nobreak > nul

REM Otwórz przeglądarkę
start http://localhost:5174

echo.
echo Aplikacja uruchomiona!
echo Serwer: http://localhost:5000
echo Frontend: http://localhost:5174
echo.
