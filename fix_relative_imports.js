import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, callback);
        } else if (fullPath.endsWith('.svelte')) {
            callback(fullPath);
        }
    });
}

walk('c:/.projects/Umbra/src/lib', (file) => {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;
    
    const replacements = [
        { from: /from\s+["']\.\.\/cn(\.js)?["']/g, to: 'from "$lib/cn.ts"' },
        { from: /from\s+["']\.\.\/\.\.\/utils\/data\.js["']/g, to: 'from "$lib/utils/data.js"' },
        { from: /from\s+["']\.\.\/\.\.\/actions\/portal\.js["']/g, to: 'from "$lib/actions/portal.js"' },
        { from: /from\s+["']\.\.\/platforms\.js["']/g, to: 'from "$lib/platforms.js"' },
    ];
    
    replacements.forEach(r => {
        if (content.match(r.from)) {
            content = content.replace(r.from, r.to);
            changed = true;
        }
    });
    
    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Fixed ${file}`);
    }
});
