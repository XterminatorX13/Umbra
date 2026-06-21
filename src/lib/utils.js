/**
 * Utility functions for conversation normalization
 * 
 * Now supports multi-platform conversations:
 * - If conv already has `platform` and `messages` (from parsers), it's returned as-is
 * - Legacy ChatGPT format (raw mapping) is normalized for backwards compatibility
 */

export function normalizeConversation(conv) {
    // If the conversation already came from a parser (has platform + messages),
    // just ensure it has searchText and return it
    if (conv.platform && Array.isArray(conv.messages) && conv.messages.length > 0) {
        return {
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
    const title = conv.title || '(Sem título)';
    const createTime = conv.create_time || null;
    const updateTime = conv.update_time || null;
    const mapping = conv.mapping || {};
    const messages = extractMessagesFromMapping(mapping, createTime);
    const searchText = buildSearchText(title, messages);

    const id = getConvKey({ raw: conv, title, createTime });

    return {
        id,
        platform: conv.platform || 'chatgpt',
        raw: conv,
        title,
        createTime,
        updateTime,
        messages,
        searchText
    };
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

function extractMessagesFromMapping(mapping, fallbackTime) {
    const msgs = [];
    for (const key in mapping) {
        const node = mapping[key];
        if (!node || !node.message) continue;

        const msg = node.message;
        const author = msg.author || {};
        const role = author.role || 'unknown';

        if (role === 'tool') continue;
        if (msg.metadata && msg.metadata.is_visually_hidden_from_conversation) continue;

        const contentObj = msg.content || {};
        const ctype = contentObj.content_type;

        if (ctype && String(ctype).startsWith('tether_')) continue;

        let text = '';

        if (ctype === 'text' && Array.isArray(contentObj.parts)) {
            text = contentObj.parts.join('\n\n');
        } else if (ctype === 'user_editable_context') {
            continue;
        } else {
            continue;
        }

        if (!text.trim()) continue;

        const ts = msg.create_time != null ? msg.create_time : (fallbackTime || 0);

        msgs.push({
            id: msg.id || key,
            role,
            textMarkdown: text,
            textPlain: text,
            timestamp: ts
        });
    }

    msgs.sort((a, b) => a.timestamp - b.timestamp);
    return msgs;
}
