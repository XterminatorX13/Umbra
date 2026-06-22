/**
 * Gemini HTML Parser
 * Parses Google Takeout "Minha atividade" HTML export for Gemini Apps
 * 
 * The HTML structure uses Material Design Lite classes:
 * Each interaction is a div.outer-cell containing:
 *   - div.header-cell → "Gemini Apps"
 *   - div.content-cell (6-col) → "Prompted [USER TEXT]\n[DATE]\n[RESPONSE HTML]"
 *   - div.content-cell (12-col, caption) → "Produtos: Gemini Apps"
 * 
 * Messages are NOT grouped by conversation — each block is an isolated interaction.
 * This parser groups them by temporal proximity.
 */

const PLATFORM = 'gemini';

// Time threshold for grouping messages into "conversations" (5 minutes)
const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Detect if the content is a Gemini Takeout HTML file
 */
export function detectHTML(text) {
  if (typeof text !== 'string') return false;
  return (
    text.includes('Gemini Apps') &&
    text.includes('outer-cell') &&
    text.includes('Prompted')
  );
}

/**
 * Parse Gemini Takeout HTML into normalized conversations
 * Uses DOMParser (browser-native) for robust HTML parsing
 * 
 * @param {string} htmlText - Raw HTML content
 * @param {function} onProgress - Optional progress callback(percent)
 * @returns {Array} Normalized conversation objects
 */
export function parseHTML(htmlText, onProgress = null) {
  // Parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  
  // Find all outer-cell blocks (each is one interaction)
  const blocks = doc.querySelectorAll('.outer-cell');
  const interactions = [];
  
  for (let i = 0; i < blocks.length; i++) {
    if (onProgress && i % 50 === 0) {
      onProgress(Math.round((i / blocks.length) * 80));
    }
    
    const block = blocks[i];
    const interaction = parseBlock(block);
    if (interaction) {
      interactions.push(interaction);
    }
  }
  
  // Sort by timestamp (oldest first)
  interactions.sort((a, b) => a.timestamp - b.timestamp);
  
  if (onProgress) onProgress(85);
  
  // Group into "conversations" by temporal proximity
  const conversations = groupIntoConversations(interactions);
  
  if (onProgress) onProgress(100);
  
  return conversations;
}

/**
 * Parse a single outer-cell block into an interaction object
 */
function parseBlock(block) {
  // Find the main content cell (6-col, body-1)
  const contentCells = block.querySelectorAll('.content-cell.mdl-cell--6-col.mdl-typography--body-1');
  if (contentCells.length === 0) return null;
  
  const contentCell = contentCells[0];
  const fullText = contentCell.textContent || '';
  const fullHtml = contentCell.innerHTML || '';
  
  // Check if this is a Gemini interaction
  if (!fullText.includes('Prompted')) return null;
  
  // Extract prompt text: everything between "Prompted " and the date line
  let promptText = '';
  let responseText = '';
  let responseHtml = '';
  let timestamp = null;
  
  // The content structure is:
  // "Prompted [text]<br>[DATE]<br>[RESPONSE HTML]"
  // We need to carefully parse this
  
  const htmlParts = fullHtml.split(/<br\s*\/?>/i);
  
  if (htmlParts.length >= 1) {
    // First part contains "Prompted [text]"
    const firstPart = htmlParts[0].trim();
    if (firstPart.startsWith('Prompted')) {
      promptText = stripHtml(firstPart.replace(/^Prompted\s*/i, '')).trim();
    }
  }
  
  if (htmlParts.length >= 2) {
    // Second part contains the date
    const datePart = stripHtml(htmlParts[1]).trim();
    timestamp = parseBrazilianDate(datePart);
  }
  
  if (htmlParts.length >= 3) {
    // Everything after the date is the response
    responseHtml = htmlParts.slice(2).join('<br>');
    responseText = stripHtml(responseHtml).trim();
  }
  
  if (!promptText && !responseText) return null;
  
  return {
    promptText,
    responseText,
    responseHtml,
    timestamp: timestamp || 0,
  };
}

/**
 * Parse Brazilian date format "DD de MMM. de YYYY, HH:MM:SS BRT"
 */
function parseBrazilianDate(dateStr) {
  if (!dateStr) return null;
  
  const months = {
    'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
  };
  
  // Match: "20 de abr. de 2026, 23:35:26 BRT"
  const match = dateStr.match(
    /(\d{1,2})\s+de\s+(\w{3})\.?\s+de\s+(\d{4}),?\s+(\d{2}):(\d{2}):(\d{2})/i
  );
  
  if (!match) {
    // Try parsing as ISO or generic date
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  
  const [, day, monthStr, year, hour, min, sec] = match;
  const month = months[monthStr.toLowerCase()];
  
  if (month === undefined) return null;
  
  // BRT is UTC-3
  const date = new Date(
    parseInt(year), month, parseInt(day),
    parseInt(hour), parseInt(min), parseInt(sec)
  );
  
  return date.getTime();
}

/**
 * Strip HTML tags to get plain text
 */
function stripHtml(html) {
  if (!html) return '';
  // Use a temporary element to strip tags properly
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Convert HTML response to Markdown (simplified)
 */
function htmlToMarkdown(html) {
  if (!html) return '';
  
  let md = html;
  
  // Bold
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  
  // Italic
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  
  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
  
  // Lists
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');
  
  // Paragraphs and breaks
  md = md.replace(/<\/p>/gi, '\n\n');
  md = md.replace(/<p[^>]*>/gi, '');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  
  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n');
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&emsp;/g, '  ');
  md = md.replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  
  return md.trim();
}

/**
 * Group isolated interactions into "conversations" by temporal proximity
 */
function groupIntoConversations(interactions) {
  if (interactions.length === 0) return [];
  
  const groups = [];
  let currentGroup = [interactions[0]];
  
  for (let i = 1; i < interactions.length; i++) {
    const prev = interactions[i - 1];
    const curr = interactions[i];
    const timeDiff = Math.abs(curr.timestamp - prev.timestamp);
    
    if (timeDiff <= GROUP_THRESHOLD_MS) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  groups.push(currentGroup);
  
  // Convert groups to normalized conversations
  return groups.map((group, idx) => {
    const firstInteraction = group[0];
    const lastInteraction = group[group.length - 1];
    
    // Build title from first prompt (truncated)
    const firstPrompt = firstInteraction.promptText || '';
    const title = firstPrompt.length > 80 
      ? firstPrompt.substring(0, 77) + '...'
      : firstPrompt || `Gemini ${new Date(firstInteraction.timestamp).toLocaleDateString('pt-BR')}`;
    
    // Build messages array (prompt → response pairs)
    const messages = [];
    for (const interaction of group) {
      if (interaction.promptText) {
        messages.push({
          id: `gemini_user_${interaction.timestamp}_${Math.random().toString(36).substr(2, 6)}`,
          role: 'user',
          textMarkdown: interaction.promptText,
          textPlain: interaction.promptText,
          timestamp: interaction.timestamp / 1000, // Convert to seconds
        });
      }
      if (interaction.responseText) {
        const md = htmlToMarkdown(interaction.responseHtml) || interaction.responseText;
        messages.push({
          id: `gemini_asst_${interaction.timestamp}_${Math.random().toString(36).substr(2, 6)}`,
          role: 'assistant',
          textMarkdown: md,
          textPlain: interaction.responseText,
          timestamp: (interaction.timestamp + 1) / 1000, // +1ms to keep order
        });
      }
    }
    
    const createTime = firstInteraction.timestamp / 1000;
    const updateTime = lastInteraction.timestamp / 1000;
    const searchText = (title + ' ' + messages.map(m => m.textPlain).join(' ')).toLowerCase();
    const id = `gemini_${createTime}_${idx}`;
    
    return {
      id,
      platform: PLATFORM,
      raw: { interactions: group },
      title,
      createTime,
      updateTime,
      messages,
      searchText,
    };
  });
}
