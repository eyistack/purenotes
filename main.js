/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PURE NOTES — PRIVATE, LOCAL-FIRST WORKSPACE
 *  main.js — State, CRUD, Multi-Tabs, View Modes, Markdown & Code Runner,
 *            AES-256 Client Encryption, Cloudflare Pages Functions Sharing,
 *            Graph Mind Map, Command Palette, Heatmap, Settings, Import/Export
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Storage Keys & Constants ─────────────────────────────────────────────
const STORAGE_NOTES_KEY    = 'purenotes_vault_v1';
const STORAGE_FOLDERS_KEY  = 'purenotes_folders_v1';
const STORAGE_SETTINGS_KEY = 'purenotes_settings_v1';
const STORAGE_THEME_KEY    = 'workspace_theme';
const AUTOSAVE_DELAY_MS    = 400;
const TOAST_DURATION_MS    = 3200;
const SHARE_API_URL        = '/api/share';

// ─── App State ────────────────────────────────────────────────────────────
let notes = [];
let folders = [];
let openTabs = [];
let activeNoteId = null;
let currentFolderFilter = null;
let currentView = 'all';
let currentTagFilter = '';
let editorMode = 'write';
let isZenMode = false;
let isBulkMode = false;
let isSidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
let selectedNoteIds = new Set();
let unlockedNotes = new Map();

// Timers
let autosaveTimer = null;
let saveIndicatorTimer = null;

// Settings (Dense Code Editor Defaults: 13px font size, 19px line height)
let settings = {
  fontFamily: "'Fira Code', monospace",
  fontSize: '13px',
  showLineNumbers: true,
  dailyWordGoal: 500
};

// ─── Helper: DOM Selector ─────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ─── Unified Lucide Stroke-Based SVG Icon Helper ──────────────────────────
const LUCIDE_PATHS = {
  'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  'folder': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  'folder-plus': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>',
  'folder-open': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  'file-code': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="10 13 8 15 10 17"/><polyline points="14 13 16 15 14 17"/>',
  'file-down': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/>',
  'copy': '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  'clone': '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  'pin': '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
  'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'unlock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  'trash': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'refresh': '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'layers': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  'cloud-up': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  'chevrons-left': '<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>',
  'chevrons-right': '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',
  'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'expand': '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
  'pen': '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  'columns': '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>',
  'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'network': '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><line x1="8.5" y1="7.5" x2="15.5" y2="7.5"/><line x1="7.5" y1="8.5" x2="10.5" y2="15.5"/><line x1="16.5" y1="8.5" x2="13.5" y2="15.5"/>',
  'chart': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  'sliders': '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/>',
  'share': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
};

function iconSvg(name, cls = 'w-3.5 h-3.5') {
  const path = LUCIDE_PATHS[name] || LUCIDE_PATHS['file-text'];
  return `<svg class="lucide-svg ${cls}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

// ─── Helper: Detect Shared Note Route (/s/[id]) ───────────────────────────
function getSharedRouteId() {
  const path = window.location.pathname || '';
  if (path.startsWith('/s/')) {
    const seg = path.replace(/^\/s\//, '').split('/')[0].split('?')[0].trim();
    if (seg) return seg;
  }
  const params = new URLSearchParams(window.location.search || '');
  const paramId = params.get('s') || params.get('share');
  if (paramId) return paramId.trim();
  return null;
}

function isSharedRouteActive() {
  return Boolean(getSharedRouteId() || (window.location.hash || '').startsWith('#share='));
}

function setSharedViewMode(active) {
  document.documentElement.classList.toggle('is-shared-route', active);
  document.body.classList.toggle('is-shared-view', active);

  const appEl = $('app');
  const sidebarEl = $('sidebar');
  const homeViewEl = $('home-view');
  const cmdModalEl = $('cmd-palette-modal');
  const sharedModalEl = $('sharedNoteModal');

  if (active) {
    if (appEl) appEl.classList.add('hidden');
    if (sidebarEl) sidebarEl.classList.add('hidden');
    if (homeViewEl) homeViewEl.classList.add('hidden');
    if (cmdModalEl) cmdModalEl.classList.add('hidden');
    if (sharedModalEl) sharedModalEl.classList.remove('hidden');
  } else {
    if (appEl) appEl.classList.remove('hidden');
    if (sidebarEl) sidebarEl.classList.remove('hidden');
    if (sharedModalEl) sharedModalEl.classList.add('hidden');
  }
}

// ─── Initializer ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadSettings();
  loadData();
  initSidebarCollapse();
  setupEventListeners();

  if (isSharedRouteActive()) {
    setSharedViewMode(true);
    checkSharedRoute();
  } else {
    setSharedViewMode(false);
    renderAll();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  1. THEME TOGGLE & SETTINGS (Premium SVG Sun/Moon Icons)
// ═══════════════════════════════════════════════════════════════════════════

function initTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  const btnTheme = $('btn-theme');
  const btnSharedTheme = $('btn-shared-theme');
  const label = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  if (btnTheme) {
    btnTheme.setAttribute('aria-label', label);
    btnTheme.setAttribute('title', label);
  }
  if (btnSharedTheme) {
    btnSharedTheme.setAttribute('aria-label', label);
    btnSharedTheme.setAttribute('title', label);
  }
}

function toggleTheme() {
  document.documentElement.classList.add('theme-transition');
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(STORAGE_THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeIcons(isDark);

  setTimeout(() => {
    document.documentElement.classList.remove('theme-transition');
  }, 450);
}

function initSidebarCollapse() {
  const sidebar = $('sidebar');
  if (!sidebar) return;
  if (isSidebarCollapsed) {
    sidebar.classList.add('collapsed');
  }
  const icon = $('collapse-icon');
  if (icon) {
    icon.innerHTML = iconSvg(isSidebarCollapsed ? 'chevrons-right' : 'chevrons-left', 'w-3.5 h-3.5');
  }
}

function toggleSidebarCollapse() {
  const sidebar = $('sidebar');
  if (!sidebar) return;
  isSidebarCollapsed = !isSidebarCollapsed;
  sidebar.classList.toggle('collapsed', isSidebarCollapsed);
  localStorage.setItem('sidebar_collapsed', isSidebarCollapsed ? 'true' : 'false');
  const icon = $('collapse-icon');
  if (icon) {
    icon.innerHTML = iconSvg(isSidebarCollapsed ? 'chevrons-right' : 'chevrons-left', 'w-3.5 h-3.5');
  }
  setTimeout(updateLineNumbers, 310);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      settings = { ...settings, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load settings', err);
  }
  applySettingsToUI();
}

function saveSettings() {
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  applySettingsToUI();
}

function applySettingsToUI() {
  const fontSizePx = parseFloat(settings.fontSize) || 13;
  const lineHeightPx = Math.round(fontSizePx * 1.45);

  document.documentElement.style.setProperty('--editor-font-size', `${fontSizePx}px`);
  document.documentElement.style.setProperty('--editor-line-height', `${lineHeightPx}px`);

  const noteContentEl = $('note-content');
  const gutter = $('editor-line-numbers');
  if (noteContentEl) {
    noteContentEl.style.fontFamily = settings.fontFamily;
    noteContentEl.style.fontSize = `${fontSizePx}px`;
    noteContentEl.style.lineHeight = `${lineHeightPx}px`;
  }
  if (gutter) {
    gutter.style.fontFamily = settings.fontFamily;
    gutter.style.fontSize = `${fontSizePx}px`;
    gutter.style.lineHeight = `${lineHeightPx}px`;
    gutter.style.display = settings.showLineNumbers ? 'block' : 'none';
  }
  updateWordGoalUI();
  updateLineNumbers();
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. DATA PERSISTENCE & DEFAULT "WELCOME TO PURE NOTES" SEEDING
// ═══════════════════════════════════════════════════════════════════════════

function createDefaultWelcomeNote() {
  return {
    id: 'note_' + Date.now(),
    title: 'Welcome to PureNotes 🚀',
    content: `# Welcome to PureNotes\n\nA completely private, local-first markdown workspace. Zero cloud, zero tracking, purely yours.\n\n### ⚡ Key Superpowers\n- **Interactive Task Lists**: Checkboxes update live in preview!\n- **In-Browser Code Execution**: Run JavaScript, Python, HTML/CSS, or validate JSON.\n- **Client-Side Encryption**: AES-256-GCM encryption with passphrase locking.\n- **Force-Directed Graph**: Visual mind map of notes and \`[[wikilinks]]\`.\n- **Pages Functions Share**: Instant shareable links with auto-sync.\n\n### 💻 Try Running Some Code Below:\n\`\`\`javascript\nconst user = "Developer";\nconsole.log(\`Hello \${user}! Today is \${new Date().toLocaleDateString()}\`);\nconst items = [10, 20, 30].map(n => n * 2);\nconsole.log("Calculated:", items);\n\`\`\`\n\n\`\`\`python\nnumbers = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in numbers]\nprint("Python in PureNotes:", squares)\n\`\`\`\n\n### 📝 Interactive Task List:\n- [x] Experience clean, minimal PureNotes aesthetic\n- [ ] Try creating nested folders\n- [ ] Open Mind Map graph (click "Graph" in sidebar)\n- [ ] Press Cmd/Ctrl+K for the Command Palette`,
    folderId: 'f_ideas',
    tags: ['welcome', 'guide'],
    favorite: true,
    pinned: true,
    deleted: false,
    deletedAt: null,
    isEncrypted: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function loadData() {
  try {
    // 1. Load or seed default folders
    const rawFolders = localStorage.getItem(STORAGE_FOLDERS_KEY) || localStorage.getItem('workspace_folders_v3');
    let parsedFolders = null;
    if (rawFolders) {
      try { parsedFolders = JSON.parse(rawFolders); } catch (_) { parsedFolders = null; }
    }
    if (Array.isArray(parsedFolders) && parsedFolders.length > 0) {
      folders = parsedFolders;
    } else {
      folders = [
        { id: 'f_work', name: 'Work', parentId: null, createdAt: Date.now() },
        { id: 'f_ideas', name: 'Ideas & Drafts', parentId: null, createdAt: Date.now() }
      ];
      saveFolders();
    }

    // 2. Load or seed default "Welcome to PureNotes" note when empty
    const rawNotes = localStorage.getItem(STORAGE_NOTES_KEY) || localStorage.getItem('workspace_notes_v3') || localStorage.getItem('workspace_notes');
    let parsedNotes = null;
    if (rawNotes) {
      try { parsedNotes = JSON.parse(rawNotes); } catch (_) { parsedNotes = null; }
    }

    if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
      notes = parsedNotes;
    } else {
      notes = [createDefaultWelcomeNote()];
      saveNotes();
    }

    // 3. Sanitize & purge 30-day expired trash items
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    notes = notes.filter(n => {
      if (n.deleted && n.deletedAt && (now - n.deletedAt > thirtyDaysMs)) {
        return false;
      }
      return true;
    }).map(n => ({
      ...n,
      folderId: n.folderId || null,
      tags: Array.isArray(n.tags) ? n.tags : [],
      favorite: Boolean(n.favorite),
      pinned: Boolean(n.pinned),
      deleted: Boolean(n.deleted),
      isEncrypted: Boolean(n.isEncrypted)
    }));

    // If all notes were purged or no active notes exist, ensure the Welcome note is present & saved
    if (notes.filter(n => !n.deleted).length === 0) {
      notes.unshift(createDefaultWelcomeNote());
      saveNotes();
    }
  } catch (err) {
    console.error('Error loading data', err);
    folders = [
      { id: 'f_work', name: 'Work', parentId: null, createdAt: Date.now() },
      { id: 'f_ideas', name: 'Ideas & Drafts', parentId: null, createdAt: Date.now() }
    ];
    notes = [createDefaultWelcomeNote()];
    saveFolders();
    saveNotes();
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    showToast('Storage full! Could not save notes.', 'error');
  }
}

function saveFolders() {
  try {
    localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
  } catch (e) {
    showToast('Storage error persisting folders.', 'error');
  }
}

function saveAll() {
  saveNotes();
  const note = getActiveNote();
  if (note) {
    syncSharedNoteToCloudflare(note);
  }
}

function saveNote(note) {
  saveNotes();
  if (note) {
    syncSharedNoteToCloudflare(note);
  }
}

async function syncSharedNoteToCloudflare(note) {
  if (!note || (!note.shareId && !note.shareUrl)) return;

  try {
    const payload = note.isEncrypted
      ? {
          id: note.shareId,
          title: note.encryptedTitle || '🔒 Encrypted Note',
          content: '',
          isEncrypted: true,
          encryptedTitle: note.encryptedTitle || '🔒 Encrypted Note',
          encryptedPayload: note.encryptedPayload,
          language: 'markdown',
          tags: note.tags || []
        }
      : {
          id: note.shareId,
          title: note.title || 'Untitled Note',
          content: note.content || '',
          isEncrypted: false,
          language: 'markdown',
          tags: note.tags || []
        };

    await fetch(SHARE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Background share sync failed silently', err);
  }
}

function generateId(prefix = 'note') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. CRUD & NOTE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function createNote(folderId = null) {
  const newNote = {
    id: generateId('note'),
    title: '',
    content: '',
    folderId: folderId || currentFolderFilter || null,
    tags: [],
    favorite: false,
    pinned: false,
    deleted: false,
    deletedAt: null,
    isEncrypted: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  notes.unshift(newNote);
  saveNotes();

  openNoteInTab(newNote.id);
  renderAll();
  setTimeout(() => {
    const titleInput = $('note-title');
    if (titleInput) titleInput.focus();
  }, 50);

  showToast('New note created');
}

function getActiveNote() {
  return notes.find(n => n.id === activeNoteId) || null;
}

function updateActiveNoteContent() {
  const note = getActiveNote();
  if (!note || note.deleted) return;

  const titleVal = $('note-title').value.trim();
  const contentVal = $('note-content').value;

  if (note.isEncrypted && unlockedNotes.has(note.id)) {
    const unlocked = unlockedNotes.get(note.id);
    unlocked.title = titleVal || 'Untitled Note';
    unlocked.content = contentVal;
    unlockedNotes.set(note.id, unlocked);
    note.updatedAt = Date.now();
    scheduleReEncryption(note, unlocked);
  } else {
    note.title = titleVal;
    note.content = contentVal;
    note.updatedAt = Date.now();
  }

  showSavingIndicator();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    performAutoSave();
  }, AUTOSAVE_DELAY_MS);
}

function performAutoSave() {
  const note = getActiveNote();
  saveNote(note);
  renderTabs();
  renderNotesList();
  renderBacklinks();
  renderTOC();
  updateWordGoalUI();
  showSavedIndicator();
}

function showSavingIndicator() {
  const ind = $('save-status-indicator');
  if (ind) {
    ind.classList.remove('hidden');
    ind.innerHTML = `${iconSvg('refresh', 'w-3 h-3 svg-spin')} <span class="hidden sm:inline">Saving…</span>`;
  }
}

function showSavedIndicator() {
  const ind = $('save-status-indicator');
  if (ind) {
    ind.classList.remove('hidden');
    ind.innerHTML = `${iconSvg('check', 'w-3 h-3')} <span class="hidden sm:inline">Saved</span>`;
    clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(() => {
      ind.classList.add('hidden');
    }, 2000);
  }
}

function duplicateNoteById(noteId, openAfterDuplicate = false) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;
  const newNote = {
    ...JSON.parse(JSON.stringify(note)),
    id: generateId('note'),
    title: (note.title ? note.title : 'Untitled Note') + ' (Copy)',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false,
    pinned: false,
    deleted: false,
    deletedAt: null,
    shareId: null,
    shareUrl: null
  };
  notes.unshift(newNote);
  saveAll();
  if (openAfterDuplicate) {
    openNoteInTab(newNote.id);
  }
  renderAll();
  showToast('Note duplicated');
}

function duplicateActiveNote() {
  if (!activeNoteId) return;
  duplicateNoteById(activeNoteId, true);
}

function togglePinNoteById(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;
  note.pinned = !note.pinned;
  note.updatedAt = Date.now();
  saveNotes();
  if (activeNoteId === noteId) updateEditorHeader(note);
  renderNotesList();
  if (!activeNoteId) renderHomeView($('home-search-input')?.value || '');
  showToast(note.pinned ? 'Note pinned to top' : 'Note unpinned');
}

function toggleFavoriteNoteById(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;
  note.favorite = !note.favorite;
  note.updatedAt = Date.now();
  saveNotes();
  if (activeNoteId === noteId) updateEditorHeader(note);
  renderNotesList();
  renderTabs();
  if (!activeNoteId) renderHomeView($('home-search-input')?.value || '');
  showToast(note.favorite ? 'Added to Favorites' : 'Removed from Favorites');
}

async function copyActiveMarkdown() {
  const note = getActiveNote();
  if (!note) return;
  const content = note.isEncrypted && unlockedNotes.has(note.id)
    ? unlockedNotes.get(note.id).content
    : note.content;
  try {
    await navigator.clipboard.writeText(content);
    showToast('Markdown copied to clipboard!', 'success');
  } catch (err) {
    showToast('Failed to copy markdown', 'error');
  }
}

function softDeleteNote(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  note.deleted = true;
  note.deletedAt = Date.now();
  saveNotes();

  closeTab(noteId);
  renderAll();
  showToast('Note moved to Trash');
}

function restoreNote(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  note.deleted = false;
  note.deletedAt = null;
  note.updatedAt = Date.now();
  saveNotes();

  renderFoldersTree();
  renderNotesList();
  if (activeNoteId === noteId) {
    loadNoteIntoEditor(noteId);
  } else {
    renderHomeView($('home-search-input')?.value || '');
  }
  showToast('Note restored from Trash', 'success');
}

function permanentlyDeleteNote(noteId) {
  notes = notes.filter(n => n.id !== noteId);
  unlockedNotes.delete(noteId);
  saveNotes();
  if (openTabs.includes(noteId)) {
    closeTab(noteId);
  }
  renderFoldersTree();
  renderNotesList();
  if (!activeNoteId) {
    renderHomeView($('home-search-input')?.value || '');
  }
  showToast('Note permanently deleted', 'info');
}

let pendingDeleteModalAction = null;

function emptyTrash() {
  const trashedCount = notes.filter(n => n.deleted).length;
  if (trashedCount === 0) {
    showToast('Trash is already empty');
    return;
  }

  const titleEl = $('modal-delete-title');
  const descEl = $('modal-delete-desc');
  const confirmBtn = $('btn-confirm-modal-delete');

  if (titleEl) titleEl.textContent = 'Empty Trash?';
  if (descEl) descEl.textContent = 'Permanently delete all notes in Trash? This action cannot be undone.';
  if (confirmBtn) confirmBtn.textContent = 'Empty Trash';

  pendingDeleteModalAction = () => {
    const purgedIds = new Set(notes.filter(n => n.deleted).map(n => n.id));
    purgedIds.forEach(id => {
      unlockedNotes.delete(id);
      const tabIdx = openTabs.indexOf(id);
      if (tabIdx !== -1) openTabs.splice(tabIdx, 1);
      if (activeNoteId === id) activeNoteId = null;
    });

    notes = notes.filter(n => !n.deleted);
    saveNotes();

    const badge = $('trash-badge');
    if (badge) badge.textContent = '(0)';

    closeModal('delete-modal');
    renderFoldersTree();
    renderNotesList();
    renderTabs();
    if (!activeNoteId) {
      renderHomeView($('home-search-input')?.value || '');
    }
    showToast(`Permanently deleted ${purgedIds.size} notes from Trash`, 'info');
  };

  openModal('delete-modal');
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. MULTI-TAB SUPPORT
// ═══════════════════════════════════════════════════════════════════════════

function clearUnlockedMemory(exceptNoteId = null) {
  for (const key of Array.from(unlockedNotes.keys())) {
    if (key !== exceptNoteId) {
      unlockedNotes.delete(key);
    }
  }
}

function openNoteInTab(noteId) {
  closeMobileSidebar();
  if (activeNoteId !== noteId) {
    // Navigating to a note always clears previously unlocked plaintext from memory
    clearUnlockedMemory(null);
  }
  if (!openTabs.includes(noteId)) {
    openTabs.push(noteId);
  }
  activeNoteId = noteId;
  renderTabs();
  loadNoteIntoEditor(noteId);
}

function switchTab(noteId) {
  if (activeNoteId !== noteId) {
    clearUnlockedMemory(null);
  }
  activeNoteId = noteId;
  renderTabs();
  loadNoteIntoEditor(noteId);
}

function closeTab(noteId, e) {
  if (e) e.stopPropagation();
  unlockedNotes.delete(noteId);

  const idx = openTabs.indexOf(noteId);
  if (idx === -1) return;

  openTabs.splice(idx, 1);

  if (activeNoteId === noteId) {
    clearUnlockedMemory(null);
    if (openTabs.length > 0) {
      activeNoteId = openTabs[Math.max(0, idx - 1)];
      loadNoteIntoEditor(activeNoteId);
    } else {
      activeNoteId = null;
      renderEmptyState();
    }
  }

  renderTabs();
}

function renderTabs() {
  const bar = $('tabs-bar');
  if (!bar) return;
  bar.innerHTML = '';

  openTabs.forEach(id => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const isActive = id === activeNoteId;
    const tabEl = document.createElement('div');
    tabEl.className = `tab-item flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer border-t border-x border-transparent shrink-0 ${
      isActive ? 'active bg-white dark:bg-[#111113] text-slate-900 dark:text-white border-slate-200/80 dark:border-white/[0.08]' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
    }`;

    const displayTitle = getNoteDisplayTitle(note);
    const lockIcon = note.isEncrypted ? `${iconSvg('lock', 'w-2.5 h-2.5 text-amber-500 mr-1')}` : '';
    const favIcon = note.favorite ? `${iconSvg('heart', 'w-2.5 h-2.5 text-rose-500 fill-current mr-1')}` : '';

    tabEl.innerHTML = `
      <span class="inline-flex items-center truncate max-w-[120px] sm:max-w-[150px]">${favIcon}${lockIcon}${escapeHTML(displayTitle)}</span>
      <button class="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Close Tab">
        ${iconSvg('x', 'w-3 h-3')}
      </button>
    `;

    tabEl.addEventListener('click', () => switchTab(id));
    const closeBtn = tabEl.querySelector('button');
    closeBtn.addEventListener('click', (ev) => closeTab(id, ev));

    bar.appendChild(tabEl);
  });
}

function getNoteDisplayTitle(note) {
  if (note.isEncrypted && !unlockedNotes.has(note.id)) {
    return note.encryptedTitle || 'Encrypted Note';
  }
  if (note.isEncrypted && unlockedNotes.has(note.id)) {
    return unlockedNotes.get(note.id).title || 'Untitled Note';
  }
  return note.title || 'Untitled Note';
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. EDITOR VIEW & MODES (Write, Split, Preview, Zen)
// ═══════════════════════════════════════════════════════════════════════════

function setEditorMode(mode) {
  editorMode = mode;
  const writeBtn = $('btn-mode-write');
  const splitBtn = $('btn-mode-split');
  const prevBtn = $('btn-mode-preview');
  const writePane = $('editor-write-pane');
  const prevPane = $('editor-preview-pane');
  const canvas = $('editor-canvas-container');

  [writeBtn, splitBtn, prevBtn].forEach(b => {
    if (b) {
      b.className = 'px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition';
    }
  });

  const activeBtnClass = 'px-2.5 py-1 rounded-lg text-slate-800 dark:text-white bg-white dark:bg-white/[0.12] shadow-sm font-semibold transition';

  if (mode === 'write') {
    if (writeBtn) writeBtn.className = activeBtnClass;
    if (canvas) canvas.className = 'flex-1 relative overflow-hidden flex flex-col editor-mode-write';
    if (writePane) writePane.classList.remove('hidden');
    if (prevPane) prevPane.classList.add('hidden');
  } else if (mode === 'split') {
    if (splitBtn) splitBtn.className = activeBtnClass;
    if (canvas) canvas.className = 'flex-1 relative overflow-hidden grid grid-cols-1 md:grid-cols-2 editor-mode-split';
    if (writePane) writePane.classList.remove('hidden');
    if (prevPane) prevPane.classList.remove('hidden');
    renderMarkdownPreview();
  } else if (mode === 'preview') {
    if (prevBtn) prevBtn.className = activeBtnClass;
    if (canvas) canvas.className = 'flex-1 relative overflow-hidden flex flex-col editor-mode-preview';
    if (writePane) writePane.classList.add('hidden');
    if (prevPane) prevPane.classList.remove('hidden');
    renderMarkdownPreview();
  }
  setTimeout(updateLineNumbers, 20);
}

function toggleZenMode() {
  isZenMode = !isZenMode;
  const appEl = $('app');
  const exitBtn = $('btn-exit-zen');

  if (isZenMode) {
    appEl.classList.add('zen-mode');
    if (exitBtn) exitBtn.classList.remove('hidden');
    showToast('Zen Mode activated. Press Esc to exit.');
  } else {
    appEl.classList.remove('zen-mode');
    if (exitBtn) exitBtn.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. LINE NUMBERS GUTTER & EXACT 1:1 SCROLL SYNC
// ═══════════════════════════════════════════════════════════════════════════

function updateLineNumbers() {
  if (!settings.showLineNumbers) return;
  const textarea = $('note-content');
  const gutter = $('editor-line-numbers');
  if (!textarea || !gutter) return;

  const text = textarea.value;
  const lines = text.split('\n');
  const linesCount = lines.length;

  const computed = window.getComputedStyle(textarea);
  const fontSizePx = parseFloat(computed.fontSize) || 13;
  const baseLineHeightPx = Math.round(parseFloat(computed.lineHeight) || Math.round(fontSizePx * 1.45));

  gutter.style.fontSize = `${fontSizePx}px`;
  gutter.style.lineHeight = `${baseLineHeightPx}px`;
  gutter.style.fontFamily = computed.fontFamily;
  gutter.style.paddingTop = computed.paddingTop;
  gutter.style.paddingBottom = computed.paddingBottom;

  const paddingLeft = parseFloat(computed.paddingLeft) || 0;
  const paddingRight = parseFloat(computed.paddingRight) || 0;
  const contentWidth = Math.max(10, textarea.clientWidth - paddingLeft - paddingRight);

  let measurer = $('line-height-measurer');
  if (!measurer) {
    measurer = document.createElement('div');
    measurer.id = 'line-height-measurer';
    measurer.style.position = 'absolute';
    measurer.style.visibility = 'hidden';
    measurer.style.pointerEvents = 'none';
    measurer.style.top = '-9999px';
    measurer.style.left = '-9999px';
    measurer.style.boxSizing = 'border-box';
    measurer.style.whiteSpace = 'pre-wrap';
    measurer.style.wordBreak = 'break-word';
    measurer.style.overflowWrap = 'break-word';
    measurer.style.padding = '0';
    measurer.style.margin = '0';
    measurer.style.border = '0';
    document.body.appendChild(measurer);
  }

  measurer.style.width = `${contentWidth}px`;
  measurer.style.fontFamily = computed.fontFamily;
  measurer.style.fontSize = `${fontSizePx}px`;
  measurer.style.lineHeight = `${baseLineHeightPx}px`;
  measurer.style.letterSpacing = computed.letterSpacing;
  measurer.style.fontVariantLigatures = computed.fontVariantLigatures;
  measurer.style.tabSize = computed.tabSize || '2';

  measurer.innerHTML = lines.map(line => {
    const escaped = line ? line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '&nbsp;';
    return `<div style="box-sizing:border-box;margin:0;padding:0;border:0;min-height:${baseLineHeightPx}px;line-height:${baseLineHeightPx}px;">${escaped}</div>`;
  }).join('');

  const children = measurer.children;
  let html = '';
  for (let i = 0; i < linesCount; i++) {
    const rawHeight = children[i] ? children[i].getBoundingClientRect().height : baseLineHeightPx;
    const lineRows = Math.max(1, Math.round(rawHeight / baseLineHeightPx));
    const exactHeight = lineRows * baseLineHeightPx;
    html += `<div class="line-num" style="height:${exactHeight}px;line-height:${baseLineHeightPx}px;">${i + 1}</div>`;
  }
  gutter.innerHTML = html;
  gutter.scrollTop = textarea.scrollTop;
}

function syncEditorScroll() {
  const textarea = $('note-content');
  const gutter = $('editor-line-numbers');
  if (textarea && gutter) {
    gutter.scrollTop = textarea.scrollTop;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  7. LOADING NOTE INTO EDITOR & STRICT HOME VIEW TOOLBAR HIDING
// ═══════════════════════════════════════════════════════════════════════════

function setEditorChromeVisibility(isNoteActive) {
  const appHeader = $('app-header');
  const tabsHeader = $('tabs-header-container');
  const statusBar = $('status-bar');
  const editorToolbar = document.querySelector('.editor-toolbar');

  document.body.classList.toggle('is-home-view', !isNoteActive);

  if (appHeader) {
    appHeader.classList.toggle('hidden', !isNoteActive);
    appHeader.style.display = isNoteActive ? '' : 'none';
  }
  if (tabsHeader) {
    tabsHeader.classList.toggle('hidden', !isNoteActive);
    tabsHeader.style.display = isNoteActive ? '' : 'none';
  }
  if (statusBar) {
    statusBar.classList.toggle('hidden', !isNoteActive);
    statusBar.style.display = isNoteActive ? '' : 'none';
  }
  if (editorToolbar) {
    editorToolbar.classList.toggle('hidden', !isNoteActive);
    editorToolbar.style.display = isNoteActive ? '' : 'none';
  }
}

function loadNoteIntoEditor(noteId) {
  const note = notes.find(n => n.id === noteId);
  const homeView = $('home-view');
  const emptyEl = $('empty-state');
  const wrapperEl = $('editor-wrapper');
  const lockOverlay = $('lock-screen-overlay');
  const trashBanner = $('trash-banner');
  const titleEl = $('note-title');
  const contentEl = $('note-content');

  if (!note) {
    goHome();
    return;
  }

  // Show editor header & toolbar only when an actual note is open
  setEditorChromeVisibility(true);

  if (homeView) homeView.classList.add('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (wrapperEl) wrapperEl.classList.remove('hidden');

  if (note.deleted) {
    trashBanner.classList.remove('hidden');
    trashBanner.classList.add('flex');
    const daysLeft = 30 - Math.floor((Date.now() - (note.deletedAt || Date.now())) / (1000 * 60 * 60 * 24));
    $('trash-days-left').textContent = `${Math.max(1, daysLeft)} days left`;
  } else {
    trashBanner.classList.add('hidden');
    trashBanner.classList.remove('flex');
  }

  updateEditorHeader(note);

  if (note.isEncrypted && !unlockedNotes.has(note.id)) {
    if (lockOverlay) {
      lockOverlay.classList.remove('hidden');
      lockOverlay.style.display = 'flex';
    }
    if ($('input-unlock-password')) $('input-unlock-password').value = '';
    if ($('unlock-error-msg')) $('unlock-error-msg').classList.add('hidden');
    setTimeout(() => $('input-unlock-password')?.focus(), 50);

    if (titleEl) {
      titleEl.value = note.encryptedTitle || 'Encrypted Note';
      titleEl.disabled = true;
    }
    if (contentEl) {
      contentEl.value = '';
      contentEl.disabled = true;
    }
    renderTagPills([]);
    return;
  }

  if (lockOverlay) {
    lockOverlay.classList.add('hidden');
    lockOverlay.style.display = 'none';
  }

  let title = note.title || '';
  let content = note.content || '';

  if (note.isEncrypted && unlockedNotes.has(note.id)) {
    const unlocked = unlockedNotes.get(note.id);
    title = unlocked.title || '';
    content = unlocked.content || '';
  }

  if (titleEl) {
    titleEl.disabled = Boolean(note.deleted);
    titleEl.readOnly = Boolean(note.deleted);
    titleEl.style.pointerEvents = 'auto';
    titleEl.value = title;
  }
  if (contentEl) {
    contentEl.disabled = Boolean(note.deleted);
    contentEl.readOnly = Boolean(note.deleted);
    contentEl.style.pointerEvents = 'auto';
    contentEl.value = content;
  }
  renderTagPills(note.tags);

  requestAnimationFrame(() => {
    updateLineNumbers();
    updateStats();
  });
  renderTOC();
  renderBacklinks();

  if (editorMode !== 'write') {
    renderMarkdownPreview();
  }
}

function goHome(targetView = 'all') {
  closeMobileSidebar();
  // Navigating away from any active note clears decrypted plaintext from memory
  clearUnlockedMemory(null);
  if ($('note-content')) $('note-content').value = '';
  if ($('note-title')) $('note-title').value = '';

  activeNoteId = null;
  openTabs = [];

  if (isBulkMode) {
    toggleBulkMode();
  } else {
    selectedNoteIds.clear();
  }

  currentView = targetView || 'all';
  if (currentView !== 'all') {
    currentFolderFilter = null;
  }
  currentTagFilter = '';
  const navMap = { all: 'nav-all-notes', favorites: 'nav-favorites', trash: 'nav-trash' };
  setActiveNavView(navMap[currentView] || 'nav-all-notes');

  // Strictly hide top editor header bar, toolbar, tabs bar & status bar on Home view
  setEditorChromeVisibility(false);

  const homeView = $('home-view');
  const editorWrapper = $('editor-wrapper');
  const emptyEl = $('empty-state');
  const lockOverlay = $('lock-screen-overlay');
  const trashBanner = $('trash-banner');

  if (homeView) homeView.classList.remove('hidden');
  if (editorWrapper) editorWrapper.classList.add('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (lockOverlay) {
    lockOverlay.classList.add('hidden');
    lockOverlay.style.display = 'none';
  }
  if (trashBanner) trashBanner.classList.add('hidden');

  const breadcrumb = $('breadcrumb-folder');
  if (breadcrumb) breadcrumb.textContent = 'PureNotes';
  const metaLastEdited = $('meta-last-edited');
  if (metaLastEdited) metaLastEdited.textContent = 'Dashboard';

  const homeSearchInput = $('home-search-input');
  if (homeSearchInput) homeSearchInput.value = '';

  renderFoldersTree();
  renderHomeView();
  renderTabs();
  renderNotesList();
}
window.goHome = goHome;

function renderEmptyState() {
  goHome();
}

function renderHomeView(query = '') {
  const container = $('home-notes-grid');
  if (!container) return;
  container.innerHTML = '';

  const btnEmptyTrash = $('btn-empty-trash');
  const btnHomeNewNote = $('btn-home-new-note');
  const btnHomeImport = $('btn-home-import');

  let list = notes.slice();

  if (currentView === 'trash') {
    list = list.filter(n => n.deleted);
    $('home-title').innerHTML = `${iconSvg('trash', 'w-5 h-5 text-rose-500')}<span>Trash</span>`;
    $('home-subtitle').textContent = 'Notes in trash will be permanently deleted after 30 days';

    if (btnHomeNewNote) btnHomeNewNote.classList.add('hidden');
    if (btnHomeImport) btnHomeImport.classList.add('hidden');
    if (btnEmptyTrash) {
      if (list.length > 0) {
        btnEmptyTrash.classList.remove('hidden');
        btnEmptyTrash.classList.add('inline-flex');
        btnEmptyTrash.disabled = false;
      } else {
        btnEmptyTrash.classList.add('hidden');
        btnEmptyTrash.classList.remove('inline-flex');
        btnEmptyTrash.disabled = true;
      }
    }
  } else {
    if (btnHomeNewNote) btnHomeNewNote.classList.remove('hidden');
    if (btnHomeImport) btnHomeImport.classList.remove('hidden');
    if (btnEmptyTrash) {
      btnEmptyTrash.classList.add('hidden');
      btnEmptyTrash.classList.remove('inline-flex');
    }

    list = list.filter(n => !n.deleted);
    if (currentView === 'favorites') {
      list = list.filter(n => n.favorite);
      $('home-title').innerHTML = `${iconSvg('heart', 'w-5 h-5 text-rose-500 fill-current')}<span>Favorites</span>`;
      $('home-subtitle').textContent = 'Your starred notes for quick reference';
    } else if (currentFolderFilter) {
      const folder = folders.find(f => f.id === currentFolderFilter);
      const folderName = folder ? folder.name : 'Folder';
      list = list.filter(n => n.folderId === currentFolderFilter);
      $('home-title').innerHTML = `${iconSvg('folder', 'w-5 h-5 text-amber-600 dark:text-amber-500')}<span>${escapeHTML(folderName)}</span>`;
      $('home-subtitle').textContent = `Showing notes stored in "${folderName}"`;
    } else {
      $('home-title').innerHTML = `${iconSvg('layers', 'w-5 h-5 text-amber-600 dark:text-amber-500')}<span>All Notes</span>`;
      $('home-subtitle').textContent = 'Browse, search, and manage your private markdown workspace';
    }
  }

  if (currentTagFilter && currentView !== 'trash') {
    list = list.filter(n => n.tags && n.tags.includes(currentTagFilter));
  }

  const q = (query || '').trim().toLowerCase();
  if (q) {
    list = list.filter(n => {
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const contentMatch = !n.isEncrypted && (n.content || '').toLowerCase().includes(q);
      const tagsMatch = (n.tags || []).some(t => t.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagsMatch;
    });
  }

  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  if (currentView !== 'trash') {
    const newCard = document.createElement('div');
    newCard.className = 'group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/[0.08] hover:border-amber-500 dark:hover:border-amber-500 bg-white/40 dark:bg-white/[0.02] hover:bg-amber-50/40 dark:hover:bg-amber-500/5 cursor-pointer transition-all duration-200 min-h-[160px] text-center';
    newCard.innerHTML = `
      <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
        ${iconSvg('plus', 'w-4 h-4')}
      </div>
      <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Create New Note</span>
      <span class="text-[10px] text-slate-400 mt-0.5">Start writing in markdown</span>
    `;
    newCard.addEventListener('click', () => {
      createNote(currentFolderFilter);
    });
    container.appendChild(newCard);
  }

  if (list.length === 0 && currentView === 'trash') {
    const emptyTrashEl = document.createElement('div');
    emptyTrashEl.className = 'col-span-full py-16 text-center text-slate-400';
    emptyTrashEl.innerHTML = `
      ${iconSvg('trash', 'w-8 h-8 mb-3 mx-auto opacity-30 block')}
      <p class="text-xs font-medium">Trash is empty</p>
    `;
    container.appendChild(emptyTrashEl);
    return;
  }

  list.forEach(note => {
    const card = document.createElement('div');
    card.className = 'home-note-card group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#111113] border border-slate-200/80 dark:border-white/[0.06] hover:border-amber-500/40 cursor-pointer transition-all duration-200 min-h-[160px]';

    const title = getNoteDisplayTitle(note);
    const words = note.isEncrypted ? 0 : (note.content || '').trim().split(/\s+/).filter(Boolean).length;
    const folder = folders.find(f => f.id === note.folderId);
    
    let snippet = note.isEncrypted
      ? '🔒 Encrypted note. Click to enter passphrase and unlock.'
      : (note.content || '').replace(/^[#*-]\s+/gm, '').replace(/[`_*~#]/g, '').trim();
    if (!snippet) snippet = 'Empty note...';
    if (snippet.length > 130) snippet = snippet.slice(0, 130) + '…';

    const quickActionsHtml = note.deleted
      ? `
        <div class="card-quick-actions" role="toolbar" aria-label="Trash Note Quick Actions">
          <button type="button" class="card-quick-btn btn-restore" data-card-action="restore" title="Restore Note">
            ${iconSvg('rotate-ccw', 'w-3.5 h-3.5')}
          </button>
          <button type="button" class="card-quick-btn btn-delete" data-card-action="perm-delete" title="Delete Permanently">
            ${iconSvg('trash', 'w-3.5 h-3.5')}
          </button>
        </div>
      `
      : `
        <div class="card-quick-actions" role="toolbar" aria-label="Note Quick Actions">
          <button type="button" class="card-quick-btn" data-card-action="duplicate" title="Duplicate Note">
            ${iconSvg('clone', 'w-3.5 h-3.5')}
          </button>
          <button type="button" class="card-quick-btn ${note.pinned ? 'active-pin' : ''}" data-card-action="pin" title="${note.pinned ? 'Unpin Note' : 'Pin Note'}">
            ${iconSvg('pin', 'w-3.5 h-3.5')}
          </button>
          <button type="button" class="card-quick-btn ${note.favorite ? 'active-fav' : ''}" data-card-action="favorite" title="${note.favorite ? 'Remove Favorite' : 'Favorite Note'}">
            ${iconSvg('heart', note.favorite ? 'w-3.5 h-3.5 fill-current' : 'w-3.5 h-3.5')}
          </button>
          <button type="button" class="card-quick-btn btn-delete" data-card-action="delete" title="Move to Trash">
            ${iconSvg('trash', 'w-3.5 h-3.5')}
          </button>
        </div>
      `;

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            ${note.pinned ? iconSvg('pin', 'w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0') : ''}
            ${note.favorite ? iconSvg('heart', 'w-3 h-3 text-rose-500 fill-current shrink-0') : ''}
            ${note.isEncrypted ? iconSvg('lock', 'w-3 h-3 text-amber-500 shrink-0') : ''}
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">${escapeHTML(title)}</h3>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            ${quickActionsHtml}
            ${folder ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                ${iconSvg('folder', 'w-2.5 h-2.5')}
                <span class="max-w-[70px] truncate">${escapeHTML(folder.name)}</span>
              </span>
            ` : ''}
          </div>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">${escapeHTML(snippet)}</p>
      </div>
      <div>
        ${note.tags && note.tags.length > 0 ? `
          <div class="flex flex-wrap gap-1 mb-3">
            ${note.tags.slice(0, 3).map(t => `<span class="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-[10px] text-slate-500 dark:text-slate-400">#${escapeHTML(t)}</span>`).join('')}
            ${note.tags.length > 3 ? `<span class="text-[9px] text-slate-400 self-center">+${note.tags.length - 3}</span>` : ''}
          </div>
        ` : ''}
        <div class="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-white/[0.04] pt-2 mt-auto">
          <span>${formatRelativeTime(note.updatedAt)}</span>
          <span class="flex items-center gap-1.5">
            <span>${note.isEncrypted ? 'AES-256' : `${words} words`}</span>
            ${note.shareUrl ? iconSvg('cloud-up', 'w-3 h-3 text-amber-500') : ''}
          </span>
        </div>
      </div>
    `;

    card.querySelectorAll('[data-card-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-card-action');
        if (action === 'restore') {
          restoreNote(note.id);
        } else if (action === 'perm-delete') {
          permanentlyDeleteNote(note.id);
        } else if (action === 'duplicate') {
          duplicateNoteById(note.id, false);
        } else if (action === 'pin') {
          togglePinNoteById(note.id);
        } else if (action === 'favorite') {
          toggleFavoriteNoteById(note.id);
        } else if (action === 'delete') {
          softDeleteNote(note.id);
        }
      });
    });

    card.addEventListener('click', () => {
      openNoteInTab(note.id);
    });

    container.appendChild(card);
  });
}

function updateEditorHeader(note) {
  const folder = folders.find(f => f.id === note.folderId);
  $('breadcrumb-folder').textContent = folder ? folder.name : 'Notes';
  $('meta-last-edited').textContent = 'Edited ' + formatRelativeTime(note.updatedAt);

  const favIcon = $('icon-favorite');
  if (favIcon) {
    favIcon.innerHTML = iconSvg('heart', note.favorite ? 'w-3.5 h-3.5 text-rose-500 fill-current' : 'w-3.5 h-3.5');
  }

  const pinIcon = $('icon-pin');
  if (pinIcon) {
    pinIcon.innerHTML = iconSvg('pin', note.pinned ? 'w-3.5 h-3.5 text-amber-600 dark:text-amber-400' : 'w-3.5 h-3.5');
  }

  const lockIcon = $('icon-lock');
  if (lockIcon) {
    lockIcon.innerHTML = iconSvg(note.isEncrypted ? 'lock' : 'unlock', note.isEncrypted ? 'w-3.5 h-3.5 text-amber-500' : 'w-3.5 h-3.5');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  8. TAGGING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function renderTagPills(tags) {
  const container = $('tags-pills-container');
  if (!container) return;
  container.innerHTML = '';

  tags.forEach(tag => {
    const pill = document.createElement('span');
    pill.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-[11px] border border-amber-500/20';
    pill.innerHTML = `
      <span>#${escapeHTML(tag)}</span>
      <button class="hover:text-red-500 transition" title="Remove tag">
        ${iconSvg('x', 'w-2.5 h-2.5')}
      </button>
    `;
    pill.querySelector('button')?.addEventListener('click', () => removeTagFromActiveNote(tag));
    container.appendChild(pill);
  });
}

function addTagToActiveNote(tagStr) {
  const note = getActiveNote();
  if (!note) return;

  const clean = tagStr.trim().replace(/^#/, '').toLowerCase();
  if (!clean || note.tags.includes(clean)) return;

  note.tags.push(clean);
  saveNotes();
  renderTagPills(note.tags);
  renderNotesList();
  updateTagFilterDropdown();
}

function removeTagFromActiveNote(tagStr) {
  const note = getActiveNote();
  if (!note) return;

  note.tags = note.tags.filter(t => t !== tagStr);
  saveNotes();
  renderTagPills(note.tags);
  renderNotesList();
  updateTagFilterDropdown();
}

function updateTagFilterDropdown() {
  const select = $('tag-filter-select');
  if (!select) return;

  const allTags = new Set();
  notes.filter(n => !n.deleted).forEach(n => n.tags.forEach(t => allTags.add(t)));

  const curr = select.value;
  select.innerHTML = '<option value="">Filter by tag (All)</option>';

  Array.from(allTags).sort().forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = '#' + tag;
    if (tag === curr) opt.selected = true;
    select.appendChild(opt);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  9. MARKDOWN PARSER, INTERACTIVE TASK LISTS & CODE RUNNER PLAYGROUND
// ═══════════════════════════════════════════════════════════════════════════

function getMarkdownTaskLineNumbers(rawMarkdown) {
  const lines = rawMarkdown.split('\n');
  const taskLines = [];
  let inCodeFence = false;
  const taskRegex = /^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX])\](\s+.*|$)/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (!inCodeFence && taskRegex.test(lines[i])) {
      taskLines.push(i);
    }
  }
  return taskLines;
}

function renderMarkdownPreview() {
  const previewEl = $('markdown-preview');
  const note = getActiveNote();
  if (!previewEl || !note) return;

  const rawMarkdown = $('note-content').value;
  const taskLineNumbers = getMarkdownTaskLineNumbers(rawMarkdown);

  let raw = rawMarkdown.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
    return `<a class="wiki-link" data-wikitarget="${escapeHTML(p1)}">${iconSvg('link', 'w-3 h-3')} ${escapeHTML(p1)}</a>`;
  });

  marked.setOptions({
    gfm: true,
    breaks: true
  });

  const rawHtml = marked.parse(raw);
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['iframe', 'input'],
    ADD_ATTR: ['target', 'data-wikitarget', 'data-task-index', 'data-line', 'allowfullscreen', 'type', 'checked', 'disabled']
  });

  previewEl.innerHTML = cleanHtml;

  enhanceTaskCheckboxes(previewEl, taskLineNumbers);
  enhanceCodeBlocks(previewEl);

  previewEl.querySelectorAll('.wiki-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTitle = link.getAttribute('data-wikitarget');
      handleWikiLinkClick(targetTitle);
    });
  });
}

function enhanceTaskCheckboxes(container, taskLineNumbers = []) {
  const items = container.querySelectorAll('li');
  let taskIndex = 0;

  items.forEach(li => {
    const existingCheckbox = li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
    if (existingCheckbox) {
      li.classList.add('task-list-item');
      existingCheckbox.removeAttribute('disabled');
      existingCheckbox.disabled = false;
      existingCheckbox.classList.add('task-checkbox');
      existingCheckbox.setAttribute('data-task-index', String(taskIndex));
      if (taskLineNumbers[taskIndex] !== undefined) {
        existingCheckbox.setAttribute('data-line', String(taskLineNumbers[taskIndex]));
      }
      taskIndex++;
      return;
    }

    const text = li.innerHTML.trim();
    if (text.startsWith('[ ]') || text.startsWith('[x]') || text.startsWith('[X]')) {
      const isChecked = text.startsWith('[x]') || text.startsWith('[X]');
      const cleanContent = text.replace(/^\[[ xX]\]\s*/, '');
      const lineNum = taskLineNumbers[taskIndex] !== undefined ? taskLineNumbers[taskIndex] : -1;

      li.className = 'task-list-item';
      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" data-task-index="${taskIndex}" data-line="${lineNum}" ${isChecked ? 'checked' : ''} />
        <span>${cleanContent}</span>
      `;
      taskIndex++;
    }
  });
}

function toggleTaskCheckboxInMarkdown(targetIndex, checked, explicitLineNumber = null) {
  const textarea = $('note-content');
  if (!textarea) return;

  const lines = textarea.value.split('\n');
  const taskRegex = /^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX])\](.*)$/;

  if (
    explicitLineNumber !== null &&
    explicitLineNumber >= 0 &&
    explicitLineNumber < lines.length &&
    taskRegex.test(lines[explicitLineNumber])
  ) {
    lines[explicitLineNumber] = lines[explicitLineNumber].replace(
      taskRegex,
      `$1[${checked ? 'x' : ' '}]$3`
    );
  } else {
    let currentTaskIdx = 0;
    let inCodeFence = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        inCodeFence = !inCodeFence;
        continue;
      }
      if (!inCodeFence) {
        const match = lines[i].match(taskRegex);
        if (match) {
          if (currentTaskIdx === targetIndex) {
            lines[i] = `${match[1]}[${checked ? 'x' : ' '}]${match[3]}`;
            break;
          }
          currentTaskIdx++;
        }
      }
    }
  }

  textarea.value = lines.join('\n');
  updateActiveNoteContent();
  updateLineNumbers();
  updateStats();
  if (editorMode !== 'write') {
    renderMarkdownPreview();
  }
}

function enhanceCodeBlocks(container) {
  const preElements = container.querySelectorAll('pre');

  preElements.forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;

    let lang = 'code';
    code.classList.forEach(cls => {
      if (cls.startsWith('language-')) {
        lang = cls.replace('language-', '').toLowerCase();
      }
    });

    const codeText = code.textContent;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    const isRunnable = ['javascript', 'js', 'html', 'css', 'json', 'python', 'py'].includes(lang);

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <span class="lang-tag">${lang}</span>
      <div class="code-block-actions">
        <button class="btn-code-action btn-copy-code" title="Copy code">
          ${iconSvg('copy', 'w-3 h-3')} Copy
        </button>
        ${isRunnable ? `
          <button class="btn-code-action btn-code-run" title="Run code">
            ${iconSvg('play', 'w-3 h-3')} Run
          </button>
        ` : ''}
      </div>
    `;

    header.querySelector('.btn-copy-code')?.addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(codeText);
      const btn = e.currentTarget;
      btn.innerHTML = `${iconSvg('check', 'w-3 h-3 text-emerald-400')} Copied`;
      setTimeout(() => {
        btn.innerHTML = `${iconSvg('copy', 'w-3 h-3')} Copy`;
      }, 1500);
    });

    if (isRunnable) {
      const runBtn = header.querySelector('.btn-code-run');
      runBtn.addEventListener('click', () => {
        executeCodeBlock(lang, codeText, wrapper);
      });
    }

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    pre.className = 'code-block-content';
    wrapper.appendChild(pre);
  });
}

function executeCodeBlock(lang, code, wrapper) {
  let outputBox = wrapper.querySelector('.code-output-container');
  if (outputBox) outputBox.remove();

  outputBox = document.createElement('div');
  outputBox.className = 'code-output-container';

  try {
    if (lang === 'javascript' || lang === 'js') {
      executeJavaScript(code, outputBox);
    } else if (lang === 'html' || lang === 'css') {
      executeHTML(code, outputBox);
    } else if (lang === 'json') {
      executeJSON(code, outputBox);
    } else if (lang === 'python' || lang === 'py') {
      executePython(code, outputBox);
    }
  } catch (err) {
    outputBox.classList.add('output-error');
    outputBox.textContent = `Execution Error: ${err.message}`;
  }

  wrapper.appendChild(outputBox);
}

function executeJavaScript(code, outputBox) {
  const logs = [];
  const customConsole = {
    log: (...args) => logs.push(args.map(formatLogArg).join(' ')),
    warn: (...args) => logs.push('[WARN] ' + args.map(formatLogArg).join(' ')),
    error: (...args) => logs.push('[ERROR] ' + args.map(formatLogArg).join(' '))
  };

  try {
    const fn = new Function('console', code);
    const result = fn(customConsole);
    if (result !== undefined) {
      logs.push(`=> ${formatLogArg(result)}`);
    }
    outputBox.textContent = logs.length > 0 ? logs.join('\n') : 'Code executed successfully (no output).';
  } catch (err) {
    outputBox.classList.add('output-error');
    outputBox.textContent = `Runtime Error: ${err.message}`;
  }
}

function formatLogArg(arg) {
  if (typeof arg === 'object' && arg !== null) {
    try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
  }
  return String(arg);
}

function executeHTML(code, outputBox) {
  outputBox.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'code-output-iframe';
  iframe.sandbox = 'allow-scripts';
  iframe.srcdoc = code;
  outputBox.appendChild(iframe);
}

function executeJSON(code, outputBox) {
  try {
    const parsed = JSON.parse(code);
    outputBox.textContent = '✓ Valid JSON formatted:\n\n' + JSON.stringify(parsed, null, 2);
  } catch (err) {
    outputBox.classList.add('output-error');
    outputBox.textContent = '✕ Invalid JSON: ' + err.message;
  }
}

function executePython(code, outputBox) {
  if (typeof Sk === 'undefined') {
    outputBox.classList.add('output-error');
    outputBox.textContent = 'Python engine (Skulpt) is initializing or offline.';
    return;
  }

  outputBox.textContent = 'Running Python…';
  let outStr = '';

  Sk.configure({
    output: (text) => { outStr += text; },
    read: (x) => {
      if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
        throw "File not found: '" + x + "'";
      }
      return Sk.builtinFiles["files"][x];
    }
  });

  const prog = Sk.misceval.asyncToPromise(() => {
    return Sk.importMainWithBody("<stdin>", false, code, true);
  });

  prog.then(() => {
    outputBox.textContent = outStr || 'Python executed successfully (no stdout).';
  }, (err) => {
    outputBox.classList.add('output-error');
    outputBox.textContent = 'Python Error: ' + err.toString();
  });
}

function handleWikiLinkClick(targetTitle) {
  const cleanTitle = targetTitle.trim();
  const match = notes.find(n => !n.deleted && n.title.toLowerCase() === cleanTitle.toLowerCase());
  if (match) {
    openNoteInTab(match.id);
  } else {
    if (confirm(`Note "${cleanTitle}" does not exist yet. Create it now?`)) {
      const newNote = {
        id: generateId('note'),
        title: cleanTitle,
        content: `# ${cleanTitle}\n\nLinked from [[${getActiveNote()?.title || 'Backlink'}]]`,
        folderId: getActiveNote()?.folderId || null,
        tags: [],
        favorite: false,
        pinned: false,
        deleted: false,
        deletedAt: null,
        isEncrypted: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      notes.unshift(newNote);
      saveNotes();
      openNoteInTab(newNote.id);
      renderAll();
      showToast(`Created "${cleanTitle}"`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  10. TABLE OF CONTENTS (TOC) & BACKLINKS DOCKS
// ═══════════════════════════════════════════════════════════════════════════

function renderTOC() {
  const list = $('toc-list');
  if (!list) return;
  list.innerHTML = '';

  const content = $('note-content')?.value || '';
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  let match;
  let count = 0;

  while ((match = headingRegex.exec(content)) !== null) {
    count++;
    const depth = match[1].length;
    const title = match[2].trim();

    const item = document.createElement('a');
    item.className = `toc-item depth-${depth}`;
    item.textContent = title;
    item.href = '#';
    item.addEventListener('click', (e) => {
      e.preventDefault();
      jumpToHeadingInEditor(title);
    });
    list.appendChild(item);
  }

  if (count === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 italic">No headings found</p>';
  }
}

function jumpToHeadingInEditor(title) {
  if (editorMode === 'write') {
    const textarea = $('note-content');
    const idx = textarea.value.indexOf(title);
    if (idx !== -1) {
      textarea.focus();
      textarea.setSelectionRange(idx, idx + title.length);
    }
  } else {
    const preview = $('markdown-preview');
    const headings = preview.querySelectorAll('h1, h2, h3, h4');
    for (const h of headings) {
      if (h.textContent.trim().toLowerCase() === title.toLowerCase()) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  }
}

function renderBacklinks() {
  const list = $('backlinks-list');
  const activeNote = getActiveNote();
  if (!list || !activeNote) return;
  list.innerHTML = '';

  const activeTitle = activeNote.title.trim().toLowerCase();
  if (!activeTitle) {
    list.innerHTML = '<p class="text-xs text-slate-400 italic">Save note title first</p>';
    return;
  }

  const linkingNotes = notes.filter(n => {
    if (n.id === activeNote.id || n.deleted) return false;
    const wikiRegex = new RegExp(`\\[\\[${escapeRegex(activeTitle)}\\]\\]`, 'i');
    return wikiRegex.test(n.content);
  });

  if (linkingNotes.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 italic">No notes link here yet</p>';
    return;
  }

  linkingNotes.forEach(n => {
    const item = document.createElement('button');
    item.className = 'w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 text-xs text-slate-700 dark:text-slate-300 transition flex items-center justify-between';
    item.innerHTML = `
      <span class="truncate font-medium">${escapeHTML(n.title || 'Untitled')}</span>
      ${iconSvg('arrow-right', 'w-3 h-3 text-slate-400')}
    `;
    item.addEventListener('click', () => openNoteInTab(n.id));
    list.appendChild(item);
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ═══════════════════════════════════════════════════════════════════════════
//  11. CLIENT-SIDE ENCRYPTION (AES-256-GCM)
// ═══════════════════════════════════════════════════════════════════════════

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(plainText, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(plainText)
  );

  return {
    cipher: arrayBufferToBase64(cipherBuffer),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv)
  };
}

async function decryptData(cipherBase64, saltBase64, ivBase64, passphrase) {
  const dec = new TextDecoder();
  const salt = base64ToArrayBuffer(saltBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  const cipherBuffer = base64ToArrayBuffer(cipherBase64);
  const key = await deriveKey(passphrase, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    cipherBuffer
  );

  return dec.decode(plainBuffer);
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function handleUnlockNote() {
  const note = getActiveNote();
  if (!note || !note.isEncrypted) return;

  const password = $('input-unlock-password').value;
  const errorMsg = $('unlock-error-msg');
  const card = $('lock-screen-overlay')?.querySelector('.max-w-sm');

  try {
    const rawPayload = await decryptData(
      note.encryptedPayload.cipher,
      note.encryptedPayload.salt,
      note.encryptedPayload.iv,
      password
    );

    const decrypted = JSON.parse(rawPayload);
    unlockedNotes.set(note.id, {
      title: decrypted.title,
      content: decrypted.content,
      password: password
    });

    const lockOverlay = $('lock-screen-overlay');
    if (lockOverlay) {
      lockOverlay.classList.add('hidden');
      lockOverlay.style.display = 'none';
    }
    loadNoteIntoEditor(note.id);
    renderTabs();
    showToast('Note unlocked', 'success');
  } catch (err) {
    if (errorMsg) errorMsg.classList.remove('hidden');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 450);
    }
  }
}

async function saveEncryptedNote(passphrase) {
  const note = getActiveNote();
  if (!note) return;

  const plainTitle = $('note-title').value || 'Untitled Note';
  const plainContent = $('note-content').value;

  const payload = JSON.stringify({ title: plainTitle, content: plainContent });
  const encrypted = await encryptData(payload, passphrase);

  note.isEncrypted = true;
  note.encryptedTitle = '🔒 Encrypted Note';
  note.encryptedPayload = encrypted;
  note.title = '';
  note.content = '';

  unlockedNotes.set(note.id, {
    title: plainTitle,
    content: plainContent,
    password: passphrase
  });

  saveNotes();
  closeModal('encrypt-modal');
  updateEditorHeader(note);
  renderNotesList();
  renderTabs();
  showToast('Note encrypted with AES-256', 'success');
}

async function scheduleReEncryption(note, unlocked) {
  if (!unlocked.password) return;
  const payload = JSON.stringify({ title: unlocked.title, content: unlocked.content });
  const encrypted = await encryptData(payload, unlocked.password);
  note.encryptedPayload = encrypted;
  note.encryptedTitle = '🔒 Encrypted Note';
  note.title = '';
  note.content = '';
}

async function removeEncryptionFromNote() {
  const note = getActiveNote();
  if (!note || !note.isEncrypted) return;

  // Author must have unlocked the note (or provide valid passphrase) to remove encryption
  if (!unlockedNotes.has(note.id)) {
    const passAttempt = $('encrypt-pass-input')?.value || '';
    if (!passAttempt) {
      showToast('Unlock the note first to remove encryption', 'error');
      return;
    }
    try {
      const rawPayload = await decryptData(
        note.encryptedPayload.cipher,
        note.encryptedPayload.salt,
        note.encryptedPayload.iv,
        passAttempt
      );
      const dec = JSON.parse(rawPayload);
      note.title = dec.title;
      note.content = dec.content;
    } catch (e) {
      showToast('Incorrect passphrase. Cannot remove encryption.', 'error');
      return;
    }
  } else {
    const unlocked = unlockedNotes.get(note.id);
    note.title = unlocked.title;
    note.content = unlocked.content;
  }

  note.isEncrypted = false;
  delete note.encryptedTitle;
  delete note.encryptedPayload;
  unlockedNotes.delete(note.id);

  saveNotes();
  closeModal('encrypt-modal');
  loadNoteIntoEditor(note.id);
  renderAll();
  showToast('Encryption removed from note');
}

// ═══════════════════════════════════════════════════════════════════════════
//  12. CLOUDFLARE PAGES FUNCTIONS SHARING & FULLSCREEN VIEWER
// ═══════════════════════════════════════════════════════════════════════════

function openShareModal(url) {
  const input = $('share-modal-url');
  if (input) {
    input.value = url;
  }
  openModal('shareModal');
}

function generateShortShareId() {
  return Math.random().toString(36).substring(2, 8);
}

async function shareNoteById(id) {
  const note = notes.find(n => n.id === id) || getActiveNote();
  if (!note) return;

  if (note.shareUrl) {
    openShareModal(note.shareUrl);
    return;
  }

  const shortId = note.shareId || generateShortShareId();

  const shareData = note.isEncrypted
    ? {
        id: shortId,
        title: note.encryptedTitle || '🔒 Encrypted Note',
        content: '',
        isEncrypted: true,
        encryptedTitle: note.encryptedTitle || '🔒 Encrypted Note',
        encryptedPayload: note.encryptedPayload,
        language: 'markdown',
        tags: note.tags || []
      }
    : {
        id: shortId,
        title: getNoteDisplayTitle(note),
        content: note.content,
        isEncrypted: false,
        language: 'markdown',
        tags: note.tags || []
      };

  showToast('Generating share link…');

  const finalUrl = window.location.origin + '/s/' + shortId;

  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shareData)
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const resolvedId = data.id || data.key || shortId;
      const cleanUrl = window.location.origin + '/s/' + resolvedId;
      note.shareId = resolvedId;
      note.shareUrl = cleanUrl;
      saveAll();
      openShareModal(cleanUrl);
      return;
    }
  } catch (err) {
    console.warn('Share API request failed, using clean /s/ short URL format', err);
  }

  note.shareId = shortId;
  note.shareUrl = finalUrl;
  saveAll();
  openShareModal(finalUrl);
}

async function shareActiveNote() {
  if (activeNoteId) {
    await shareNoteById(activeNoteId);
  }
}

async function checkSharedRoute() {
  const hash = window.location.hash || '';
  if (hash.startsWith('#share=')) {
    setSharedViewMode(true);
    try {
      const encoded = hash.replace(/^#share=/, '');
      const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      openFullscreenSharedViewer(decoded);
      return;
    } catch (e) {
      console.warn('Failed to decode #share hash payload', e);
    }
  }

  const shortId = getSharedRouteId();
  if (!shortId) return;

  setSharedViewMode(true);

  const titleEl = $('shared-note-title');
  const bodyEl = $('shared-note-body');
  if (titleEl) titleEl.textContent = 'Loading shared note…';
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
        ${iconSvg('refresh', 'w-5 h-5 text-amber-500 svg-spin')}
        <span>Fetching note content…</span>
      </div>
    `;
  }

  // 1. Try local storage vault first (for same-browser testing / offline access)
  const localNote = notes.find(n => n.shareId === shortId || n.id === shortId);
  if (localNote) {
    openFullscreenSharedViewer({
      title: localNote.isEncrypted ? (localNote.encryptedTitle || '🔒 Encrypted Note') : (localNote.title || 'Untitled Note'),
      content: localNote.isEncrypted ? '' : (localNote.content || ''),
      isEncrypted: Boolean(localNote.isEncrypted),
      encryptedPayload: localNote.encryptedPayload || null,
      tags: localNote.tags || []
    });
    return;
  }

  // 2. Fetch from Cloudflare Pages Functions API (/api/share?id=... with /api/share/... fallback)
  let noteData = null;
  try {
    let res = await fetch(`/api/share?id=${encodeURIComponent(shortId)}`);
    if (!res.ok) {
      res = await fetch(`/api/share/${encodeURIComponent(shortId)}`);
    }
    if (res.ok) {
      const rawJson = await res.json();
      noteData = rawJson.note || rawJson.data || rawJson;
    }
  } catch (err) {
    console.warn('Unable to load shared note from API', err);
  }

  if (noteData && (noteData.title !== undefined || noteData.content !== undefined || noteData.encryptedPayload)) {
    openFullscreenSharedViewer(noteData);
  } else {
    if (titleEl) titleEl.textContent = 'Shared Note Unavailable';
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="py-10 text-center space-y-4">
          <p class="text-sm text-slate-500 dark:text-slate-400">This shared note link could not be found or has expired.</p>
          <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition no-underline">
            <span>Go to PureNotes Workspace</span>
          </a>
        </div>
      `;
    }
  }
}

function openFullscreenSharedViewer(noteData) {
  setSharedViewMode(true);

  const titleEl = $('shared-note-title');
  const bodyEl = $('shared-note-body');
  const tagsCont = $('shared-note-tags');

  if (tagsCont) {
    tagsCont.innerHTML = '';
    (noteData.tags || []).forEach(t => {
      const pill = document.createElement('span');
      pill.className = 'px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium';
      pill.textContent = '#' + t;
      tagsCont.appendChild(pill);
    });
  }

  const isDark = document.documentElement.classList.contains('dark');
  updateThemeIcons(isDark);

  openModal('sharedNoteModal');

  let resolvedTitle = noteData.title || 'Untitled Note';
  let resolvedContent = noteData.content || '';
  let isCurrentlyLocked = Boolean(noteData.isEncrypted && noteData.encryptedPayload);

  const renderSharedBodyMarkdown = (mdText) => {
    if (!bodyEl) return;
    marked.setOptions({ gfm: true, breaks: true });
    const rawHtml = marked.parse(mdText || '');
    bodyEl.innerHTML = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['iframe', 'input'],
      ADD_ATTR: ['target', 'allowfullscreen', 'type', 'checked', 'disabled']
    });
    enhanceCodeBlocks(bodyEl);
  };

  if (isCurrentlyLocked) {
    if (titleEl) titleEl.textContent = '🔒 Encrypted Shared Note';
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="max-w-sm mx-auto my-8 p-6 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/[0.08] shadow-lg text-center space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            ${iconSvg('lock', 'w-5 h-5')}
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">Passphrase Required</h3>
            <p class="text-xs text-slate-400 mt-1">This shared note is protected with client-side AES-256 encryption. Enter the passphrase to decrypt and read it.</p>
          </div>
          <div class="space-y-2">
            <input id="shared-unlock-password" type="password" placeholder="Enter decryption passphrase…"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 transition" />
            <p id="shared-unlock-error" class="text-[11px] text-red-500 hidden">Incorrect passphrase. Decryption failed.</p>
          </div>
          <button id="btn-shared-unlock-confirm"
            class="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-sm transition">
            Decrypt &amp; Read Note
          </button>
        </div>
      `;

      const unlockInput = $('shared-unlock-password');
      const unlockBtn = $('btn-shared-unlock-confirm');
      const unlockErr = $('shared-unlock-error');

      const attemptSharedDecrypt = async () => {
        if (!unlockInput) return;
        try {
          const rawDecrypted = await decryptData(
            noteData.encryptedPayload.cipher,
            noteData.encryptedPayload.salt,
            noteData.encryptedPayload.iv,
            unlockInput.value
          );
          const parsedDecrypted = JSON.parse(rawDecrypted);
          resolvedTitle = parsedDecrypted.title || 'Shared Note';
          resolvedContent = parsedDecrypted.content || '';
          isCurrentlyLocked = false;
          if (titleEl) titleEl.textContent = resolvedTitle;
          renderSharedBodyMarkdown(resolvedContent);
        } catch (err) {
          if (unlockErr) unlockErr.classList.remove('hidden');
        }
      };

      unlockBtn?.addEventListener('click', attemptSharedDecrypt);
      unlockInput?.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') attemptSharedDecrypt();
      });
      setTimeout(() => unlockInput?.focus(), 60);
    }
  } else {
    if (titleEl) titleEl.textContent = resolvedTitle;
    renderSharedBodyMarkdown(resolvedContent);
  }

  const saveSharedBtn = $('btn-save-shared-note');
  if (saveSharedBtn) {
    saveSharedBtn.onclick = () => {
      if (isCurrentlyLocked) {
        showToast('Please decrypt the shared note before saving to your vault', 'error');
        return;
      }
      const newNote = {
        id: generateId('note'),
        title: resolvedTitle,
        content: resolvedContent,
        folderId: null,
        tags: noteData.tags || ['shared'],
        favorite: false,
        pinned: false,
        deleted: false,
        deletedAt: null,
        isEncrypted: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      notes.unshift(newNote);
      saveNotes();
      setSharedViewMode(false);
      closeModal('sharedNoteModal');
      if (window.location.pathname.startsWith('/s/') || window.location.search || window.location.hash) {
        window.history.replaceState({}, '', '/');
      }
      openNoteInTab(newNote.id);
      renderAll();
      showToast('Saved shared note to your PureNotes vault!', 'success');
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  13. INTERACTIVE FORCE-DIRECTED GRAPH VIEW / MIND MAP
// ═══════════════════════════════════════════════════════════════════════════

let graphAnimFrame = null;
let graphNodes = [];
let graphLinks = [];
let graphDragNode = null;

function initGraph() {
  const canvas = $('graph-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const activeNotes = notes.filter(n => !n.deleted);

  graphNodes = activeNotes.map((n, i) => {
    const angle = (i / Math.max(1, activeNotes.length)) * 2 * Math.PI;
    const dist = 100 + Math.random() * 120;
    return {
      id: n.id,
      title: getNoteDisplayTitle(n),
      folderId: n.folderId,
      tags: n.tags || [],
      x: (rect.width / 2) + Math.cos(angle) * dist,
      y: (rect.height / 2) + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      radius: Math.min(22, 10 + Math.sqrt((n.content || '').length / 40))
    };
  });

  graphLinks = [];
  for (let i = 0; i < activeNotes.length; i++) {
    for (let j = i + 1; j < activeNotes.length; j++) {
      const n1 = activeNotes[i];
      const n2 = activeNotes[j];
      let connected = false;

      const sharedTag = n1.tags.some(t => n2.tags.includes(t));
      if (sharedTag) connected = true;

      if (n1.content.includes(`[[${n2.title}]]`) || n2.content.includes(`[[${n1.title}]]`)) {
        connected = true;
      }

      if (connected) {
        graphLinks.push({ source: graphNodes[i], target: graphNodes[j] });
      }
    }
  }

  canvas.onmousedown = (e) => {
    const pos = getCanvasMousePos(canvas, e);
    graphDragNode = graphNodes.find(n => Math.hypot(n.x - pos.x, n.y - pos.y) <= n.radius * 1.4);
  };

  canvas.onmousemove = (e) => {
    if (graphDragNode) {
      const pos = getCanvasMousePos(canvas, e);
      graphDragNode.x = pos.x;
      graphDragNode.y = pos.y;
      graphDragNode.vx = 0;
      graphDragNode.vy = 0;
    }
  };

  canvas.onmouseup = (e) => {
    if (graphDragNode) {
      const pos = getCanvasMousePos(canvas, e);
      if (Math.hypot(graphDragNode.x - pos.x, graphDragNode.y - pos.y) < 5) {
        closeModal('graph-modal');
        openNoteInTab(graphDragNode.id);
      }
      graphDragNode = null;
    }
  };

  cancelAnimationFrame(graphAnimFrame);
  function loop() {
    simulateGraphPhysics(rect.width, rect.height);
    drawGraph(ctx, rect.width, rect.height);
    graphAnimFrame = requestAnimationFrame(loop);
  }
  loop();
}

function getCanvasMousePos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function simulateGraphPhysics(w, h) {
  const cx = w / 2;
  const cy = h / 2;

  graphNodes.forEach(n => {
    if (n === graphDragNode) return;
    n.vx += (cx - n.x) * 0.0006;
    n.vy += (cy - n.y) * 0.0006;
  });

  for (let i = 0; i < graphNodes.length; i++) {
    for (let j = i + 1; j < graphNodes.length; j++) {
      const n1 = graphNodes[i];
      const n2 = graphNodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 220) {
        const force = (220 - dist) / dist * 0.04;
        if (n1 !== graphDragNode) { n1.vx -= dx * force; n1.vy -= dy * force; }
        if (n2 !== graphDragNode) { n2.vx += dx * force; n2.vy += dy * force; }
      }
    }
  }

  graphLinks.forEach(l => {
    const dx = l.target.x - l.source.x;
    const dy = l.target.y - l.source.y;
    const dist = Math.hypot(dx, dy) || 1;
    const targetDist = 90;
    const force = (dist - targetDist) * 0.003;
    if (l.source !== graphDragNode) { l.source.vx += dx * force; l.source.vy += dy * force; }
    if (l.target !== graphDragNode) { l.target.vx -= dx * force; l.target.vy -= dy * force; }
  });

  graphNodes.forEach(n => {
    if (n === graphDragNode) return;
    n.vx *= 0.88;
    n.vy *= 0.88;
    n.x += n.vx;
    n.y += n.vy;
  });
}

function drawGraph(ctx, w, h) {
  const isDark = document.documentElement.classList.contains('dark');
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.25)';
  graphLinks.forEach(l => {
    ctx.beginPath();
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
    ctx.stroke();
  });

  graphNodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
    ctx.fillStyle = n.id === activeNoteId ? '#d97706' : (isDark ? '#27272a' : '#e4e4e7');
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = n.id === activeNoteId ? '#f59e0b' : (isDark ? '#3f3f46' : '#d4d4d8');
    ctx.stroke();

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#e4e4e7' : '#27272a';
    ctx.textAlign = 'center';
    ctx.fillText(n.title.slice(0, 14), n.x, n.y + n.radius + 12);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  14. COMMAND PALETTE (CMD+K / CTRL+K)
// ═══════════════════════════════════════════════════════════════════════════

let cmdPaletteItems = [];
let cmdPaletteSelectedIndex = 0;

function openCommandPalette() {
  openModal('cmd-palette-modal');
  $('cmd-palette-input').value = '';
  renderCommandPaletteResults('');
  setTimeout(() => $('cmd-palette-input').focus(), 50);
}

function closeCommandPalette() {
  closeModal('cmd-palette-modal');
}

function renderCommandPaletteResults(query) {
  const container = $('cmd-palette-results');
  if (!container) return;
  container.innerHTML = '';

  const q = query.toLowerCase().trim();

  const defaultCommands = [
    { title: 'New Note', icon: 'plus', shortcut: 'Cmd/Ctrl + N', action: () => createNote() },
    { title: 'Save / Sync Note', icon: 'check-circle', shortcut: 'Cmd/Ctrl + S', action: () => performAutoSave() },
    { title: 'Export Current Note as PDF', icon: 'file-down', shortcut: 'Cmd/Ctrl + P', action: () => exportActiveNote('pdf') },
    { title: 'Toggle Sidebar', icon: 'columns', shortcut: 'Cmd/Ctrl + B', action: () => toggleSidebarCollapse() },
    { title: 'New Folder', icon: 'folder-plus', shortcut: 'Cmd/Ctrl + Shift + F', action: () => openFolderModal() },
    { title: 'Duplicate Note', icon: 'clone', shortcut: 'Cmd/Ctrl + D', action: () => duplicateActiveNote() },
    { title: 'Copy Markdown', icon: 'copy', shortcut: 'Cmd/Ctrl + Shift + C', action: () => copyActiveMarkdown() },
    { title: 'Toggle Dark / Light Theme', icon: 'moon', shortcut: 'Cmd/Ctrl + Shift + L', action: () => toggleTheme() },
    { title: 'Toggle Zen Mode (Fullscreen)', icon: 'expand', shortcut: 'Cmd/Ctrl + Shift + Z', action: () => toggleZenMode() },
    { title: 'Switch to Write Mode', icon: 'pen', shortcut: 'Ctrl + Alt + 1', action: () => setEditorMode('write') },
    { title: 'Switch to Split Mode', icon: 'columns', shortcut: 'Ctrl + Alt + 2', action: () => setEditorMode('split') },
    { title: 'Switch to Preview Mode', icon: 'eye', shortcut: 'Ctrl + Alt + 3', action: () => setEditorMode('preview') },
    { title: 'Open Mind Map Graph View', icon: 'network', shortcut: 'Cmd/Ctrl + G', action: () => { openModal('graph-modal'); initGraph(); } },
    { title: 'Open Analytics & Heatmap', icon: 'chart', shortcut: 'Cmd/Ctrl + I', action: () => { openModal('stats-modal'); renderAnalytics(); } },
    { title: 'Open Preferences & Settings', icon: 'sliders', shortcut: 'Cmd/Ctrl + ,', action: () => openModal('settings-modal') },
    { title: 'Export Current Note as Markdown (.md)', icon: 'file-code', shortcut: 'Cmd/Ctrl + Shift + M', action: () => exportActiveNote('md') },
    { title: 'Export Entire Vault Backup (JSON)', icon: 'download', shortcut: 'Cmd/Ctrl + Shift + E', action: () => exportVaultBackup() },
    { title: 'Import Notes (.json, .md, .txt)', icon: 'cloud-up', shortcut: 'Cmd/Ctrl + O', action: () => $('hidden-file-input')?.click() },
    { title: 'Lock / Encrypt Current Note (AES-256)', icon: 'lock', shortcut: 'Cmd/Ctrl + L', action: () => openEncryptModal() },
    { title: 'Share Note Link', icon: 'share', shortcut: 'Cmd/Ctrl + Shift + S', action: () => shareActiveNote() },
    { title: 'Empty Trash', icon: 'trash', shortcut: 'Cmd/Ctrl + Shift + Backspace', action: () => emptyTrash() },
    { title: 'Privacy Policy', icon: 'info', shortcut: 'Legal', action: () => { window.location.href = '/privacy'; } },
    { title: 'Terms of Service', icon: 'info', shortcut: 'Legal', action: () => { window.location.href = '/terms'; } },
    { title: 'Dismiss Command Palette', icon: 'x', shortcut: 'Esc', action: () => closeCommandPalette() }
  ];

  cmdPaletteItems = [];

  defaultCommands.forEach(c => {
    if (!q || c.title.toLowerCase().includes(q) || (c.shortcut && c.shortcut.toLowerCase().includes(q))) {
      cmdPaletteItems.push({ ...c, type: 'command' });
    }
  });

  notes.filter(n => !n.deleted).forEach(n => {
    const title = getNoteDisplayTitle(n);
    if (!q || title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
      cmdPaletteItems.push({
        title: title,
        icon: 'file-text',
        shortcut: '↵ Open',
        type: 'note',
        id: n.id,
        action: () => openNoteInTab(n.id)
      });
    }
  });

  cmdPaletteSelectedIndex = 0;

  if (cmdPaletteItems.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 p-4 text-center">No matching commands or notes found.</p>';
    return;
  }

  cmdPaletteItems.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs cursor-pointer transition ${
      idx === cmdPaletteSelectedIndex ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
    }`;
    el.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0 pr-3">
        ${iconSvg(item.icon, 'w-3.5 h-3.5 text-slate-400 shrink-0')}
        <span class="truncate">${escapeHTML(item.title)}</span>
      </div>
      <kbd class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.08] text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">${escapeHTML(item.shortcut)}</kbd>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCommandPalette();
      item.action();
    });

    container.appendChild(el);
  });
}

function handleCmdPaletteKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeCommandPalette();
    return;
  }

  if (cmdPaletteItems.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdPaletteSelectedIndex = (cmdPaletteSelectedIndex + 1) % cmdPaletteItems.length;
    updateCmdPaletteSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdPaletteSelectedIndex = (cmdPaletteSelectedIndex - 1 + cmdPaletteItems.length) % cmdPaletteItems.length;
    updateCmdPaletteSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = cmdPaletteItems[cmdPaletteSelectedIndex];
    if (item) {
      closeCommandPalette();
      item.action();
    }
  }
}

function updateCmdPaletteSelection() {
  const container = $('cmd-palette-results');
  const children = container.children;
  for (let i = 0; i < children.length; i++) {
    if (i === cmdPaletteSelectedIndex) {
      children[i].className = 'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs cursor-pointer bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium';
      children[i].scrollIntoView({ block: 'nearest' });
    } else {
      children[i].className = 'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  15. ANALYTICS & 14-DAY ACTIVITY HEATMAP
// ═══════════════════════════════════════════════════════════════════════════

function renderAnalytics() {
  const activeNotes = notes.filter(n => !n.deleted);
  const totalNotes = activeNotes.length;
  let totalWords = 0;

  activeNotes.forEach(n => {
    totalWords += (n.content.trim().match(/\S+/g) || []).length;
  });

  $('stat-total-notes').textContent = totalNotes;
  $('stat-total-words').textContent = totalWords.toLocaleString();
  $('stat-total-folders').textContent = folders.length;

  let streak = 1;
  const today = new Date().toDateString();
  const hasToday = activeNotes.some(n => new Date(n.updatedAt).toDateString() === today);
  $('stat-day-streak').textContent = `🔥 ${hasToday ? streak : 0}`;

  const heatmapEl = $('activity-heatmap');
  if (!heatmapEl) return;
  heatmapEl.innerHTML = '';

  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const dayStr = day.toDateString();

    const activityCount = activeNotes.filter(n => new Date(n.updatedAt).toDateString() === dayStr).length;
    let level = 0;
    if (activityCount > 0) level = 1;
    if (activityCount >= 3) level = 2;
    if (activityCount >= 6) level = 3;
    if (activityCount >= 10) level = 4;

    const cell = document.createElement('div');
    cell.className = `heatmap-cell level-${level}`;
    cell.title = `${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${activityCount} notes updated`;
    heatmapEl.appendChild(cell);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  16. FOLDERS & BULK ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

function openFolderModal(folderId = null) {
  $('folder-modal-title').textContent = folderId ? 'Edit Folder' : 'Create Folder';
  $('folder-name-input').value = folderId ? (folders.find(f => f.id === folderId)?.name || '') : '';

  const select = $('folder-parent-select');
  select.innerHTML = '<option value="">None (Top Level)</option>';
  folders.filter(f => f.id !== folderId).forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    select.appendChild(opt);
  });

  openModal('folder-modal');
  setTimeout(() => $('folder-name-input').focus(), 50);

  $('btn-save-folder').onclick = () => {
    const name = $('folder-name-input').value.trim();
    const parentId = $('folder-parent-select').value || null;
    if (!name) return;

    if (folderId) {
      const f = folders.find(fold => fold.id === folderId);
      if (f) { f.name = name; f.parentId = parentId; }
    } else {
      folders.push({
        id: generateId('f'),
        name: name,
        parentId: parentId,
        createdAt: Date.now()
      });
    }

    saveFolders();
    closeModal('folder-modal');
    renderFoldersTree();
    showToast(`Folder "${name}" saved`);
  };
}

function renderFoldersTree() {
  const treeEl = $('folders-tree');
  if (!treeEl) return;
  treeEl.innerHTML = '';

  folders.forEach(f => {
    const count = notes.filter(n => !n.deleted && n.folderId === f.id).length;
    const isSelected = currentFolderFilter === f.id;

    const item = document.createElement('div');
    item.className = `flex items-center justify-between px-2 py-1 rounded-lg text-xs cursor-pointer group transition ${
      isSelected ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
    }`;

    item.innerHTML = `
      <div class="flex items-center gap-1.5 truncate">
        ${iconSvg('folder', 'w-3 h-3 text-slate-400')}
        <span class="truncate">${escapeHTML(f.name)}</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-[10px] text-slate-400 opacity-60">(${count})</span>
        <button class="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-slate-400 text-[10px]" title="Delete Folder">
          ${iconSvg('trash', 'w-3 h-3')}
        </button>
      </div>
    `;

    item.addEventListener('click', () => {
      currentFolderFilter = currentFolderFilter === f.id ? null : f.id;
      renderFoldersTree();
      renderNotesList();
      if (!activeNoteId) renderHomeView();
      closeMobileSidebar();
    });

    const delBtn = item.querySelector('button');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete folder "${f.name}"? Notes inside will be moved to top level.`)) {
        notes.forEach(n => { if (n.folderId === f.id) n.folderId = null; });
        folders = folders.filter(fol => fol.id !== f.id);
        saveFolders();
        saveNotes();
        renderFoldersTree();
        renderNotesList();
        showToast(`Folder "${f.name}" deleted`);
      }
    });

    treeEl.appendChild(item);
  });
}

function toggleBulkMode() {
  isBulkMode = !isBulkMode;
  selectedNoteIds.clear();
  const bar = $('bulk-action-bar');
  if (bar) {
    if (isBulkMode) bar.classList.remove('hidden');
    else bar.classList.add('hidden');
  }
  renderNotesList();
  updateBulkCount();
}

function updateBulkCount() {
  const countEl = $('bulk-selected-count');
  if (countEl) countEl.textContent = `${selectedNoteIds.size} selected`;
}

function handleBulkTrash() {
  if (selectedNoteIds.size === 0) return;
  selectedNoteIds.forEach(id => {
    const note = notes.find(n => n.id === id);
    if (note) { note.deleted = true; note.deletedAt = Date.now(); }
  });
  saveNotes();
  toggleBulkMode();
  renderAll();
  showToast('Selected notes moved to Trash');
}

function handleBulkMoveFolder() {
  if (selectedNoteIds.size === 0) return;
  const folderName = prompt('Enter Folder Name to move notes to:');
  if (!folderName) return;

  let targetFolder = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
  if (!targetFolder) {
    targetFolder = { id: generateId('f'), name: folderName, parentId: null, createdAt: Date.now() };
    folders.push(targetFolder);
    saveFolders();
  }

  selectedNoteIds.forEach(id => {
    const note = notes.find(n => n.id === id);
    if (note) note.folderId = targetFolder.id;
  });

  saveNotes();
  toggleBulkMode();
  renderAll();
  showToast(`Moved notes to folder "${targetFolder.name}"`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  17. SIDEBAR NOTES LIST RENDERING
// ═══════════════════════════════════════════════════════════════════════════

function renderNotesList() {
  const container = $('notes-list');
  if (!container) return;
  container.innerHTML = '';

  let list = notes.slice();

  if (currentView === 'trash') {
    list = list.filter(n => n.deleted);
  } else {
    list = list.filter(n => !n.deleted);
    if (currentView === 'favorites') {
      list = list.filter(n => n.favorite);
    }
  }

  if (currentFolderFilter && currentView !== 'trash') {
    list = list.filter(n => n.folderId === currentFolderFilter);
  }

  if (currentTagFilter && currentView !== 'trash') {
    list = list.filter(n => n.tags.includes(currentTagFilter));
  }

  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const trashCount = notes.filter(n => n.deleted).length;
  $('trash-badge').textContent = `(${trashCount})`;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-xs text-slate-400">
        ${iconSvg('folder-open', 'w-5 h-5 mb-2 mx-auto opacity-50 block')}
        No notes found
      </div>
    `;
    return;
  }

  list.forEach(note => {
    const isActive = note.id === activeNoteId;
    const isSelected = selectedNoteIds.has(note.id);
    const title = getNoteDisplayTitle(note);
    const rawPreview = note.isEncrypted && !unlockedNotes.has(note.id)
      ? 'Encrypted note'
      : (note.content || '').replace(/^[#*-]\s+/gm, '').replace(/[`_*~#]/g, '').trim();
    const previewText = rawPreview ? rawPreview.slice(0, 80) : 'Empty note…';

    const item = document.createElement('div');
    item.className = `note-item p-2 rounded-xl border border-transparent cursor-pointer select-none transition ${
      isActive ? 'active bg-amber-500/10 border-amber-500/25' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
    }`;

    item.setAttribute('title', title);
    item.innerHTML = `
      <div class="flex items-start justify-between gap-2 w-full">
        ${isBulkMode ? `
          <input type="checkbox" class="bulk-check mt-1 w-3.5 h-3.5 text-amber-600 rounded" ${isSelected ? 'checked' : ''} />
        ` : ''}
        <div class="note-icon hidden text-slate-400">
          ${iconSvg('file-text', 'w-4 h-4')}
        </div>
        <div class="note-item-text flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-0.5">
            ${note.pinned ? iconSvg('pin', 'w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0') : ''}
            ${note.favorite ? iconSvg('heart', 'w-2.5 h-2.5 text-rose-500 fill-current shrink-0') : ''}
            ${note.isEncrypted ? iconSvg('lock', 'w-2.5 h-2.5 text-amber-500 shrink-0') : ''}
            <h4 class="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHTML(title)}</h4>
          </div>
          <p class="text-[11px] text-slate-400 truncate leading-snug">${escapeHTML(previewText)}</p>
          <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
            <span>${formatRelativeTime(note.updatedAt)}</span>
            ${note.tags.slice(0, 2).map(t => `<span class="bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.2 rounded text-[9px]">#${escapeHTML(t)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    item.addEventListener('click', () => {
      if (isBulkMode) {
        if (selectedNoteIds.has(note.id)) selectedNoteIds.delete(note.id);
        else selectedNoteIds.add(note.id);
        renderNotesList();
        updateBulkCount();
      } else {
        openNoteInTab(note.id);
      }
    });

    container.appendChild(item);
  });
}

function renderAll() {
  renderFoldersTree();
  updateTagFilterDropdown();
  renderNotesList();
  renderHomeView();
  renderTabs();
  if (activeNoteId) {
    loadNoteIntoEditor(activeNoteId);
  } else {
    renderEmptyState();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  18. IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════════════════════

function exportActiveNote(format) {
  const note = getActiveNote();
  if (!note) return;

  const title = getNoteDisplayTitle(note);
  const content = note.isEncrypted && unlockedNotes.has(note.id)
    ? unlockedNotes.get(note.id).content
    : note.content;

  if (format === 'md') {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, `${slugify(title)}.md`);
    showToast(`Exported "${title}.md"`);
  } else if (format === 'pdf') {
    window.print();
  }
}

function exportVaultBackup() {
  const vaultData = {
    version: 'purenotes-1.0',
    exportDate: new Date().toISOString(),
    notes: notes,
    folders: folders,
    settings: settings
  };

  const jsonStr = JSON.stringify(vaultData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `purenotes-vault-backup-${new Date().toISOString().slice(0, 10)}.json`);
  showToast('PureNotes vault backup exported', 'success');
}

function handleFileImport(files) {
  const fileInput = $('hidden-file-input');
  if (fileInput) {
    fileInput.setAttribute('accept', '.json, .md, .txt');
  }

  const fileList = Array.from(files || []);
  if (fileList.length === 0) return;

  fileList.forEach(file => {
    const reader = new FileReader();
    const lowerName = (file.name || '').toLowerCase();

    if (lowerName.endsWith('.json')) {
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const incomingNotes = Array.isArray(parsed)
            ? parsed
            : (Array.isArray(parsed?.notes) ? parsed.notes : (parsed && typeof parsed === 'object' && (parsed.title || parsed.content) ? [parsed] : []));

          const incomingFolders = (!Array.isArray(parsed) && Array.isArray(parsed?.folders))
            ? parsed.folders
            : [];

          if (incomingFolders.length > 0) {
            const existingFolderIds = new Set(folders.map(f => f.id));
            incomingFolders.forEach(rawFolder => {
              if (!rawFolder || typeof rawFolder !== 'object' || !rawFolder.name) return;
              const folderId = (rawFolder.id && !existingFolderIds.has(rawFolder.id))
                ? rawFolder.id
                : generateId('f');
              existingFolderIds.add(folderId);
              folders.push({
                id: folderId,
                name: String(rawFolder.name).trim(),
                parentId: rawFolder.parentId || null,
                createdAt: rawFolder.createdAt || Date.now()
              });
            });
            saveFolders();
          }

          if (incomingNotes.length > 0) {
            const existingNoteIds = new Set(notes.map(n => n.id));
            let importedCount = 0;

            incomingNotes.slice().reverse().forEach(rawNote => {
              if (!rawNote || typeof rawNote !== 'object') return;
              let resolvedId = rawNote.id ? String(rawNote.id) : generateId('note');
              if (existingNoteIds.has(resolvedId)) {
                resolvedId = generateId('note');
              }
              existingNoteIds.add(resolvedId);

              const normalizedNote = {
                id: resolvedId,
                title: typeof rawNote.title === 'string' ? rawNote.title : 'Untitled Note',
                content: typeof rawNote.content === 'string' ? rawNote.content : (typeof rawNote.body === 'string' ? rawNote.body : ''),
                folderId: rawNote.folderId || null,
                tags: Array.isArray(rawNote.tags) ? rawNote.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean) : ['imported'],
                favorite: Boolean(rawNote.favorite),
                pinned: Boolean(rawNote.pinned),
                deleted: Boolean(rawNote.deleted),
                deletedAt: rawNote.deletedAt || null,
                isEncrypted: Boolean(rawNote.isEncrypted),
                encryptedTitle: rawNote.encryptedTitle || undefined,
                encryptedPayload: rawNote.encryptedPayload || undefined,
                createdAt: rawNote.createdAt || Date.now(),
                updatedAt: rawNote.updatedAt || Date.now()
              };

              notes.unshift(normalizedNote);
              importedCount++;
            });

            saveNotes();
            renderFoldersTree();
            updateTagFilterDropdown();
            renderNotesList();
            renderHomeView($('home-search-input')?.value || '');
            renderTabs();
            showToast(`Imported ${importedCount} note${importedCount === 1 ? '' : 's'} from JSON`, 'success');
          } else {
            showToast('No valid notes found in JSON file', 'error');
          }
        } catch (err) {
          showToast('Failed to parse JSON file', 'error');
        }
      };
      reader.readAsText(file);
    } else if (lowerName.endsWith('.md') || lowerName.endsWith('.txt') || file.type.startsWith('text/')) {
      reader.onload = (e) => {
        const title = file.name.replace(/\.[^/.]+$/, '') || 'Untitled Note';
        const rawContent = typeof e.target.result === 'string' ? e.target.result : '';
        const newNote = {
          id: generateId('note'),
          title: title,
          content: rawContent,
          folderId: currentFolderFilter || null,
          tags: ['imported'],
          favorite: false,
          pinned: false,
          deleted: false,
          deletedAt: null,
          isEncrypted: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        notes.unshift(newNote);
        saveNotes();
        renderFoldersTree();
        updateTagFilterDropdown();
        renderNotesList();
        renderHomeView($('home-search-input')?.value || '');
        renderTabs();
        if (activeNoteId) {
          openNoteInTab(newNote.id);
        }
        showToast(`Imported "${title}"`, 'success');
      };
      reader.readAsText(file);
    } else {
      showToast('Unsupported file type. Please upload .json, .md, or .txt files.', 'error');
    }
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
//  19. MODALS & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add('hidden');
}

function openEncryptModal() {
  const note = getActiveNote();
  if (!note) return;

  if (note.isEncrypted && !unlockedNotes.has(note.id)) {
    showToast('Unlock this note first to manage its encryption settings', 'info');
    $('input-unlock-password')?.focus();
    return;
  }

  const removeBtn = $('btn-remove-encryption');
  if (note.isEncrypted && unlockedNotes.has(note.id)) {
    $('encrypt-modal-title').textContent = 'Update Encryption';
    removeBtn?.classList.remove('hidden');
  } else {
    $('encrypt-modal-title').textContent = 'Encrypt Note (AES-256)';
    removeBtn?.classList.add('hidden');
  }

  $('encrypt-pass-input').value = '';
  $('encrypt-pass-confirm').value = '';
  openModal('encrypt-modal');
  setTimeout(() => $('encrypt-pass-input')?.focus(), 50);
}

function updateStats() {
  const textarea = $('note-content');
  if (!textarea) return;
  const text = textarea.value;

  const words = (text.trim().match(/\S+/g) || []).length;
  const chars = text.length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  $('stat-words').textContent = `${words} words`;
  $('stat-chars').textContent = `${chars} characters`;
  $('stat-reading-time').textContent = `${readTime} min read`;

  const pos = textarea.selectionStart;
  const line = (text.substring(0, pos).match(/\n/g) || []).length + 1;
  const col = pos - text.lastIndexOf('\n', pos - 1);
  $('stat-cursor-pos').textContent = `Ln ${line}, Col ${col}`;
}

function updateWordGoalUI() {
  const textarea = $('note-content');
  if (!textarea) return;
  const words = (textarea.value.trim().match(/\S+/g) || []).length;
  const goal = settings.dailyWordGoal || 500;
  const pct = Math.min(100, Math.round((words / goal) * 100));

  $('goal-progress-text').textContent = `${words}/${goal}`;
  $('goal-progress-bar').style.width = `${pct}%`;
}

function showToast(message, type = 'info') {
  const container = $('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-enter px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl backdrop-blur-md border flex items-center gap-2 select-none pointer-events-auto bg-white/95 dark:bg-[#18181b]/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-white/[0.08]';

  let iconName = 'info';
  let iconColor = 'text-amber-500';
  if (type === 'success') { iconName = 'check-circle'; iconColor = 'text-emerald-500'; }
  if (type === 'error') { iconName = 'alert-circle'; iconColor = 'text-red-500'; }

  toast.innerHTML = `${iconSvg(iconName, `w-4 h-4 ${iconColor}`)} <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.className = toast.className.replace('toast-enter', 'toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, TOAST_DURATION_MS);
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ═══════════════════════════════════════════════════════════════════════════
//  20. GLOBAL EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

function setupEventListeners() {
  $('brand-logo-container')?.addEventListener('click', goHome);
  $('btn-toggle-sidebar-collapse')?.addEventListener('click', toggleSidebarCollapse);

  $('btn-theme')?.addEventListener('click', toggleTheme);
  $('btn-shared-theme')?.addEventListener('click', toggleTheme);

  $('btn-new-note')?.addEventListener('click', () => createNote());
  $('btn-tab-new')?.addEventListener('click', () => createNote());
  $('btn-empty-new-note')?.addEventListener('click', () => createNote());
  $('btn-new-folder')?.addEventListener('click', () => { closeMobileSidebar(); openFolderModal(); });

  $('home-search-input')?.addEventListener('input', (e) => renderHomeView(e.target.value));
  $('btn-home-new-note')?.addEventListener('click', () => createNote());
  $('btn-home-import')?.addEventListener('click', () => $('hidden-file-input').click());

  $('btn-cmd-palette-trigger')?.addEventListener('click', () => { closeMobileSidebar(); openCommandPalette(); });
  $('cmd-palette-input')?.addEventListener('input', (e) => renderCommandPaletteResults(e.target.value));
  $('cmd-palette-input')?.addEventListener('keydown', handleCmdPaletteKeydown);
  $('btn-cmd-palette-esc')?.addEventListener('click', () => closeCommandPalette());
  $('cmd-palette-modal')?.addEventListener('click', (e) => {
    if (e.target === $('cmd-palette-modal')) {
      closeCommandPalette();
    }
  });

  $('nav-all-notes')?.addEventListener('click', () => {
    goHome('all');
  });
  $('nav-favorites')?.addEventListener('click', () => {
    goHome('favorites');
  });
  $('nav-trash')?.addEventListener('click', () => {
    goHome('trash');
  });
  $('btn-empty-trash')?.addEventListener('click', () => {
    emptyTrash();
  });
  $('btn-cancel-modal-delete')?.addEventListener('click', () => {
    pendingDeleteModalAction = null;
    closeModal('delete-modal');
  });
  $('btn-confirm-modal-delete')?.addEventListener('click', () => {
    if (typeof pendingDeleteModalAction === 'function') {
      const fn = pendingDeleteModalAction;
      pendingDeleteModalAction = null;
      fn();
    } else {
      closeModal('delete-modal');
    }
  });
  $('delete-modal')?.addEventListener('click', (e) => {
    if (e.target === $('delete-modal')) {
      pendingDeleteModalAction = null;
      closeModal('delete-modal');
    }
  });

  $('tag-filter-select')?.addEventListener('change', (e) => {
    currentTagFilter = e.target.value;
    renderNotesList();
    if (!activeNoteId) renderHomeView();
  });

  window.addEventListener('resize', updateLineNumbers);

  $('btn-toggle-bulk')?.addEventListener('click', toggleBulkMode);
  $('btn-bulk-cancel')?.addEventListener('click', toggleBulkMode);
  $('btn-bulk-trash')?.addEventListener('click', handleBulkTrash);
  $('btn-bulk-move-folder')?.addEventListener('click', handleBulkMoveFolder);
  $('btn-bulk-select-all')?.addEventListener('click', () => {
    notes.filter(n => !n.deleted).forEach(n => selectedNoteIds.add(n.id));
    renderNotesList();
    updateBulkCount();
  });

  $('note-title')?.addEventListener('input', updateActiveNoteContent);
  const contentArea = $('note-content');
  contentArea?.addEventListener('input', () => {
    updateActiveNoteContent();
    updateLineNumbers();
    updateStats();
    if (editorMode !== 'write') renderMarkdownPreview();
  });
  contentArea?.addEventListener('scroll', syncEditorScroll);
  contentArea?.addEventListener('keyup', updateStats);
  contentArea?.addEventListener('click', updateStats);

  $('tag-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagToActiveNote(e.target.value);
      e.target.value = '';
    }
  });

  $('btn-mode-write')?.addEventListener('click', () => setEditorMode('write'));
  $('btn-mode-split')?.addEventListener('click', () => setEditorMode('split'));
  $('btn-mode-preview')?.addEventListener('click', () => setEditorMode('preview'));

  // Delegated listener on preview container for interactive task checkboxes
  $('markdown-preview')?.addEventListener('click', (e) => {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    const taskIndex = parseInt(checkbox.getAttribute('data-task-index') ?? '-1', 10);
    const lineAttr = checkbox.getAttribute('data-line');
    const lineNumber = lineAttr !== null ? parseInt(lineAttr, 10) : null;
    toggleTaskCheckboxInMarkdown(taskIndex, checkbox.checked, lineNumber);
  });

  $('btn-toggle-favorite')?.addEventListener('click', () => {
    const note = getActiveNote();
    if (note) {
      note.favorite = !note.favorite;
      saveNotes();
      updateEditorHeader(note);
      renderNotesList();
      renderTabs();
    }
  });

  $('btn-toggle-pin')?.addEventListener('click', () => {
    const note = getActiveNote();
    if (note) {
      note.pinned = !note.pinned;
      saveNotes();
      updateEditorHeader(note);
      renderNotesList();
    }
  });

  $('btn-toggle-lock')?.addEventListener('click', openEncryptModal);
  $('btn-toggle-zen')?.addEventListener('click', toggleZenMode);
  $('btn-exit-zen')?.addEventListener('click', toggleZenMode);

  $('btn-toggle-toc')?.addEventListener('click', () => {
    $('toc-dock').classList.toggle('dock-hidden');
    $('backlinks-dock').classList.add('dock-hidden');
  });
  $('btn-close-toc')?.addEventListener('click', () => $('toc-dock').classList.add('dock-hidden'));

  $('btn-toggle-backlinks')?.addEventListener('click', () => {
    $('backlinks-dock').classList.toggle('dock-hidden');
    $('toc-dock').classList.add('dock-hidden');
  });
  $('btn-close-backlinks')?.addEventListener('click', () => $('backlinks-dock').classList.add('dock-hidden'));

  $('btn-share-note')?.addEventListener('click', shareActiveNote);
  $('btn-trash-note')?.addEventListener('click', () => {
    if (activeNoteId) softDeleteNote(activeNoteId);
  });

  $('btn-copy-markdown')?.addEventListener('click', copyActiveMarkdown);
  $('btn-duplicate-note')?.addEventListener('click', duplicateActiveNote);
  $('btn-export-md')?.addEventListener('click', () => exportActiveNote('md'));
  $('btn-export-pdf')?.addEventListener('click', () => exportActiveNote('pdf'));

  $('btn-close-share-modal')?.addEventListener('click', () => closeModal('shareModal'));
  $('btn-share-copy')?.addEventListener('click', async () => {
    const url = $('share-modal-url')?.value;
    if (url) {
      await navigator.clipboard.writeText(url);
      const copyBtn = $('btn-share-copy');
      if (copyBtn) {
        copyBtn.innerHTML = `${iconSvg('check', 'w-3 h-3 mr-1.5')}Copied!`;
        setTimeout(() => {
          copyBtn.innerHTML = `${iconSvg('copy', 'w-3 h-3 mr-1.5')}Copy Link`;
        }, 1800);
      }
      showToast('Share link copied to clipboard!', 'success');
    }
  });
  $('btn-share-open')?.addEventListener('click', () => {
    const url = $('share-modal-url')?.value;
    if (url) window.open(url, '_blank');
  });

  $('btn-banner-restore')?.addEventListener('click', () => {
    if (activeNoteId) restoreNote(activeNoteId);
  });
  $('btn-banner-perm-delete')?.addEventListener('click', () => {
    if (activeNoteId) {
      if (confirm('Permanently delete this note? This action cannot be undone.')) {
        permanentlyDeleteNote(activeNoteId);
      }
    }
  });

  $('btn-unlock-confirm')?.addEventListener('click', handleUnlockNote);
  $('input-unlock-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlockNote();
  });
  $('btn-unlock-cancel')?.addEventListener('click', () => {
    if (openTabs.length > 1) closeTab(activeNoteId);
    else renderEmptyState();
  });

  $('btn-cancel-encrypt')?.addEventListener('click', () => closeModal('encrypt-modal'));
  $('btn-save-encrypt')?.addEventListener('click', () => {
    const pass = $('encrypt-pass-input').value;
    const confirmPass = $('encrypt-pass-confirm').value;
    if (!pass) { showToast('Please enter a passphrase', 'error'); return; }
    if (pass !== confirmPass) { showToast('Passphrases do not match', 'error'); return; }
    saveEncryptedNote(pass);
  });
  $('btn-remove-encryption')?.addEventListener('click', removeEncryptionFromNote);

  $('btn-close-shared-modal')?.addEventListener('click', () => {
    closeModal('sharedNoteModal');
    if (window.location.pathname.startsWith('/s/')) {
      window.history.replaceState({}, '', '/');
    }
  });

  $('btn-close-graph')?.addEventListener('click', () => {
    closeModal('graph-modal');
    cancelAnimationFrame(graphAnimFrame);
  });
  $('btn-graph-reset')?.addEventListener('click', initGraph);

  $('btn-close-stats')?.addEventListener('click', () => closeModal('stats-modal'));
  $('btn-close-settings')?.addEventListener('click', () => closeModal('settings-modal'));
  $('btn-settings-save')?.addEventListener('click', () => closeModal('settings-modal'));
  $('btn-cancel-folder')?.addEventListener('click', () => closeModal('folder-modal'));

  $('setting-font-family')?.addEventListener('change', (e) => {
    settings.fontFamily = e.target.value;
    saveSettings();
  });
  document.querySelectorAll('.btn-font-size').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-font-size').forEach(b => {
        b.className = 'btn-font-size px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs';
      });
      btn.className = 'btn-font-size px-3 py-1.5 rounded-lg border border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold';
      settings.fontSize = btn.getAttribute('data-size');
      saveSettings();
    });
  });
  $('setting-line-numbers')?.addEventListener('change', (e) => {
    settings.showLineNumbers = e.target.checked;
    saveSettings();
  });
  $('setting-word-goal')?.addEventListener('change', (e) => {
    settings.dailyWordGoal = parseInt(e.target.value, 10) || 500;
    saveSettings();
  });
  $('btn-settings-export-vault')?.addEventListener('click', exportVaultBackup);
  $('btn-settings-import-notes')?.addEventListener('click', () => {
    const fileInput = $('hidden-file-input');
    if (fileInput) {
      fileInput.setAttribute('accept', '.json, .md, .txt');
      fileInput.click();
    }
  });

  $('btn-footer-graph')?.addEventListener('click', () => { closeMobileSidebar(); openModal('graph-modal'); initGraph(); });
  $('btn-footer-stats')?.addEventListener('click', () => { closeMobileSidebar(); openModal('stats-modal'); renderAnalytics(); });
  $('btn-footer-settings')?.addEventListener('click', () => { closeMobileSidebar(); openModal('settings-modal'); });

  $('btn-open-sidebar')?.addEventListener('click', toggleMobileSidebar);
  $('btn-mobile-menu')?.addEventListener('click', toggleMobileSidebar);
  $('btn-close-sidebar')?.addEventListener('click', closeMobileSidebar);
  $('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    $('drop-overlay').classList.add('active');
  });
  window.addEventListener('dragleave', (e) => {
    if (e.clientX <= 0 || e.clientY <= 0) {
      $('drop-overlay').classList.remove('active');
    }
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    $('drop-overlay').classList.remove('active');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleFileImport(e.dataTransfer.files);
    }
  });

  $('btn-empty-import')?.addEventListener('click', () => $('hidden-file-input').click());
  $('hidden-file-input')?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileImport(e.target.files);
      e.target.value = '';
    }
  });

  window.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('is-shared-view') || document.documentElement.classList.contains('is-shared-route')) {
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modal = $('cmd-palette-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
      return;
    }
    if (e.key === 'Escape') {
      const cmdModal = $('cmd-palette-modal');
      if (cmdModal && !cmdModal.classList.contains('hidden')) {
        e.preventDefault();
        closeCommandPalette();
        return;
      }
      if (isZenMode) toggleZenMode();
      closeModal('shareModal');
      closeModal('sharedNoteModal');
      closeModal('graph-modal');
      closeModal('stats-modal');
      closeModal('settings-modal');
      closeModal('folder-modal');
      closeModal('encrypt-modal');
      return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); toggleSidebarCollapse(); }
      else if (k === 's') { e.preventDefault(); performAutoSave(); }
      else if (k === ',') { e.preventDefault(); openModal('settings-modal'); }
    }
    if ((e.metaKey || e.ctrlKey) && e.altKey) {
      if (e.key === '1') { e.preventDefault(); setEditorMode('write'); }
      if (e.key === '2') { e.preventDefault(); setEditorMode('split'); }
      if (e.key === '3') { e.preventDefault(); setEditorMode('preview'); }
    }
  });
}

function setActiveNavView(activeBtnId) {
  ['nav-all-notes', 'nav-favorites', 'nav-trash'].forEach(id => {
    const btn = $(id);
    if (!btn) return;
    if (id === activeBtnId) {
      btn.className = 'px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs';
    } else {
      btn.className = 'px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 text-xs';
    }
  });
}

function openMobileSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  if (sidebar) {
    sidebar.classList.add('show-sidebar');
    sidebar.classList.remove('sidebar-hidden');
  }
  if (overlay) {
    overlay.classList.remove('overlay-hidden');
  }
}

function closeMobileSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  if (sidebar) {
    sidebar.classList.remove('show-sidebar');
    sidebar.classList.add('sidebar-hidden');
  }
  if (overlay) {
    overlay.classList.add('overlay-hidden');
  }
}

function toggleMobileSidebar() {
  const sidebar = $('sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('show-sidebar')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}
