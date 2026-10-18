@echo off
title SIBORA - Local Server Runner
echo ========================================================
echo               SIBORA LOCAL SERVER RUNNER
echo ========================================================
echo.

REM 1. Set PATH to include XAMPP PHP and MySQL
set "PATH=C:\xampp\php;C:\xampp\mysql\bin;%PATH%"

REM 2. Check if MySQL is running on port 3308
netstat -ano | findstr :3308 >nul
if %errorlevel% neq 0 (
    echo [INFO] Menjalankan MySQL XAMPP...
    start /B "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] MySQL sudah berjalan di port 3308.
)

REM 3. Masuk ke folder backend-laravel
cd /d "%~dp0backend-laravel"

REM 4. Buka browser secara otomatis
start "" "http://127.0.0.1:8000/index.html"

REM 5. Jalankan Laravel Artisan Serve
echo.
echo [OK] Server Laravel berjalan di: http://127.0.0.1:8000
echo      - Frontend : http://127.0.0.1:8000/index.html
echo      - API      : http://127.0.0.1:8000/api/v1/health
echo.
echo Tekan Ctrl + C untuk mematikan server.
echo.
php artisan serve --host=127.0.0.1 --port=8000
pause
