const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../logs/api-requests.log');

function logApiEvent(event) {
    fs.appendFile(
        logFile,
        JSON.stringify({ ...event, timestamp: new Date().toISOString() }) + '\n',
        err => { if (err) console.error('Log write error:', err); }
    );
}

module.exports = { logApiEvent };
