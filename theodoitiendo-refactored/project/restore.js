const fs = require('fs');
const path = require('path');

const LATEST_BACKUP_PATH = path.join(__dirname, 'backups', 'latest_backup.json');
const RESTORE_FILE_PATH = path.join(__dirname, 'public', 'restore.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

console.log('Starting restore process...');

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
    console.log('Creating public directory...');
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Check if the latest backup file exists
if (!fs.existsSync(LATEST_BACKUP_PATH)) {
    console.error('Error: No backup file found at ' + LATEST_BACKUP_PATH);
    console.error('Cannot proceed with restore. Please ensure a backup has been made.');
    process.exit(1); // Exit with an error code
}

// Copy the latest backup to the public directory for the app to fetch
try {
    fs.copyFileSync(LATEST_BACKUP_PATH, RESTORE_FILE_PATH);
    console.log(`Successfully prepared restore file at ${RESTORE_FILE_PATH}`);
    console.log('-----------------------------------------------------------');
    console.log('SUCCESS! Please REFRESH your web application page now.');
    console.log('-----------------------------------------------------------');
} catch (err) {
    console.error('Error copying backup file for restore:', err);
    process.exit(1);
}