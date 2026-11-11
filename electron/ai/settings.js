/**
 * Settings multi-provider (v2) — Electron Main Process
 *
 * Formato v2 (persistido em userData/ai-settings.json):
 * {
 *   "version": 2,
 *   "providers": {
 *     "openrouter": { "apiKey": "..." },
 *     "openai":     { "apiKey": "..." },
 *     "anthropic":  { "apiKey": "..." },
 *     "google":     { "apiKey": "..." },
 *     "ollama":     { "baseUrl": "http://localhost:11434" },
 *     "custom":     { "apiKey": "...", "baseURL": "https://..." }   // migrado do v1
 *   },
 *   "defaultModel": { "providerId": "openrouter", "modelId": "..." }
 * }
 *
 * Migração v1 → v2: { apiKey, baseURL } antigo vira provider
 * "openrouter" (ou "custom" se apontava pra outro endpoint).
 */
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';

const SETTINGS_FILE = 'ai-settings.json';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export const FIXED_PROVIDER_IDS = ['openrouter', 'openai', 'anthropic', 'google', 'ollama', 'omniroute'];

const DEFAULTS = {
    version: 2,
    providers: {
        openrouter: { apiKey: null },
        openai: { apiKey: null },
        anthropic: { apiKey: null },
        google: { apiKey: null },
        ollama: { baseUrl: 'http://localhost:11434' },
        omniroute: { baseUrl: 'http://localhost:20128', apiKey: null },
    },
    defaultModel: null,
};

let cached = null;

function getSettingsPath() {
    return path.join(app.getPath('userData'), SETTINGS_FILE);
}

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/** Migra o formato v1 ({apiKey, baseURL}) para v2. */
function migrateV1(parsed) {
    const v2 = deepCopy(DEFAULTS);
    const apiKey = parsed.apiKey || null;
    const baseURL = parsed.baseURL || '';
    if (apiKey) {
        if (baseURL.includes(':20128')) {
            // v1 apontava pro gateway OmniRoute local
            v2.providers.omniroute = { baseUrl: baseURL, apiKey };
        } else if (!baseURL || baseURL.includes('openrouter')) {
            v2.providers.openrouter.apiKey = apiKey;
        } else {
            v2.providers.custom = { apiKey, baseURL };
        }
    }
    return v2;
}

function normalize(parsed) {
    if (!parsed || typeof parsed !== 'object' || !parsed.version) {
        return migrateV1(parsed || {});
    }
    const merged = deepCopy(DEFAULTS);
    for (const id of FIXED_PROVIDER_IDS) {
        if (parsed.providers?.[id]) {
            merged.providers[id] = { ...merged.providers[id], ...parsed.providers[id] };
        }
    }
    if (parsed.providers?.custom?.baseURL) {
        merged.providers.custom = parsed.providers.custom;
    }
    if (parsed.defaultModel?.providerId && parsed.defaultModel?.modelId) {
        merged.defaultModel = parsed.defaultModel;
    }
    return merged;
}

export async function loadAISettings() {
    try {
        const content = await fs.readFile(getSettingsPath(), 'utf-8');
        const parsed = JSON.parse(content);
        const needsMigration = !parsed.version;
        cached = normalize(parsed);
        if (needsMigration) {
            await fs.writeFile(getSettingsPath(), JSON.stringify(cached, null, 2), 'utf-8');
            console.log('[AI Settings] Migrado do formato v1 para v2');
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('[AI Settings] Erro ao carregar:', error.message);
        }
        cached = deepCopy(DEFAULTS);
    }
    return cached;
}

/** Merge parcial no shape v2 e persiste. */
export async function saveProviderSettings(patch) {
    if (!cached) await loadAISettings();
    // Merge profundo: patch traz só um provider — spread raso
    // apagaria as chaves dos demais
    const merged = deepCopy(cached);
    if (patch?.providers) {
        for (const id of FIXED_PROVIDER_IDS) {
            if (patch.providers[id]) {
                merged.providers[id] = { ...merged.providers[id], ...patch.providers[id] };
            }
        }
        if (patch.providers.custom?.baseURL) {
            merged.providers.custom = patch.providers.custom;
        }
    }
    if (patch?.defaultModel?.providerId && patch.defaultModel.modelId) {
        merged.defaultModel = patch.defaultModel;
    }
    cached = normalize(merged);
    await fs.writeFile(getSettingsPath(), JSON.stringify(cached, null, 2), 'utf-8');
    return cached;
}

/**
 * Adapter legado — o renderer antigo salva { apiKey?, baseURL? }.
 * Roteia: baseURL não-openrouter → provider "custom"; senão openrouter.
 */
export async function saveLegacySettings({ apiKey, baseURL } = {}) {
    if (!cached) await loadAISettings();
    if (apiKey !== undefined) {
        if (baseURL && !baseURL.includes('openrouter')) {
            cached.providers.custom = { apiKey, baseURL };
        } else {
            cached.providers.openrouter.apiKey = apiKey;
            delete cached.providers.custom;
        }
    }
    await fs.writeFile(getSettingsPath(), JSON.stringify(cached, null, 2), 'utf-8');
    return cached;
}

export async function setDefaultModel(spec) {
    if (!spec?.providerId || !spec?.modelId) {
        throw new Error('defaultModel requer { providerId, modelId }');
    }
    return saveProviderSettings({ defaultModel: spec });
}

/** View sem segredos para o renderer. */
export function providerPublicView(settings) {
    const p = settings?.providers || {};
    const anyKey = ['openrouter', 'openai', 'anthropic', 'google', 'omniroute'].some(
        (id) => !!p[id]?.apiKey,
    );
    return {
        anyKey,
        openrouter: { configured: !!p.openrouter?.apiKey },
        openai: { configured: !!p.openai?.apiKey },
        anthropic: { configured: !!p.anthropic?.apiKey },
        google: { configured: !!p.google?.apiKey },
        ollama: { configured: !!p.ollama?.baseUrl, baseUrl: p.ollama?.baseUrl || 'http://localhost:11434' },
        omniroute: {
            configured: !!p.omniroute?.apiKey,
            baseUrl: p.omniroute?.baseUrl || 'http://localhost:20128',
        },
        custom: p.custom?.baseURL ? { configured: true } : { configured: false },
        defaultModel: settings?.defaultModel || null,
    };
}

export function getOpenRouterBase() {
    return OPENROUTER_BASE;
}
