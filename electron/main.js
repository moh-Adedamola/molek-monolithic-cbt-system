// electron/main.js
// COMPLETE PRODUCTION-READY CODE WITH FULLSCREEN KIOSK MODE

const { app, BrowserWindow, Menu, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let examWindow;
let backendServer;

// Paths configuration
const paths = {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    archives: null,
    database: null,
    backend: null,
    uploads: null,
    logs: null
};

// ============================================
// INITIALIZE PATHS
// ============================================
function initializePaths() {
    if (isDev) {
        paths.backend = path.join(__dirname, '../backend');
        paths.database = path.join(paths.backend, 'src/db');
        paths.archives = path.join(paths.backend, 'archives');
        paths.uploads = path.join(paths.backend, 'uploads');
        paths.logs = path.join(paths.backend, 'logs');
    } else {
        const isAsar = __dirname.includes('.asar');
        if (isAsar) {
            paths.backend = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
        } else {
            paths.backend = path.join(process.resourcesPath, 'backend');
        }
        paths.database = path.join(paths.userData, 'data');
        paths.archives = path.join(paths.documents, 'MolekCBT_Archives');
        paths.uploads = path.join(paths.userData, 'uploads');
        paths.logs = path.join(paths.userData, 'logs');
    }

    [paths.archives, paths.database, paths.uploads, paths.logs].forEach(dirPath => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });

    console.log('========================================');
    console.log('📁 PATHS INITIALIZED');
    console.log('========================================');
    console.log('Mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
    console.log('Backend:', paths.backend);
    console.log('Database:', paths.database);
    console.log('Archives:', paths.archives);
    console.log('========================================');
}

// ============================================
// START BACKEND SERVER
// ============================================
async function startBackend() {
    return new Promise((resolve, reject) => {
        try {
            // FIXED: Correct path to server.js inside src folder
            const serverPath = path.join(paths.backend, 'src', 'server.js');

            if (!fs.existsSync(serverPath)) {
                throw new Error(`Backend not found at: ${serverPath}`);
            }

            console.log('========================================');
            console.log('🚀 STARTING BACKEND SERVER');
            console.log('========================================');
            console.log('Server path:', serverPath);

            backendServer = spawn('node', [serverPath], {
                cwd: paths.backend,
                env: {
                    ...process.env,
                    DB_PATH: paths.database,
                    UPLOADS_PATH: path.join(paths.uploads, 'questions'),
                    LOGS_PATH: paths.logs,
                    NODE_ENV: isDev ? 'development' : 'production'
                },
                stdio: ['ignore', 'pipe', 'pipe']
            });

            backendServer.stdout.on('data', (data) => {
                console.log(`[Backend] ${data.toString().trim()}`);
            });

            backendServer.stderr.on('data', (data) => {
                console.error(`[Backend Error] ${data.toString().trim()}`);
            });

            backendServer.on('error', (error) => {
                console.error('❌ Backend failed to start:', error);
                reject(error);
            });

            backendServer.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    console.error('⚠️  Backend exited with code:', code);
                }
            });

            setTimeout(() => {
                console.log('✅ Backend started (PID:', backendServer.pid, ')');
                resolve(true);
            }, 3000);

        } catch (error) {
            console.error('❌ Failed to start backend:', error);
            reject(error);
        }
    });
}

// ============================================
// CREATE ADMIN WINDOW (Normal Mode)
// ============================================
function createAdminWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png'),
        title: 'Molek CBT System - Admin Panel',
        backgroundColor: '#ffffff',
        show: false,
        autoHideMenuBar: true
    });

    Menu.setApplicationMenu(null);

    const startURL = isDev
        ? 'http://localhost:3000/admin'
        : 'http://localhost:5000/admin';

    console.log('🌐 Loading Admin Panel:', startURL);

    mainWindow.loadURL(startURL);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev) mainWindow.webContents.openDevTools();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ============================================
// CREATE EXAM WINDOW (FULLSCREEN KIOSK MODE)
// ============================================
function createExamWindow() {
    examWindow = new BrowserWindow({
        // KIOSK MODE - Fullscreen with no escape
        kiosk: true,
        fullscreen: true,
        frame: false,

        width: 1920,
        height: 1080,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false,

        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: false
        },

        icon: path.join(__dirname, 'icon.png'),
        title: 'Molek CBT - Examination',
        backgroundColor: '#ffffff',
        show: false,
        alwaysOnTop: true,
        skipTaskbar: false
    });

    // DISABLE ALL SHORTCUTS DURING EXAM
    disableShortcuts();

    examWindow.setMenu(null);
    examWindow.setMenuBarVisibility(false);

    const examURL = isDev
        ? 'http://localhost:3000/'
        : 'http://localhost:5000/';

    console.log('🔒 Loading Exam Window (KIOSK MODE):', examURL);

    examWindow.loadURL(examURL);

    examWindow.once('ready-to-show', () => {
        examWindow.show();
        examWindow.focus();
        examWindow.setFullScreen(true);
        examWindow.setKiosk(true);
    });

    // PREVENT CLOSING DURING EXAM
    examWindow.on('close', (e) => {
        e.preventDefault();

        dialog.showMessageBoxSync(examWindow, {
            type: 'warning',
            title: 'Cannot Close During Exam',
            message: 'You cannot close this window while the exam is in progress.',
            detail: 'Please complete and submit your exam first.',
            buttons: ['OK'],
            defaultId: 0
        });

        console.log('⚠️  Student attempted to close exam window');
    });

    // PREVENT NAVIGATION AWAY FROM EXAM
    examWindow.webContents.on('will-navigate', (e, url) => {
        if (!url.includes('localhost')) {
            e.preventDefault();
            console.log('⚠️  Blocked navigation to:', url);
        }
    });

    // PREVENT NEW WINDOWS
    examWindow.webContents.setWindowOpenHandler(() => {
        console.log('⚠️  Blocked attempt to open new window');
        return { action: 'deny' };
    });

    examWindow.on('closed', () => {
        enableShortcuts();
        examWindow = null;
    });
}

// ============================================
// DISABLE SHORTCUTS (ANTI-CHEATING)
// ============================================
function disableShortcuts() {
    console.log('🔒 Disabling keyboard shortcuts (anti-cheat mode)');

    const shortcuts = [
        'CommandOrControl+N',
        'CommandOrControl+T',
        'CommandOrControl+W',
        'CommandOrControl+Q',
        'CommandOrControl+R',
        'CommandOrControl+Shift+R',
        'F5',
        'CommandOrControl+F',
        'CommandOrControl+P',
        'CommandOrControl+S',
        'Alt+F4',
        'Alt+Tab',
        'CommandOrControl+Tab',
        'CommandOrControl+Shift+I',
        'CommandOrControl+Shift+J',
        'CommandOrControl+Shift+C',
        'F11',
        'F12',
        'Escape',
        'CommandOrControl+H',
        'CommandOrControl+M',
    ];

    shortcuts.forEach(shortcut => {
        globalShortcut.register(shortcut, () => {
            console.log(`⚠️  Blocked shortcut: ${shortcut}`);
            return false;
        });
    });
}

// ============================================
// ENABLE SHORTCUTS (After Exam)
// ============================================
function enableShortcuts() {
    console.log('✅ Re-enabling keyboard shortcuts');
    globalShortcut.unregisterAll();
}

// ============================================
// IPC HANDLERS
// ============================================
ipcMain.handle('get-archives-path', () => paths.archives);
ipcMain.handle('get-logs-path', () => paths.logs);
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('open-archives-folder', () => shell.openPath(paths.archives));
ipcMain.handle('open-logs-folder', () => shell.openPath(paths.logs));

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

// START EXAM MODE
ipcMain.handle('start-exam-mode', () => {
    console.log('🔒 Starting exam in kiosk mode');
    if (examWindow) {
        examWindow.focus();
        examWindow.setFullScreen(true);
        examWindow.setKiosk(true);
        return { success: true };
    } else {
        createExamWindow();
        return { success: true };
    }
});

// EXIT EXAM MODE
ipcMain.handle('exit-exam-mode', () => {
    console.log('✅ Exiting exam mode');
    if (examWindow) {
        examWindow.setKiosk(false);
        examWindow.close();
        enableShortcuts();
    }
    return { success: true };
});

// ============================================
// APP LIFECYCLE
// ============================================
app.on('ready', async () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   MOLEK CBT SYSTEM STARTING...        ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('Version:', app.getVersion());
    console.log('Environment:', isDev ? 'Development' : 'Production');
    console.log('========================================');

    initializePaths();

    try {
        await startBackend();
        createAdminWindow();
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    console.log('📚 All windows closed');

    if (backendServer) {
        console.log('🛑 Stopping backend server...');
        backendServer.kill();
    }

    globalShortcut.unregisterAll();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null && examWindow === null) {
        createAdminWindow();
    }
});

app.on('before-quit', () => {
    console.log('🛑 APPLICATION QUITTING');

    if (examWindow) {
        examWindow.destroy();
    }

    if (backendServer) {
        backendServer.kill();
    }

    globalShortcut.unregisterAll();
});

// PREVENT APP FROM BEING HIDDEN (Windows)
if (process.platform === 'win32') {
    app.on('browser-window-blur', () => {
        if (examWindow && !examWindow.isDestroyed()) {
            setTimeout(() => {
                examWindow.focus();
            }, 100);
        }
    });
}

console.log('✅ Main process initialized');
