// DOM Elements
export const elements = {
  fileBrowser: document.getElementById('file-browser') as HTMLDivElement,
  editorContainer: document.getElementById('editor-container') as HTMLDivElement,
  tabBar: document.getElementById('tab-bar') as HTMLDivElement,
  fileName: document.getElementById('file-name') as HTMLSpanElement,
  saveBtn: document.getElementById('save-btn') as HTMLButtonElement,
  newFolderBtn: document.getElementById('new-folder-btn') as HTMLButtonElement,
  newFileBtn: document.getElementById('new-file-btn') as HTMLButtonElement,
  refreshBtn: document.getElementById('refresh-btn') as HTMLButtonElement,
  openFolderBtn: document.getElementById('open-folder-btn') as HTMLButtonElement,
  contextMenu: document.getElementById('context-menu') as HTMLDivElement,
  dialogOverlay: document.getElementById('dialog-overlay') as HTMLDivElement,
  dialogTitle: document.getElementById('dialog-title') as HTMLSpanElement,
  dialogInput: document.getElementById('dialog-input') as HTMLInputElement,
  dialogHint: document.querySelector('.dialog-hint') as HTMLSpanElement,
  dialogConfirm: document.getElementById('dialog-confirm') as HTMLButtonElement,
  dialogCancel: document.getElementById('dialog-cancel') as HTMLButtonElement,
  dialogClose: document.getElementById('dialog-close') as HTMLButtonElement,
  deleteItemBtn: document.getElementById('delete-item-btn') as HTMLButtonElement,
  renameItemBtn: document.getElementById('rename-item-btn') as HTMLButtonElement,
  newFolderInCtx: document.getElementById('new-folder-in-ctx') as HTMLButtonElement,
  newFileInCtx: document.getElementById('new-file-in-ctx') as HTMLButtonElement,
  editorContextMenu: document.getElementById('editor-context-menu') as HTMLDivElement,
  editorUndo: document.getElementById('editor-undo') as HTMLButtonElement,
  editorRedo: document.getElementById('editor-redo') as HTMLButtonElement,
  editorCut: document.getElementById('editor-cut') as HTMLButtonElement,
  editorCopy: document.getElementById('editor-copy') as HTMLButtonElement,
  editorPaste: document.getElementById('editor-paste') as HTMLButtonElement,
  editorSelectAll: document.getElementById('editor-select-all') as HTMLButtonElement,
};

// App State
export interface AppState {
  editor: import('@tiptap/core').Editor | null;
  currentPath: string | null;
  rootPath: string | null;
  currentFile: SelectedItem | null;
  hasUnsavedChanges: boolean;
  contextMenuPath: string;
}

export interface SelectedItem {
  name: string;
  path: string;
}

export interface FileItemData {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItemData[];
  loaded?: boolean;
}

// Utility functions
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function classIf(condition: boolean, className: string): string {
  return condition ? className : '';
}

export function joinPath(...parts: string[]): string {
  return parts.join('\\').replace(/\\\\/g, '\\');
}

export function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || '';
}

export function getParentPath(filePath: string): string {
  return filePath.replace(/[/\\][^/\\]+$/, '');
}