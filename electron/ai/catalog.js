/**
 * Model Catalog — Electron Main Process
 *
 * Adaptado de models.dev (https://models.dev, MIT): banco open-source
 * com todos os modelos de todos os providers — custo, janela de
 * contexto, tool-calling, reasoning, cutoff de conhecimento.
 *
 * Padrão de resiliência (last-good-copy) inspirado no consumer do
 * models.dev do projeto otari (Mozilla): fetch com TTL de 24h em
 * userData; se models.dev estiver fora do ar, serve a última cópia
 * boa; se nunca houve fetch, serve um fallback embutido mínimo.
 *
 * Modelos locais do Ollama não existem no models.dev — são buscados
 * ao vivo em {baseUrl}/api/tags (barato, servidor local).
 */
import path from 'path';
import fs from 'fs/promises';

const MODELS_DEV_URL = 'https://models.dev/api.json';
const CACHE_FILE = 'catalog-cache.json';
// Versiona o shape normalizado em cache — mudanças na normalização
// invalidam caches antigos em vez de servir dados sem campos novos
const CATALOG_SCHEMA = 2;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 15000;
const OLLAMA_TIMEOUT_MS = 3000;
const OMNIROUTE_TIMEOUT_MS = 3000;
const OMNIROUTE_DEFAULT_BASE = 'http://localhost:20128';

// Só estes atravessam o IPC — o payload completo tem ~5.9 MB / 235 providers
const CLOUD_PROVIDERS = ['openrouter', 'openai', 'anthropic', 'google'];

// Fallback embutido — primeira execução sem rede
const FALLBACK_PROVIDERS = {
    anthropic: [
        { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', contextWindow: 1000000, toolCall: true, reasoning: true },
        { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', contextWindow: 1000000, toolCall: true, reasoning: true },
    ],
    openai: [
        { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', contextWindow: 1050000, toolCall: true, reasoning: true },
    ],
    google: [
        { id: 'gemini-4-carbon', name: 'Gemini 4 Carbon', contextWindow: 1048576, toolCall: true, reasoning: true },
    ],
    openrouter: [
        { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5 (OpenRouter)', contextWindow: 1000000, toolCall: true, reasoning: true },
        { id: 'openai/gpt-6.1-terra', name: 'GPT-6.1 Terra (OpenRouter)', contextWindow: 1050000, toolCall: true, reasoning: true },
    ],
};

let cachedPathFn = null;

/** Injeta o resolvedor de caminho de cache (main.js passa app.getPath). */
export function setCachePathResolver(fn) {
    cachedPathFn = fn;
}

async function getCachePath() {
    if (!cachedPathFn) {
        // Lazy import: permite smoke-test fora do runtime Electron
        const { app } = await import('electron');
        return path.join(app.getPath('userData'), CACHE_FILE);
    }
    return cachedPathFn();
}

/** models.dev api.json → shape normalizado do Umbra, filtrado. */
function extractProviders(apiJson) {
    const result = {};
    for (const providerId of CLOUD_PROVIDERS) {
        const provider = apiJson?.[providerId];
        if (!provider?.models) continue;
        const models = Object.entries(provider.models)
            .map(([key, m]) => ({
                id: m.id || key,
                name: m.name || m.id || key,
                contextWindow: m.limit?.context ?? null,
                maxOutputTokens: m.limit?.output ?? null,
                cost: m.cost
                    ? { input: m.cost.input ?? null, output: m.cost.output ?? null }
                    : null,
                // grátis = custo conhecido e zero nos dois sentidos
                // (variantes :free do OpenRouter etc.)
                free: !!m.cost && m.cost.input === 0 && m.cost.output === 0,
                toolCall: !!m.tool_call,
                reasoning: !!m.reasoning,
                attachment: !!m.attachment,
                structuredOutput: !!m.structured_output,
                openWeights: !!m.open_weights,
                knowledge: m.knowledge ?? null,
                releaseDate: m.release_date ?? null,
                status: m.status ?? null,
            }))
            .filter((m) => m.status !== 'deprecated')
            .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
        result[providerId] = models;
    }
    return result;
}

async function fetchModelsDev() {
    const response = await fetch(MODELS_DEV_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`models.dev respondeu ${response.status}`);
    }
    return response.json();
}

async function fetchOllamaModels(settings) {
    const baseUrl = (settings?.providers?.ollama?.baseUrl || 'http://localhost:11434')
        .toString()
        .replace(/\/$/, '');
    try {
        const response = await fetch(`${baseUrl}/api/tags`, {
            signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
        });
        if (!response.ok) return [];
        const json = await response.json();
        return (json.models || []).map((m) => ({
            id: m.name,
            name: m.name,
            contextWindow: null,
            maxOutputTokens: null,
            cost: null, // local: grátis
            free: true, // roda na sua máquina
            toolCall: true,
            reasoning: false,
            attachment: false,
            structuredOutput: false,
            openWeights: true,
            knowledge: null,
            releaseDate: null,
            status: null,
            local: true,
        }));
    } catch {
        return []; // servidor local desligado — normal
    }
}

/**
 * Modelos do gateway OmniRoute (localhost:20128). OpenAI-compatible:
 * GET {baseUrl}/v1/models com Bearer. Inclui o modelo mágico "auto"
 * (rota para o melhor provider elegível — 150+ free tiers).
 */
async function fetchOmniRouteModels(settings) {
    const conf = settings?.providers?.omniroute;
    const baseUrl = (conf?.baseUrl || OMNIROUTE_DEFAULT_BASE).replace(/\/$/, '');
    if (!conf?.apiKey) return [];

    const toModel = (m) => ({
        id: m.id,
        name: m.name || m.id,
        contextWindow: m.context_length ?? null,
        maxOutputTokens: null,
        cost: null, // roteado: custo depende da rota escolhida
        free: null, // desconhecido — OmniRoute tem 150+ providers free tier
        toolCall: true,
        reasoning: false,
        attachment: false,
        structuredOutput: false,
        openWeights: false,
        knowledge: null,
        releaseDate: null,
        status: null,
        gateway: 'omniroute',
    });

    try {
        const response = await fetch(`${baseUrl}/v1/models`, {
            headers: { Authorization: `Bearer ${conf.apiKey}` },
            signal: AbortSignal.timeout(OMNIROUTE_TIMEOUT_MS),
        });
        if (!response.ok) return [];
        const json = await response.json();
        const models = (json.data || []).map(toModel);
        const withAuto = models.some((m) => m.id === 'auto')
            ? models
            : [
                  {
                      id: 'auto',
                      name: 'Auto — melhor rota elegível (free tiers)',
                      contextWindow: null,
                      maxOutputTokens: null,
                      cost: null,
                      free: true,
                      toolCall: true,
                      reasoning: false,
                      attachment: false,
                      structuredOutput: false,
                      openWeights: false,
                      knowledge: null,
                      releaseDate: null,
                      status: null,
                      gateway: 'omniroute',
                      auto: true,
                  },
                  ...models,
              ];
        return withAuto;
    } catch {
        return []; // gateway desligado — normal
    }
}

/**
 * Catálogo completo para o renderer.
 * @returns {Promise<{providers: Object, source: 'cache'|'live'|'fallback', updatedAt: number}>}
 */
export async function getCatalog(settings) {
    let providers = null;
    let source = 'live';

    // 1. Cache fresco?
    try {
        const cachePath = await getCachePath();
        const raw = await fs.readFile(cachePath, 'utf-8');
        const cache = JSON.parse(raw);
        if (
            cache?.schema === CATALOG_SCHEMA &&
            cache?.providers &&
            Date.now() - cache.fetchedAt < CACHE_TTL_MS
        ) {
            providers = cache.providers;
            source = 'cache';
        }
    } catch {
        // sem cache — segue pro fetch
    }

    // 2. Fetch live (e grava cache)
    if (!providers) {
        try {
            const apiJson = await fetchModelsDev();
            providers = extractProviders(apiJson);
            if (Object.keys(providers).length > 0) {
                try {
                    const cachePath = await getCachePath();
                    await fs.writeFile(
                        cachePath,
                        JSON.stringify({ schema: CATALOG_SCHEMA, fetchedAt: Date.now(), providers }),
                        'utf-8',
                    );
                } catch (e) {
                    console.warn('[Catalog] Cache write falhou:', e.message);
                }
            }
        } catch (e) {
            console.warn('[Catalog] models.dev inacessível:', e.message);
        }
    }

    // 3. Last-good-copy (cache stale) ou fallback embutido
    if (!providers) {
        try {
            const cachePath = await getCachePath();
            const cache = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
            if (cache?.schema === CATALOG_SCHEMA && cache?.providers) {
                providers = cache.providers;
                source = 'cache-stale';
            }
        } catch {
            // ignora
        }
    }
    if (!providers) {
        providers = FALLBACK_PROVIDERS;
        source = 'fallback';
    }

    const ollama = await fetchOllamaModels(settings);
    const omniroute = await fetchOmniRouteModels(settings);

    return {
        providers: { ...providers, ollama, omniroute },
        source,
        updatedAt: Date.now(),
    };
}
