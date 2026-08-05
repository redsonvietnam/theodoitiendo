@echo off
echo Stopping the Node.js server...

rem Find the process ID (PID) of the running server
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002"') do (
    set PID=%%a
)

if defined PID (
    echo Server process found with PID: %PID%
    taskkill /F /PID %PID%
    echo Server stopped successfully.
) else (
    echo Server is not running or could not be found.
)

pause