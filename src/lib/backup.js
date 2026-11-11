/**
 * Serviço de backup do acervo — exporta/restaura as tabelas Dexie
 * (conversations, metadata, messages) como um único .zip via JSZip.
 *
 * O arquivo .zip é gravado pelo processo main em
 * <userData>/backups/umbra-backup-<timestamp>.zip — o renderer só
 * envia os bytes; nenhum caminho arbitrário atravessa o IPC.
 *
 * Restauração usa upsert (bulkPut): conversas do backup sobrescrevem
 * as de mesma chave, sem apagar dados existentes que não estejam no
 * backup.
 */
import JSZip from 'jszip';
import { db } from './db.js';

const LAST_BACKUP_KEY = 'umbra-last-backup';
const AUTO_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const BACKUP_VERSION = 1;

function isElectron() {
    return typeof window !== 'undefined' && window.electronAPI?.saveBackup;
}

function readJsonFromZip(zip, name) {
    const entry = zip.file(name);
    if (!entry) return null;
    return entry.async('string').then((text) => JSON.parse(text));
}

/**
 * Cria um backup completo do acervo em disco.
 * @returns {Promise<{path: string, counts: Object}>}
 */
export async function createBackup() {
    if (!isElectron()) {
        throw new Error('Backup em disco está disponível apenas no app Electron.');
    }

    const [conversations, metadata, messages] = await Promise.all([
        db.conversations.toArray(),
        db.metadata.toArray(),
        db.messages.toArray(),
    ]);

    const manifest = {
        app: 'Umbra',
        backupVersion: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        counts: {
            conversations: conversations.length,
            metadata: metadata.length,
            messages: messages.length,
        },
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('conversations.json', JSON.stringify(conversations));
    zip.file('metadata.json', JSON.stringify(metadata));
    zip.file('messages.json', JSON.stringify(messages));

    const bytes = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    const path = await window.electronAPI.saveBackup(bytes);

    localStorage.setItem(
        LAST_BACKUP_KEY,
        JSON.stringify({ at: manifest.createdAt, path, counts: manifest.counts }),
    );

    console.log(`💾 Backup criado: ${path} (${manifest.counts.conversations} conversas)`);
    return { path, counts: manifest.counts };
}

/**
 * Restaura um backup a partir de um arquivo .zip (upsert).
 * @param {File} file - arquivo escolhido via <input type="file">
 * @returns {Promise<Object>} counts restaurados
 */
export async function restoreBackup(file) {
    let zip;
    try {
        zip = await JSZip.loadAsync(file);
    } catch (e) {
        throw new Error('Arquivo inválido: não é um zip de backup do Umbra.');
    }

    const manifest = await readJsonFromZip(zip, 'manifest.json');
    if (!manifest || manifest.app !== 'Umbra' || manifest.backupVersion !== BACKUP_VERSION) {
        throw new Error('Backup incompatível ou corrompido (manifest ausente).');
    }

    const [conversations, metadata, messages] = await Promise.all([
        readJsonFromZip(zip, 'conversations.json'),
        readJsonFromZip(zip, 'metadata.json'),
        readJsonFromZip(zip, 'messages.json'),
    ]);

    const validConvs = Array.isArray(conversations)
        ? conversations.filter((c) => c && c.id != null)
        : [];
    const validMeta = Array.isArray(metadata)
        ? metadata.filter((m) => m && m.id != null)
        : [];
    const validMsgs = Array.isArray(messages)
        ? messages.filter((m) => m && m.conversationId != null)
        : [];

    await db.transaction('rw', db.conversations, db.metadata, db.messages, async () => {
        if (validConvs.length > 0) await db.conversations.bulkPut(validConvs);
        if (validMeta.length > 0) await db.metadata.bulkPut(validMeta);
        if (validMsgs.length > 0) await db.messages.bulkPut(validMsgs);
    });

    const counts = {
        conversations: validConvs.length,
        metadata: validMeta.length,
        messages: validMsgs.length,
    };
    console.log(`📥 Backup restaurado: ${JSON.stringify(counts)}`);
    return counts;
}

/**
 * Informações do último backup criado (localStorage).
 * @returns {{at: string, path: string, counts: Object}|null}
 */
export function getLastBackupInfo() {
    try {
        const raw = localStorage.getItem(LAST_BACKUP_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Backup automático semanal — chamar no onMount do App.
 * Silencioso: falha apenas loga no console.
 */
export async function maybeAutoBackup() {
    if (!isElectron()) return null;

    const last = getLastBackupInfo();
    if (last && Date.now() - new Date(last.at).getTime() < AUTO_BACKUP_INTERVAL_MS) {
        return null;
    }

    try {
        const count = await db.conversations.count();
        if (count === 0) return null;
        return await createBackup();
    } catch (e) {
        console.warn('Backup automático falhou:', e);
        return null;
    }
}
