/**
 * ChatGPT Parser
 * Parses OpenAI's conversations.json export format (tree-based mapping structure)
 */

const PLATFORM = 'chatgpt';

/**
 * Detect if the data is a ChatGPT export
 */
export function detect(data) {
  if (!data) return false;
  
  // Single conversation with mapping
  if (data.mapping && typeof data.mapping === 'object') return true;
  
  // Array of conversations
  if (Array.isArray(data)) {
    return data.some(item => item.mapping && typeof item.mapping === 'object');
  }
  
  // Wrapper object
  if (data.conversations && Array.isArray(data.conversations)) {
    return data.conversations.some(item => item.mapping);
  }
  
  return false;
}

/**
 * Parse ChatGPT export data into normalized conversations
 */
export function parse(data) {
  let rawConversations = [];
  
  if (Array.isArray(data)) {
    rawConversations = data;
  } else if (data.conversations && Array.isArray(data.conversations)) {
    rawConversations = data.conversations;
  } else if (data.mapping) {
    rawConversations = [data];
  }
  
  return rawConversations.map(conv => normalizeConversation(conv));
}

function normalizeConversation(conv) {
  const title = conv.title || '(Sem título)';
  const createTime = conv.create_time || null;
  const updateTime = conv.update_time || null;
  const mapping = conv.mapping || {};
  const messages = extractMessagesFromMapping(mapping, createTime);
  const searchText = (title + ' ' + messages.map(m => m.textPlain).join(' ')).toLowerCase();
  
  const id = conv.id || conv.conversation_id || `chatgpt_${title}@@${createTime}`;
  
  return {
    id,
    platform: PLATFORM,
    raw: conv,
    title,
    createTime,
    updateTime,
    messages,
    searchText,
  };
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
      timestamp: ts,
    });
  }

  msgs.sort((a, b) => a.timestamp - b.timestamp);
  return msgs;
}
