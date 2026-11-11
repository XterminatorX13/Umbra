/**
 * Provider Registry — Electron Main Process
 *
 * Resolve { providerId, modelId } + settings → instância LanguageModel
 * do AI SDK v5. Um único ponto que conhece todos os providers:
 *
 *   openrouter  → openai-compatible (1 chave, centenas de modelos)
 *   openai      → @ai-sdk/openai (chave própria)
 *   anthropic   → @ai-sdk/anthropic (chave própria)
 *   google      → @ai-sdk/google (chave própria)
 *   ollama      → openai-compatible em localhost (sem chave)
 *   custom      → openai-compatible arbitrário (migrado do v1)
 */
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export function resolveModel({ providerId, modelId }, settings) {
    const providers = settings?.providers || {};
    if (!modelId) {
        throw new Error('modelId é obrigatório');
    }

    switch (providerId) {
        case 'openai': {
            const apiKey = providers.openai?.apiKey;
            if (!apiKey) throw new Error('OpenAI não configurado. Adicione a chave nas Configurações.');
            return createOpenAI({ apiKey })(modelId);
        }

        case 'anthropic': {
            const apiKey = providers.anthropic?.apiKey;
            if (!apiKey) throw new Error('Anthropic não configurado. Adicione a chave nas Configurações.');
            return createAnthropic({ apiKey })(modelId);
        }

        case 'google': {
            const apiKey = providers.google?.apiKey;
            if (!apiKey) throw new Error('Google/Gemini não configurado. Adicione a chave nas Configurações.');
            return createGoogleGenerativeAI({ apiKey })(modelId);
        }

        case 'openrouter': {
            const apiKey = providers.openrouter?.apiKey;
            if (!apiKey) throw new Error('OpenRouter não configurado. Adicione a chave nas Configurações.');
            return createOpenAICompatible({
                name: 'openrouter',
                baseURL: OPENROUTER_BASE,
                apiKey,
                headers: {
                    'HTTP-Referer': 'https://umbra.app',
                    'X-Title': 'Umbra',
                },
            }).chatModel(modelId);
        }

        case 'ollama': {
            const baseUrl = (providers.ollama?.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
            return createOpenAICompatible({
                name: 'ollama',
                baseURL: `${baseUrl}/v1`,
            }).chatModel(modelId);
        }

        case 'omniroute': {
            const conf = providers.omniroute || {};
            const baseUrl = (conf.baseUrl || 'http://localhost:20128').replace(/\/$/, '');
            const apiKey = conf.apiKey;
            if (!apiKey) {
                throw new Error(
                    'OmniRoute não configurado. Inicie o gateway (npm i -g omniroute) e cole a chave de Dashboard → Endpoints nas Configurações.',
                );
            }
            return createOpenAICompatible({
                name: 'omniroute',
                baseURL: `${baseUrl}/v1`,
                apiKey,
            }).chatModel(modelId);
        }

        case 'custom': {
            const { apiKey, baseURL } = providers.custom || {};
            if (!baseURL) throw new Error('Provider custom não configurado.');
            return createOpenAICompatible({
                name: 'custom',
                baseURL,
                apiKey: apiKey || undefined,
            }).chatModel(modelId);
        }

        default:
            throw new Error(`Provider desconhecido: ${providerId}`);
    }
}

/**
 * Model legado do renderer (string "vendor/model") → spec { providerId, modelId }.
 * Se o v1 apontava pra um endpoint custom, a string pertence ao custom.
 */
export function legacyModelSpec(modelId, settings) {
    const custom = settings?.providers?.custom;
    if (custom?.baseURL && !custom.baseURL.includes('openrouter')) {
        return { providerId: 'custom', modelId };
    }
    return { providerId: 'openrouter', modelId };
}
