import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
    streamChat,
    abortStream,
    loadAISettings,
    saveAISettings,
    fetchAvailableModels,
    getSettingsView,
    saveProviderSettings,
    setDefaultModel,
    providerPublicView,
    getCatalog,
} from './ai-bridge.js';

// GPU Acceleration flags for better performance
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//     app.quit();
// }

let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Umbra',
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#050508',
            symbolColor: '#c77dff',
            height: 40
        },
        backgroundColor: '#050508',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Check if we are in dev mode (running via vite)
    // We can check if an argument is passed or an env var
    // For simplicity, we'll try to connect to localhost:5173 first
    // If it fails (production), we load the index.html

    // In this setup, 'npm run dev' starts vite on 5173 and then electron.
    // So we can just load the URL.
    // However, for production build, we need to load the file.

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else if (process.env.NODE_ENV === 'development') {
        // Fluxo do scripts/dev.js: Vite já está rodando na 5173,
        // mas sem VITE_DEV_SERVER_URL no ambiente.
        mainWindow.loadURL('http://localhost:5173');
    } else {
        // Produção: carrega o build do Vite empacotado em dist/.
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
//
// Superfície mínima: IA + backup do acervo. Os handlers de
// diálogo/fs existiam mas nunca eram chamados pelo renderer (o
// import usa a File API do browser e as settings de IA têm seu
// próprio acesso a userData dentro do ai-bridge) — removeram-se
// para reduzir superfície de ataque.

// ═══════════════════════════════════════════════════════════════
// Backup do acervo — único ponto de escrita em disco vindo do
// renderer. O renderer envia apenas os bytes do zip; o caminho e
// o nome do arquivo são definidos aqui, dentro de userData.
// ═══════════════════════════════════════════════════════════════
function getBackupsDir() {
    return path.join(app.getPath('userData'), 'backups');
}

ipcMain.handle('backup:save', async (event, zipBytes) => {
    if (!(zipBytes instanceof Uint8Array) || zipBytes.length === 0) {
        throw new Error('backup:save requer um Uint8Array não vazio');
    }
    const backupsDir = getBackupsDir();
    await fs.mkdir(backupsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(backupsDir, `umbra-backup-${timestamp}.zip`);
    await fs.writeFile(filePath, Buffer.from(zipBytes));
    console.log(`[Backup] Salvo em ${filePath}`);
    await pruneBackups(backupsDir);
    return filePath;
});

// Retenção: mantém só os MAX_BACKUPS mais recentes (o nome já ordena
// cronologicamente pelo timestamp ISO). Falha de retenção nunca
// bloqueia o save do backup atual.
const MAX_BACKUPS = 10;
async function pruneBackups(backupsDir) {
    try {
        const entries = await fs.readdir(backupsDir);
        const backups = entries
            .filter((f) => f.startsWith('umbra-backup-') && f.endsWith('.zip'))
            .sort()
            .reverse();
        for (const old of backups.slice(MAX_BACKUPS)) {
            await fs.rm(path.join(backupsDir, old), { force: true });
        }
    } catch (e) {
        console.warn('[Backup] Retenção falhou (mantendo backups antigos):', e.message);
    }
}

ipcMain.handle('backup:openFolder', async () => {
    const backupsDir = getBackupsDir();
    await fs.mkdir(backupsDir, { recursive: true });
    await shell.openPath(backupsDir);
    return true;
});

// ═══════════════════════════════════════════════════════════════
// AI Bridge — Generative UI via OpenRouter / Custom Provider
// ═══════════════════════════════════════════════════════════════
// Load settings on startup
app.whenReady().then(() => {
    loadAISettings().then(settings => {
        const configured = Object.entries(settings.providers || {})
            .filter(([id, p]) => (id === 'ollama' ? !!p.baseUrl : !!p.apiKey))
            .map(([id]) => id);
        if (configured.length > 0) {
            console.log(`[AI] Providers configurados: ${configured.join(', ')}`);
        }
    });
});

// Stream a chat completion (renderer → main → OpenRouter → main → renderer)
ipcMain.handle('ai:stream', async (event, params) => {
    try {
        await streamChat(mainWindow, params);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Abort active stream
ipcMain.handle('ai:abort', async () => {
    abortStream();
    return { success: true };
});

// Save AI settings securely in userData (legacy single-key adapter)
ipcMain.handle('ai:saveSettings', async (event, settings) => {
    await saveAISettings(settings);
    return { success: true };
});

// Get AI settings (compat view {hasKey, baseURL} + providers/defaultModel, sem chaves)
ipcMain.handle('ai:getSettings', async () => {
    return await getSettingsView();
});

// Fetch models dynamically (legacy: catálogo público do OpenRouter)
ipcMain.handle('ai:getModels', async () => {
    return await fetchAvailableModels();
});

// ── Multi-provider (v2) ──
ipcMain.handle('ai:getProviders', async () => {
    return providerPublicView(await loadAISettings());
});

ipcMain.handle('ai:saveProviderSettings', async (event, patch) => {
    await saveProviderSettings(patch);
    return providerPublicView(await loadAISettings());
});

ipcMain.handle('ai:setDefaultModel', async (event, spec) => {
    await setDefaultModel(spec);
    return { success: true };
});

// Catálogo multi-provider (models.dev + Ollama local), com cache 24h
ipcMain.handle('ai:getCatalog', async () => {
    return await getCatalog(await loadAISettings());
});
