// Markdown to HTML parser
export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '<p></p>';

  // First escape HTML entities to prevent XSS and processing issues
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // Process inline formatting with proper ordering
  const processInline = (text: string): string => {
    let result = escapeHtml(text);
    
    // Code blocks first (inline)
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold and italic (must process *** before ** and *)
    result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Underline
    result = result.replace(/__(.+?)__/g, '<u>$1</u>');
    result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<u>$1</u>');
    
    // Strikethrough
    result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Links and images
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    return result;
  };

  const lines = markdown.split('\n');
  let html = '';
  let inCodeBlock = false;
  let inBulletList = false;
  let inOrderedList = false;
  let inParagraph = false;

  const closeLists = () => {
    if (inBulletList) { html += '</ul>'; inBulletList = false; }
    if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
  };

  const closeParagraph = () => {
    if (inParagraph) { html += '</p>'; inParagraph = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      closeParagraph();
      closeLists();
      if (inCodeBlock) {
        html += '</code></pre>';
        inCodeBlock = false;
      } else {
        html += '<pre><code>';
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html += line + '\n';
      continue;
    }

    // Empty line - close paragraph and lists
    if (trimmed === '') {
      closeParagraph();
      closeLists();
      continue;
    }

    // Headings
    if (trimmed.match(/^#{1,6}\s/)) {
      closeParagraph();
      closeLists();
      const level = trimmed.match(/^#{1,6}/)![0].length;
      const content = trimmed.replace(/^#{1,6}\s*/, '');
      html += `<h${level}>${processInline(content)}</h${level}>`;
      continue;
    }

    // Bullet list
    if (trimmed.match(/^[-*+]\s/)) {
      closeParagraph();
      if (!inBulletList) {
        closeLists();
        html += '<ul>';
        inBulletList = true;
      }
      const content = trimmed.replace(/^[-*+]\s*/, '');
      html += `<li>${processInline(content)}</li>`;
      continue;
    }

    // Ordered list
    if (trimmed.match(/^\d+\.\s/)) {
      closeParagraph();
      if (!inOrderedList) {
        closeLists();
        html += '<ol>';
        inOrderedList = true;
      }
      const content = trimmed.replace(/^\d+\.\s*/, '');
      html += `<li>${processInline(content)}</li>`;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      closeParagraph();
      closeLists();
      const content = trimmed.replace(/^>\s*/, '');
      html += `<blockquote>${processInline(content)}</blockquote>`;
      continue;
    }

    // Horizontal rule
    if (trimmed.match(/^[-*_]{3,}$/)) {
      closeParagraph();
      closeLists();
      html += '<hr />';
      continue;
    }

    // Regular paragraph text
    closeLists();
    if (!inParagraph) {
      html += '<p>';
      inParagraph = true;
    } else {
      html += '<br />';
    }
    html += processInline(line);
  }

  // Close any open tags
  closeParagraph();
  if (inBulletList) html += '</ul>';
  if (inOrderedList) html += '</ol>';
  if (inCodeBlock) html += '</code></pre>';

  return html || '<p></p>';
}

// HTML to Markdown converter
export function htmlToMarkdown(element: Element): string {
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    switch (tagName) {
      case 'h1': return `# ${processNodeList(el)}\n`;
      case 'h2': return `## ${processNodeList(el)}\n`;
      case 'h3': return `### ${processNodeList(el)}\n`;
      case 'h4': return `#### ${processNodeList(el)}\n`;
      case 'h5': return `##### ${processNodeList(el)}\n`;
      case 'h6': return `###### ${processNodeList(el)}\n`;
      case 'p': return `${processNodeList(el)}\n`;
      case 'br': return '\n';
      case 'div': return processNodeList(el);
      case 'strong':
      case 'b': return `**${processNodeList(el)}**`;
      case 'em':
      case 'i': return `*${processNodeList(el)}*`;
      case 'u': return `_${processNodeList(el)}_`;
      case 'del':
      case 's': return `~~${processNodeList(el)}~~`;
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') return processNodeList(el);
        return `\`${processNodeList(el)}\``;
      case 'pre': return `\`\`\`\n${processNodeList(el)}\n\`\`\`\n`;
      case 'a': {
        const href = el.getAttribute('href') || '';
        const text = processNodeList(el);
        return href ? `[${text}](${href})` : text;
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return src ? `![${alt}](${src})` : '';
      }
      case 'blockquote': {
        const content = processNodeList(el).trim();
        if (!content) return '';
        return content.split('\n').map(q => `> ${q}`).join('\n') + '\n';
      }
      case 'ul':
      case 'ol': {
        const listContent = processNodeList(el);
        if (!listContent.trim()) return '';
        return listContent + '\n';
      }
      case 'li': return `- ${processNodeList(el).replace(/\n/g, '\n  ')}\n`;
      case 'hr': return '---\n';
      case 'section':
      case 'main':
      case 'article': return processNodeList(el);
      default: return processNodeList(el);
    }
  };

  const processNodeList = (parent: Element): string => {
    return Array.from(parent.childNodes).map(processNode).join('');
  };

  let markdown = '';
  Array.from(element.childNodes).forEach(node => {
    const text = processNode(node);
    if (text) markdown += text;
  });

  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}