export function normalizeConversation(conv) {
    const title = conv.title || '(Sem título)';
    const createTime = conv.create_time || null;
    const updateTime = conv.update_time || null;
    const mapping = conv.mapping || {};
    const messages = extractMessagesFromMapping(mapping, createTime);
    const searchText = (title + ' ' + messages.map(m => m.textPlain).join(' ')).toLowerCase();

    // Ensure we have a stable ID. 
    // The original script used: externalId || `${title}@@${ctime}`
    // We'll attach it here for easier access.
    const id = getConvKey({ raw: conv, title, createTime });

    return {
        id,
        raw: conv,
        title,
        createTime,
        updateTime,
        messages,
        searchText
    };
}

export function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000); // timestamp is usually seconds in ChatGPT export
    // If year is current year, show "DD/MM", else "DD/MM/YYYY"
    const now = new Date();
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

export function getConvKey(conv) {
    const raw = conv.raw || {};
    const externalId = raw.id || null;
    const title = conv.title || '';
    const ctime = conv.createTime || 0;
    if (externalId) return externalId;
    return `${title}@@${ctime}`;
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
