export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'azure' 
  | 'aws' 
  | 'openrouter' 
  | 'lmstudio' 
  | 'ollama';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  defaultModels: string[];
  baseUrl?: string;
  supportsCustomEndpoint: boolean;
}

declare global {
  interface Window {
    electronAPI: {
      readDirectory: (dirPath: string) => Promise<FileItem[]>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
      createFolder: (folderPath: string) => Promise<boolean>;
      createFile: (filePath: string) => Promise<boolean>;
      deleteItem: (itemPath: string) => Promise<boolean>;
      renameItem: (oldPath: string, newPath: string) => Promise<boolean>;
      getDocumentsPath: () => Promise<string>;
      showOpenFolder: () => Promise<string | null>;
      getProviders: () => Promise<ProviderInfo[]>;
      loadAIConfig: () => Promise<{ provider: AIProvider; model: string; apiKey: string; baseUrl: string } | null>;
      saveAIConfig: (config: { provider: AIProvider; model: string; apiKey: string; baseUrl: string }) => Promise<boolean>;
      generateAI: (prompt: string) => Promise<{ result?: string; error?: string }>;
      onOpenAISettings: (callback: () => void) => void;
      setRootFolder: (folderPath: string) => Promise<boolean>;
      getRootFolder: () => Promise<string | null>;
    };
  }
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  const MAIN_WINDOW_VITE_NAME: string;
}

export {};