const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\.projects\\Umbra\\src';

const specificMap = {
    'ImportDialog.svelte': '$lib/components/importer/ImportDialog.svelte',
    'ExportGuide.svelte': '$lib/components/importer/ExportGuide.svelte',
    'PlatformBadge.svelte': '$lib/components/chat/PlatformBadge.svelte',
    'CategoryDropdown.svelte': '$lib/components/importer/CategoryDropdown.svelte',
    'DebugPanel.svelte': '$lib/components/importer/DebugPanel.svelte',
    'Sidebar.svelte': '$lib/components/layout/Sidebar.svelte',
    'MainArea.svelte': '$lib/components/layout/MainArea.svelte',
    'Calendar.svelte': '$lib/components/layout/Calendar.svelte',
    'CommandPalette.svelte': '$lib/components/layout/CommandPalette.svelte',
    'ChatView.svelte': '$lib/components/chat/ChatView.svelte',
    'FilterPanel.svelte': '$lib/components/filters/FilterPanel.svelte',
    'SourcesPanel.svelte': '$lib/components/filters/SourcesPanel.svelte'
};

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

walkDir(srcDir, (filePath) => {
    if (filePath.endsWith('.svelte') || filePath.endsWith('.js') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // Matches: import ComponentName from "./components/ComponentName.svelte"
        // Also matches: import ComponentName from "../components/ComponentName.svelte"
        // And even just: import { getConvKey } from "./utils"; (but we only want .svelte replacements here or let's be careful)
        
        // Let's replace any import ending in .svelte that has a relative path
        const regex = /from\s+['"]([\.\/]+)([\w-]+)\.svelte['"]/g;
        
        content = content.replace(regex, (match, p1, filename) => {
            const svelteFile = filename + '.svelte';
            let newPath = '';
            
            if (specificMap[svelteFile]) {
                newPath = specificMap[svelteFile];
            } else {
                newPath = `$lib/components/base/${svelteFile}`;
            }
            changed = true;
            return `from "${newPath}"`;
        });

        // Some imports in App.svelte might be like import Sidebar from "./lib/Sidebar.svelte"
        const appRegex = /from\s+['"]\.\/lib\/([\w-]+)\.svelte['"]/g;
        content = content.replace(appRegex, (match, filename) => {
            const svelteFile = filename + '.svelte';
            if (specificMap[svelteFile]) {
                changed = true;
                return `from "${specificMap[svelteFile]}"`;
            }
            return match;
        });

        // Utils imports like "./utils" -> "$lib/utils" inside layout/chat components
        // Only if they are relative imports going up like "../utils"
        const utilsRegex = /from\s+['"][\.\/]+utils['"]/g;
        content = content.replace(utilsRegex, (match) => {
            changed = true;
            return `from "$lib/utils"`;
        });
        
        const utilsJsRegex = /from\s+['"][\.\/]+utils\.js['"]/g;
        content = content.replace(utilsJsRegex, (match) => {
            changed = true;
            return `from "$lib/utils.js"`;
        });

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated imports in ${filePath}`);
        }
    }
});
