const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendServer; // This will hold the spawned process

// Paths configuration
const paths = {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    archives: null,
    database: null,
    backend: null,
    uploads: null
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
    } else {
        // Production paths
        paths.backend = path.join(process.resourcesPath, 'backend');
        paths.database = path.join(paths.userData, 'data');
        paths.archives = path.join(paths.documents, 'MolekCBT_Archives');
        paths.uploads = path.join(paths.documents, 'MolekCBT_Uploads');
    }

    // Create necessary directories
    try {
        if (!fs.existsSync(paths.archives)) {
            fs.mkdirSync(paths.archives, { recursive: true });
        }
        if (!fs.existsSync(paths.database)) {
            fs.mkdirSync(paths.database, { recursive: true });
        }
        if (!fs.existsSync(paths.uploads)) {
            fs.mkdirSync(paths.uploads, { recursive: true });
        }

        console.log('Paths initialized:');
        console.log('   Mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
        console.log('   Backend:', paths.backend);
        console.log('   Database:', paths.database);
        console.log('   Archives:', paths.archives);
        console.log('   Uploads:', paths.uploads);
    } catch (error) {
        console.error('Failed to create directories:', error);
    }
}

/**
 * First-time setup
 */
async function runFirstTimeSetup() {
    const setupMarker = path.join(paths.userData, '.setup-complete');

    if (fs.existsSync(setupMarker)) {
        console.log('Setup already completed');
        return true;
    }

    console.log('Running first-time setup...');

    try {
        // Copy database to user data (production only)
        if (!isDev) {
            const sourceDb = path.join(paths.backend, 'src/db/cbt.db');
            const targetDb = path.join(paths.database, 'cbt.db');

            if (fs.existsSync(sourceDb) && !fs.existsSync(targetDb)) {
                console.log('Copying database to user data...');
                fs.copyFileSync(sourceDb, targetDb);
            } else if (!fs.existsSync(sourceDb)) {
                console.log('Source database not found, creating new one...');
                // Database will be created automatically by backend on first run
            }
        }

        // Mark setup as complete
        fs.writeFileSync(setupMarker, JSON.stringify({
            completedAt: new Date().toISOString(),
            version: app.getVersion()
        }));

        console.log('Setup completed successfully!');
        return true;
    } catch (error) {
        console.error('Setup failed:', error);

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
 * Start backend server - USES SYSTEM NODE.JS
 */
async function startBackend() {
    const { spawn } = require('child_process');

    // Database path based on environment
    const dbPath = isDev
        ? path.join(paths.backend, 'src/db/cbt.db')
        : path.join(paths.database, 'cbt.db');

    console.log('Starting backend server...');
    console.log('   Backend path:', paths.backend);
    console.log('   Database path:', dbPath);
    console.log('   Archives path:', paths.archives);
    console.log('   Uploads path:', paths.uploads);

    const serverPath = path.join(paths.backend, 'src/server.js');

    console.log('   Server path:', serverPath);
    console.log('   Server exists?:', fs.existsSync(serverPath));

    if (!fs.existsSync(serverPath)) {
        dialog.showErrorBox(
            'Backend Not Found',
            'Backend server file not found at:\n' + serverPath + '\n\n' +
            'Please reinstall the application.'
        );
        return false;
    }

    try {
        // Spawn Node.js process using system's Node.js
        console.log('Spawning Node.js process...');

        backendServer = spawn('node', [serverPath], {
            cwd: paths.backend,
            env: {
                ...process.env,
                PORT: '5000',
                DB_PATH: dbPath,
                ARCHIVES_PATH: paths.archives,
                UPLOADS_PATH: paths.uploads,
                NODE_ENV: isDev ? 'development' : 'production'
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Log backend output
        backendServer.stdout.on('data', (data) => {
            console.log(`[Backend] ${data.toString().trim()}`);
        });

        backendServer.stderr.on('data', (data) => {
            console.error(`[Backend Error] ${data.toString().trim()}`);
        });

        backendServer.on('error', (error) => {
            console.error('Failed to start backend process:', error);

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
            console.log(`[Backend] Process exited with code ${code}`);

            if (code !== 0 && code !== null) {
                dialog.showMessageBox({
                    type: 'error',
                    title: 'Backend Stopped',
                    message: 'The backend server stopped unexpectedly.',
                    detail: `Exit code: ${code}\n\nThe application may not function correctly.`
                });
            }
        });

        console.log('Backend process spawned successfully!');
        console.log('   Process PID:', backendServer.pid);
        return true;

    } catch (error) {
        console.error('Failed to start backend:', error);

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
        autoHideMenuBar: !isDev
    });

    // Remove menu in production
    if (!isDev) {
        Menu.setApplicationMenu(null);
    }

    // Load the app - Admin UI for master system
    const startURL = isDev
        ? 'http://localhost:3000/admin'  // Vite dev server
        : 'http://localhost:5000/admin';  // Backend serves admin in production

    console.log('Loading URL:', startURL);

    mainWindow.loadURL(startURL);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('Main window shown');

        // Open DevTools in development only
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle page load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);

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

/**
 * App lifecycle events
 */
app.on('ready', async () => {
    console.log('========================================');
    console.log('Molek CBT System Starting...');
    console.log('   Version:', app.getVersion());
    console.log('   Environment:', isDev ? 'Development' : 'Production');
    console.log('========================================');

    initializePaths();

    const setupSuccess = await runFirstTimeSetup();
    if (!setupSuccess && !isDev) {
        app.quit();
        return;
    }

    const backendStarted = await startBackend();
    if (!backendStarted) {
        console.error('Backend failed to start, quitting...');
        app.quit();
        return;
    }

    // Wait for backend to fully initialize
    const waitTime = isDev ? 2000 : 3000;
    console.log(`Waiting ${waitTime}ms for backend to initialize...`);

    setTimeout(() => {
        createWindow();
    }, waitTime);
});

app.on('window-all-closed', () => {
    console.log('All windows closed');

    // Kill backend process
    if (backendServer) {
        console.log('Stopping backend server...');
        backendServer.kill();
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
    console.log('Application quitting...');

    // Kill backend process
    if (backendServer) {
        backendServer.kill();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);

    if (!isDev) {
        fs.appendFileSync(
            path.join(app.getPath('userData'), 'error.log'),
            `[${new Date().toISOString()}] Uncaught Exception: ${error.message}\n${error.stack}\n\n`
        );
    } else {
        dialog.showErrorBox(
            'Application Error',
            'An unexpected error occurred:\n\n' + error.message
        );
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);

    if (!isDev) {
        fs.appendFileSync(
            path.join(app.getPath('userData'), 'error.log'),
            `[${new Date().toISOString()}] Unhandled Rejection: ${reason}\n\n`
        );
    }
});

console.log('Main process initialized');