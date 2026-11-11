/**
 * AI Bridge — facade de compatibilidade (Electron Main Process)
 *
 * A implementação real agora vive em electron/ai/:
 *   ai/settings.js  — settings multi-provider (v2) + migração do v1
 *   ai/providers.js — registry de providers (openrouter, openai,
 *                     anthropic, google, ollama, custom)
 *   ai/harness.js    — streamText + tools + retry + abort
 *
 * Este módulo mantém as assinaturas que o main.js consome e o
 * contrato de eventos que o renderer espera.
 */
import {
    loadAISettings,
    saveProviderSettings,
    saveLegacySettings,
    setDefaultModel,
    providerPublicView,
} from './ai/settings.js';
import { streamChat as harnessStreamChat, abortStream as harnessAbort } from './ai/harness.js';
import { getCatalog } from './ai/catalog.js';

export { loadAISettings, saveProviderSettings, setDefaultModel, providerPublicView, getCatalog };

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Streaming — delega ao harness com settings v2.
 */
export async function streamChat(mainWindow, params) {
    const settings = await loadAISettings();
    return harnessStreamChat(mainWindow, params, settings);
}

/**
 * Abort do stream ativo.
 */
export function abortStream() {
    return harnessAbort();
}

/**
 * IPC legado ai:getSettings — view compatível com o renderer antigo
 * ({hasKey, baseURL}) + dados novos (providers, defaultModel).
 * Chaves nunca cruzam o IPC.
 */
export async function getSettingsView() {
    const settings = await loadAISettings();
    const view = providerPublicView(settings);
    return {
        hasKey: view.anyKey,
        baseURL: 'https://openrouter.ai/api/v1',
        providers: view,
        defaultModel: settings.defaultModel,
    };
}

/**
 * IPC legado ai:saveSettings — adapter para o formato v2.
 */
export async function saveAISettings(settings) {
    await saveLegacySettings(settings);
    return { success: true };
}

/**
 * IPC legado ai:getModels — catálogo público do OpenRouter.
 * (Catálogo multi-provider completo chega na Fase 2: ai:getCatalog.)
 */
export async function fetchAvailableModels() {
    try {
        const response = await fetch(OPENROUTER_MODELS_URL);
        if (!response.ok) return [];
        const json = await response.json();
        return (json.data || []).map((m) => ({
            id: m.id,
            name: m.name,
            context_length: m.context_length,
            pricing: m.pricing,
        }));
    } catch (error) {
        console.error('[AI Bridge] Failed to fetch models:', error.message);
        return [];
    }
}
