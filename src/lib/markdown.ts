// Markdown to HTML parser
export function markdownToHtml(markdown: string): string {
  const lines = (markdown || '').split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return '<p></p>';

  let html = '<p>';
  let inCodeBlock = false;
  let inBulletList = false;
  let inOrderedList = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>';
        inCodeBlock = false;
      } else {
        if (inBulletList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
        if (inOrderedList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }
        html += '</p><pre><code>';
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html += line + '\n';
      continue;
    }

    if (line.match(/^#{1,6}\s/)) {
      if (inBulletList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
      if (inOrderedList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }
      const level = line.match(/^#{1,6}/)![0].length;
      html += `</p><h${level}>${line.replace(/^#{1,6}\s+/, '')}</h${level}><p>`;
      continue;
    }

    if (line.match(/^[-*]\s/)) {
      if (!inBulletList) {
        if (inOrderedList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }
        html += '<ul>';
        inBulletList = true;
      }
      html += `<li>${line.replace(/^[-*]\s+/, '')}</li>`;
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      if (!inOrderedList) {
        if (inBulletList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
        html += '<ol>';
        inOrderedList = true;
      }
      html += `<li>${line.replace(/^\d+\.\s+/, '')}</li>`;
      continue;
    }

    if (inBulletList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ul>$&</ul>'); inBulletList = false; }
    if (inOrderedList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ol>$&</ol>'); inOrderedList = false; }

    if (line.match(/^>\s/)) {
      html += `</p><blockquote>${line.replace(/^>\s*/, '')}</blockquote><p>`;
      continue;
    }

    if (line.trim() === '') {
      html += '</p><p>';
      continue;
    }

    html += processInlineFormatting(line);
  }

  if (inBulletList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ul>$&</ul>'); }
  if (inOrderedList) { html = html.replace(/<li>(.+?)<\/li>$/, '<ol>$&</ol>'); }
  if (inCodeBlock) { html += '</code></pre>'; }
  html += '</p>';
  return html;
}

function processInlineFormatting(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/_(.+?)_/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
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