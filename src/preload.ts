import { contextBridge, ipcRenderer } from 'electron';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

contextBridge.exposeInMainWorld('electronAPI', {
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:read-directory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:write-file', filePath, content),
  createFolder: (folderPath: string) => ipcRenderer.invoke('fs:create-folder', folderPath),
  createFile: (filePath: string) => ipcRenderer.invoke('fs:create-file', filePath),
  deleteItem: (itemPath: string) => ipcRenderer.invoke('fs:delete-item', itemPath),
  renameItem: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename-item', oldPath, newPath),
  getDocumentsPath: () => ipcRenderer.invoke('app:get-documents-path'),
  showOpenFolder: () => ipcRenderer.invoke('dialog:show-open-folder'),
});