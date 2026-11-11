const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ── AI Bridge (Generative UI) ──
    streamChat: (params) => ipcRenderer.invoke('ai:stream', params),
    abortChat: () => ipcRenderer.invoke('ai:abort'),
    saveSettings: (settings) => ipcRenderer.invoke('ai:saveSettings', settings),
    getSettings: () => ipcRenderer.invoke('ai:getSettings'),
    getModels: () => ipcRenderer.invoke('ai:getModels'),

    // ── Multi-provider (v2) ──
    getProviderSettings: () => ipcRenderer.invoke('ai:getProviders'),
    saveProviderSettings: (patch) => ipcRenderer.invoke('ai:saveProviderSettings', patch),
    setDefaultModel: (spec) => ipcRenderer.invoke('ai:setDefaultModel', spec),
    getCatalog: () => ipcRenderer.invoke('ai:getCatalog'),

    // ── Backup do acervo ──
    saveBackup: (zipBytes) => ipcRenderer.invoke('backup:save', zipBytes),
    openBackupsFolder: () => ipcRenderer.invoke('backup:openFolder'),

    // AI streaming listeners (main → renderer)
    onAiChunk: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('ai:chunk', handler);
        return () => ipcRenderer.removeListener('ai:chunk', handler);
    },
    onAiToolCall: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('ai:toolCall', handler);
        return () => ipcRenderer.removeListener('ai:toolCall', handler);
    },
    onAiDone: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('ai:done', handler);
        return () => ipcRenderer.removeListener('ai:done', handler);
    },
    onAiError: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('ai:error', handler);
        return () => ipcRenderer.removeListener('ai:error', handler);
    },
});
