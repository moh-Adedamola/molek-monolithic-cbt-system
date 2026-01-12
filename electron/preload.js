const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Archives
    getArchivesPath: () => ipcRenderer.invoke('get-archives-path'),
    openArchivesFolder: () => ipcRenderer.invoke('open-archives-folder'),

    // Logs
    getLogsPath: () => ipcRenderer.invoke('get-logs-path'),
    openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),

    // Version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Network
    getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),

    // ✅ EXAM MODE CONTROLS (Fullscreen)
    startExamMode: () => ipcRenderer.invoke('start-exam-mode'),
    exitExamMode: () => ipcRenderer.invoke('exit-exam-mode'),

    // Platform info
    platform: process.platform,
    isElectron: true
});

console.log('✅ Preload script loaded with exam mode controls');