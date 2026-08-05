@echo off
setlocal enabledelayedexpansion

rem =================================================================================
rem This script creates a complete, portable, offline package for the application.
rem Run this on a machine WITH an internet connection.
rem
rem v5: Root cause of the silent crash found. The window-closing bug (v4) was real
rem but hid a DEEPER bug: better-sqlite3 ships a compiled native binary tied to the
rem exact Node.js ABI version used when "npm install" ran. If the OFFLINE machine's
rem Node.js version differs even slightly from the machine that ran this script,
rem loading that binary crashes the whole process at the OS level -- no JS
rem try/catch can catch it, so nothing gets printed. That matches "prints the db
rem path, then just stops with no error".
rem
rem Fix: stop trusting whatever Node.js happens to be installed on the offline
rem machine. Download a portable copy of the EXACT Node.js version used here and
rem ship it inside FINAL_PACKAGE\node\. start.bat now runs FINAL_PACKAGE\node\node.exe
rem instead of the bare "node" command, so the runtime always matches the binary
rem that better-sqlite3 was compiled against.
rem =================================================================================

echo Creating a clean offline package (v5)...

rem --- Configuration ---
set PACKAGE_DIR=FINAL_PACKAGE
set NODE_MODULES_DIR=%PACKAGE_DIR%\node_modules

rem --- Step 0: Make sure the frontend is actually built and up to date ---
if not exist "dist\index.html" (
    echo.
    echo ERROR: dist\index.html not found.
    echo You must run "npm run build" in this folder BEFORE running package-offline.bat.
    echo Aborting so we don't ship an offline package with a missing/blank frontend.
    echo.
    exit /b 1
)

rem --- Step 0b: Bundle a portable Node.js runtime matching THIS machine's version,
rem     so the offline machine can never load a mismatched native binary. ---
for /f "delims=" %%v in ('node -v') do set NODEVER=%%v
echo Detected Node.js version on this machine: %NODEVER%
echo Downloading a portable Node.js %NODEVER% (win-x64) to bundle offline...
if exist "node-portable.zip" del /q "node-portable.zip"
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -Uri 'https://nodejs.org/dist/%NODEVER%/node-%NODEVER%-win-x64.zip' -OutFile 'node-portable.zip' } catch { exit 1 }"
if not exist "node-portable.zip" (
    echo.
    echo WARNING: Could not download a portable Node.js runtime ^(no internet, or this
    echo Node.js version is not published for win-x64^). Continuing WITHOUT bundling a
    echo runtime -- the offline machine MUST have Node.js %NODEVER% installed exactly,
    echo or better-sqlite3 will crash again with no error message. Recommended: install
    echo Node.js %NODEVER% manually on the offline machine.
    echo.
    set BUNDLE_NODE_FAILED=1
) else (
    echo Extracting portable Node.js...
    if exist "node-portable-tmp" rmdir /s /q "node-portable-tmp"
    powershell -NoProfile -Command "Expand-Archive -Path 'node-portable.zip' -DestinationPath 'node-portable-tmp' -Force"
    del /q "node-portable.zip"
    if not exist "%PACKAGE_DIR%" mkdir "%PACKAGE_DIR%"
    if exist "%PACKAGE_DIR%\node" rmdir /s /q "%PACKAGE_DIR%\node"
    move "node-portable-tmp\node-%NODEVER%-win-x64" "%PACKAGE_DIR%\node" > nul
    rmdir /s /q "node-portable-tmp" 2>nul
    if exist "%PACKAGE_DIR%\node\node.exe" (
        echo Bundled portable Node.js %NODEVER% into %PACKAGE_DIR%\node\node.exe
    ) else (
        echo WARNING: Extraction did not produce node.exe where expected. Falling back
        echo to relying on the offline machine's own Node.js install.
        set BUNDLE_NODE_FAILED=1
    )
)

rem --- Step 1: Prepare the package directory (don't delete, to avoid file locks) ---
echo Ensuring package directory exists: %PACKAGE_DIR%
if not exist "%PACKAGE_DIR%" mkdir "%PACKAGE_DIR%"
cd "%PACKAGE_DIR%"

rem --- Step 2: Create a minimal package.json and install dependencies ---
echo Creating a temporary package.json with all required dependencies...
(
    echo {
    echo   "name": "theodoitiendo-offline",
    echo   "version": "1.0.0",
    echo   "type": "module",
    echo   "dependencies": {
    echo     "bcryptjs": "^3.0.3",
    echo     "better-sqlite3": "^13.0.2",
    echo     "cors": "^2.8.6",
    echo     "dotenv": "^17.2.3",
    echo     "express": "^4.21.2",
    echo     "jsonwebtoken": "^9.0.3"
    echo   }
    echo }
) > package.json

echo Installing production dependencies... This requires an internet connection.
call npm install --omit=dev
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed. Please check your internet connection and try again.
    exit /b 1
)

rem --- Step 3: Copy all necessary application files from the source directory ---
echo Copying application files...
cd ..

rem List of files and folders to copy
rem We are intentionally NOT copying the 'data' directory to avoid file locks
rem on the live database. The server will create a new empty database on first run.
set "COPY_ITEMS=server.js package.json server public dist"

for %%i in (%COPY_ITEMS%) do (
    if exist "%%i" (
        echo Copying %%i...
        if exist "%%i\" (
            robocopy "%%i" "%PACKAGE_DIR%\%%i" /E /NFL /NDL /NJH /NJS /nc /ns /np
        ) else (
            copy "%%i" "%PACKAGE_DIR%\" /Y > nul
        )
    ) else (
        echo WARNING: Source item '%%i' not found, skipping.
    )
)

rem --- Step 3b: Sanity-check that the frontend actually made it into the package ---
if not exist "%PACKAGE_DIR%\dist\index.html" (
    echo.
    echo ERROR: %PACKAGE_DIR%\dist\index.html is missing after copy. The offline
    echo package would start but show a blank/404 page. Aborting.
    echo.
    exit /b 1
)

rem --- Step 3c: Make sure the data folder exists inside the package (defensive;
rem     server/db.js and server/auth.js also create it on first run via mkdirSync) ---
if not exist "%PACKAGE_DIR%\data" mkdir "%PACKAGE_DIR%\data"

rem --- Step 4: Create the correct start.bat in the final package ---
echo Creating final start.bat...
(
    echo @echo off
    echo cd /d "%%~dp0"
    echo if exist "%%~dp0node\node.exe" ^(
    echo     set "NODE_EXE=%%~dp0node\node.exe"
    echo ^) else ^(
    echo     set "NODE_EXE=node"
    echo ^)
    echo echo ============================================================
    echo echo  Dang khoi dong may chu. DUNG DONG cua so nay khi dang dung app.
    echo echo  Truy cap ung dung tai: http://localhost:3002
    echo echo ============================================================
    echo echo.
    echo "%%NODE_EXE%%" server.js
    echo echo.
    echo echo ============================================================
    echo echo  May chu da dung lai. Neu day la loi bat ngo ^(khong phai do ban
    echo echo  tu dong cua so^), hay chup lai man hinh cua so nay de bao loi.
    echo echo ============================================================
    echo pause
) > "%PACKAGE_DIR%\start.bat"


echo.
echo =================================================================================
echo SUCCESS!
echo A complete offline package has been created in the '%PACKAGE_DIR%' folder.
if defined BUNDLE_NODE_FAILED (
    echo.
    echo *** WARNING: portable Node.js was NOT bundled ^(see warning above^). The
    echo *** offline machine must have Node.js %NODEVER% installed exactly, or
    echo *** better-sqlite3 will crash silently again.
)
echo.
echo NEXT STEPS:
echo 1. ZIP the ENTIRE '%PACKAGE_DIR%' folder ^(this now includes a node\ folder,
echo    so the zip will be larger than before -- that's expected^).
echo 2. Copy the ZIP file to the offline machine.
echo 3. Unzip and run 'start.bat'.
echo =================================================================================
pause
