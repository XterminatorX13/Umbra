/**
 * Platform Identity Constants
 * Visual identity, colors, logos and metadata for each AI platform
 */

export const PLATFORMS = {
  chatgpt: {
    name: 'ChatGPT',
    company: 'OpenAI',
    icon: '🤖',
    color: '#10A37F',
    colorDark: '#0D8A6A',
    gradient: 'linear-gradient(135deg, #10A37F, #0D8A6A)',
    bgSubtle: 'rgba(16, 163, 127, 0.12)',
    borderColor: 'rgba(16, 163, 127, 0.3)',
    assistantLabel: 'ChatGPT',
    userLabel: 'Você',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>`,
  },
  gemini: {
    name: 'Gemini',
    company: 'Google',
    icon: '✨',
    color: '#4285F4',
    colorDark: '#3367D6',
    gradient: 'linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)',
    bgSubtle: 'rgba(66, 133, 244, 0.12)',
    borderColor: 'rgba(66, 133, 244, 0.3)',
    assistantLabel: 'Gemini',
    userLabel: 'Você',
    svg: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 24C12 24 12 12 24 12C12 12 12 0 12 0C12 0 12 12 0 12C12 12 12 24 12 24Z" fill="url(#gemini-grad)"/><defs><linearGradient id="gemini-grad" x1="0" y1="0" x2="24" y2="24"><stop stop-color="#4285F4"/><stop offset="0.5" stop-color="#9B72CB"/><stop offset="1" stop-color="#D96570"/></linearGradient></defs></svg>`,
  },
  claude: {
    name: 'Claude',
    company: 'Anthropic',
    icon: '🧡',
    color: '#D97757',
    colorDark: '#C4612E',
    gradient: 'linear-gradient(135deg, #D97757, #C4612E)',
    bgSubtle: 'rgba(217, 119, 87, 0.12)',
    borderColor: 'rgba(217, 119, 87, 0.3)',
    assistantLabel: 'Claude',
    userLabel: 'Você',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.957 4.386l-5.08 15.228h3.353L18.31 4.386h-3.353zM5.69 4.386L2 19.614h3.353l3.69-15.228H5.69zm8.564 0l-3.69 15.228h3.354l3.69-15.228h-3.354z"/></svg>`,
  },
  grok: {
    name: 'Grok',
    company: 'xAI',
    icon: '⚡',
    color: '#F5F5F5',
    colorDark: '#CCCCCC',
    gradient: 'linear-gradient(135deg, #E8E8E8, #B0B0B0)',
    bgSubtle: 'rgba(245, 245, 245, 0.12)',
    borderColor: 'rgba(245, 245, 245, 0.3)',
    assistantLabel: 'Grok',
    userLabel: 'Você',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.04 4h4.378l5.622 8.072L17.618 4h4.378L13.92 15.428 22 20h-4.378l-5.622-8.072L6.378 20H2l8.076-11.572L2.04 4z"/></svg>`,
  },
};

/**
 * Get platform config by key, with fallback
 */
export function getPlatform(key) {
  return PLATFORMS[key] || PLATFORMS.chatgpt;
}

/**
 * Get all platform keys
 */
export function getPlatformKeys() {
  return Object.keys(PLATFORMS);
}
