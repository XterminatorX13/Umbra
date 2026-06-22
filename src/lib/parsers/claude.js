/**
 * Claude Parser
 * Parses Anthropic's conversations.json export format
 * 
 * Expected structure:
 * [
 *   {
 *     "uuid": "...",
 *     "name": "Conversation Title",
 *     "created_at": "2025-01-01T00:00:00Z",
 *     "updated_at": "2025-01-01T01:00:00Z",
 *     "chat_messages": [
 *       {
 *         "uuid": "...",
 *         "text": "message content",
 *         "sender": "human" | "assistant",
 *         "created_at": "2025-01-01T00:00:00Z",
 *         "attachments": [],
 *         "files": []
 *       }
 *     ]
 *   }
 * ]
 */

const PLATFORM = 'claude';

/**
 * Detect if the data is a Claude export
 */
export function detect(data) {
  if (!data) return false;
  
  // Array of conversations with chat_messages
  if (Array.isArray(data)) {
    return data.some(item => 
      item.chat_messages && Array.isArray(item.chat_messages) &&
      item.chat_messages.some(msg => msg.sender === 'human' || msg.sender === 'assistant')
    );
  }
  
  // Single conversation
  if (data.chat_messages && Array.isArray(data.chat_messages)) {
    return true;
  }
  
  return false;
}

/**
 * Parse Claude export data into normalized conversations
 */
export function parse(data) {
  let rawConversations = [];
  
  if (Array.isArray(data)) {
    rawConversations = data;
  } else if (data.chat_messages) {
    rawConversations = [data];
  }
  
  return rawConversations
    .filter(conv => conv.chat_messages && conv.chat_messages.length > 0)
    .map(conv => normalizeConversation(conv));
}

function normalizeConversation(conv) {
  const title = conv.name || '(Sem título)';
  const createTime = conv.created_at ? new Date(conv.created_at).getTime() / 1000 : null;
  const updateTime = conv.updated_at ? new Date(conv.updated_at).getTime() / 1000 : null;
  
  const messages = (conv.chat_messages || [])
    .filter(msg => msg.text && msg.text.trim())
    .map(msg => {
      const ts = msg.created_at ? new Date(msg.created_at).getTime() / 1000 : (createTime || 0);
      return {
        id: msg.uuid || crypto.randomUUID(),
        role: mapSenderToRole(msg.sender),
        textMarkdown: msg.text,
        textPlain: msg.text,
        timestamp: ts,
        attachments: msg.attachments || msg.files || [],
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
  
  const searchText = (title + ' ' + messages.map(m => m.textPlain).join(' ')).toLowerCase();
  const id = conv.uuid || `claude_${title}@@${createTime}`;
  
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

function mapSenderToRole(sender) {
  switch (sender) {
    case 'human': return 'user';
    case 'assistant': return 'assistant';
    default: return sender || 'unknown';
  }
}
