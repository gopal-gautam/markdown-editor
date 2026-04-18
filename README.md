# Markdown Editor

A professional desktop Markdown editor built with Electron, Vite, and TypeScript. Features a rich text editing experience while saving files in Markdown format, with optional AI-powered assistance.

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

### AI Integration
- **AI Generate** - Generate markdown content using AI and append it to your document
- **AI Chat** - Ask questions about your open document in a conversational sidebar
- **Multiple Providers** - Support for OpenAI, Anthropic, Google, Azure, AWS, OpenRouter, LMStudio, and Ollama
- **Custom Endpoints** - Configure custom API endpoints for local or self-hosted models

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

## AI Configuration

### Supported Providers

| Provider | Default Model | Notes |
|----------|---------------|-------|
| OpenAI | gpt-4o | Requires OpenAI API key |
| Anthropic | claude-3-5-sonnet-20241022 | Requires Anthropic API key |
| Google Gemini | gemini-1.5-pro | Requires Google AI API key |
| Azure OpenAI | gpt-4o | Requires Azure subscription |
| AWS Bedrock | Claude 3 Sonnet | Requires AWS credentials |
| OpenRouter | gpt-4o | Aggregator - supports many models |
| LMStudio | llama-3.1-8b | Local models via LMStudio |
| Ollama | llama3.1 | Local models via Ollama |

### Setup Steps

1. Open a folder in the editor (File > Open Folder...)
2. Click on the **+AI** button in the toolbar or use the **AI Settings...** menu item under File
3. Select your preferred provider from the dropdown
4. Enter the model name (default is pre-filled)
5. Enter your API key
6. Optionally configure a custom endpoint URL (for local models or proxies)
7. Click **Save**
8. Settings are stored in `.markdown-editor/settings.json` in your workspace folder

### Using AI Features

#### AI Generate
- Open a file or start a new document
- Click the **+AI** button in the toolbar (disabled when no file is open)
- Enter your prompt describing what you want to generate
- Press Ctrl+Enter or click **Generate**
- The AI-generated content will be appended to your document at the cursor position

#### AI Chat
- Open any markdown file
- Click the **Chat** button in the toolbar to toggle the chat sidebar
- The sidebar shows a conversation history
- Ask questions about your document (e.g., "What is this document about?", "Summarize the main points")
- Press Ctrl+Enter or click **Send** to send your message
- The chat includes your file content as context automatically
- Click the **X** button or toggle the Chat button to close the sidebar

### API Key Security

Your API keys are stored locally in your workspace folder at `.markdown-editor/settings.json`. They are never transmitted anywhere except directly to the AI provider's API. For production use, consider using environment variables or a secrets manager.

The settings file is created in the root folder of your workspace when you first configure AI settings.

## Project Structure

```
markdown-editor/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Context bridge
│   ├── renderer.ts      # Editor UI & logic
│   ├── index.css       # Styles
│   ├── types.ts        # TypeScript types
│   ├── main.test.ts    # Tests
│   └── lib/
│       ├── utils.ts    # Utility functions
│       ├── markdown.ts # Markdown parsing
│       └── ai-config.ts # AI provider configuration
├── index.html          # Main HTML
├── package.json        # Dependencies
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
| Ctrl+Enter | Generate AI content |

## Contributing

Contributions are welcome! Please follow these steps:

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/gopal-gautam/markdown-editor.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run tests: `pnpm test`
7. Run lint: `pnpm lint`
8. Commit your changes: `git commit -m "Add your feature"`
9. Push to your fork: `git push origin feature/your-feature-name`
10. Create a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Write tests for new features
- Ensure all tests pass before submitting PRs

### Reporting Issues

When reporting issues, please include:
- Your operating system and version
- Steps to reproduce the issue
- Any error messages or logs
- Expected vs actual behavior

## License

MIT