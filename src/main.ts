import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import log from 'electron-log';
import { AIProvider, PROVIDERS } from './lib/ai-config';

log.initialize();
log.transports.file.level = 'info';

let rootFolderPath: string | null = null;

const getAIConfigPath = () => {
  return path.join(app.getPath('userData'), 'ai-settings.json');
};

const ensureAIConfigDir = () => {
  const configDir = app.getPath('userData');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return true;
};

export const loadAIConfig = (): { provider: AIProvider; model: string; apiKey: string; baseUrl: string } | null => {
  const configPath = getAIConfigPath();
  if (!configPath) return null;
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    // silently ignore
  }
  return null;
};

export const saveAIConfig = (config: { provider: AIProvider; model: string; apiKey: string; baseUrl: string }) => {
  if (!ensureAIConfigDir()) return false;
  const configPath = getAIConfigPath();
  if (!configPath) return false;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return true;
};

export const setRootFolder = (folderPath: string) => {
  rootFolderPath = folderPath;
  try {
    const recentPath = path.join(app.getPath('userData'), 'recent-folder.json');
    fs.writeFileSync(recentPath, JSON.stringify({ path: folderPath }));
  } catch {}
};

app.applicationMenu = null;

if (started) {
  app.quit();
}

const getDocumentsPath = () => {
  return path.join(app.getPath('documents'), 'MarkdownEditor');
};

const ensureDocumentsDir = () => {
  const docsPath = getDocumentsPath();
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  return docsPath;
};

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

const readDirectory = (dirPath: string): FileItem[] => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items
      .filter(item => item.isDirectory() || item.name.endsWith('.md'))
      .map(item => ({
        name: item.name,
        path: path.join(dirPath, item.name),
        isDirectory: item.isDirectory(),
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();
};

ipcMain.handle('fs:read-directory', async (_, dirPath: string) => {
  return readDirectory(dirPath);
});

ipcMain.handle('fs:read-file', async (_, filePath: string) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
});

ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:create-folder', async (_, folderPath: string) => {
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:create-file', async (_, filePath: string) => {
  try {
    fs.writeFileSync(filePath, '', 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:delete-item', async (_, itemPath: string) => {
  try {
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      fs.rmSync(itemPath, { recursive: true });
    } else {
      fs.unlinkSync(itemPath);
    }
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:rename-item', async (_, oldPath: string, newPath: string) => {
  try {
    fs.renameSync(oldPath, newPath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('app:get-documents-path', async () => {
  return ensureDocumentsDir();
});

ipcMain.handle('dialog:show-open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths[0]) {
    setRootFolder(result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('ai:get-providers', async () => {
  return PROVIDERS;
});

ipcMain.handle('ai:load-config', async () => {
  return loadAIConfig();
});

ipcMain.handle('ai:save-config', async (_, config: { provider: AIProvider; model: string; apiKey: string; baseUrl: string }) => {
  saveAIConfig(config);
  return true;
});

ipcMain.handle('app:set-root-folder', async (_, folderPath: string) => {
  setRootFolder(folderPath);
  return true;
});

ipcMain.handle('app:get-root-folder', async () => {
  return rootFolderPath;
});

ipcMain.handle('app:load-recent-folder', async () => {
  try {
    const recentPath = path.join(app.getPath('userData'), 'recent-folder.json');
    if (fs.existsSync(recentPath)) {
      const data = JSON.parse(fs.readFileSync(recentPath, 'utf-8'));
      return data.path || null;
    }
  } catch {}
  return null;
});

ipcMain.on('ai:generate-stream', async (event, messages: { role: string; content: string }[]) => {
  const config = loadAIConfig();
  if (!config) {
    event.sender.send('ai:stream-error', 'AI not configured. Please set up AI settings first.');
    return;
  }

  try {
    const { buildHeaders, buildStreamBody, getStreamEndpoint, parseStreamLine } = await import('./lib/ai-config');

    const headers = buildHeaders(config);
    const body = buildStreamBody(config.provider, config.model, messages);
    const endpoint = getStreamEndpoint(config);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorLower = errorText.toLowerCase();
      if (errorLower.includes('image') && (errorLower.includes('does not support') || errorLower.includes('not supported') || errorLower.includes('not allow') || errorLower.includes('cannot'))) {
        event.sender.send('ai:stream-error', 'This model does not support image input.');
        return;
      }
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          event.sender.send('ai:stream-error', errorJson.error.message);
          return;
        }
      } catch {
        // Not JSON, use raw error
      }
      event.sender.send('ai:stream-error', `API error: ${response.status} - ${errorText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      event.sender.send('ai:stream-error', 'Failed to read response stream.');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const text = parseStreamLine(line, config.provider);
        if (text) {
          event.sender.send('ai:stream-chunk', text);
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const text = parseStreamLine(buffer, config.provider);
      if (text) {
        event.sender.send('ai:stream-chunk', text);
      }
    }

    event.sender.send('ai:stream-done');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    if (errorMessage.toLowerCase().includes('image') && (errorMessage.toLowerCase().includes('support') || errorMessage.toLowerCase().includes('not'))) {
      event.sender.send('ai:stream-error', 'This model does not support image input.');
      return;
    }
    event.sender.send('ai:stream-error', `Request failed: ${errorMessage}`);
  }
});

const createAppMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'AI',
      submenu: [
        {
          label: 'Configure Model...',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('menu:open-ai-settings');
            }
          },
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

createAppMenu();

app.applicationMenu = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
