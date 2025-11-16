const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess;

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
        paths.database = path.join(paths.backend, 'src/db');  // ✅ Keep in src/db
        paths.archives = path.join(paths.backend, 'archives'); // ✅ Keep in backend/archives
        paths.uploads = path.join(paths.backend, 'uploads');   // ✅ Keep in backend/uploads
    } else {
        // Production paths
        paths.backend = path.join(process.resourcesPath, 'backend');
        paths.database = path.join(paths.userData, 'data');
        paths.archives = path.join(paths.documents, 'MolekCBT_Archives');
        paths.uploads = path.join(paths.documents, 'MolekCBT_Uploads'); // ✅ User documents for uploads
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

        console.log('📁 Paths initialized:');
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
 * Execute command helper
 */
function execCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        const isWin = process.platform === 'win32';
        const shell = isWin ? 'cmd.exe' : '/bin/sh';
        const shellFlag = isWin ? '/c' : '-c';

        console.log(`Executing: ${command}`);

        const child = spawn(shell, [shellFlag, command], {
            ...options,
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
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
        // Skip npm install in production - dependencies are already bundled
        if (isDev) {
            console.log('📦 Installing backend dependencies (dev mode)...');
            await execCommand('npm install --production', { cwd: paths.backend });
        } else {
            console.log('📦 Using bundled dependencies...');
        }

        // Copy database to user data (production only)
        if (!isDev) {
            const sourceDb = path.join(paths.backend, 'src/db/cbt.db');
            const targetDb = path.join(paths.database, 'cbt.db');

            if (fs.existsSync(sourceDb) && !fs.existsSync(targetDb)) {
                console.log('📋 Copying database to user data...');
                fs.copyFileSync(sourceDb, targetDb);
            } else if (!fs.existsSync(sourceDb)) {
                console.log('⚠️ Source database not found, creating new one...');
                // Database will be created automatically by backend on first run
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

        dialog.showErrorBox(
            'Setup Failed',
            'Failed to complete first-time setup.\n\n' +
            'Error: ' + error.message + '\n\n' +
            'The application will try to continue anyway.'
        );

        // Return true anyway to let the app try to run
        return true;
    }
}

/**
 * Start backend server
 */
function startBackend() {
    const serverPath = path.join(paths.backend, 'src/server.js');

    // Database path based on environment
    const dbPath = isDev
        ? path.join(paths.backend, 'src/db/cbt.db')  // ✅ Development: backend/src/db/
        : path.join(paths.database, 'cbt.db');        // ✅ Production: AppData

    console.log('🚀 Starting backend server...');
    console.log('   Server path:', serverPath);
    console.log('   Server exists?:', fs.existsSync(serverPath));
    console.log('   Database path:', dbPath);
    console.log('   Archives path:', paths.archives);
    console.log('   Uploads path:', paths.uploads);
    console.log('   Backend path:', paths.backend);

    // Log critical files/folders
    console.log('📋 Checking backend structure...');
    console.log('   Backend folder exists?:', fs.existsSync(paths.backend));
    console.log('   node_modules exists?:', fs.existsSync(path.join(paths.backend, 'node_modules')));
    console.log('   better-sqlite3 exists?:', fs.existsSync(path.join(paths.backend, 'node_modules', 'better-sqlite3')));
    console.log('   package.json exists?:', fs.existsSync(path.join(paths.backend, 'package.json')));

    if (!fs.existsSync(serverPath)) {
        const errorMsg = `Server file not found at: ${serverPath}`;
        console.error('❌', errorMsg);
        dialog.showErrorBox('Backend Start Failed', errorMsg);
        return;
    }

    backendProcess = spawn('node', [serverPath], {
        cwd: paths.backend,
        env: {
            ...process.env,
            PORT: 5000,
            DB_PATH: dbPath,
            ARCHIVES_PATH: paths.archives,
            UPLOADS_PATH: paths.uploads,
            NODE_ENV: isDev ? 'development' : 'production'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
            console.log(`[Backend] ${message}`);
        }
    });

    backendProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message && !message.includes('DeprecationWarning')) {
            console.error(`[Backend Error] ${message}`);

            // Show critical errors in a dialog
            if (message.includes('Cannot find module') || message.includes('Error:')) {
                dialog.showErrorBox(
                    'Backend Error Details',
                    `The backend encountered an error:\n\n${message}\n\nCheck the console for more details.`
                );
            }
        }
    });

    backendProcess.on('close', (code) => {
        console.log(`[Backend] Process exited with code ${code}`);
        if (code !== 0 && code !== null) {
            dialog.showErrorBox(
                'Backend Error',
                `The backend server stopped unexpectedly with exit code ${code}.\n\nCheck the console logs for details.`
            );
        }
    });

    backendProcess.on('error', (error) => {
        console.error('[Backend] Failed to start:', error);
        dialog.showErrorBox(
            'Backend Start Failed',
            'Failed to start the backend server:\n\n' + error.message + '\n\nBackend path: ' + paths.backend
        );
    });
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

    console.log('🌐 Loading URL:', startURL);

    mainWindow.loadURL(startURL);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('✅ Main window shown');

        // TEMPORARY: Open DevTools in production to see logs
        if (!isDev) {
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
        }
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

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
    console.log('═══════════════════════════════════════════');
    console.log('🚀 Molek CBT System Starting...');
    console.log('   Version:', app.getVersion());
    console.log('   Environment:', isDev ? 'Development' : 'Production');
    console.log('═══════════════════════════════════════════');

    initializePaths();

    const setupSuccess = await runFirstTimeSetup();
    if (!setupSuccess && !isDev) {
        app.quit();
        return;
    }

    startBackend();

    const waitTime = isDev ? 3000 : 5000;
    console.log(`⏳ Waiting ${waitTime}ms for backend to start...`);

    setTimeout(() => {
        createWindow();
    }, waitTime);
});

app.on('window-all-closed', () => {
    console.log('🔚 All windows closed');

    if (backendProcess) {
        console.log('🛑 Stopping backend process...');
        backendProcess.kill();
    }

    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    console.log('🛑 Application quitting...');

    if (backendProcess) {
        backendProcess.kill();
    }
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);

    if (!isDev) {
        // Log but don't crash in production
    } else {
        dialog.showErrorBox(
            'Application Error',
            'An unexpected error occurred:\n\n' + error.message
        );
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Main process initialized');