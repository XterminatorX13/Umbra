# Aurora Chat Manager - Build Features Log

> "Second Active Mind."

Currently implemented features in the **Aurora Chat Manager**, running on `Svelte + Dexie (IndexedDB) + Tailwind`.

## 🧠 Version 1.1 - "The Thinking Update"
Recent additions focused on supporting the next generation of reasoning models:

- **Reasoning Engine Tracking**:
  - Automatically detects **o1, o3, gpt-5-thinking** models.
  - **Time Tracking**: Displays exactly how long the model thought directly in the header (e.g., `🧠 Pensou por 2m 15s`).
  - **Exclusive Filter**: Screen out standard chats to focus on deep reasoning sessions with the new Brain filter.

- **Deep Research Integration**:
  - Detection and badges for **Deep Research** sessions (🔬).
  - Dedicated filters to find research-heavy conversations.

- **Dynamic Model Intelligence**:
  - **Auto (Dynamic Mode)**: Resolves the underlying model slug even when standard export says "Auto".
  - **Future-Proofing**: Automatically formats new model versions (e.g., `GPT-5.2`, `GPT-5.3`) without needing code updates.

---

## 🏗️ Core Architecture
- **Local-First Persistence**: All data stored in `IndexedDB` via `Dexie.js`. No cloud dependency.
- **Smart Import System**: 
  - **Raw Scan**: Deep scans message metadata to find tools missed by standard parsers (Canvas, Code Interpreter).
  - **Deduplication**: Smartly merges new conversations while preserving local folders/tags.
- **Virtual Scrolling**: Efficient rendering of thousands of conversations.

## 🎨 Interface (Dark Aurora V3)
- **3-Column Layout**: Sidebar (Filters), Main Area (Grid/List), Chat View.
- **Visuals**: "Neon Violet" accent system, glassmorphism, and custom scrollbars.
- **Responsive**: Dynamic sidebar collapsing (`B` hotkey).

## 🛠️ Advanced Tools
### 1. Powerful Filters
- **Interactive Panel**:
  - Feature Toggles: `Reasoning` 🧠, `Deep Research` 🔬, `Canvas` 🎨, `Code` 💻, `Web` 🌐, `Image` 🖼️.
  - **Model Picker**: Select specific models (`GPT-4`, `Claude 3.5`, etc.).
  - **Date Ranges**: Calendar picker for precise history navigation.
- **Active Badges**: Quick view of active filters in the sidebar.

### 2. Chat Experience
- **Rich Header**: Shows conversation title, model used (with dynamic naming), message count, date, and reasoning time.
- **Formatting**: Full Markdown support, code blocks with syntax highlighting.
- **Artifacts**: Support for parsing and displaying AI artifacts.

### 3. Organization
- **Folders**: Drag & Drop or Context Menu organization.
- **Favorites**: "Star" system for quick access.
- **Bulk Actions**: Select multiple chats → Move/Delete/Export.

## 🚀 Upcoming
- **Semantic Compass**: Relationships between conversations.
- **Wiki-Links**: Bi-directional linking between chats.
- **Local Graph**: Visualizing connections.
