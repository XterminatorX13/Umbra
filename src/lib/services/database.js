/**
 * Dexie Database - IndexedDB wrapper for large data storage
 * Solves localStorage quota limitations
 */
import Dexie from 'dexie';

// Create database
export const db = new Dexie('ChatGPT_PKM');

// Define schema
db.version(1).stores({
    // Conversations table - stores full conversation data
    conversations: 'id, title, createTime, updateTime',
    // Metadata table - stores user metadata (folders, favorites, tags, notes, semantic relations)
    metadata: 'id, folder, favorite, *tags, parent, *children, *lateral'
});

/**
 * Save all conversations
 * @param {Array} conversations - Array of conversation objects
 */
export async function saveConversations(conversations) {
    try {
        const toSave = conversations.map(conv => ({
            id: conv.id || conv.conversation_id,
            title: conv.title,
            createTime: conv.create_time || conv.createTime,
            updateTime: conv.update_time || conv.updateTime,
            data: conv.raw || conv // Store full conversation
        }));
        await db.conversations.bulkPut(toSave);
        console.log(`💾 Saved ${toSave.length} conversations to IndexedDB`);
        return true;
    } catch (error) {
        console.error('Error saving conversations:', error);
        throw error;
    }
}

/**
 * Load all conversations
 * @returns {Array} Array of conversation objects
 */
export async function loadConversations() {
    try {
        const rows = await db.conversations.toArray();
        console.log(`📂 Loaded ${rows.length} conversations from IndexedDB`);
        return rows.map(row => row.data);
    } catch (error) {
        console.error('Error loading conversations:', error);
        return [];
    }
}

/**
 * Save metadata for a conversation
 * @param {string} id - Conversation ID
 * @param {Object} meta - Metadata object
 */
export async function saveMetadata(id, meta) {
    try {
        await db.metadata.put({ id, ...meta });
    } catch (error) {
        console.error('Error saving metadata:', error);
    }
}

/**
 * Load all metadata
 * @returns {Object} Map of id -> metadata
 */
export async function loadAllMetadata() {
    try {
        const rows = await db.metadata.toArray();
        const result = {};
        rows.forEach(row => {
            const { id, ...meta } = row;
            result[id] = meta;
        });
        console.log(`📂 Loaded ${rows.length} metadata entries from IndexedDB`);
        return result;
    } catch (error) {
        console.error('Error loading metadata:', error);
        return {};
    }
}

/**
 * Bulk save all metadata
 * @param {Object} metadata - Map of id -> metadata
 */
export async function saveAllMetadata(metadata) {
    try {
        const entries = Object.entries(metadata).map(([id, meta]) => ({
            id,
            ...meta
        }));
        await db.metadata.bulkPut(entries);
        console.log(`💾 Saved ${entries.length} metadata entries to IndexedDB`);
    } catch (error) {
        console.error('Error saving metadata:', error);
    }
}

/**
 * Migrate from localStorage to IndexedDB
 * Call this once on startup to migrate existing data
 */
export async function migrateFromLocalStorage() {
    try {
        // Check if migration needed
        const count = await db.conversations.count();
        if (count > 0) {
            console.log('✅ IndexedDB already has data, skipping migration');
            return false;
        }

        // Migrate conversations
        const savedConvs = localStorage.getItem('auto-saved-conversations');
        if (savedConvs) {
            const convs = JSON.parse(savedConvs);
            if (Array.isArray(convs) && convs.length > 0) {
                const toSave = convs.map(conv => ({
                    id: conv.id || conv.conversation_id || crypto.randomUUID(),
                    title: conv.title || '(Sem título)',
                    createTime: conv.create_time,
                    updateTime: conv.update_time,
                    data: conv
                }));
                await db.conversations.bulkPut(toSave);
                console.log(`✅ Migrated ${toSave.length} conversations to IndexedDB`);
            }
        }

        // Migrate metadata
        const savedMeta = localStorage.getItem('chatgpt-pkm-metadata');
        if (savedMeta) {
            const meta = JSON.parse(savedMeta);
            const entries = Object.entries(meta).map(([id, m]) => ({ id, ...m }));
            if (entries.length > 0) {
                await db.metadata.bulkPut(entries);
                console.log(`✅ Migrated ${entries.length} metadata entries to IndexedDB`);
            }
        }

        // Clear old localStorage after successful migration
        // localStorage.removeItem('auto-saved-conversations'); // Uncomment after testing
        console.log('🎉 Migration complete! (localStorage preserved for safety)');
        return true;
    } catch (error) {
        console.error('Migration error:', error);
        return false;
    }
}

/**
 * Get database stats
 */
export async function getDbStats() {
    const convCount = await db.conversations.count();
    const metaCount = await db.metadata.count();
    return { conversations: convCount, metadata: metaCount };
}

export default db;
