const fs = require('fs');
const path = require('path');

// Determine log directory based on environment
const getLogDirectory = () => {
    if (process.env.NODE_ENV === 'production' && process.env.LOGS_PATH) {
        return process.env.LOGS_PATH;
    }

    // Development: logs in backend folder
    return path.join(__dirname, '../../logs');
};

// Ensure log directory exists
const logDir = getLogDirectory();
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Log file paths
const logFile = path.join(logDir, 'backend.log');
const errorLogFile = path.join(logDir, 'errors.log');

// Create write streams
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const errorLogStream = fs.createWriteStream(errorLogFile, { flags: 'a' });

/**
 * Format log message with timestamp
 */
function formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}\n`;
}

/**
 * Enhanced console.log that also writes to file
 */
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    // Write to file
    logStream.write(formatMessage('INFO', message));

    // Also output to console
    originalLog.apply(console, args);
};

console.error = function(...args) {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    // Write to both log files
    logStream.write(formatMessage('ERROR', message));
    errorLogStream.write(formatMessage('ERROR', message));

    // Also output to console
    originalError.apply(console, args);
};

console.warn = function(...args) {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    // Write to file
    logStream.write(formatMessage('WARN', message));

    // Also output to console
    originalWarn.apply(console, args);
};

// Log startup
console.log('========================================');
console.log('📝 LOGGER INITIALIZED');
console.log('========================================');
console.log('Log directory:', logDir);
console.log('Main log file:', logFile);
console.log('Error log file:', errorLogFile);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('========================================');

// Handle process exit to close streams
process.on('exit', () => {
    logStream.end();
    errorLogStream.end();
});

process.on('SIGINT', () => {
    logStream.end();
    errorLogStream.end();
    process.exit();
});

process.on('SIGTERM', () => {
    logStream.end();
    errorLogStream.end();
    process.exit();
});

module.exports = {
    logFile,
    errorLogFile,
    logDir
};