/**
 * Utility functions for conversation normalization
 * 
 * Now supports multi-platform conversations:
 * - If conv already has `platform` and `messages` (from parsers), it's returned as-is
 * - Legacy ChatGPT format (raw mapping) is normalized for backwards compatibility
 */

import { normalizeConversation as chatgptNormalize } from './utils/data.js';

export function normalizeConversation(conv) {
    // If the conversation already came from a parser (has platform + messages),
    // just ensure it has searchText and return it
    if (conv.platform && Array.isArray(conv.messages) && conv.messages.length > 0) {
        return {
            ...conv,
            id: conv.id || getConvKey(conv),
            platform: conv.platform,
            raw: conv.raw || conv,
            title: conv.title || '(Sem título)',
            createTime: conv.createTime || conv.create_time || null,
            updateTime: conv.updateTime || conv.update_time || null,
            messages: conv.messages,
            searchText: conv.searchText || buildSearchText(conv.title, conv.messages),
        };
    }

    // Legacy path: raw ChatGPT format with mapping
    const normalized = chatgptNormalize(conv);
    normalized.platform = 'chatgpt';
    return normalized;
}

export function getConvKey(conv) {
    // Direct id from conversation object
    if (conv.id && typeof conv.id === 'string' && conv.id.length > 0) {
        // Avoid returning the id if it looks like a getConvKey-generated one
        // to prevent double-wrapping
        if (!conv.id.includes('@@') || conv.raw) {
            return conv.id;
        }
    }
    const raw = conv.raw || {};
    const externalId = raw.id || null;
    const title = conv.title || '';
    const ctime = conv.createTime || 0;
    if (externalId) return externalId;
    return `${title}@@${ctime}`;
}

function buildSearchText(title, messages) {
    return (
        (title || '') + ' ' + (messages || []).map(m => m.textPlain || '').join(' ')
    ).toLowerCase();
}

export function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * (timestamp < 100000000000 ? 1000 : 1));
    return date.toLocaleDateString('pt-BR');
}
