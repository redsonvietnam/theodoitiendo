@echo off
echo Starting server...
rem The backend server (server.js) also serves the frontend files from the 'dist' folder.
rem There is no need to run a separate frontend development server (like Vite).
start "Server" node server.js
echo The application server is starting in a new window.
echo You can access it at http://localhost:3002 after a few moments.
