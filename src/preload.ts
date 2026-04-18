import { contextBridge, ipcRenderer } from 'electron';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  defaultModels: string[];
  baseUrl?: string;
  supportsCustomEndpoint: boolean;
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'azure' | 'aws' | 'openrouter' | 'lmstudio' | 'ollama';

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
  getProviders: () => ipcRenderer.invoke('ai:get-providers'),
  loadAIConfig: () => ipcRenderer.invoke('ai:load-config'),
  saveAIConfig: (config: { provider: AIProvider; model: string; apiKey: string; baseUrl: string }) =>
    ipcRenderer.invoke('ai:save-config', config),
  generateAI: (prompt: string) => ipcRenderer.invoke('ai:generate', prompt),
  onOpenAISettings: (callback: () => void) => {
    ipcRenderer.on('menu:open-ai-settings', callback);
  },
  setRootFolder: (folderPath: string) => ipcRenderer.invoke('app:set-root-folder', folderPath),
  getRootFolder: () => ipcRenderer.invoke('app:get-root-folder'),
});