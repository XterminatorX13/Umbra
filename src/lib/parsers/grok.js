/**
 * Grok Parser
 * Parses xAI's Grok export format (JSON)
 * 
 * Expected structure (based on community reports):
 * {
 *   "conversations": [
 *     {
 *       "id": "...",
 *       "title": "Conversation Title",
 *       "create_time": "2025-01-01T00:00:00Z" | epoch,
 *       "messages": [
 *         {
 *           "id": "...",
 *           "role": "user" | "assistant",
 *           "content": "message text",
 *           "timestamp": "2025-01-01T00:00:00Z" | epoch
 *         }
 *       ]
 *     }
 *   ]
 * }
 * 
 * Alternative flat format:
 * [
 *   {
 *     "id": "...",
 *     "title": "...",
 *     "messages": [...]
 *   }
 * ]
 */

const PLATFORM = 'grok';

/**
 * Detect if the data is a Grok export
 */
export function detect(data) {
  if (!data) return false;
  
  // Check for Grok-specific markers
  const checkConv = (conv) => {
    if (!conv.messages || !Array.isArray(conv.messages)) return false;
    // Grok messages have simple role + content (no mapping tree like ChatGPT)
    return conv.messages.some(msg => 
      msg.content !== undefined && 
      (msg.role === 'user' || msg.role === 'assistant') &&
      !msg.author // ChatGPT uses author.role, Grok uses role directly
    );
  };
  
  if (Array.isArray(data)) {
    return data.some(checkConv);
  }
  
  if (data.conversations && Array.isArray(data.conversations)) {
    return data.conversations.some(checkConv);
  }
  
  return false;
}

/**
 * Parse Grok export data into normalized conversations
 */
export function parse(data) {
  let rawConversations = [];
  
  if (Array.isArray(data)) {
    rawConversations = data;
  } else if (data.conversations && Array.isArray(data.conversations)) {
    rawConversations = data.conversations;
  }
  
  return rawConversations
    .filter(conv => conv.messages && conv.messages.length > 0)
    .map(conv => normalizeConversation(conv));
}

function normalizeConversation(conv) {
  const title = conv.title || '(Sem título)';
  const createTime = parseTimestamp(conv.create_time || conv.created_at);
  const updateTime = parseTimestamp(conv.update_time || conv.updated_at);
  
  const messages = (conv.messages || [])
    .filter(msg => msg.content && msg.content.trim())
    .map(msg => ({
      id: msg.id || crypto.randomUUID(),
      role: msg.role || 'unknown',
      textMarkdown: msg.content,
      textPlain: msg.content,
      timestamp: parseTimestamp(msg.timestamp || msg.created_at) || createTime || 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
  
  const searchText = (title + ' ' + messages.map(m => m.textPlain).join(' ')).toLowerCase();
  const id = conv.id || `grok_${title}@@${createTime}`;
  
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

/**
 * Parse various timestamp formats to epoch seconds
 */
function parseTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') {
    // Already epoch — check if milliseconds or seconds
    return ts > 2000000000 ? ts / 1000 : ts;
  }
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d.getTime() / 1000;
  }
  return null;
}
