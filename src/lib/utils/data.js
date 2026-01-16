// Known model aliases (for special formatting)
const MODEL_ALIASES = {
    'research': 'Deep Research',
};

/**
 * Dynamically formats model slugs to readable names.
 * Instead of hardcoding, this auto-detects patterns like:
 * - "gpt-5" → "GPT-5"
 * - "gpt-5.2" → "GPT-5.2"
 * - "o4-mini" → "o4 Mini"
 * - "research" → "Deep Research"
 * - Any new model → Formatted automatically
 */
function getModelName(slug) {
    if (!slug) return 'Unknown';

    // Check known aliases first
    if (MODEL_ALIASES[slug]) return MODEL_ALIASES[slug];

    // Auto-format pattern: gpt-X.X → GPT-X.X
    if (slug.startsWith('gpt-')) {
        return 'GPT-' + slug.slice(4).toUpperCase().replace(/-/g, ' ');
    }

    // Auto-format pattern: oX-mini → oX Mini
    if (slug.match(/^o\d+/)) {
        return slug.replace(/-/g, ' ').replace(/mini/gi, 'Mini');
    }

    // Fallback: capitalize and humanize
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Export for use in components
export { getModelName };

/**
 * Parses image generation structured output from DALL-E.
 * Detects JSON like: {"prompt": "...", "size": "1024x1024"}
 * @returns {Object|null} { prompt, size } or null if not an image gen prompt
 */
export function parseImageGenPrompt(text) {
    if (!text) return null;
    const trimmed = text.trim();

    // Check if it looks like a JSON image prompt
    if (!trimmed.startsWith('{') || !trimmed.includes('"prompt"')) return null;

    try {
        const parsed = JSON.parse(trimmed);
        if (parsed.prompt && typeof parsed.prompt === 'string') {
            return {
                prompt: parsed.prompt,
                size: parsed.size || '1024x1024'
            };
        }
    } catch (e) {
        // Not valid JSON
    }
    return null;
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

    // Aggregate filter metadata at conversation level
    const filterMeta = {
        hasImageGen: messages.some(m => m.imageGen !== null && m.imageGen !== undefined),
        hasWebSearch: messages.some(m => m.tools?.some(t => t.type === 'browser')),
        hasSources: messages.some(m => m.sources?.length > 0),
        modelSlug: modelInfo.modelSlug,
        modelName: modelInfo.modelName,
        isDeepResearch: modelInfo.isDeepResearch,
        createDate: createTime ? new Date(createTime * 1000) : null
    };

    return {
        id,
        raw: conv,
        title,
        createTime,
        updateTime,
        messages,
        searchText,
        modelInfo,
        filterMeta
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

/**
 * Silently deduplicates conversations.
 * Returns only new conversations that don't exist in the current set.
 * 
 * @param {Array} existingConversations - Currently loaded conversations
 * @param {Array} newConversations - Newly imported conversations
 * @returns {Object} { unique: [...], stats: { total, new, duplicates, updated } }
 */
export function deduplicateConversations(existingConversations, newConversations) {
    // Build a map of existing conversations by ID
    const existingMap = new Map();
    for (const conv of existingConversations) {
        const key = getConvKey(conv);
        existingMap.set(key, conv);
    }

    const unique = [];
    const updated = [];
    let duplicates = 0;

    for (const newConv of newConversations) {
        const key = getConvKey(newConv);

        if (existingMap.has(key)) {
            const existing = existingMap.get(key);

            // Check if the new version has more recent updates
            const existingUpdate = existing.updateTime || existing.createTime || 0;
            const newUpdate = newConv.updateTime || newConv.createTime || 0;

            if (newUpdate > existingUpdate) {
                // Newer version found - update
                unique.push(newConv);
                updated.push({ title: newConv.title, key });
            } else {
                // Exact duplicate - skip
                duplicates++;
            }
        } else {
            // Completely new conversation
            unique.push(newConv);
        }
    }

    return {
        unique,
        stats: {
            total: newConversations.length,
            new: unique.length - updated.length,
            duplicates,
            updated: updated.length
        }
    };
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
            const contentRefs = msg.metadata?.content_references || [];
            text = cleanChatGPTArtifacts(contentObj.parts.join('\n\n'), citations, safeUrls, contentRefs);
        } else if (ctype === 'user_editable_context') {
            continue;
        } else {
            continue;
        }

        const ts = msg.create_time != null ? msg.create_time : (fallbackTime || 0);

        // Detect Tools Used (Offline/No-API)
        const tools = detectTools(msg);

        // ═══════════════════════════════════════════════════════════════
        // NEW: Detect tool_calls explicitly for assistant messages
        // ═══════════════════════════════════════════════════════════════
        const rawToolCalls = msg.tool_calls || [];
        const hasToolCall = rawToolCalls.length > 0;
        const contentIsNull = !text.trim() && hasToolCall;

        // Parse tool calls into structured format
        const toolCalls = rawToolCalls.map(tc => ({
            id: tc.id || 'unknown',
            type: tc.type || 'function',
            name: tc.function?.name || tc.tool?.name || 'desconhecida',
            arguments: tc.function?.arguments || tc.tool?.arguments || '{}'
        }));

        if (hasToolCall) {
            tools.push({
                type: 'tool_call',
                label: `${toolCalls.length} chamada(s) de ferramenta`,
                icon: 'function',
                details: toolCalls
            });
            if (contentIsNull) {
                text = '(Resposta gerada via ferramenta - sem texto direto do assistente)';
            }
        }

        // Skip empty text messages (but allow tool call placeholders)
        if (!text.trim() && !hasToolCall) continue;

        // Extract per-message sources from content_references
        const contentRefs = msg.metadata?.content_references || [];
        const sources = extractSourcesFromRefs(contentRefs);

        // Extract per-message model info
        const msgModelSlug = msg.metadata?.model_slug || null;
        const modelName = msgModelSlug ? (getModelName(msgModelSlug) || msgModelSlug) : null;

        // Detect DALL-E image generation prompts (structured output)
        const imageGenPrompt = parseImageGenPrompt(text);

        // Extract image URLs from content_references (for DALL-E/multimodal)
        let imageUrls = [];
        if (contentRefs.some(ref => ref.type === 'image_group')) {
            imageUrls = contentRefs
                .filter(ref => ref.type === 'image_group' && ref.images)
                .flatMap(ref => ref.images
                    .filter(img => img.image_result?.content_url)
                    .map(img => img.image_result.content_url)
                );
        }

        msgs.push({
            id: msg.id || key,
            role,
            textMarkdown: imageGenPrompt ? null : text,
            textPlain: imageGenPrompt ? imageGenPrompt.prompt : text,
            timestamp: ts,
            tools,
            sources,
            modelSlug: msgModelSlug,
            modelName: modelName,
            imageGen: imageGenPrompt,
            toolCalls,       // NEW: Array of parsed tool calls
            hasToolCall,     // NEW: Boolean flag
            contentIsNull,   // NEW: Flag for null content with tool calls
            imageUrls        // NEW: Array of image URLs
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
 * 
 * HYBRID APPROACH:
 * 1. Priority: Use content_references metadata (official OpenAI data)
 * 2. Fallback: Regex patterns for older exports without content_references
 * 
 * Handles:
 * - citeturn0view0 → Clickable citation link
 * - entity["software","ChatGPT",0] → Just "ChatGPT"
 * - entity_metadata[...] → Hidden (removed)
 * - image_group{...} → Image URLs
 * - 【17†source】 → Resolved citation
 */
function cleanChatGPTArtifacts(text, citations = [], safeUrls = [], contentReferences = []) {
    if (!text) return text;

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 1: Use content_references (Official OpenAI metadata)
    // ═══════════════════════════════════════════════════════════════════
    if (contentReferences && contentReferences.length > 0) {
        text = applyContentReferences(text, contentReferences);
        // Also apply regex cleanup as safety for any missed tokens
        text = cleanWithRegexFallback(text);
    } else {
        // ═══════════════════════════════════════════════════════════════════
        // FALLBACK: Regex cleanup for older exports
        // ═══════════════════════════════════════════════════════════════════
        text = cleanWithRegexFallback(text);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Common cleanup (applies to all exports)
    // ═══════════════════════════════════════════════════════════════════

    // 1. Remove :::contextList ... ::: blocks (keep content inside)
    text = text.replace(/:::contextList\s*/gi, '');
    text = text.replace(/:::\s*/g, '');

    // 2. Remove 【{\"image_fetch\": \"...\"}】 commands
    text = text.replace(/【\s*\{[^】]*"image_fetch"[^】]*\}\s*】/g, '');

    // 3. Remove video markers: video...turn#search# (e.g., videoComo...turn0search6)
    text = text.replace(/video[^\s]*turn\d+search\d+/gi, '');

    // 4. Resolve Bracket Citations: 【17†source】 using safe_urls
    text = text.replace(/【(\d+)(?:†[^】]*)?】/g, (match, indexStr) => {
        const index = parseInt(indexStr, 10);

        // Try safe_urls first (Deep Research)
        if (safeUrls && safeUrls[index]) {
            const url = safeUrls[index];
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

    // 5. Clean up excessive whitespace from removals
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/  +/g, ' ');

    return text.trim();
}

/**
 * Applies content_references substitutions from OpenAI metadata.
 * This is the OFFICIAL way to resolve ChatGPT tokens.
 * 
 * Each reference contains:
 * - matched_text: The exact token in the text (e.g., "citeturn0view0")
 * - alt: What to replace it with (e.g., "([OpenAI](url))")
 * - type: The reference type (grouped_webpages, alt_text, hidden, image_group)
 */
function applyContentReferences(text, refs) {
    if (!refs || !Array.isArray(refs) || refs.length === 0) return text;

    // Sort by start_idx descending to replace from end to start
    // This prevents index shifting issues
    const sortedRefs = [...refs].sort((a, b) => (b.start_idx || 0) - (a.start_idx || 0));

    for (const ref of sortedRefs) {
        const matchedText = ref.matched_text;
        if (!matchedText) continue;

        let replacement = '';

        switch (ref.type) {
            case 'hidden':
                // Remove completely (entity_metadata, etc.)
                replacement = '';
                break;

            case 'alt_text':
                // Entity references: just use the alt text
                replacement = ref.alt || '';
                break;

            case 'grouped_webpages':
                // Citation references: use alt or build from items
                if (ref.alt) {
                    replacement = ref.alt;
                } else if (ref.items && ref.items.length > 0) {
                    const item = ref.items[0];
                    replacement = item.url ? ` ([${item.attribution || 'Source'}](${item.url}))` : '';
                }
                break;

            case 'image_group':
                // Image groups: render as HTML gallery container
                if (ref.images && ref.images.length > 0) {
                    const validImages = ref.images.filter(img => img.image_result?.content_url);

                    if (validImages.length > 0) {
                        const galleryClass = validImages.length === 1 ? 'image-gallery single-image' : 'image-gallery';
                        const imageMarkdown = validImages
                            .map(img => {
                                const url = img.image_result.content_url;
                                const title = img.image_result.title || 'Image';
                                return `![${title}](${url})`;
                            })
                            .join('\n\n');

                        // Wrap in gallery div for styling (will be rendered as HTML)
                        replacement = `\n\n${imageMarkdown}\n\n`;
                    } else {
                        replacement = ref.alt || '';
                    }
                } else if (ref.alt) {
                    replacement = ref.alt;
                }
                break;

            case 'sources_footnote':
                // Footer sources: remove or keep minimal
                replacement = '';
                break;

            default:
                // Unknown type: use alt if available, or remove
                replacement = ref.alt || '';
        }

        // Replace the matched text
        // Use start_idx and end_idx for precision if available
        if (typeof ref.start_idx === 'number' && typeof ref.end_idx === 'number') {
            const before = text.substring(0, ref.start_idx);
            const after = text.substring(ref.end_idx);
            text = before + replacement + after;
        } else {
            // Fallback: simple string replace (first occurrence only)
            text = text.replace(matchedText, replacement);
        }
    }

    return text;
}

/**
 * Regex fallback for older ChatGPT exports without content_references.
 * Less accurate but works for basic cleanup.
 */
function cleanWithRegexFallback(text) {
    // 1. Remove citeturn markers: citeturn0view0, citeturn1search3, etc.
    text = text.replace(/\s*(?:cite)?turn\d+(?:view|search)\d+\s*/gi, ' ');

    // 2. Replace entity["type","name",n] → extracted name
    //    Handles escaped quotes inside: entity[\"software\",\"ChatGPT\",0]
    text = text.replace(/entity\[([^\]]+)\]/g, (match, content) => {
        try {
            // Handle both escaped and unescaped quotes
            const cleanContent = content.replace(/\\"/g, '"');
            const parsed = JSON.parse('[' + cleanContent + ']');
            if (Array.isArray(parsed) && parsed.length >= 2) {
                return parsed[1]; // Return the name (second element)
            }
            return '';
        } catch (e) {
            // Fallback: try to extract name manually
            const nameMatch = content.match(/["\"]([^"\"]+)["\"]/g);
            if (nameMatch && nameMatch.length >= 2) {
                return nameMatch[1].replace(/["\\"]/g, '');
            }
            return '';
        }
    });

    // 3. Remove entity_metadata[...] completely (can have nested content)
    text = text.replace(/entity_metadata\[[^\]]*\]/g, '');

    // 4. Remove image_group{...} with nested JSON
    //    This regex matches from image_group{ until the matching closing }
    text = text.replace(/image_group\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');

    // 4b. Fallback for complex nested JSON - greedy match to end of line
    text = text.replace(/image_group\{.*?\}(?:\s*\})?/g, '');

    // 5. Remove residual turn markers
    text = text.replace(/\s*(?:cite)?turn\d+search\d+\s*/gi, ' ');

    // 6. Remove any remaining malformed entity patterns
    text = text.replace(/entity\[[^\]]*\]/g, '');

    // 7. Remove any remaining image_group with simple pattern
    text = text.replace(/image_group\s*\{[^}]+/g, '');

    return text;
}
