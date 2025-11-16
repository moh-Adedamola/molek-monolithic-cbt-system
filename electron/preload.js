const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Archives
    getArchivesPath: () => ipcRenderer.invoke('get-archives-path'),
    openArchivesFolder: () => ipcRenderer.invoke('open-archives-folder'),

    // Version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Network
    getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),

    // Platform info
    platform: process.platform,
    isElectron: true
});

console.log('✅ Preload script loaded');