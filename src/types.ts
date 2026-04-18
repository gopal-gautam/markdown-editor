export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
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
    };
  }
  var MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  var MAIN_WINDOW_VITE_NAME: string;
}

export {};