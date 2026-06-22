/**
 * ChatGPT Parser
 * Parses OpenAI's conversations.json export format (tree-based mapping structure)
 */

import { normalizeConversation as advancedNormalize } from '../utils/data.js';

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
  
  return rawConversations.map(conv => {
      const normalized = advancedNormalize(conv);
      normalized.platform = PLATFORM;
      return normalized;
  });
}
