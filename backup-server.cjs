const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const BACKUP_DIR = path.join(__dirname, 'backups');
const PUBLIC_DIR = path.join(__dirname, 'public');
const LATEST_BACKUP_PATH = path.join(BACKUP_DIR, 'latest_backup.json');
const RESTORE_FILE_PATH = path.join(PUBLIC_DIR, 'restore.json');

// Create directories if they don't exist
[BACKUP_DIR, PUBLIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/backup') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                // Write to the latest backup file (overwriting)
                fs.writeFile(LATEST_BACKUP_PATH, body, (err) => {
                    if (err) {
                        console.error('Error writing latest backup file:', err);
                        // Don't stop, still try to send response
                    } else {
                        console.log(`Live backup updated: ${path.basename(LATEST_BACKUP_PATH)}`);
                    }
                });

                // Also write to a timestamped file for history
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `backup-${timestamp}.json`;
                const filepath = path.join(BACKUP_DIR, filename);

                fs.writeFile(filepath, body, (err) => {
                    if (err) {
                        console.error('Error writing timestamped backup file:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Error writing backup file' }));
                        return;
                    }
                    console.log(`Historical backup saved: ${filename}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Backup successful' }));
                });

            } catch (e) {
                console.error('Error processing backup data:', e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid data format' }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/delete-restore-file') {
        if (fs.existsSync(RESTORE_FILE_PATH)) {
            fs.unlink(RESTORE_FILE_PATH, (err) => {
                if (err) {
                    console.error('Error deleting restore file:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Error deleting restore file' }));
                    return;
                }
                console.log('Restore file deleted successfully.');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Restore file deleted' }));
            });
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'No restore file to delete' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Not Found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Backup server listening on http://localhost:${PORT}`);
    console.log('Ready to receive backup data from the web app.');
    console.log('You can leave this window open and it will automatically save backups.');
    console.log('Press Ctrl+C to stop the server.');
});