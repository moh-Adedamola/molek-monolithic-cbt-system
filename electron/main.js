const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendServer;

// Paths configuration
const paths = {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    archives: null,
    database: null,
    backend: null,
    uploads: null,
    logs: null  // ✅ ADD LOGS PATH
};

/**
 * Initialize application paths
 */
function initializePaths() {
    if (isDev) {
        // Development paths
        paths.backend = path.join(__dirname, '../backend');
        paths.database = path.join(paths.backend, 'src/db');
        paths.archives = path.join(paths.backend, 'archives');
        paths.uploads = path.join(paths.backend, 'uploads');
        paths.logs = path.join(paths.backend, 'logs');  // ✅ ADD THIS
    } else {
        // Production paths
        paths.backend = path.join(process.resourcesPath, 'backend');
        paths.database = path.join(paths.userData, 'data');
        paths.archives = path.join(paths.documents, 'MolekCBT_Archives');
        paths.uploads = path.join(paths.documents, 'MolekCBT_Uploads');
        paths.logs = path.join(paths.documents, 'MolekCBT_Logs');  // ✅ ADD THIS
    }

    // Create necessary directories
    try {
        if (!fs.existsSync(paths.archives)) {
            fs.mkdirSync(paths.archives, { recursive: true });
            console.log('✅ Created archives directory');
        }
        if (!fs.existsSync(paths.database)) {
            fs.mkdirSync(paths.database, { recursive: true });
            console.log('✅ Created database directory');
        }
        if (!fs.existsSync(paths.uploads)) {
            fs.mkdirSync(paths.uploads, { recursive: true });
            console.log('✅ Created uploads directory');
        }
        if (!fs.existsSync(paths.logs)) {  // ✅ ADD THIS
            fs.mkdirSync(paths.logs, { recursive: true });
            console.log('✅ Created logs directory');
        }

        console.log('========================================');
        console.log('📁 PATHS INITIALIZED');
        console.log('========================================');
        console.log('Mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
        console.log('Backend:', paths.backend);
        console.log('Database:', paths.database);
        console.log('Archives:', paths.archives);
        console.log('Uploads:', paths.uploads);
        console.log('Logs:', paths.logs);  // ✅ ADD THIS
        console.log('========================================');
    } catch (error) {
        console.error('❌ Failed to create directories:', error);
    }
}

/**
 * First-time setup
 */
async function runFirstTimeSetup() {
    const setupMarker = path.join(paths.userData, '.setup-complete');

    if (fs.existsSync(setupMarker)) {
        console.log('✅ Setup already completed');
        return true;
    }

    console.log('🎉 Running first-time setup...');

    try {
        // Copy database to user data (production only)
        if (!isDev) {
            const sourceDb = path.join(paths.backend, 'src/db/cbt.db');
            const targetDb = path.join(paths.database, 'cbt.db');

            console.log('📋 Checking database...');
            console.log('   Source:', sourceDb);
            console.log('   Target:', targetDb);
            console.log('   Source exists?', fs.existsSync(sourceDb));
            console.log('   Target exists?', fs.existsSync(targetDb));

            if (fs.existsSync(sourceDb) && !fs.existsSync(targetDb)) {
                console.log('📋 Copying database to user data...');
                fs.copyFileSync(sourceDb, targetDb);
                console.log('✅ Database copied successfully');
            } else if (!fs.existsSync(sourceDb)) {
                console.log('⚠️  Source database not found, will be created by backend');
            } else {
                console.log('✅ Target database already exists');
            }
        }

        // Mark setup as complete
        fs.writeFileSync(setupMarker, JSON.stringify({
            completedAt: new Date().toISOString(),
            version: app.getVersion()
        }));

        console.log('✅ Setup completed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Setup failed:', error);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);

        dialog.showErrorBox(
            'Setup Failed',
            'Failed to complete first-time setup.\n\n' +
            'Error: ' + error.message + '\n\n' +
            'The application will try to continue anyway.'
        );

        return true; // Return true anyway to let the app try to run
    }
}

/**
 * Start backend server
 */
async function startBackend() {
    const { spawn } = require('child_process');

    // Database path - FULL PATH TO .db FILE
    const dbPath = isDev
        ? path.join(paths.backend, 'src/db/cbt.db')
        : path.join(paths.database, 'cbt.db');

    console.log('========================================');
    console.log('🚀 STARTING BACKEND SERVER');
    console.log('========================================');
    console.log('Backend path:', paths.backend);
    console.log('Database path:', dbPath);
    console.log('Archives path:', paths.archives);
    console.log('Uploads path:', paths.uploads);
    console.log('Logs path:', paths.logs);  // ✅ ADD THIS
    console.log('Environment:', isDev ? 'development' : 'production');

    const serverPath = path.join(paths.backend, 'src/server.js');

    console.log('Server path:', serverPath);
    console.log('Server exists?', fs.existsSync(serverPath));

    if (!fs.existsSync(serverPath)) {
        console.error('❌ Backend server file not found!');
        dialog.showErrorBox(
            'Backend Not Found',
            'Backend server file not found at:\n' + serverPath + '\n\n' +
            'Please reinstall the application.'
        );
        return false;
    }

    // Verify database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        console.log('📁 Creating database directory...');
        fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('========================================');

    try {
        // Spawn Node.js process
        console.log('🔧 Spawning Node.js process...');

        backendServer = spawn('node', [serverPath], {
            cwd: paths.backend,
            env: {
                ...process.env,
                PORT: '5000',
                DB_PATH: dbPath,  // Full path to .db file
                ARCHIVES_PATH: paths.archives,
                UPLOADS_PATH: paths.uploads,
                LOGS_PATH: paths.logs,  // ✅ ADD THIS
                NODE_ENV: isDev ? 'development' : 'production',
                DEBUG: 'true'  // Enable debug mode
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Log backend output with timestamps
        backendServer.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                console.log(`[Backend] ${line}`);
            });
        });

        backendServer.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                console.error(`[Backend Error] ${line}`);
            });
        });

        backendServer.on('error', (error) => {
            console.error('========================================');
            console.error('❌ BACKEND PROCESS ERROR');
            console.error('========================================');
            console.error('Error:', error);
            console.error('Code:', error.code);
            console.error('Message:', error.message);

            if (error.code === 'ENOENT') {
                dialog.showErrorBox(
                    'Node.js Not Found',
                    'Node.js is not installed or not found in system PATH.\n\n' +
                    'Please install Node.js from https://nodejs.org\n' +
                    'Version 18.x or higher is required.\n\n' +
                    'After installation, restart your computer.'
                );
            } else {
                dialog.showErrorBox(
                    'Backend Start Failed',
                    'Failed to start the backend server:\n\n' + error.message
                );
            }
        });

        backendServer.on('close', (code) => {
            console.log('========================================');
            console.log(`[Backend] Process exited with code ${code}`);
            console.log('========================================');

            if (code !== 0 && code !== null) {
                dialog.showMessageBox({
                    type: 'error',
                    title: 'Backend Stopped',
                    message: 'The backend server stopped unexpectedly.',
                    detail: `Exit code: ${code}\n\nThe application may not function correctly.`
                });
            }
        });

        console.log('✅ Backend process spawned successfully!');
        console.log('   Process PID:', backendServer.pid);
        console.log('========================================');
        return true;

    } catch (error) {
        console.error('========================================');
        console.error('❌ FAILED TO START BACKEND');
        console.error('========================================');
        console.error('Error:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);

        dialog.showErrorBox(
            'Backend Start Failed',
            'Failed to start the backend server:\n\n' +
            error.message + '\n\n' +
            'Please ensure Node.js is installed correctly.'
        );

        return false;
    }
}

/**
 * Create main application window
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png'),
        title: 'Molek CBT System - Admin Panel',
        backgroundColor: '#ffffff',
        show: false,
        autoHideMenuBar: true  // Always hide menu bar
    });

    // Always remove application menu
    Menu.setApplicationMenu(null);

    // Load the app
    const startURL = isDev
        ? 'http://localhost:3000/admin'
        : 'http://localhost:5000/admin';

    console.log('========================================');
    console.log('🌐 LOADING APPLICATION');
    console.log('========================================');
    console.log('URL:', startURL);
    console.log('========================================');

    mainWindow.loadURL(startURL);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('✅ Main window shown');

        // Open dev tools only in development (optional in production)
        if (isDev) {
            console.log('🔧 Opening Developer Tools...');
            mainWindow.webContents.openDevTools();
            console.log('✅ Developer Tools opened');
        } else {
            console.log('ℹ️  Dev tools disabled in production (logs saved to file)');
            console.log('   To enable: Press F12 or Ctrl+Shift+I');
        }
    });

    // Handle page load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('========================================');
        console.error('❌ FAILED TO LOAD APPLICATION');
        console.error('========================================');
        console.error('Error Code:', errorCode);
        console.error('Description:', errorDescription);
        console.error('URL:', startURL);
        console.error('========================================');

        if (isDev) {
            dialog.showErrorBox(
                'Failed to Load',
                'Could not connect to development server.\n\n' +
                'Make sure the frontend dev server is running:\n' +
                'npm run dev --workspace frontend\n\n' +
                'Error: ' + errorDescription
            );
        } else {
            dialog.showErrorBox(
                'Failed to Load',
                'Could not load the application interface.\n\n' +
                'Error: ' + errorDescription + '\n\n' +
                'Please restart the application or contact support.'
            );
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * IPC Handlers
 */
ipcMain.handle('get-archives-path', () => {
    return paths.archives;
});

ipcMain.handle('get-logs-path', () => {  // ✅ ADD THIS
    return paths.logs;
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-network-info', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({
                    name: name,
                    address: iface.address
                });
            }
        }
    }

    return addresses;
});

ipcMain.handle('open-archives-folder', () => {
    shell.openPath(paths.archives);
});

ipcMain.handle('open-logs-folder', () => {  // ✅ ADD THIS
    shell.openPath(paths.logs);
});

/**
 * App lifecycle events
 */
app.on('ready', async () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   MOLEK CBT SYSTEM STARTING...        ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('Version:', app.getVersion());
    console.log('Environment:', isDev ? 'Development' : 'Production');
    console.log('Node Version:', process.version);
    console.log('Electron Version:', process.versions.electron);
    console.log('Chrome Version:', process.versions.chrome);
    console.log('========================================');

    initializePaths();

    const setupSuccess = await runFirstTimeSetup();
    if (!setupSuccess && !isDev) {
        console.error('❌ Setup failed, quitting...');
        app.quit();
        return;
    }

    const backendStarted = await startBackend();
    if (!backendStarted) {
        console.error('❌ Backend failed to start, quitting...');
        app.quit();
        return;
    }

    // Wait for backend to fully initialize
    const waitTime = isDev ? 2000 : 4000;
    console.log(`⏳ Waiting ${waitTime}ms for backend to initialize...`);

    setTimeout(() => {
        createWindow();
    }, waitTime);
});

app.on('window-all-closed', () => {
    console.log('========================================');
    console.log('📚 All windows closed');
    console.log('========================================');

    // Kill backend process
    if (backendServer) {
        console.log('🛑 Stopping backend server...');
        backendServer.kill();
        console.log('✅ Backend server stopped');
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    console.log('========================================');
    console.log('🛑 APPLICATION QUITTING');
    console.log('========================================');

    // Kill backend process
    if (backendServer) {
        backendServer.kill();
    }
});

process.on('uncaughtException', (error) => {
    console.error('========================================');
    console.error('💥 UNCAUGHT EXCEPTION');
    console.error('========================================');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================');

    if (!isDev) {
        const logPath = path.join(app.getPath('userData'), 'error.log');
        fs.appendFileSync(
            logPath,
            `[${new Date().toISOString()}] Uncaught Exception: ${error.message}\n${error.stack}\n\n`
        );
        console.log('Error logged to:', logPath);
    } else {
        dialog.showErrorBox(
            'Application Error',
            'An unexpected error occurred:\n\n' + error.message
        );
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('========================================');
    console.error('💥 UNHANDLED REJECTION');
    console.error('========================================');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    console.error('========================================');

    if (!isDev) {
        const logPath = path.join(app.getPath('userData'), 'error.log');
        fs.appendFileSync(
            logPath,
            `[${new Date().toISOString()}] Unhandled Rejection: ${reason}\n\n`
        );
    }
});

console.log('✅ Main process initialized');