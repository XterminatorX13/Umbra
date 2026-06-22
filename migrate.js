const fs = require('fs');
const path = require('path');

const destSrc = 'c:\\.projects\\Umbra\\src';
const destLib = path.join(destSrc, 'lib');
const proSrc = 'c:\\.projects\\Umbra-aurora-pro-ui\\src';
const uiSrc = 'c:\\.projects\\Umbra-aurora-ui\\src';

// Ensure component directories exist
const dirs = ['base', 'layout', 'chat', 'filters', 'importer'];
dirs.forEach(d => fs.mkdirSync(path.join(destLib, 'components', d), { recursive: true }));

// 1. Move functional components to importer & chat
const moveMap = {
    'ImportDialog.svelte': 'importer',
    'ExportGuide.svelte': 'importer',
    'PlatformBadge.svelte': 'chat'
};
Object.keys(moveMap).forEach(file => {
    const oldPath = path.join(destLib, 'components', file);
    const newPath = path.join(destLib, 'components', moveMap[file], file);
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);
});

// 2. Move remaining original generic components to base
const oldBaseFiles = fs.readdirSync(path.join(destLib, 'components')).filter(f => f.endsWith('.svelte'));
oldBaseFiles.forEach(f => {
    fs.renameSync(path.join(destLib, 'components', f), path.join(destLib, 'components', 'base', f));
});

// 3. Copy base UI components from aurora-pro-ui
const baseComponents = [
    "Badge.svelte", "Button.svelte", "Card.svelte", "Dialog.svelte", "DropdownMenu.svelte", 
    "Input.svelte", "Tabs.svelte", "Toast.svelte", "Tooltip.svelte", "VirtualList.svelte", 
    "Separator.svelte", "SparkBadge.svelte", "SpotlightInput.svelte", "BorderBeam.svelte", 
    "ShineBorder.svelte", "TextGradient.svelte", "GlitchButton.svelte", "EmptyState.svelte", 
    "InputModal.svelte", "MarkdownDemo.svelte", "RichTextEditor.svelte", "CategoryDropdown.svelte", "DebugPanel.svelte"
];
baseComponents.forEach(file => {
    const srcPath = path.join(proSrc, 'lib', 'components', file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(destLib, 'components', 'base', file));
    }
});

// 4. Copy Layout components
const layoutFiles = ['Calendar.svelte', 'CommandPalette.svelte'];
layoutFiles.forEach(file => {
    const srcPath = path.join(proSrc, 'lib', 'components', file);
    if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, path.join(destLib, 'components', 'layout', file));
});
fs.copyFileSync(path.join(proSrc, 'lib', 'Sidebar.svelte'), path.join(destLib, 'components', 'layout', 'Sidebar.svelte'));
fs.copyFileSync(path.join(proSrc, 'lib', 'MainArea.svelte'), path.join(destLib, 'components', 'layout', 'MainArea.svelte'));

// 5. Copy Chat components
fs.copyFileSync(path.join(proSrc, 'lib', 'ChatView.svelte'), path.join(destLib, 'components', 'chat', 'ChatView.svelte'));

// 6. Copy Filter Panel from aurora-ui
fs.copyFileSync(path.join(uiSrc, 'lib', 'components', 'features', 'FilterPanel.svelte'), path.join(destLib, 'components', 'filters', 'FilterPanel.svelte'));
fs.copyFileSync(path.join(proSrc, 'lib', 'components', 'SourcesPanel.svelte'), path.join(destLib, 'components', 'filters', 'SourcesPanel.svelte'));

// 7. Copy CSS and Config
fs.copyFileSync(path.join(proSrc, 'app.css'), path.join(destSrc, 'app.css'));
fs.copyFileSync('c:\\.projects\\Umbra-aurora-pro-ui\\tailwind.config.js', 'c:\\.projects\\Umbra\\tailwind.config.js');

console.log("File copy and organization complete.");
