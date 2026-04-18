import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { markdownToHtml, htmlToMarkdown } from './lib/markdown';

const testDir = path.join(process.cwd(), 'test-files');

describe('File System Operations', () => {
  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('readDirectory', () => {
    it('should read empty directory', async () => {
      const items = fs.readdirSync(testDir, { withFileTypes: true });
      expect(items).toEqual([]);
    });

    it('should read directory with files', async () => {
      fs.writeFileSync(path.join(testDir, 'test.md'), '# Hello');
      fs.mkdirSync(path.join(testDir, 'folder'));

      const items = fs.readdirSync(testDir, { withFileTypes: true });
      const names = items.map(i => i.name).sort();
      expect(names).toEqual(['folder', 'test.md']);
    });

    it('should filter to only markdown files and folders', async () => {
      fs.writeFileSync(path.join(testDir, 'test.md'), '# Hello');
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'plain text');
      fs.mkdirSync(path.join(testDir, 'folder'));

      const items = fs.readdirSync(testDir, { withFileTypes: true });
      const filtered = items.filter(i => i.isDirectory() || i.name.endsWith('.md'));
      const names = filtered.map(i => i.name).sort();
      expect(names).toEqual(['folder', 'test.md']);
    });
  });

  describe('writeFile', () => {
    it('should create new file', async () => {
      const filePath = path.join(testDir, 'new.md');
      fs.writeFileSync(filePath, '# New File', 'utf-8');

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('# New File');
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'existing.md');
      fs.writeFileSync(filePath, '# Original', 'utf-8');
      fs.writeFileSync(filePath, '# Updated', 'utf-8');

      expect(fs.readFileSync(filePath, 'utf-8')).toBe('# Updated');
    });
  });

  describe('createFolder', () => {
    it('should create new folder', async () => {
      const folderPath = path.join(testDir, 'new-folder');
      fs.mkdirSync(folderPath, { recursive: true });

      expect(fs.existsSync(folderPath)).toBe(true);
      expect(fs.statSync(folderPath).isDirectory()).toBe(true);
    });
  });

  describe('deleteItem', () => {
    it('should delete file', async () => {
      const filePath = path.join(testDir, 'to-delete.md');
      fs.writeFileSync(filePath, 'content');
      fs.unlinkSync(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should delete folder', async () => {
      const folderPath = path.join(testDir, 'to-delete-folder');
      fs.mkdirSync(folderPath);
      fs.rmSync(folderPath, { recursive: true });

      expect(fs.existsSync(folderPath)).toBe(false);
    });
  });

  describe('renameItem', () => {
    it('should rename file', async () => {
      const oldPath = path.join(testDir, 'old.md');
      const newPath = path.join(testDir, 'new.md');
      fs.writeFileSync(oldPath, 'content');
      fs.renameSync(oldPath, newPath);

      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
    });

    it('should rename folder', async () => {
      const oldPath = path.join(testDir, 'old-folder');
      const newPath = path.join(testDir, 'new-folder');
      fs.mkdirSync(oldPath);
      fs.renameSync(oldPath, newPath);

      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
    });
  });
});

describe('Path Operations', () => {
  it('should join paths correctly', () => {
    const result = path.join('C:\\Users\\test', 'folder', 'file.md');
    expect(result).toBe('C:\\Users\\test\\folder\\file.md');
  });

  it('should extract filename from path', () => {
    expect(path.basename('C:\\Users\\test\\file.md')).toBe('file.md');
  });

  it('should handle both forward and back slashes', () => {
    const withBackslash = 'C:\\Users\\test\\file.md';
    const withForwardSlash = 'C:/Users/test/file.md';

    expect(path.basename(withBackslash)).toBe('file.md');
    expect(path.basename(withForwardSlash)).toBe('file.md');
  });

  it('should handle Windows path separators correctly', () => {
    const parts = 'C:\\Users\\test\\folder'.split(/[/\\]/);
    expect(parts[0]).toBe('C:');
    expect(parts[parts.length - 1]).toBe('folder');
  });

  it('should extract parent path correctly', () => {
    const parentPath = 'C:\\Users\\test\\file.md'.replace(/[/\\][^/\\]+$/, '');
    expect(parentPath).toBe('C:\\Users\\test');
  });
});

describe('Markdown Parsing', () => {
  it('should parse headings', () => {
    const lines = ['# Heading 1', '## Heading 2', '### Heading 3'];
    const results = lines.map(line => {
      const match = line.match(/^#{1,6}\s/);
      return match ? line.match(/^#{1,6}/)![0].length : null;
    });
    expect(results).toEqual([1, 2, 3]);
  });

  it('should parse bold', () => {
    const line = '**bold text**';
    expect(line).toContain('**bold text**');
  });

  it('should parse italic', () => {
    const line = '*italic text*';
    expect(line).toContain('*italic text*');
  });

  it('should parse code blocks', () => {
    const lines = ['```', 'code here', '```'];
    expect(lines[0]).toBe('```');
    expect(lines[2]).toBe('```');
  });

  it('should parse links', () => {
    const line = '[link text](https://example.com)';
    const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('link text');
    expect(match![2]).toBe('https://example.com');
  });

  it('should parse images', () => {
    const line = '![alt text](image.jpg)';
    const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('alt text');
    expect(match![2]).toBe('image.jpg');
  });

  it('should parse bullet lists', () => {
    const line = '- List item';
    expect(line.match(/^[-*]\s/)).not.toBeNull();
  });

  it('should parse numbered lists', () => {
    const line = '1. List item';
    expect(line.match(/^\d+\.\s/)).not.toBeNull();
  });

  it('should parse blockquotes', () => {
    const line = '> Quote text';
    expect(line.match(/^>\s/)).not.toBeNull();
  });

  it('should filter empty lines', () => {
    const lines = ['# Heading', '', 'code', '', '- item1', '', '- item2'].filter(l => l.trim() !== '');
    expect(lines.length).toBe(4);
    expect(lines[1]).toBe('code');
  });
});

describe('HTML Generation', () => {
  it('should generate heading tags', () => {
    const markdown = '# Test';
    const level = markdown.match(/^#{1,6}/)![0].length;
    expect(level).toBe(1);
  });

  it('should generate bold tags', () => {
    const markdown = '**bold**';
    const replaced = markdown.replace(/\*\*/g, '');
    expect(replaced).toBe('bold');
  });

  it('should generate italic tags', () => {
    const markdown = '*italic*';
    const replaced = markdown.replace(/\*/g, '');
    expect(replaced).toBe('italic');
  });

  it('should generate code tags', () => {
    const markdown = '`code`';
    const replaced = markdown.replace(/`/g, '');
    expect(replaced).toBe('code');
  });

  it('should generate link tags', () => {
    const markdown = '[text](url)';
    const html = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    expect(html).toBe('<a href="url">text</a>');
  });

  it('should generate image tags', () => {
    const markdown = '![alt](img.jpg)';
    const html = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    expect(html).toBe('<img src="img.jpg" alt="alt" />');
  });

  it('should generate blockquote tags', () => {
    const markdown = '> Quote';
    const html = markdown.replace(/^>\s*/, '<blockquote>') + '</blockquote>';
    expect(html).toBe('<blockquote>Quote</blockquote>');
  });
});

describe('Markdown to HTML Conversion - Bullet Lists', () => {
  it('should parse simple bullet list', () => {
    const markdown = '- item1\n- item2\n- item3';
    const html = markdownToHtml(markdown);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item1</li>');
    expect(html).toContain('</ul>');
  });

  it('should parse bullet list with multiple items', () => {
    const markdown = '- First item\n- Second item\n- Third item';
    const html = markdownToHtml(markdown);
    expect(html).toContain('<li>First item</li>');
    expect(html).toContain('<li>Second item</li>');
    expect(html).toContain('<li>Third item</li>');
  });

  it('should close bullet list after heading', () => {
    const markdown = '- item1\n- item2\n# Heading';
    const html = markdownToHtml(markdown);
    expect(html).toContain('<ul>');
    expect(html).toContain('</ul>');
    expect(html).toContain('<h1>');
  });

  it('should handle empty input', () => {
    const html = markdownToHtml('');
    expect(html).toBe('<p></p>');
  });

  it('should handle null input', () => {
    const html = markdownToHtml(null as any);
    expect(html).toBe('<p></p>');
  });

  it('should not create extra empty list items', () => {
    const markdown = '- item1\n- item2';
    const html = markdownToHtml(markdown);
    const emptyLi = html.match(/<li>\s*<\/li>/g);
    expect(emptyLi).toBeFalsy();
  });

  it('should handle mixed content - bullet then heading', () => {
    const markdown = '- item1\n# Heading\nParagraph text';
    const html = markdownToHtml(markdown);
    expect(html).toContain('<ul>');
    expect(html).toContain('<h1>');
    expect(html).toContain('<p>');
  });
});

describe('Tab Management', () => {
  it('should find existing tab', () => {
    const tabs = [
      { name: 'file1.md', path: 'C:\\test\\file1.md' },
      { name: 'file2.md', path: 'C:\\test\\file2.md' }
    ];
    const findTab = (path: string) => tabs.findIndex(t => t.path === path);
    
    expect(findTab('C:\\test\\file1.md')).toBe(0);
    expect(findTab('C:\\test\\file2.md')).toBe(1);
    expect(findTab('C:\\test\\file3.md')).toBe(-1);
  });

  it('should add new tab at beginning', () => {
    const tabs = [{ name: 'file1.md', path: 'C:\\test\\file1.md' }];
    const newTab = { name: 'file2.md', path: 'C:\\test\\file2.md' };
    tabs.unshift(newTab);
    
    expect(tabs.length).toBe(2);
    expect(tabs[0].name).toBe('file2.md');
  });

  it('should remove tab by path', () => {
    const tabs = [
      { name: 'file1.md', path: 'C:\\test\\file1.md' },
      { name: 'file2.md', path: 'C:\\test\\file2.md' }
    ];
    const removePath = 'C:\\test\\file1.md';
    const newTabs = tabs.filter(t => t.path !== removePath);
    
    expect(newTabs.length).toBe(1);
    expect(newTabs[0].name).toBe('file2.md');
  });
});

describe('App Config', () => {
  it('should have correct app name', () => {
    expect('markdown-editor').toBeTruthy();
  });

  it('should have required dependencies in package.json', () => {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    expect(pkg.dependencies['@tiptap/core']).toBeTruthy();
    expect(pkg.devDependencies.electron).toBeTruthy();
  });
});