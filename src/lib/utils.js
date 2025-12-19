// Model slug to readable name mapping
const MODEL_NAMES = {
    'research': 'Deep Research',
    'gpt-5': 'GPT-5',
    'o4-mini': 'o4-mini',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'o3': 'o3',
    'o1': 'o1',
    'o1-mini': 'o1-mini',
    'gpt-4': 'GPT-4',
    'gpt-4-turbo': 'GPT-4 Turbo',
};

function getModelName(slug) {
    if (!slug) return 'Unknown';
    return MODEL_NAMES[slug] || slug;
}

export function normalizeConversation(conv) {
    const title = conv.title || '(Sem título)';
    const createTime = conv.create_time || null;
    const updateTime = conv.update_time || null;
    const mapping = conv.mapping || {};
    const safeUrls = conv.safe_urls || []; // Deep Research URLs
    const messages = extractMessagesFromMapping(mapping, createTime, safeUrls);
    const searchText = (title + ' ' + messages.map(m => m.textPlain).join(' ')).toLowerCase();

    // Ensure we have a stable ID. 
    const id = getConvKey({ raw: conv, title, createTime });

    // Extract model/conversation metadata
    const modelInfo = {
        modelSlug: conv.default_model_slug || 'unknown',
        isDeepResearch: conv.default_model_slug === 'research',
        isStudyMode: conv.is_study_mode || false,
        memoryScope: conv.memory_scope || null,
    };
    modelInfo.modelName = getModelName(modelInfo.modelSlug);

    return {
        id,
        raw: conv,
        title,
        createTime,
        updateTime,
        messages,
        searchText,
        modelInfo
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

function extractMessagesFromMapping(mapping, fallbackTime, safeUrls = []) {
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
            const citations = msg.metadata ? (msg.metadata.citations || []) : [];
            text = cleanChatGPTArtifacts(contentObj.parts.join('\n\n'), citations, safeUrls);
        } else if (ctype === 'user_editable_context') {
            continue;
        } else {
            continue;
        }

        if (!text.trim()) continue;

        const ts = msg.create_time != null ? msg.create_time : (fallbackTime || 0);

        // Detect Tools Used (Offline/No-API)
        const tools = detectTools(msg);

        // Extract per-message sources from content_references
        const contentRefs = msg.metadata?.content_references || [];
        const sources = extractSourcesFromRefs(contentRefs);

        // Extract per-message model info
        const msgModelSlug = msg.metadata?.model_slug || null;
        const modelName = msgModelSlug ? (getModelName(msgModelSlug) || msgModelSlug) : null;

        msgs.push({
            id: msg.id || key,
            role,
            textMarkdown: text,
            textPlain: text,
            timestamp: ts,
            tools,
            sources,
            modelSlug: msgModelSlug,
            modelName: modelName
        });
    }

    msgs.sort((a, b) => a.timestamp - b.timestamp);
    return msgs;
}

/**
 * Detects which internal tool generated this message based on metadata/author.
 */
function detectTools(msg) {
    const tools = [];

    // 1. Author Role Check
    if (msg.author && msg.author.role === 'tool') {
        const name = msg.author.name;
        if (name === 'browser' || name === 'tether_browsing_display') {
            tools.push({ type: 'browser', label: 'Deep Research / Web', icon: 'globe' });
        } else if (name === 'python' || name === 'dalle.text2im') {
            tools.push({ type: 'code', label: 'Analysis / Python', icon: 'code' });
        }
    }

    // 2. Content Type Check
    const ctype = msg.content ? msg.content.content_type : '';
    if (ctype === 'execution_output') {
        tools.push({ type: 'code', label: 'Python Output', icon: 'terminal' });
    } else if (ctype === 'tether_browsing_display') {
        tools.push({ type: 'browser', label: 'Browsing', icon: 'globe' });
    }

    // 3. Metadata Citation Check - Use content_references for accurate count
    const contentRefs = msg.metadata?.content_references || [];
    if (contentRefs.length > 0) {
        // Deduplicate by URL to get unique sources
        const uniqueUrls = new Set(contentRefs.map(r => r.url).filter(Boolean));
        tools.push({
            type: 'citation',
            label: `${uniqueUrls.size} Sources`,
            icon: 'book',
            sourceCount: uniqueUrls.size
        });
    }

    return tools;
}

/**
 * Extracts unique sources from content_references metadata.
 * Returns array of { url, title, snippet, domain }
 */
function extractSourcesFromRefs(refs) {
    if (!refs || !Array.isArray(refs)) return [];

    const seen = new Set();
    const sources = [];

    for (const ref of refs) {
        if (!ref.url || seen.has(ref.url)) continue;
        seen.add(ref.url);

        let domain = '';
        try {
            domain = new URL(ref.url).hostname.replace('www.', '');
        } catch { domain = ref.attribution || ''; }

        sources.push({
            url: ref.url,
            title: ref.title || domain,
            snippet: ref.snippet || '',
            domain: domain,
            attribution: ref.attribution || domain
        });
    }

    return sources;
}

/**
 * Cleans ChatGPT internal artifacts/tools syntax and resolves citations.
 * Example entity: entity["car", "BYD Yangwang U9", 0] -> BYD Yangwang U9
 * Example citation: citeturn0search3 -> (Removed)
 * Example bracket: 【17†L65-L73】 -> [17](url) or [17]
 */
function cleanChatGPTArtifacts(text, citations = [], safeUrls = []) {
    if (!text) return text;

    // 1. Replace Entities: entity[...] -> extracted name
    text = text.replace(/entity(.*?)/g, (match, content) => {
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length >= 2) {
                return parsed[1];
            }
            return content;
        } catch (e) {
            return match;
        }
    });

    // 2. Remove Internal Citations: cite...
    text = text.replace(/cite.*?/g, '');

    // 3. Resolve Bracket Citations: 【17†source】 using safe_urls
    text = text.replace(/【(\d+)(?:†[^】]*)?】/g, (match, indexStr) => {
        const index = parseInt(indexStr, 10);

        // Try safe_urls first (Deep Research)
        if (safeUrls && safeUrls[index]) {
            const url = safeUrls[index];
            // Extract domain for display
            try {
                const domain = new URL(url).hostname.replace('www.', '');
                return ` [${domain}](${url})`;
            } catch {
                return ` [Source ${index}](${url})`;
            }
        }

        // Fallback to citations array
        if (citations && citations[index]) {
            const cit = citations[index];
            const url = cit.metadata ? (cit.metadata.url || cit.metadata.source_url) : null;
            if (url) {
                try {
                    const domain = new URL(url).hostname.replace('www.', '');
                    return ` [${domain}](${url})`;
                } catch {
                    return ` [Source](${url})`;
                }
            }
        }

        // Clean removal if no URL found
        return '';
    });

    return text;
}
