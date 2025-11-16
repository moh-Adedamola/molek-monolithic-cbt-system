const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

class AutoUpdateManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.setupAutoUpdater();
    }

    setupAutoUpdater() {
        // Configure auto-updater
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        // Event handlers
        autoUpdater.on('checking-for-update', () => {
            this.log('Checking for updates...');
        });

        autoUpdater.on('update-available', (info) => {
            this.log(`Update available: ${info.version}`);
            this.showUpdateAvailable(info);
        });

        autoUpdater.on('update-not-available', () => {
            this.log('App is up to date');
        });

        autoUpdater.on('download-progress', (progressObj) => {
            this.log(`Download progress: ${progressObj.percent}%`);
            this.updateProgressBar(progressObj);
        });

        autoUpdater.on('update-downloaded', (info) => {
            this.log('Update downloaded');
            this.showUpdateReadyToInstall(info);
        });

        autoUpdater.on('error', (error) => {
            this.log(`Update error: ${error}`);
            this.showUpdateError(error);
        });
    }

    checkForUpdates() {
        autoUpdater.checkForUpdates();
    }

    showUpdateAvailable(info) {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available!`,
            detail: info.releaseNotes || 'Would you like to download it now?',
            buttons: ['Download Update', 'Later'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    }

    showUpdateReadyToInstall(info) {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: 'Update has been downloaded',
            detail: `Version ${info.version} is ready to install. The application will restart to complete the installation.`,
            buttons: ['Restart Now', 'Install on Exit'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true);
            }
        });
    }

    showUpdateError(error) {
        dialog.showMessageBox(this.mainWindow, {
            type: 'error',
            title: 'Update Error',
            message: 'Failed to check for updates',
            detail: error.message || 'Please check your internet connection and try again later.',
            buttons: ['OK']
        });
    }

    updateProgressBar(progressObj) {
        if (this.mainWindow) {
            const percent = progressObj.percent / 100;
            this.mainWindow.setProgressBar(percent);
        }
    }

    log(message) {
        console.log(`[AutoUpdate] ${message}`);
        log.info(message);
    }
}

module.exports = AutoUpdateManager;