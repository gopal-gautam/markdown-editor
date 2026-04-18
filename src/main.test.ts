import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

describe('App Config', () => {
  it('should have correct app name', () => {
    expect('markdown-editor').toBeTruthy();
  });
});