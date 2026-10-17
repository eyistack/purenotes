# PureNotes

**A private, local-first Markdown workspace, code notebook, and personal knowledge base.**

**PureNotes** is a modernized, upgraded version of the original **DevNotes** site—retaining all of the original core functions while introducing a heavily upgraded UI and minor functional tweaks. Built as a fast, zero-dependency static web application, PureNotes pairs DevNotes' developer-focused editing, in-browser code execution, and client-side encryption with an overhauled Warm Amber & Obsidian design system, full mobile responsiveness, installable Progressive Web App (PWA) support, and hardened security and workflow refinements.

***Live Site:*** [https://cartmanager.pages.dev/](https://purenotes.pages.dev/)

---

> ### ⚠️ Project Disclaimer
> **This is strictly a non-commercial, educational hobby project.** 
> **All application architecture, user interface design, logic, and source code in this repository were completely generated using Artificial Intelligence (AI).** It is maintained solely for learning, personal experimentation, and prototyping purposes.

---

## What's New in PureNotes (Upgrades Over DevNotes)

PureNotes preserves the complete feature set and data compatibility of the original DevNotes workspace while delivering targeted visual and functional improvements:

- **Overhauled Warm Amber & Obsidian UI**: Replaces legacy blue and indigo accents with a high-contrast Warm Amber (`#f59e0b` / `#d97706`) and deep Slate/Obsidian (`#09090b` / `#111113`) palette across both dark and light themes.
- **Hardened Encryption Lifecycle**: Enforces strict session memory clearing whenever an encrypted note is closed or unfocused—requiring passphrase authentication on every reopen—and supports client-side passphrase decryption on shared links (`/s/[id]`).
- **Isolated Shared Note Reader (`/s/[id]`)**: Automatically hides the workspace sidebar, dashboard, and command palette when viewing a shared note URL, presenting a centered distraction-free reader with direct root navigation and theme switching.
- **Installable Offline-First PWA**: Includes a web app manifest (`manifest.json`) with native maskable vector icons, iOS Apple Touch Icon support, and an offline-first Service Worker (`sw.js`) that caches the core application shell.
- **Mobile-First Slide-Out Navigation**: Introduces a responsive off-canvas sidebar drawer (`0.3s ease` transition) triggered via a mobile header hamburger button, while preserving the collapsible icon-only rail on both mobile and desktop.
- **Unified Data & Backups Workflow**: Consolidates exports and multi-format imports (`.json`, `.md`, and `.txt`) inside the Settings modal with seamless backward compatibility for legacy DevNotes JSON exports and automatic ID deduplication.
- **Enhanced Card & Trash Controls**: Adds hover quick-action buttons (Duplicate, Pin, Favorite, Delete) to dashboard note cards alongside one-click **Empty Trash**, **Restore Note**, and **Delete Permanently** actions in the Trash view.

## Features

### Rich Markdown Editor & Workspace Modes
- **Multi-Tab Workspace**: Open, switch, and manage multiple notes simultaneously in a browser-style tab bar.
- **Four Viewing Modes**: Seamlessly toggle between **Write**, **Split-Pane**, **Preview**, and distraction-free **Zen Mode** (`Alt + Z`).
- **Interactive GFM Checklists**: Click task list checkboxes (`- [ ]` / `- [x]`) directly inside the rendered preview to update the underlying Markdown source in real time.
- **Slash Commands & Formatting Toolbar**: Type `/` in the editor or use the top toolbar to insert headings, tables, callouts, math blocks, horizontal rules, and code snippets.
- **Version History**: Automatically snapshots note revisions locally so you can inspect and restore previous drafts at any time.

### In-Browser Executable Code Blocks
- **JavaScript Sandbox**: Execute fenced `js` / `javascript` blocks directly inside your notes with captured `console.log`, warning, and error output.
- **Client-Side Python Runtime**: Run fenced `python` blocks in the browser via **Skulpt** without a backend server.
- **Live HTML Preview & JSON Validation**: Render fenced `html` blocks in an isolated sandbox preview and format or validate `json` blocks with a single click.

### Privacy & Client-Side Encryption
- **100% Local-First Storage**: All notes, folders, tags, and workspace settings persist directly in your browser's `localStorage` with zero tracking or cloud telemetry.
- **AES-256-GCM Note Locking**: Protect sensitive notes with a passphrase using the Web Crypto API (`PBKDF2` key derivation with 100,000 iterations and `AES-256-GCM` authenticated encryption).
- **Encrypted & Portable Backups**: Export your entire workspace as a portable `.json` vault or export individual notes as `.md`, `.txt`, `.html`, or printable PDF documents.

### Organization & Knowledge Graph
- **Folders, Tags & Filters**: Organize notes into custom folders, assign color-coded tags, pin important notes to the top of your dashboard, and star favorites.
- **Bidirectional Wiki-Links**: Connect related ideas using `[[Note Title]]` syntax to navigate seamlessly between linked notes.
- **Interactive Mind Map**: Visualize your workspace connections in an interactive, force-directed HTML5 Canvas graph with zoom, pan, and node filtering.
- **Writing Activity Heatmap**: Track your daily note creation and editing momentum with a 14-day activity heatmap in the sidebar.

### Keyboard-First Workflow

| Shortcut | Action |
| :--- | :--- |
| `Cmd/Ctrl + K` | Open the Command Palette |
| `Cmd/Ctrl + P` | Quick-search notes |
| `Cmd/Ctrl + S` | Save current note & snapshot version |
| `Cmd/Ctrl + B` | Toggle Bold formatting |
| `Cmd/Ctrl + I` | Toggle Italic formatting |
| `Alt + N` | Create a new note |
| `Alt + Z` | Toggle distraction-free Zen Mode |
| `Esc` | Close active modal, drawer, or Command Palette |

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Core Application** | HTML5, CSS3, Vanilla JavaScript (ES6+) | Zero-build, framework-free single-page workspace architecture |
| **Styling & Theme** | Tailwind CSS (CDN) + Custom CSS (`style.css`) | Warm Amber & Obsidian dark/light design system and responsive layout |
| **Typography & Icons** | Google Fonts (`Inter`, `Montserrat`, `Outfit`, `Fira Code`), FontAwesome 6, Custom SVG | Customizable editor typography and crisp vector iconography |
| **Markdown & Sanitization** | Marked.js (`v14.1.4`) + DOMPurify (`v3.2.4`) | Fast GFM parsing and strict XSS sanitization |
| **Python Execution** | Skulpt (`v1.2.0`) | In-browser Python 3 execution inside Markdown code blocks |
| **Cryptography** | Web Crypto API (`SubtleCrypto`) | Client-side `PBKDF2` + `AES-256-GCM` note encryption and decryption |
| **Offline & PWA** | Web App Manifest (`manifest.json`) + Service Worker (`sw.js`) | Standalone desktop/mobile installation and offline-first asset caching |
| **Cloud Sharing (Optional)** | Cloudflare Pages Functions + Cloudflare KV | Read-only `/s/[id]` shared note links and `/api/share` persistence |
