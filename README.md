# Markdown Editor

A professional desktop Markdown editor built with Electron, Vite, and TypeScript. Features a Microsoft Word-like rich text editing experience while saving files in Markdown format.

![Markdown Editor](screenshot.png)

## Features

### Editor
- **Rich Text Editing** - WYSIWYG editing with familiar formatting tools
- **Toolbar Formatting** - Bold, Italic, Underline, Strikethrough, Code
- **Headings** - H1, H2, H3 support
- **Lists** - Bullet lists, Ordered lists, Task lists
- **Block Elements** - Blockquotes, Code blocks
- **Media** - Insert links and images
- **Text Alignment** - Left, Center, Right, Justify

### File Management
- **File Browser** - VS Code-style tree navigation with expand/collapse folders
- **Multiple Tabs** - Open multiple files in tabs
- **File Operations** - Create, Rename, Delete files and folders
- **Context Menu** - Right-click for quick actions
- **Root Folder** - Open any folder as workspace root

### Technical
- **Real-time Sync** - Edit visually, save as Markdown
- **Keyboard Shortcuts** - Ctrl+S to save, standard shortcuts
- **Dark Theme** - VS Code-inspired dark UI

## Getting Started

### Prerequisites

- Node.js 22.x
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Or using npm
npm install
```

### Development

```bash
# Start development server
pnpm start
```

### Building

```bash
# Package the app
pnpm package

# Create distributable
pnpm make
```

### Testing

```bash
# Run tests
pnpm test

# Run lint
pnpm lint
```

## Project Structure

```
markdown-editor/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Context bridge
│   ├── renderer.ts     # Editor UI & logic
│   ├── index.css       # Styles
│   ├── types.ts        # TypeScript types
│   └── main.test.ts     # Tests
├── index.html          # Main HTML
├── package.json       # Dependencies
├── forge.config.ts   # Electron Forge config
├── vitest.config.ts   # Test config
└── run-dev.cmd        # Quick start script
```

## Key Technologies

- **Electron** - Desktop framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **TipTap** - Rich text editor
- **Vitest** - Testing

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save file |
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |

## License

MIT