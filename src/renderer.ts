import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

import { elements, AppState, FileItemData, SelectedItem, escapeHtml, getFileName, getParentPath, joinPath } from './lib/utils';
import { markdownToHtml, htmlToMarkdown } from './lib/markdown';

import './index.css';

// State
const state: AppState = {
  editor: null,
  currentPath: null,
  rootPath: null,
  currentFile: null,
  hasUnsavedChanges: false,
  contextMenuPath: '',
};

// File system caches
const expandedFolders = new Set<string>();
const openTabs: SelectedItem[] = [];
const expandedFoldersData = new Map<string, FileItemData[]>();

// ============ FILE BROWSER ============

function renderTreeItem(item: FileItemData, depth = 0): string {
  const isExpanded = expandedFolders.has(item.path);
  const childHtml = item.isDirectory && isExpanded && item.children
    ? item.children.map(child => renderTreeItem(child, depth + 1)).join('')
    : '';

  const icon = item.isDirectory
    ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 14.5 4H6.71l-2.21-2.5H1.5z"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.45 0 .883.184 1.207.525l2.623 2.958c.317.357.493.822.493 1.299v8.468A1.75 1.75 0 0 1 13.75 15h-10A1.75 1.75 0 0 1 2 13.25v-11.5z"/></svg>';

  return `
    <div class="file-item" data-path="${escapeHtml(item.path)}" data-is-dir="${item.isDirectory}" style="padding-left: ${depth * 16 + 8}px">
      ${item.isDirectory ? `<span class="chevron">${isExpanded ? '▼' : '▶'}</span>` : ''}
      <span class="file-icon">${icon}</span>
      <span class="file-name">${escapeHtml(item.name)}</span>
    </div>
    ${childHtml}
  `;
}

function renderFileTree(items: FileItemData[]): string {
  return items.map(item => renderTreeItem(item)).join('');
}

async function loadDirectory(dirPath: string, isRoot = false): Promise<void> {
  if (isRoot || !state.rootPath) {
    state.rootPath = dirPath;
    expandedFolders.clear();
  }
  state.currentPath = dirPath;

  try {
    let items = expandedFoldersData.get(dirPath);
    if (!items) {
      const rawItems = await window.electronAPI.readDirectory(dirPath);
      items = rawItems.map(item => ({
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory,
        children: undefined,
        loaded: false,
      }));
      expandedFoldersData.set(dirPath, items);
    }

    if (!isRoot && state.rootPath) {
      const parentItems = expandedFoldersData.get(state.rootPath);
      const parentItem = parentItems?.find(p => p.path === dirPath);
      if (parentItem) {
        parentItem.children = items;
        parentItem.loaded = true;
      }
    }

    const rootItems = expandedFoldersData.get(state.rootPath!);
    elements.fileBrowser.innerHTML = renderFileTree(rootItems || []);
    attachFileListeners();
  } catch (err) {
    console.error('Failed to load directory:', err);
  }
}

// ============ FILE LISTENERS ============

function attachFileListeners(): void {
  elements.fileBrowser.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const target = item as HTMLElement;
      const path = target.dataset.path!;
      const isDir = target.dataset.isDir === 'true';
      const chevron = item.querySelector('.chevron');

      if (isDir && (e.target as HTMLElement).classList.contains('chevron')) {
        if (expandedFolders.has(path)) {
          expandedFolders.delete(path);
        } else {
          expandedFolders.add(path);
        }
        const rootItems = expandedFoldersData.get(state.rootPath!);
        elements.fileBrowser.innerHTML = renderFileTree(rootItems || []);
        attachFileListeners();
        return;
      }

      elements.fileBrowser.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      if (isDir) {
        expandedFolders.add(path);
        await loadDirectory(path);
      } else {
        await openFile(path);
      }
    });

    item.addEventListener('dblclick', async () => {
      const path = (item as HTMLElement).dataset.path!;
      const isDir = (item as HTMLElement).dataset.isDir === 'true';

      if (isDir) {
        expandedFolders.add(path);
        await loadDirectory(path);
      } else {
        await openFile(path);
      }
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      state.contextMenuPath = (item as HTMLElement).dataset.path!;
      const isDir = (item as HTMLElement).dataset.isDir === 'true';

      const rect = (item as HTMLElement).getBoundingClientRect();
      elements.contextMenu.style.top = `${rect.bottom}px`;
      elements.contextMenu.style.left = `${rect.left}px`;
      elements.contextMenu.style.display = 'block';

      elements.deleteItemBtn.style.display = 'flex';
      elements.renameItemBtn.style.display = 'flex';
      elements.newFolderInCtx.style.display = 'flex';
      elements.newFileInCtx.style.display = 'flex';

      (elements.deleteItemBtn as HTMLButtonElement).dataset.path = state.contextMenuPath;
      (elements.renameItemBtn as HTMLButtonElement).dataset.path = state.contextMenuPath;
      (elements.renameItemBtn as HTMLButtonElement).dataset.isDir = isDir.toString();
    });
  });
}

// ============ FILE OPERATIONS ============

const findTabIndex = (path: string) => openTabs.findIndex(t => t.path === path);

async function openFile(filePath: string): Promise<void> {
  const existingTab = findTabIndex(filePath);
  if (existingTab >= 0) {
    setActiveTab(filePath);
    return;
  }

  if (state.currentFile && state.hasUnsavedChanges) {
    if (!confirm('Do you want to save changes?')) return;
    await saveFile();
  }

  const content = await window.electronAPI.readFile(filePath);
  const fileName = getFileName(filePath);
  state.currentFile = { name: fileName, path: filePath };

  openTabs.push({ name: fileName, path: filePath });
  renderTabs();

  if (state.editor) {
    state.editor.commands.setContent(markdownToHtml(content));
  }

  state.hasUnsavedChanges = false;
  updateSaveStatus();
}

function setActiveTab(path: string): void {
  const tabIndex = findTabIndex(path);
  if (tabIndex < 0) return;

  if (state.currentFile && state.hasUnsavedChanges) {
    saveFile();
  }

  const tab = openTabs[tabIndex];
  state.currentFile = tab;

  openTabs.splice(tabIndex, 1);
  openTabs.unshift(tab);
  renderTabs();

  window.electronAPI.readFile(path).then(content => {
    if (state.editor) state.editor.commands.setContent(markdownToHtml(content));
    state.hasUnsavedChanges = false;
    updateSaveStatus();
  });
}

async function closeTab(path: string, e: Event): Promise<void> {
  e.stopPropagation();
  const tabIndex = findTabIndex(path);
  if (tabIndex < 0) return;

  if (state.hasUnsavedChanges && state.currentFile?.path === path) {
    if (!confirm('Do you want to save changes?')) return;
    await saveFile();
  }

  if (state.currentFile?.path === path) {
    openTabs.splice(tabIndex, 1);
    if (openTabs.length > 0) {
      const newTab = openTabs[0];
      state.currentFile = newTab;
      const content = await window.electronAPI.readFile(newTab.path);
      if (state.editor) state.editor.commands.setContent(markdownToHtml(content));
    } else {
      state.currentFile = null;
      if (state.editor) state.editor.commands.setContent('<p></p>');
    }
    renderTabs();
    state.hasUnsavedChanges = false;
    updateSaveStatus();
  } else {
    openTabs.splice(tabIndex, 1);
    renderTabs();
  }
}

function renderTabs(): void {
  if (openTabs.length === 0) {
    elements.tabBar.innerHTML = '<span class="tab empty">No file open</span>';
    return;
  }

  elements.tabBar.innerHTML = openTabs.map(tab => {
    const isActive = state.currentFile?.path === tab.path;
    return `<span class="tab ${isActive ? 'active' : ''}" data-path="${escapeHtml(tab.path)}">${escapeHtml(tab.name)}${state.hasUnsavedChanges && isActive ? ' •' : ''}<button class="tab-close" data-path="${escapeHtml(tab.path)}">&times;</button></span>`;
  }).join('');

  elements.tabBar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => setActiveTab((tab as HTMLElement).dataset.path!));
  });

  elements.tabBar.querySelectorAll('.tab-close').forEach(btn => {
    btn.addEventListener('click', (e) => closeTab((btn as HTMLElement).dataset.path!, e));
  });
}

// ============ SAVE/LOAD ============

async function saveFile(): Promise<void> {
  if (!state.currentFile || !state.editor) return;

  const element = state.editor.options.element;
  const markdown = htmlToMarkdown(element);
  const success = await window.electronAPI.writeFile(state.currentFile.path, markdown);

  if (success) {
    state.hasUnsavedChanges = false;
    updateSaveStatus();
  }
}

function updateSaveStatus(): void {
  if (!elements.fileName) return;
  elements.fileName.textContent = state.currentFile
    ? `${state.currentFile.name}${state.hasUnsavedChanges ? ' •' : ''}`
    : 'No file open';
}

// ============ EDITOR ============

function initEditor(): void {
  state.editor = new Editor({
    element: elements.editorContainer,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '<p></p>',
    onUpdate: () => {
      state.hasUnsavedChanges = true;
      updateSaveStatus();
    },
  });

  setupToolbar();
}

function setupToolbar(): void {
  if (!state.editor) return;

  const buttons = [
    { id: 'bold-btn', command: () => state.editor?.chain().focus().toggleBold().run(), active: () => state.editor?.isActive('bold') },
    { id: 'italic-btn', command: () => state.editor?.chain().focus().toggleItalic().run(), active: () => state.editor?.isActive('italic') },
    { id: 'underline-btn', command: () => state.editor?.chain().focus().toggleUnderline().run(), active: () => state.editor?.isActive('underline') },
    { id: 'strike-btn', command: () => state.editor?.chain().focus().toggleStrike().run(), active: () => state.editor?.isActive('strike') },
    { id: 'code-btn', command: () => state.editor?.chain().focus().toggleCode().run(), active: () => state.editor?.isActive('code') },
    { id: 'h1-btn', command: () => state.editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => state.editor?.isActive('heading', { level: 1 }) },
    { id: 'h2-btn', command: () => state.editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => state.editor?.isActive('heading', { level: 2 }) },
    { id: 'h3-btn', command: () => state.editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: () => state.editor?.isActive('heading', { level: 3 }) },
    { id: 'bullet-list-btn', command: () => state.editor?.chain().focus().toggleBulletList().run(), active: () => state.editor?.isActive('bulletList') },
    { id: 'ordered-list-btn', command: () => state.editor?.chain().focus().toggleOrderedList().run(), active: () => state.editor?.isActive('orderedList') },
    { id: 'blockquote-btn', command: () => state.editor?.chain().focus().toggleBlockquote().run(), active: () => state.editor?.isActive('blockquote') },
    { id: 'code-block-btn', command: () => state.editor?.chain().focus().toggleCodeBlock().run(), active: () => state.editor?.isActive('codeBlock') },
    { id: 'task-list-btn', command: () => state.editor?.chain().focus().toggleTaskList().run(), active: () => state.editor?.isActive('taskList') },
    { id: 'left-align-btn', command: () => state.editor?.chain().focus().setTextAlign('left').run(), active: () => state.editor?.isActive({ textAlign: 'left' }) },
    { id: 'center-align-btn', command: () => state.editor?.chain().focus().setTextAlign('center').run(), active: () => state.editor?.isActive({ textAlign: 'center' }) },
    { id: 'right-align-btn', command: () => state.editor?.chain().focus().setTextAlign('right').run(), active: () => state.editor?.isActive({ textAlign: 'right' }) },
    { id: 'justify-btn', command: () => state.editor?.chain().focus().setTextAlign('justify').run(), active: () => state.editor?.isActive({ textAlign: 'justify' }) },
  ];

  const updateToolbar = () => {
    buttons.forEach(btn => {
      const element = document.getElementById(btn.id);
      if (element) {
        element.classList.toggle('active', btn.active());
      }
    });
  };

  buttons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      element.addEventListener('click', () => {
        btn.command();
        state.editor?.commands.focus();
        updateToolbar();
      });
    }
  });

  state.editor.on('selectionUpdate', updateToolbar);
  state.editor.on('transaction', updateToolbar);
  updateToolbar();

  // Link button
  document.getElementById('link-btn')?.addEventListener('click', () => {
    showDialog('link', '', (url) => state.editor?.chain().focus().setLink({ href: url }).run());
  });

  // Image button
  document.getElementById('image-btn')?.addEventListener('click', () => {
    showDialog('image', '', (url) => state.editor?.chain().focus().setImage({ src: url }).run());
  });

  // Save button
  elements.saveBtn?.addEventListener('click', saveFile);

  // Keyboard shortcuts
  document.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      await saveFile();
    }
  });
}

// ============ DIALOG ============

type DialogMode = 'new-file' | 'new-folder' | 'rename' | 'link' | 'image';

let dialogMode: DialogMode = 'new-file';
let dialogCallback: ((name: string) => void) | null = null;

function showDialog(mode: DialogMode, defaultName = '', callback?: (name: string) => void): void {
  dialogMode = mode;
  elements.dialogInput.value = defaultName;
  dialogCallback = callback || null;

  switch (mode) {
    case 'new-file':
      elements.dialogTitle.textContent = 'New File';
      elements.dialogHint.textContent = '.md will be added automatically';
      elements.dialogConfirm.textContent = 'Create';
      elements.dialogInput.placeholder = 'File name';
      break;
    case 'new-folder':
      elements.dialogTitle.textContent = 'New Folder';
      elements.dialogHint.textContent = '';
      elements.dialogConfirm.textContent = 'Create';
      elements.dialogInput.placeholder = 'Folder name';
      break;
    case 'link':
      elements.dialogTitle.textContent = 'Insert Link';
      elements.dialogHint.textContent = '';
      elements.dialogConfirm.textContent = 'Insert';
      elements.dialogInput.placeholder = 'https://example.com';
      break;
    case 'image':
      elements.dialogTitle.textContent = 'Insert Image';
      elements.dialogHint.textContent = '';
      elements.dialogConfirm.textContent = 'Insert';
      elements.dialogInput.placeholder = 'https://example.com/image.jpg';
      break;
    case 'rename':
      elements.dialogTitle.textContent = 'Rename';
      elements.dialogHint.textContent = '';
      elements.dialogConfirm.textContent = 'Rename';
      elements.dialogInput.placeholder = 'Name';
      break;
  }

  elements.dialogOverlay.classList.add('show');
  elements.dialogInput.focus();
}

function hideDialog(): void {
  elements.dialogOverlay.classList.remove('show');
  elements.dialogInput.value = '';
  dialogCallback = null;
}

async function handleDialogConfirm(): Promise<void> {
  const name = elements.dialogInput.value.trim();
  if (!name) {
    elements.dialogInput.focus();
    return;
  }

  const targetPath = state.contextMenuPath || state.currentPath;

  switch (dialogMode) {
    case 'new-file': {
      const fileName = name.endsWith('.md') ? name : name + '.md';
      await window.electronAPI.createFile(joinPath(targetPath!, fileName));
      await loadDirectory(state.rootPath!, true);
      break;
    }
    case 'new-folder': {
      await window.electronAPI.createFolder(joinPath(targetPath!, name));
      await loadDirectory(state.rootPath!, true);
      break;
    }
    case 'link':
    case 'image': {
      if (dialogCallback) {
        dialogCallback(name);
        state.editor?.commands.focus();
      }
      break;
    }
    case 'rename': {
      if (dialogCallback) {
        dialogCallback(name);
      }
      break;
    }
  }

  hideDialog();
}

elements.dialogConfirm.addEventListener('click', handleDialogConfirm);
elements.dialogCancel.addEventListener('click', hideDialog);
elements.dialogClose.addEventListener('click', hideDialog);
elements.dialogInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleDialogConfirm();
  if (e.key === 'Escape') hideDialog();
});
elements.dialogOverlay.addEventListener('click', (e) => {
  if (e.target === elements.dialogOverlay) hideDialog();
});

// ============ INITIALIZATION ============

async function init(): Promise<void> {
  const docsPath = await window.electronAPI.getDocumentsPath();
  await loadDirectory(docsPath, true);
  initEditor();

  // Menu bar buttons
  document.getElementById('menu-open-folder')?.addEventListener('click', async () => {
    const folder = await window.electronAPI.showOpenFolder();
    if (folder) await loadDirectory(folder, true);
  });
  document.getElementById('menu-new-folder')?.addEventListener('click', () => showDialog('new-folder'));
  document.getElementById('menu-new-file')?.addEventListener('click', () => showDialog('new-file'));
  document.getElementById('menu-save')?.addEventListener('click', saveFile);

  // Edit menu
  document.getElementById('menu-undo')?.addEventListener('click', () => state.editor?.chain().focus().undo().run());
  document.getElementById('menu-redo')?.addEventListener('click', () => state.editor?.chain().focus().redo().run());
  document.getElementById('menu-cut')?.addEventListener('click', () => document.execCommand('cut'));
  document.getElementById('menu-copy')?.addEventListener('click', () => document.execCommand('copy'));
  document.getElementById('menu-paste')?.addEventListener('click', () => document.execCommand('paste'));

  // Sidebar toggle
  let sidebarVisible = true;
  document.getElementById('menu-toggle-sidebar')?.addEventListener('click', () => {
    sidebarVisible = !sidebarVisible;
    elements.fileBrowser.parentElement!.style.display = sidebarVisible ? 'flex' : 'none';
  });

  // Toolbar buttons
  elements.newFolderBtn?.addEventListener('click', () => showDialog('new-folder'));
  elements.newFileBtn?.addEventListener('click', () => showDialog('new-file'));
  elements.refreshBtn?.addEventListener('click', async () => {
    if (state.currentPath) await loadDirectory(state.currentPath);
  });

  // Context menu buttons
  elements.deleteItemBtn.addEventListener('click', async () => {
    const path = (elements.deleteItemBtn as HTMLButtonElement).dataset.path;
    if (path && confirm('Delete this item?')) {
      await window.electronAPI.deleteItem(path);
      if (state.rootPath) await loadDirectory(state.rootPath, true);
    }
    elements.contextMenu.style.display = 'none';
  });

  elements.renameItemBtn.addEventListener('click', async () => {
    const path = (elements.renameItemBtn as HTMLButtonElement).dataset.path;
    const isDir = (elements.renameItemBtn as HTMLButtonElement).dataset.isDir === 'true';
    if (path) {
      const oldName = getFileName(path);
      showDialog('rename', oldName, async (name) => {
        const newPath = joinPath(getParentPath(path), isDir ? name : name.endsWith('.md') ? name : name + '.md');
        await window.electronAPI.renameItem(path, newPath);
        if (state.rootPath) await loadDirectory(state.rootPath, true);
      });
    }
    elements.contextMenu.style.display = 'none';
  });

  elements.newFolderInCtx.addEventListener('click', () => {
    elements.contextMenu.style.display = 'none';
    showDialog('new-folder');
  });

  elements.newFileInCtx.addEventListener('click', () => {
    elements.contextMenu.style.display = 'none';
    showDialog('new-file');
  });

  elements.openFolderBtn.addEventListener('click', async () => {
    const folder = await window.electronAPI.showOpenFolder();
    if (folder) await loadDirectory(folder, true);
  });

  document.addEventListener('click', () => {
    elements.contextMenu.style.display = 'none';
    state.contextMenuPath = '';
  });
}

init();