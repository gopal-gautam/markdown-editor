import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import log from 'electron-log';

log.initialize();
log.transports.file.level = 'info';

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
  return result.canceled ? null : result.filePaths[0];
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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
