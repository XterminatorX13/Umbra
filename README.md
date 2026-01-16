# Aurora PKM - Build Features Log

> "Second Active Mind."

Currently implemented features in the **Aurora PKM** prototype, running on `Svelte + Dexie (IndexedDB) + Tailwind`.

## 🏗️ Core Architecture (Skeleton)
- **Local-First Persistence**: All data stored in `IndexedDB` via `Dexie.js`. No cloud dependency.
- **Import System**: 
  - Drag & Drop `conversations.json` (ChatGPT Export).
  - Web Worker processing for large files (avoids UI freeze).
- **Virtual Scrolling**: Efficient rendering of thousands of conversations (`Sidebar` & `MainArea`).

## 🎨 Interface (Dark Aurora V3)
- **3-Column Layout**:
  - **Sidebar**: Folders, History, Search.
  - **Main Area**: Conversation List / Gallery / Grid.
  - **Chat View**: Message renderer + Inspector.
- **Visuals**:
  - Custom scrollbars.
  - Glassmorphism effects (without heavy `backdrop-filter` for performance).
  - "Neon Violet" accent system.

## 🛠️ Advanced Tools (Implemented)
### 1. Command Palette (`Ctrl+K`)
- Raycast-style floating search.
- Fuzzy search for conversation titles.
- Keyboard navigation (Up/Down/Enter).

### 2. Inspector & Filters
- **Filter Panel**:
  - Date Range picker.
  - Model Badges (`GPT-4`, `o1`).
  - Feature Flags (`Valid Image`, `Web Search`, `Deep Research`).
- **Inspector Panel** (Right Sidebar):
  - Metadata view (Model, Date, Tokens).
  - Feature detection tags.

### 3. Organization
- **Folders**: Drag & Drop or Context Menu organization.
- **Favorites**: "Star" system for quick access.
- **Bulk Actions**: Select multiple chats → Move/Delete/Export.

### 4. Chat Experience
- **Markdown Rendering**: Full support for code blocks, tables, and LaTeX equations.
- **Artifacts**: Parsing of specific ChatGPT artifact tags.
- **Message Selection**: Copy/Share individual messages.

## 🚀 Upcoming (Phase 2 & 3)
- **Structure**: Wiki-Links, Local Graph, Semantic Compass.
- **Intelligence**: Auto-Tagging, DDC Auto-Categorization.
- **UI**: Optimistic Updates, Generative Widgets.
