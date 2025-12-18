const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    readUserData: (fileName) => ipcRenderer.invoke('fs:readUserData', fileName),
    writeUserData: (fileName, data) => ipcRenderer.invoke('fs:writeUserData', fileName, data)
});
