/**
 * AI Harness — Electron Main Process
 *
 * Motor de execução do chat: AI SDK streamText com tool-calling
 * (generative UI), retry/backoff nativo do SDK (429/5xx), abort
 * real via AbortSignal e taxonomia de erros estruturada.
 *
 * Mantém o contrato de eventos do renderer (compatível com o
 * ai-bridge antigo):
 *   ai:chunk   { type: 'text', content }
 *   ai:toolCall{ type: 'tool_invocations', toolInvocations: [{id, toolName, args, state:'result'}] }
 *   ai:done    { finishReason: 'stop'|'tool_calls'|'length'|'content_filter'|'aborted' }
 *   ai:error   { type: 'stream_error'|..., message, status, code }
 */
import { streamText, tool, jsonSchema } from 'ai';
import { resolveModel, legacyModelSpec } from './providers.js';

let activeAbortController = null;

// FinishReason do AI SDK → razões do contrato legado (formato OpenAI)
const FINISH_REASON_MAP = {
    stop: 'stop',
    length: 'length',
    'content-filter': 'content_filter',
    'tool-calls': 'tool_calls',
    error: 'error',
    interrupted: 'aborted',
};

/**
 * Mensagens do renderer (formato OpenAI {role, content}) →
 * ModelMessage do AI SDK.
 */
function toModelMessages(messages) {
    return (messages || [])
        .filter((m) => m && typeof m.content === 'string' && m.content.length > 0)
        .map((m) => {
            const role = ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user';
            return { role, content: m.content };
        });
}

/**
 * Schemas de tools no formato OpenAI (params.tools do renderer) →
 * ToolSet do AI SDK. Tools sem execute = client-side (generative UI):
 * o stream termina com finishReason 'tool-calls' e o renderer renderiza
 * os artifacts.
 */
function toToolSet(schemas) {
    if (!Array.isArray(schemas) || schemas.length === 0) return undefined;
    const toolSet = {};
    for (const s of schemas) {
        const name = s?.function?.name || s?.name;
        if (!name) continue;
        toolSet[name] = tool({
            description: s?.function?.description || s?.description || '',
            parameters: jsonSchema(s?.function?.parameters || { type: 'object', properties: {} }),
        });
    }
    return Object.keys(toolSet).length > 0 ? toolSet : undefined;
}

/**
 * Streams um chat completion para o renderer via IPC.
 *
 * @param {Electron.BrowserWindow} mainWindow
 * @param {Object} params - { messages, model, tools, temperature, maxTokens }
 *   model: { providerId, modelId } (novo) ou string (legado → openrouter/custom)
 * @param {Object} settings - settings v2 carregados no main
 */
export async function streamChat(mainWindow, params, settings) {
    const { messages, model, tools, temperature = 0.7, maxTokens } = params;

    // Um stream ativo por vez (comportamento do bridge antigo)
    if (activeAbortController) {
        activeAbortController.abort();
    }
    activeAbortController = new AbortController();
    const signal = activeAbortController.signal;

    let doneSent = false;
    const sendDone = (finishReason) => {
        if (doneSent || mainWindow.isDestroyed()) return;
        doneSent = true;
        mainWindow.webContents.send('ai:done', { finishReason });
    };

    try {
        const spec =
            typeof model === 'string' ? legacyModelSpec(model, settings) : model;
        if (!spec?.modelId) {
            throw new Error('Nenhum modelo especificado. Configure um modelo padrão.');
        }

        const languageModel = resolveModel(spec, settings);

        const options = {
            model: languageModel,
            messages: toModelMessages(messages),
            temperature,
            abortSignal: signal,
            // retry/backoff nativo do SDK para 429/5xx (2 tentativas)
            maxRetries: 2,
        };
        if (maxTokens) {
            options.maxOutputTokens = maxTokens;
        }
        const toolSet = toToolSet(tools);
        if (toolSet) {
            options.tools = toolSet;
        }

        const result = streamText(options);
        const toolInvocations = [];

        for await (const part of result.fullStream) {
            if (mainWindow.isDestroyed()) {
                activeAbortController.abort();
                return;
            }

            switch (part.type) {
                case 'text-delta':
                    mainWindow.webContents.send('ai:chunk', {
                        type: 'text',
                        content: part.text,
                    });
                    break;

                case 'tool-call':
                    toolInvocations.push({
                        id: part.toolCallId,
                        toolName: part.toolName,
                        args: part.input,
                        state: 'result',
                    });
                    break;

                case 'abort':
                    sendDone('aborted');
                    break;

                case 'error':
                    throw part.error;

                case 'finish':
                    if (toolInvocations.length > 0) {
                        mainWindow.webContents.send('ai:toolCall', {
                            type: 'tool_invocations',
                            toolInvocations,
                        });
                    }
                    sendDone(FINISH_REASON_MAP[part.finishReason] || part.finishReason);
                    break;

                // 'reasoning-delta' e afins: sem canal no contrato legado (v1)
            }
        }
    } catch (error) {
        if (error?.name === 'AbortError' || signal.aborted) {
            sendDone('aborted');
            return;
        }

        console.error('[AI Harness] Stream error:', error);
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai:error', {
                type: 'stream_error',
                message: error?.message || 'Erro desconhecido na comunicação com a IA',
                status: error?.statusCode ?? error?.status ?? null,
                code: error?.code ?? null,
            });
        }
    } finally {
        if (activeAbortController?.signal === signal) {
            activeAbortController = null;
        }
    }
}

export function abortStream() {
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
}
