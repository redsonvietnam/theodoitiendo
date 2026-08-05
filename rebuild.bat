@echo off
rem Automatically change to the script's directory to ensure all commands run in the correct folder.
cd /d "%~dp0"

echo ====================================================================
echo Running in directory: %cd%
echo Rebuilding dependencies... this may take a few minutes.
echo ====================================================================

rem Remove the old, potentially corrupt node_modules folder
if exist "node_modules" (
    echo Deleting old node_modules folder...
    rmdir /s /q "node_modules"
)

rem Reinstall dependencies from package.json using the correct flag for production
echo Installing dependencies with npm...
call npm install --omit=dev

echo.
echo ====================================================================
echo Dependencies have been rebuilt successfully.
echo You can now run start.bat to launch the application.
echo ====================================================================
pause
