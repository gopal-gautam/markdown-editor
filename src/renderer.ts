import './index.css';

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TurndownService from 'turndown';

import './types';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface SelectedItem {
  name: string;
  path: string;
}

let editor: Editor | null = null;
let currentPath: string | null = null;
let currentFile: SelectedItem | null = null;
let hasUnsavedChanges = false;
let contextMenuPath: string | null = null;

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const fileBrowser = document.getElementById('file-browser') as HTMLDivElement;
const editorContainer = document.getElementById('editor-container') as HTMLDivElement;
const fileNameDisplay = document.getElementById('file-name') as HTMLSpanElement;
const newFolderBtn = document.getElementById('new-folder-btn') as HTMLButtonElement;
const newFileBtn = document.getElementById('new-file-btn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const deleteItemBtn = document.getElementById('delete-item-btn') as HTMLButtonElement;
const renameItemBtn = document.getElementById('rename-item-btn') as HTMLButtonElement;
const openFolderBtn = document.getElementById('open-folder-btn') as HTMLButtonElement;
const contextMenu = document.getElementById('context-menu') as HTMLDivElement;

interface FileItemData {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItemData[];
  loaded?: boolean;
}

let rootPath: string | null = null;
const expandedFolders = new Set<string>();
const openTabs: SelectedItem[] = [];
const expandedFoldersData = new Map<string, FileItemData[]>();

const renderFileTreeItem = (item: FileItemData, depth: number = 0): string => {
  const isExpanded = expandedFolders.has(item.path);
  const childHtml = item.isDirectory && isExpanded && item.children
    ? item.children.map(child => renderFileTreeItem(child, depth + 1)).join('')
    : '';

  return `
    <div class="file-item" data-path="${escapeHtml(item.path)}" data-is-dir="${item.isDirectory}" style="padding-left: ${depth * 16 + 8}px">
      ${item.isDirectory ? `<span class="chevron">${isExpanded ? '▼' : '▶'}</span>` : ''}
      <span class="file-icon">${item.isDirectory ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 14.5 4H6.71l-2.21-2.5H1.5z"/></svg>' : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.45 0 .883.184 1.207.525l2.623 2.958c.317.357.493.822.493 1.299v8.468A1.75 1.75 0 0 1 13.75 15h-10A1.75 1.75 0 0 1 2 13.25v-11.5z"/></svg>'}</span>
      <span class="file-name">${escapeHtml(item.name)}</span>
    </div>
    ${childHtml}
  `;
};

const renderFileTree = (items: FileItemData[]): string => {
  return items.map(item => renderFileTreeItem(item)).join('');
};

const loadDirectory = async (dirPath: string, isRoot = false) => {
  if (isRoot) {
    rootPath = dirPath;
    expandedFolders.clear();
  }
  if (!rootPath && !rootPath) {
    rootPath = dirPath;
  }
  currentPath = dirPath;

  try {
    let items = expandedFoldersData.get(dirPath);
    if (!items) {
      const rawItems = await window.electronAPI.readDirectory(dirPath);
      items = rawItems.map(item => ({
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory,
        children: undefined,
        loaded: false
      }));
      expandedFoldersData.set(dirPath, items);
    }
    if (!isRoot) {
      const parentPath = dirPath.replace(/[/\\][^/\\]+$/, '');
      const parentItems = expandedFoldersData.get(parentPath);
      if (parentItems) {
        const parentItem = parentItems.find(p => p.path === dirPath);
        if (parentItem) {
          parentItem.children = items;
          parentItem.loaded = true;
        }
      }
    }
    const rootItems = expandedFoldersData.get(rootPath!);
    fileBrowser.innerHTML = renderFileTree(rootItems || []);
    attachFileListeners();
  } catch (err) {
    console.error('Failed to load directory:', err);
  }
};

const attachFileListeners = () => {
  const fileItems = fileBrowser.querySelectorAll('.file-item');
  fileItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      const path = (item as HTMLElement).dataset.path!;
      const isDir = (item as HTMLElement).dataset.isDir === 'true';
      const chevron = item.querySelector('.chevron');

      if (isDir && (e.target as HTMLElement).classList.contains('chevron')) {
        if (expandedFolders.has(path)) {
          expandedFolders.delete(path);
        } else {
          expandedFolders.add(path);
        }
        const rootItems = expandedFoldersData.get(rootPath!);
        fileBrowser.innerHTML = renderFileTree(rootItems || []);
        attachFileListeners();
        return;
      }

      document.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      if (isDir) {
        if (!expandedFolders.has(path)) {
          expandedFolders.add(path);
        }
        await loadDirectory(path);
      } else {
        await openFile(path);
      }
    });

    item.addEventListener('dblclick', async () => {
      const path = (item as HTMLElement).dataset.path!;
      const isDir = (item as HTMLElement).dataset.isDir === 'true';

      if (isDir) {
        if (!expandedFolders.has(path)) {
          expandedFolders.add(path);
        }
        await loadDirectory(path);
      } else {
        await openFile(path);
      }
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextMenuPath = (item as HTMLElement).dataset.path!;
      const isDir = (item as HTMLElement).dataset.isDir === 'true';

      const rect = (item as HTMLElement).getBoundingClientRect();
      contextMenu.style.top = `${rect.bottom}px`;
      contextMenu.style.left = `${rect.left}px`;
      contextMenu.style.display = 'block';

      deleteItemBtn.style.display = 'flex';
      renameItemBtn.style.display = 'flex';
      newFolderInCtx.style.display = 'flex';
      newFileInCtx.style.display = 'flex';
      (deleteItemBtn as HTMLButtonElement).dataset.path = contextMenuPath;
      (renameItemBtn as HTMLButtonElement).dataset.path = contextMenuPath;
      (renameItemBtn as HTMLButtonElement).dataset.isDir = isDir.toString();
    });
  });
};

const tabBar = document.getElementById('tab-bar') as HTMLDivElement;
const newFolderInCtx = document.getElementById('new-folder-in-ctx') as HTMLButtonElement;
const newFileInCtx = document.getElementById('new-file-in-ctx') as HTMLButtonElement;

const findTab = (path: string) => openTabs.findIndex(t => t.path === path);

const openFile = async (filePath: string) => {
  const existingTab = findTab(filePath);
  if (existingTab >= 0) {
    setActiveTab(filePath);
    return;
  }

  if (currentFile && hasUnsavedChanges) {
    if (!confirm('Do you want to save changes?')) return;
    await saveFile();
  }

  const content = await window.electronAPI.readFile(filePath);
  const fileName = filePath.split(/[/\\]/).pop()!;
  currentFile = { name: fileName, path: filePath };

  openTabs.push({ name: fileName, path: filePath });
  renderTabs();

  if (editor) {
    editor.commands.setContent(markdownToHtml(content));
  }

  hasUnsavedChanges = false;
  updateSaveStatus();
};

const setActiveTab = (path: string) => {
  const tabIndex = findTab(path);
  if (tabIndex < 0) return;

  if (currentFile && hasUnsavedChanges) {
    saveFile();
  }

  const tab = openTabs[tabIndex];
  currentFile = { name: tab.name, path: tab.path };

  openTabs.splice(tabIndex, 1);
  openTabs.unshift(tab);
  renderTabs();

  window.electronAPI.readFile(path).then(content => {
    if (editor) {
      editor.commands.setContent(markdownToHtml(content));
    }
    hasUnsavedChanges = false;
    updateSaveStatus();
  });
};

const closeTab = async (path: string, e: Event) => {
  e.stopPropagation();
  const tabIndex = findTab(path);
  if (tabIndex < 0) return;

  if (hasUnsavedChanges && currentFile?.path === path) {
    if (!confirm('Do you want to save changes?')) return;
    await saveFile();
  }

  if (currentFile?.path === path) {
    openTabs.splice(tabIndex, 1);
    if (openTabs.length > 0) {
      const newTab = openTabs[0];
      currentFile = newTab;
      window.electronAPI.readFile(newTab.path).then(content => {
        if (editor) editor.commands.setContent(markdownToHtml(content));
      });
    } else {
      currentFile = null;
      if (editor) editor.commands.setContent('<p></p>');
    }
    renderTabs();
    hasUnsavedChanges = false;
    updateSaveStatus();
  } else {
    openTabs.splice(tabIndex, 1);
    renderTabs();
  }
};

const renderTabs = () => {
  if (!tabBar) return;
  if (openTabs.length === 0) {
    tabBar.innerHTML = '<span class="tab empty">No file open</span>';
    return;
  }

  tabBar.innerHTML = openTabs.map(tab => {
    const isActive = currentFile?.path === tab.path;
    return `<span class="tab ${isActive ? 'active' : ''}" data-path="${escapeHtml(tab.path)}">${escapeHtml(tab.name)}${hasUnsavedChanges && isActive ? ' •' : ''}<button class="tab-close" data-path="${escapeHtml(tab.path)}">&times;</button></span>`;
  }).join('');

  tabBar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const path = (tab as HTMLElement).dataset.path!;
      setActiveTab(path);
    });
  });

  tabBar.querySelectorAll('.tab-close').forEach(btn => {
    btn.addEventListener('click', (e) => closeTab((btn as HTMLElement).dataset.path!, e));
  });
};

const markdownToHtml = (markdown: string): string => {
  const lines = (markdown || '').split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return '<p></p>';

  let html = '<p>';
  let inCodeBlock = false;
  let inBulletList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>';
        inCodeBlock = false;
      } else {
        if (inBulletList) { html = html.replace(/<li>(.+)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
        if (inOrderedList) { html = html.replace(/<li>(.+)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }
        html += '</p><pre><code>';
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html += line + '\n';
      continue;
    }

    if (line.match(/^#{1,6}\s/)) {
      if (inBulletList) { html = html.replace(/<li>(.+)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
      if (inOrderedList) { html = html.replace(/<li>(.+)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }
      const level = line.match(/^#{1,6}/)![0].length;
      html += `</p><h${level}>${line.replace(/^#{1,6}\s+/, '')}</h${level}><p>`;
      continue;
    }

    if (line.match(/^[-*]\s/)) {
      if (!inBulletList) {
        if (inOrderedList) { html = html.replace(/<li>(.+)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }
        html += '<ul>';
        inBulletList = true;
      }
      html += `<li>${line.replace(/^[-*]\s+/, '')}</li>`;
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      if (!inOrderedList) {
        if (inBulletList) { html = html.replace(/<li>(.+)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
        html += '<ol>';
        inOrderedList = true;
      }
      html += `<li>${line.replace(/^\d+\.\s+/, '')}</li>`;
      continue;
    }

    if (inBulletList) { html = html.replace(/<li>(.+)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
    if (inOrderedList) { html = html.replace(/<li>(.+)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }

    if (line.match(/^>\s/)) {
      html += `</p><blockquote>${line.replace(/^>\s*/, '')}</blockquote><p>`;
      continue;
    }

    if (line.trim() === '') {
      html += '</p><p>';
      continue;
    }

    let processedLine = line
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/_(.+?)_/g, '<u>$1</u>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    html += processedLine;
  }

  if (inBulletList) { html = html.replace(/<li>(.+)<\/li>$/, '<ul>$&</ul>'); }
  if (inOrderedList) { html = html.replace(/<li>(.+)<\/li>$/, '<ol>$&</ol>'); }
  if (inCodeBlock) { html += '</code></pre>'; }

  html += '</p>';
  return html;
};

const htmlToMarkdown = (): string => {
  if (!editor) return '';

  const doc = editor.getHTML();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = doc;

  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    switch (tagName) {
      case 'h1': return `# ${processNodeList(el)}\n`;
      case 'h2': return `## ${processNodeList(el)}\n`;
      case 'h3': return `### ${processNodeList(el)}\n`;
      case 'h4': return `#### ${processNodeList(el)}\n`;
      case 'h5': return `##### ${processNodeList(el)}\n`;
      case 'h6': return `###### ${processNodeList(el)}\n`;
      case 'p': return `${processNodeList(el)}\n`;
      case 'br': return '\n';
      case 'div': return processNodeList(el);
      case 'strong':
      case 'b': return `**${processNodeList(el)}**`;
      case 'em':
      case 'i': return `*${processNodeList(el)}*`;
      case 'u': return `_${processNodeList(el)}_`;
      case 'del':
      case 's': return `~~${processNodeList(el)}~~`;
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return processNodeList(el);
        }
        return `\`${processNodeList(el)}\``;
      case 'pre': return `\`\`\`\n${processNodeList(el)}\n\`\`\`\n`;
      case 'a':
        const href = el.getAttribute('href') || '';
        const text = processNodeList(el);
        return href ? `[${text}](${href})` : text;
      case 'img':
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return src ? `![${alt}](${src})` : '';
      case 'blockquote':
        const content = processNodeList(el).trim();
        if (!content) return '';
        return content.split('\n').map(q => `> ${q}`).join('\n') + '\n';
      case 'ul':
      case 'ol':
        const listContent = processNodeList(el);
        if (!listContent.trim()) return '';
        return listContent + '\n';
      case 'li': return `- ${processNodeList(el).replace(/\n/g, '\n  ')}\n`;
      case 'hr': return '---\n';
      default: return processNodeList(el);
    }
  };

  const processNodeList = (parent: Element): string => {
    return Array.from(parent.childNodes).map(processNode).join('');
  };

  let markdown = '';
  Array.from(tempDiv.childNodes).forEach(node => {
    const text = processNode(node);
    if (text) markdown += text;
  });

  markdown = markdown.replace(/\n{3,}/g, '\n\n').replace(/\n$/gm, '');
  return markdown.trim();
};

const saveFile = async () => {
  if (!currentFile) return;
  const markdown = htmlToMarkdown();
  const success = await window.electronAPI.writeFile(currentFile.path, markdown);
  if (success) {
    hasUnsavedChanges = false;
    updateSaveStatus();
  }
};

const updateSaveStatus = () => {
  if (fileNameDisplay) {
    fileNameDisplay.textContent = currentFile
      ? `${currentFile.name}${hasUnsavedChanges ? ' •' : ''}`
      : 'No file open';
  }
};

const initEditor = () => {
  editor = new Editor({
    element: editorContainer,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '<p></p>',
    onUpdate: () => {
      hasUnsavedChanges = true;
      updateSaveStatus();
    },
  });

  setupToolbar();
};

const setupToolbar = () => {
  const buttons = [
    { id: 'bold-btn', command: () => editor?.chain().focus().toggleBold().run(), active: () => editor?.isActive('bold') },
    { id: 'italic-btn', command: () => editor?.chain().focus().toggleItalic().run(), active: () => editor?.isActive('italic') },
    { id: 'underline-btn', command: () => editor?.chain().focus().toggleUnderline().run(), active: () => editor?.isActive('underline') },
    { id: 'strike-btn', command: () => editor?.chain().focus().toggleStrike().run(), active: () => editor?.isActive('strike') },
    { id: 'code-btn', command: () => editor?.chain().focus().toggleCode().run(), active: () => editor?.isActive('code') },
    { id: 'h1-btn', command: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => editor?.isActive('heading', { level: 1 }) },
    { id: 'h2-btn', command: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor?.isActive('heading', { level: 2 }) },
    { id: 'h3-btn', command: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: () => editor?.isActive('heading', { level: 3 }) },
    { id: 'bullet-list-btn', command: () => editor?.chain().focus().toggleBulletList().run(), active: () => editor?.isActive('bulletList') },
    { id: 'ordered-list-btn', command: () => editor?.chain().focus().toggleOrderedList().run(), active: () => editor?.isActive('orderedList') },
    { id: 'blockquote-btn', command: () => editor?.chain().focus().toggleBlockquote().run(), active: () => editor?.isActive('blockquote') },
    { id: 'code-block-btn', command: () => editor?.chain().focus().toggleCodeBlock().run(), active: () => editor?.isActive('codeBlock') },
    { id: 'task-list-btn', command: () => editor?.chain().focus().toggleTaskList().run(), active: () => editor?.isActive('taskList') },
    { id: 'left-align-btn', command: () => editor?.chain().focus().setTextAlign('left').run(), active: () => editor?.isActive({ textAlign: 'left' }) },
    { id: 'center-align-btn', command: () => editor?.chain().focus().setTextAlign('center').run(), active: () => editor?.isActive({ textAlign: 'center' }) },
    { id: 'right-align-btn', command: () => editor?.chain().focus().setTextAlign('right').run(), active: () => editor?.isActive({ textAlign: 'right' }) },
    { id: 'justify-btn', command: () => editor?.chain().focus().setTextAlign('justify').run(), active: () => editor?.isActive({ textAlign: 'justify' }) },
  ];

  const updateToolbar = () => {
    buttons.forEach(btn => {
      const element = document.getElementById(btn.id);
      if (element) {
        const isActive = btn.active();
        element.classList.toggle('active', isActive);
      }
    });
  };

  buttons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      element.addEventListener('click', () => {
        btn.command();
        editor?.commands.focus();
        updateToolbar();
      });
    }
  });

  editor?.on('selectionUpdate', updateToolbar);
  editor?.on('transaction', updateToolbar);
  updateToolbar();

  const linkBtn = document.getElementById('link-btn');
  if (linkBtn) {
    linkBtn.addEventListener('click', () => {
      showDialog('link', '', (url) => {
        editor?.chain().focus().setLink({ href: url }).run();
      });
    });
  }

  const imageBtn = document.getElementById('image-btn');
  if (imageBtn) {
    imageBtn.addEventListener('click', () => {
      showDialog('image', '', (url) => {
        editor?.chain().focus().setImage({ src: url }).run();
      });
    });
  }

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveFile);

  document.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      await saveFile();
    }
  });
};

let dialogMode: 'new-file' | 'new-folder' | 'rename' | 'link' | 'image' = 'new-file';
let dialogCallback: ((name: string) => void) | null = null;

const dialogOverlay = document.getElementById('dialog-overlay') as HTMLDivElement;
const dialogTitle = document.getElementById('dialog-title') as HTMLSpanElement;
const dialogInput = document.getElementById('dialog-input') as HTMLInputElement;
const dialogHint = document.querySelector('.dialog-hint') as HTMLSpanElement;
const dialogConfirm = document.getElementById('dialog-confirm') as HTMLButtonElement;
const dialogCancel = document.getElementById('dialog-cancel') as HTMLButtonElement;
const dialogClose = document.getElementById('dialog-close') as HTMLButtonElement;

const showDialog = (mode: 'new-file' | 'new-folder' | 'rename' | 'link' | 'image', defaultName = '', callback?: (name: string) => void) => {
  dialogMode = mode;
  dialogInput.value = defaultName;
  dialogCallback = callback || null;

  if (mode === 'new-file') {
    dialogTitle.textContent = 'New File';
    dialogHint.textContent = '.md will be added automatically';
    dialogConfirm.textContent = 'Create';
    dialogInput.placeholder = 'File name';
  } else if (mode === 'new-folder') {
    dialogTitle.textContent = 'New Folder';
    dialogHint.textContent = '';
    dialogConfirm.textContent = 'Create';
    dialogInput.placeholder = 'Folder name';
  } else if (mode === 'link') {
    dialogTitle.textContent = 'Insert Link';
    dialogHint.textContent = '';
    dialogConfirm.textContent = 'Insert';
    dialogInput.placeholder = 'https://example.com';
  } else if (mode === 'image') {
    dialogTitle.textContent = 'Insert Image';
    dialogHint.textContent = '';
    dialogConfirm.textContent = 'Insert';
    dialogInput.placeholder = 'https://example.com/image.jpg';
  } else {
    dialogTitle.textContent = 'Rename';
    dialogHint.textContent = '';
    dialogConfirm.textContent = 'Rename';
    dialogInput.placeholder = 'Name';
  }

  dialogOverlay.classList.add('show');
  dialogInput.focus();
};

const hideDialog = () => {
  dialogOverlay.classList.remove('show');
  dialogInput.value = '';
  dialogCallback = null;
};

const handleDialogConfirm = async () => {
  const name = dialogInput.value.trim();
  if (!name) {
    dialogInput.focus();
    return;
  }

  if (dialogMode === 'new-file') {
    const targetPath = contextMenuPath || currentPath;
    const fileName = name.endsWith('.md') ? name : name + '.md';
    await window.electronAPI.createFile(`${targetPath}\\${fileName}`);
    await loadDirectory(rootPath!, true);
    hideDialog();
  } else if (dialogMode === 'new-folder') {
    const targetPath = contextMenuPath || currentPath;
    await window.electronAPI.createFolder(`${targetPath}\\${name}`);
    await loadDirectory(rootPath!, true);
    hideDialog();
  } else if (dialogMode === 'link' && dialogCallback) {
    dialogCallback(name);
    editor?.commands.focus();
    hideDialog();
  } else if (dialogMode === 'image' && dialogCallback) {
    dialogCallback(name);
    editor?.commands.focus();
    hideDialog();
  } else if (dialogMode === 'rename' && dialogCallback) {
    dialogCallback(name);
    hideDialog();
  } else {
    hideDialog();
  }
};

dialogConfirm.addEventListener('click', handleDialogConfirm);
dialogCancel.addEventListener('click', hideDialog);
dialogClose.addEventListener('click', hideDialog);
dialogInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleDialogConfirm();
  if (e.key === 'Escape') hideDialog();
});
dialogOverlay.addEventListener('click', (e) => {
  if (e.target === dialogOverlay) hideDialog();
});

const init = async () => {
  const docsPath = await window.electronAPI.getDocumentsPath();
  await loadDirectory(docsPath);
  initEditor();

  newFolderBtn.addEventListener('click', () => {
    showDialog('new-folder');
  });

  newFileBtn.addEventListener('click', () => {
    showDialog('new-file');
  });

  refreshBtn.addEventListener('click', async () => {
    if (currentPath) await loadDirectory(currentPath);
  });

  deleteItemBtn.addEventListener('click', async () => {
    const path = (deleteItemBtn as HTMLButtonElement).dataset.path;
    if (path && confirm('Delete this item?')) {
      await window.electronAPI.deleteItem(path);
      if (rootPath) await loadDirectory(rootPath, true);
    }
    contextMenu.style.display = 'none';
  });

  renameItemBtn.addEventListener('click', async () => {
    const path = (renameItemBtn as HTMLButtonElement).dataset.path;
    const isDir = (renameItemBtn as HTMLButtonElement).dataset.isDir === 'true';
    if (path) {
      const oldName = path.split(/[/\\]/).pop()!;
      showDialog('rename', oldName, async (name) => {
        const newPath = `${path.replace(/[/\\][^/\\]+$/, '')}\\${isDir ? name : name.endsWith('.md') ? name : name + '.md'}`;
        await window.electronAPI.renameItem(path, newPath);
        if (rootPath) await loadDirectory(rootPath, true);
      });
    }
    contextMenu.style.display = 'none';
  });

  newFolderInCtx.addEventListener('click', () => {
    contextMenu.style.display = 'none';
    showDialog('new-folder');
  });

  newFileInCtx.addEventListener('click', () => {
    contextMenu.style.display = 'none';
    showDialog('new-file');
  });

  openFolderBtn.addEventListener('click', async () => {
    const folder = await window.electronAPI.showOpenFolder();
    if (folder) await loadDirectory(folder, true);
  });

  document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
    contextMenuPath = '';
  });

  contextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
};

init();