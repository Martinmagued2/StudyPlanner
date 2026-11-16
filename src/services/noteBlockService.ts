import { NoteBlock, NoteBlockType } from '../types';
import katex from 'katex';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

export const generateBlockId = () =>
  `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function createBlock(
  type: NoteBlockType = 'paragraph',
  content: string = '',
  props?: NoteBlock['props'],
  indent: number = 0
): NoteBlock {
  const defaultProps: NoteBlock['props'] = { ...(props || {}) };
  if (type === 'todo' && defaultProps.checked === undefined) {
    defaultProps.checked = false;
  }
  if (type === 'code' && !defaultProps.language) {
    defaultProps.language = 'python';
  }
  if (type === 'callout') {
    if (!defaultProps.calloutTone) defaultProps.calloutTone = 'info';
    if (!defaultProps.calloutIcon) defaultProps.calloutIcon = '💡';
  }
  if (type === 'toggle') {
    if (defaultProps.toggleOpen === undefined) defaultProps.toggleOpen = true;
    if (defaultProps.toggleBody === undefined) defaultProps.toggleBody = 'Add toggle details or sub-notes here...';
  }
  if (type === 'table' && !defaultProps.tableRows) {
    defaultProps.tableRows = [
      ['Concept', 'Definition', 'Notes'],
      ['Item 1', 'Description', 'Key point'],
      ['Item 2', 'Description', 'Key point']
    ];
    defaultProps.tableHasHeader = true;
  }
  if (type === 'math') {
    if (defaultProps.displayMode === undefined) defaultProps.displayMode = true;
  }
  if (type === 'image' && !defaultProps.imageWidth) {
    defaultProps.imageWidth = 100;
  }

  return {
    id: generateBlockId(),
    type,
    content,
    indent: Math.max(0, Math.min(3, indent)),
    props: Object.keys(defaultProps).length > 0 ? defaultProps : undefined
  };
}

export function renderKatexSafe(formula: string, displayMode: boolean = true): string {
  try {
    return katex.renderToString((formula || '').trim() || 'x = y', {
      displayMode,
      throwOnError: false
    });
  } catch {
    return escapeHtml(formula);
  }
}

export function highlightCodeSafe(code: string, lang: string = 'python'): string {
  try {
    const grammar = Prism.languages[lang] || Prism.languages.clike;
    return Prism.highlight(code || '', grammar, lang);
  } catch {
    return escapeHtml(code || '');
  }
}

export function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\u200B/g, '')
    .trim();
}

/**
 * Serializes structured NoteBlocks into clean, rich semantic HTML
 * so search, flashcards, AI reading, and HTML/PDF export preserve 100% styling.
 */
export function blocksToHtml(blocks: NoteBlock[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return '<p><br></p>';

  const htmlParts: string[] = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];
    const indentStyle = b.indent && b.indent > 0 ? ` style="margin-left: ${b.indent * 24}px;"` : '';
    const content = b.content || '';

    if (b.type === 'bullet') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'bullet') {
        const cur = blocks[i];
        const liStyle = cur.indent && cur.indent > 0 ? ` style="margin-left: ${cur.indent * 20}px;"` : '';
        items.push(`<li${liStyle} dir="auto">${cur.content || '<br>'}</li>`);
        i++;
      }
      htmlParts.push(`<ul class="nook-ul">${items.join('')}</ul>`);
      continue;
    }

    if (b.type === 'numbered') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'numbered') {
        const cur = blocks[i];
        const liStyle = cur.indent && cur.indent > 0 ? ` style="margin-left: ${cur.indent * 20}px;"` : '';
        items.push(`<li${liStyle} dir="auto">${cur.content || '<br>'}</li>`);
        i++;
      }
      htmlParts.push(`<ol class="nook-ol">${items.join('')}</ol>`);
      continue;
    }

    switch (b.type) {
      case 'h1':
        htmlParts.push(`<h1 class="nook-h1"${indentStyle} dir="auto">${content || '<br>'}</h1>`);
        break;
      case 'h2':
        htmlParts.push(`<h2 class="nook-h2"${indentStyle} dir="auto">${content || '<br>'}</h2>`);
        break;
      case 'h3':
        htmlParts.push(`<h3 class="nook-h3"${indentStyle} dir="auto">${content || '<br>'}</h3>`);
        break;
      case 'todo': {
        const checked = Boolean(b.props?.checked);
        htmlParts.push(
          `<div class="nook-todo" data-checked="${checked}"${indentStyle} dir="auto"><span class="nook-checkbox">${checked ? '☑' : '☐'}</span> <span class="nook-todo-text" style="${checked ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${content}</span></div>`
        );
        break;
      }
      case 'quote':
        htmlParts.push(`<blockquote class="nook-quote"${indentStyle} dir="auto">${content || '<br>'}</blockquote>`);
        break;
      case 'callout': {
        const tone = b.props?.calloutTone || 'info';
        const icon = b.props?.calloutIcon || '💡';
        htmlParts.push(
          `<div class="nook-callout nook-callout-${tone}" data-callout-tone="${tone}"${indentStyle} dir="auto"><span class="nook-callout-icon">${escapeHtml(icon)}</span><div class="nook-callout-body">${content}</div></div>`
        );
        break;
      }
      case 'toggle': {
        const body = b.props?.toggleBody || '';
        htmlParts.push(
          `<details class="nook-toggle" open${indentStyle}><summary class="nook-toggle-summary" dir="auto">${content || 'Toggle section'}</summary><div class="nook-toggle-body" dir="auto">${body}</div></details>`
        );
        break;
      }
      case 'code': {
        const lang = b.props?.language || 'python';
        const highlighted = highlightCodeSafe(stripHtmlTags(content), lang);
        htmlParts.push(
          `<div class="nook-code-block" data-language="${escapeHtml(lang)}"${indentStyle}><div class="nook-code-lang">${escapeHtml(lang.toUpperCase())}</div><pre><code class="language-${escapeHtml(lang)}">${highlighted}</code></pre></div>`
        );
        break;
      }
      case 'math': {
        const latex = stripHtmlTags(content) || '\\int_a^b f(x)\\,dx';
        const displayMode = b.props?.displayMode !== false;
        const rendered = renderKatexSafe(latex, displayMode);
        htmlParts.push(
          `<div class="nook-math-block" data-latex="${encodeURIComponent(latex)}"${indentStyle}>${rendered}</div>`
        );
        break;
      }
      case 'table': {
        const rows = b.props?.tableRows || [['Header 1', 'Header 2'], ['Cell 1', 'Cell 2']];
        const hasHeader = b.props?.tableHasHeader !== false;
        let thead = '';
        let bodyRows = rows;
        if (hasHeader && rows.length > 0) {
          thead = `<thead><tr>${rows[0].map(c => `<th dir="auto">${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
          bodyRows = rows.slice(1);
        }
        const tbody = `<tbody>${bodyRows.map(r => `<tr>${r.map(c => `<td dir="auto">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
        htmlParts.push(`<div class="nook-table-wrap"${indentStyle}><table class="nook-table">${thead}${tbody}</table></div>`);
        break;
      }
      case 'image': {
        const url = b.props?.imageUrl || '';
        const cap = b.props?.imageCaption || '';
        const width = b.props?.imageWidth || 100;
        if (url) {
          htmlParts.push(
            `<figure class="nook-figure"${indentStyle}><img src="${escapeHtml(url)}" alt="${escapeHtml(cap)}" style="width:${width}%;max-width:100%;border-radius:8px;" />${cap ? `<figcaption dir="auto">${escapeHtml(cap)}</figcaption>` : ''}</figure>`
          );
        }
        break;
      }
      case 'divider':
        htmlParts.push('<hr class="nook-divider" />');
        break;
      case 'paragraph':
      default:
        htmlParts.push(`<p class="nook-p"${indentStyle} dir="auto">${content || '<br>'}</p>`);
        break;
    }

    i++;
  }

  return htmlParts.join('\n');
}

/**
 * Serializes NoteBlocks into clean GitHub-Flavored Markdown (preserving math, checklists, tables, callouts, code).
 */
export function blocksToMarkdown(blocks: NoteBlock[], title?: string): string {
  const lines: string[] = [];
  if (title) {
    lines.push(`# ${title}`, '');
  }

  let numberedCounter = 1;
  blocks.forEach((b, idx) => {
    const indentPrefix = b.indent && b.indent > 0 ? '  '.repeat(b.indent) : '';
    const text = stripHtmlTags(b.content);

    if (b.type !== 'numbered') numberedCounter = 1;

    switch (b.type) {
      case 'h1':
        lines.push(`# ${text}`, '');
        break;
      case 'h2':
        lines.push(`## ${text}`, '');
        break;
      case 'h3':
        lines.push(`### ${text}`, '');
        break;
      case 'bullet':
        lines.push(`${indentPrefix}- ${text}`);
        if (blocks[idx + 1]?.type !== 'bullet') lines.push('');
        break;
      case 'numbered':
        lines.push(`${indentPrefix}${numberedCounter++}. ${text}`);
        if (blocks[idx + 1]?.type !== 'numbered') lines.push('');
        break;
      case 'todo':
        lines.push(`${indentPrefix}- [${b.props?.checked ? 'x' : ' '}] ${text}`);
        if (blocks[idx + 1]?.type !== 'todo') lines.push('');
        break;
      case 'quote':
        lines.push(`> ${text}`, '');
        break;
      case 'callout':
        lines.push(`> ${b.props?.calloutIcon || '💡'} **${(b.props?.calloutTone || 'info').toUpperCase()}**: ${text}`, '');
        break;
      case 'toggle':
        lines.push(`<details>\n<summary>${text}</summary>\n\n${stripHtmlTags(b.props?.toggleBody || '')}\n\n</details>`, '');
        break;
      case 'code':
        lines.push(`\`\`\`${b.props?.language || 'python'}\n${text}\n\`\`\``, '');
        break;
      case 'math':
        lines.push(`$$\n${text}\n$$`, '');
        break;
      case 'table': {
        const rows = b.props?.tableRows || [];
        if (rows.length > 0) {
          lines.push(`| ${rows[0].join(' | ')} |`);
          lines.push(`| ${rows[0].map(() => '---').join(' | ')} |`);
          rows.slice(1).forEach(r => lines.push(`| ${r.join(' | ')} |`));
          lines.push('');
        }
        break;
      }
      case 'image':
        if (b.props?.imageUrl) {
          lines.push(`![${b.props?.imageCaption || 'Image'}](${b.props.imageUrl})`, '');
        }
        break;
      case 'divider':
        lines.push('---', '');
        break;
      case 'paragraph':
      default:
        if (text) lines.push(`${indentPrefix}${text}`, '');
        break;
    }
  });

  return lines.join('\n').trim();
}

/**
 * Parses inline markdown formatting (bold, italic, inline code, links, inline math) to HTML
 */
function inlineMarkdownToHtml(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="nook-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Converts existing HTML or Markdown content into structured Notion NoteBlocks cleanly.
 * Guarantees every note opens as rich editable blocks without losing colors, highlights, tables, code, or formulas.
 */
export function parseHtmlOrMarkdownToBlocks(raw: string): NoteBlock[] {
  if (!raw || raw.trim() === '' || raw.trim() === '<p><br></p>') {
    return [createBlock('paragraph', '')];
  }

  const trimmed = raw.trim();

  // Check if input looks primarily like HTML (from previous WYSIWYG editor or our serializer)
  const looksLikeHtml = /<(h[1-6]|p|div|ul|ol|blockquote|pre|table|figure|details|hr)\b/i.test(trimmed);

  if (looksLikeHtml && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
      const root = doc.body.firstElementChild;
      if (root) {
        const blocks: NoteBlock[] = [];

        const processElement = (el: Element) => {
          const tag = el.tagName.toLowerCase();

          // Special Nook / custom classes first
          if (el.classList.contains('nook-math-block') || el.classList.contains('katex-display-block')) {
            const latex = el.getAttribute('data-latex')
              ? decodeURIComponent(el.getAttribute('data-latex')!)
              : stripHtmlTags(el.innerHTML);
            blocks.push(createBlock('math', latex, { displayMode: true }));
            return;
          }

          if (el.classList.contains('nook-code-block') || el.classList.contains('code-block-container')) {
            const pre = el.querySelector('pre');
            const codeEl = el.querySelector('code');
            const langAttr = el.getAttribute('data-language') ||
              (codeEl?.className.match(/language-([a-z0-9]+)/i)?.[1]) ||
              'python';
            const codeText = codeEl?.textContent || pre?.textContent || '';
            blocks.push(createBlock('code', codeText, { language: langAttr }));
            return;
          }

          if (el.classList.contains('nook-callout')) {
            const tone = (el.getAttribute('data-callout-tone') as any) || 'info';
            const icon = el.querySelector('.nook-callout-icon')?.textContent?.trim() || '💡';
            const body = el.querySelector('.nook-callout-body')?.innerHTML || el.innerHTML;
            blocks.push(createBlock('callout', body, { calloutTone: tone, calloutIcon: icon }));
            return;
          }

          if (el.classList.contains('nook-todo')) {
            const checked = el.getAttribute('data-checked') === 'true';
            const txt = el.querySelector('.nook-todo-text')?.innerHTML || stripHtmlTags(el.innerHTML);
            blocks.push(createBlock('todo', txt, { checked }));
            return;
          }

          if (tag === 'details') {
            const summary = el.querySelector('summary')?.innerHTML || 'Toggle Section';
            const bodyEl = el.querySelector('.nook-toggle-body');
            const body = bodyEl ? bodyEl.innerHTML : el.innerHTML.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, '').trim();
            blocks.push(createBlock('toggle', summary, { toggleOpen: true, toggleBody: body }));
            return;
          }

          if (tag === 'figure') {
            const img = el.querySelector('img');
            const cap = el.querySelector('figcaption')?.textContent || '';
            if (img?.getAttribute('src')) {
              blocks.push(createBlock('image', '', {
                imageUrl: img.getAttribute('src')!,
                imageCaption: cap,
                imageWidth: 100
              }));
              return;
            }
          }

          if (tag === 'img') {
            const src = el.getAttribute('src');
            if (src) {
              blocks.push(createBlock('image', '', { imageUrl: src, imageCaption: el.getAttribute('alt') || '', imageWidth: 100 }));
            }
            return;
          }

          if (tag === 'h1') {
            blocks.push(createBlock('h1', el.innerHTML));
            return;
          }
          if (tag === 'h2') {
            blocks.push(createBlock('h2', el.innerHTML));
            return;
          }
          if (tag === 'h3' || tag === 'h4') {
            blocks.push(createBlock('h3', el.innerHTML));
            return;
          }
          if (tag === 'blockquote') {
            blocks.push(createBlock('quote', el.innerHTML));
            return;
          }
          if (tag === 'hr') {
            blocks.push(createBlock('divider', ''));
            return;
          }
          if (tag === 'pre') {
            const codeEl = el.querySelector('code');
            const lang = codeEl?.className.match(/language-([a-z0-9]+)/i)?.[1] || 'python';
            blocks.push(createBlock('code', el.textContent || '', { language: lang }));
            return;
          }
          if (tag === 'ul') {
            Array.from(el.children).forEach(li => {
              if (li.tagName.toLowerCase() === 'li') {
                blocks.push(createBlock('bullet', li.innerHTML));
              }
            });
            return;
          }
          if (tag === 'ol') {
            Array.from(el.children).forEach(li => {
              if (li.tagName.toLowerCase() === 'li') {
                blocks.push(createBlock('numbered', li.innerHTML));
              }
            });
            return;
          }
          if (tag === 'table' || (tag === 'div' && el.classList.contains('nook-table-wrap'))) {
            const tableEl = tag === 'table' ? el : el.querySelector('table');
            if (tableEl) {
              const rows: string[][] = [];
              let hasHeader = false;
              const theadRows = tableEl.querySelectorAll('thead tr');
              if (theadRows.length > 0) hasHeader = true;
              tableEl.querySelectorAll('tr').forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '');
                if (cells.length > 0) rows.push(cells);
              });
              if (rows.length > 0) {
                blocks.push(createBlock('table', '', { tableRows: rows, tableHasHeader: hasHeader }));
                return;
              }
            }
          }

          if (tag === 'div') {
            // Check if checkbox row
            const cb = el.querySelector('input[type="checkbox"]');
            if (cb) {
              const checked = (cb as HTMLInputElement).checked || cb.hasAttribute('checked');
              const labelText = el.textContent?.trim() || '';
              blocks.push(createBlock('todo', labelText, { checked }));
              return;
            }
            // If wrapper div containing multiple block children, unwrap
            const hasBlockKids = Array.from(el.children).some(c =>
              ['H1', 'H2', 'H3', 'P', 'DIV', 'UL', 'OL', 'TABLE', 'PRE', 'BLOCKQUOTE', 'DETAILS', 'FIGURE'].includes(c.tagName)
            );
            if (hasBlockKids) {
              Array.from(el.children).forEach(child => processElement(child));
              return;
            }
          }

          // Default paragraph
          const inner = el.innerHTML.trim();
          if (inner && inner !== '<br>') {
            blocks.push(createBlock('paragraph', inner));
          }
        };

        Array.from(root.childNodes).forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node as Element);
          } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            blocks.push(createBlock('paragraph', escapeHtml(node.textContent.trim())));
          }
        });

        if (blocks.length > 0) return blocks;
      }
    } catch {
      // Fallback to Markdown parsing below
    }
  }

  // Markdown / Plain Text Parser
  const lines = trimmed.replace(/\r\n/g, '\n').split('\n');
  const blocks: NoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const s = line.trim();

    if (!s) {
      i++;
      continue;
    }

    // Code block fence
    if (s.startsWith('```')) {
      const lang = s.slice(3).trim() || 'python';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(createBlock('code', codeLines.join('\n'), { language: lang }));
      continue;
    }

    // Math block $$...$$
    if (s.startsWith('$$')) {
      if (s.endsWith('$$') && s.length > 4) {
        blocks.push(createBlock('math', s.slice(2, -2).trim(), { displayMode: true }));
        i++;
        continue;
      }
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(createBlock('math', mathLines.join('\n').trim(), { displayMode: true }));
      continue;
    }

    // Table
    if (s.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const rows: string[][] = [];
      const parseRow = (rowLine: string) =>
        rowLine
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => c.trim());
      rows.push(parseRow(lines[i]));
      i += 2; // skip separator
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push(createBlock('table', '', { tableRows: rows, tableHasHeader: true }));
      continue;
    }

    // Divider
    if (/^(?:---|\*\*\*|___)$/.test(s)) {
      blocks.push(createBlock('divider', ''));
      i++;
      continue;
    }

    // Headings
    if (s.startsWith('### ')) {
      blocks.push(createBlock('h3', inlineMarkdownToHtml(s.slice(4))));
      i++;
      continue;
    }
    if (s.startsWith('## ')) {
      blocks.push(createBlock('h2', inlineMarkdownToHtml(s.slice(3))));
      i++;
      continue;
    }
    if (s.startsWith('# ')) {
      blocks.push(createBlock('h1', inlineMarkdownToHtml(s.slice(2))));
      i++;
      continue;
    }

    // Checklist
    const todoMatch = s.match(/^(?:[-*]\s*)?\[( |x|X)\]\s*(.*)$/);
    if (todoMatch) {
      blocks.push(createBlock('todo', inlineMarkdownToHtml(todoMatch[2]), { checked: todoMatch[1].toLowerCase() === 'x' }));
      i++;
      continue;
    }

    // Bullets
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const indent = Math.min(3, Math.floor(bulletMatch[1].length / 2));
      blocks.push(createBlock('bullet', inlineMarkdownToHtml(bulletMatch[2]), undefined, indent));
      i++;
      continue;
    }

    // Numbered
    const numMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (numMatch) {
      const indent = Math.min(3, Math.floor(numMatch[1].length / 2));
      blocks.push(createBlock('numbered', inlineMarkdownToHtml(numMatch[2]), undefined, indent));
      i++;
      continue;
    }

    // Blockquote / Callout
    if (s.startsWith('> ')) {
      const quoteText = s.slice(2);
      if (/^\[!(TIP|NOTE|INFO|WARNING|IMPORTANT|CAUTION)\]/i.test(quoteText)) {
        const toneRaw = quoteText.match(/^\[!([A-Z]+)\]/i)?.[1]?.toLowerCase() || 'info';
        const tone = toneRaw === 'warning' || toneRaw === 'caution' ? 'warning' : toneRaw === 'tip' ? 'tip' : 'info';
        const body = quoteText.replace(/^\[![A-Z]+\]\s*/i, '');
        blocks.push(createBlock('callout', inlineMarkdownToHtml(body), { calloutTone: tone, calloutIcon: tone === 'warning' ? '⚠️' : '💡' }));
      } else {
        blocks.push(createBlock('quote', inlineMarkdownToHtml(quoteText)));
      }
      i++;
      continue;
    }

    // Paragraph
    blocks.push(createBlock('paragraph', inlineMarkdownToHtml(s)));
    i++;
  }

  return blocks.length > 0 ? blocks : [createBlock('paragraph', '')];
}

export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  coverImage?: string;
  tags: string[];
  blocks: NoteBlock[];
}

export const COVER_PRESETS: Array<{ id: string; label: string; value: string }> = [
  { id: 'indigo', label: 'Deep Indigo', value: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #3b82f6 100%)' },
  { id: 'emerald', label: 'Emerald Study', value: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)' },
  { id: 'sunset', label: 'Warm Sunset', value: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #f59e0b 100%)' },
  { id: 'slate', label: 'Minimal Slate', value: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #475569 100%)' },
  { id: 'rose', label: 'Crimson Rose', value: 'linear-gradient(135deg, #881337 0%, #e11d48 50%, #fb7185 100%)' },
  { id: 'aurora', label: 'Aurora Teal', value: 'linear-gradient(135deg, #164e63 0%, #0284c7 50%, #8b5cf6 100%)' }
];

export const NOTE_EMOJI_ICONS = ['📝', '📘', '🧠', '💡', '🔬', '💻', '📐', '🎓', '⚡', '🎯', '📊', '🗂️'];

export function getNoteTemplates(): NoteTemplate[] {
  return [
    {
      id: 'blank',
      name: 'Blank Page',
      icon: '📝',
      description: 'Start fresh with an open Notion-style writing canvas.',
      tags: ['notes'],
      blocks: [createBlock('paragraph', '')]
    },
    {
      id: 'cornell',
      name: 'Cornell Lecture Notes',
      icon: '🎓',
      description: 'Structured lecture layout with cues, main concepts, and summary.',
      coverImage: COVER_PRESETS[0].value,
      tags: ['lecture', 'cornell'],
      blocks: [
        createBlock('callout', '<strong>Lecture Topic & Date:</strong> Add module details, lecturer, and core objective.', { calloutTone: 'info', calloutIcon: '🎓' }),
        createBlock('h2', 'Key Questions & Cues'),
        createBlock('bullet', 'What problem does this concept solve?'),
        createBlock('bullet', 'What are the core definitions and invariants?'),
        createBlock('h2', 'Detailed Lecture Notes'),
        createBlock('paragraph', 'Write detailed explanations, examples, and diagrams here...'),
        createBlock('h2', 'Action Items & Review'),
        createBlock('todo', 'Review lecture slides and test recall', { checked: false }),
        createBlock('todo', 'Create flashcards for key definitions', { checked: false }),
        createBlock('divider', ''),
        createBlock('h3', 'Executive Summary'),
        createBlock('quote', 'Summarize the entire lecture in 2-3 clear sentences.')
      ]
    },
    {
      id: 'revision',
      name: 'Exam Revision Sheet',
      icon: '🎯',
      description: 'High-yield exam cheatsheet with formulas, comparisons, and trap warnings.',
      coverImage: COVER_PRESETS[2].value,
      tags: ['exam', 'revision'],
      blocks: [
        createBlock('callout', '<strong>Exam Focus:</strong> Core testable formulas, theorems, and pitfalls.', { calloutTone: 'warning', calloutIcon: '⚠️' }),
        createBlock('h2', 'Core Formulas & Invariants'),
        createBlock('math', 'T(n) = 2T(n/2) + O(n) \\implies O(n \\log n)', { displayMode: true }),
        createBlock('h2', 'Concept Comparison Matrix'),
        createBlock('table', '', {
          tableHasHeader: true,
          tableRows: [
            ['Method / Structure', 'Time Complexity', 'Best Use Case'],
            ['Approach A', 'O(log n)', 'Sorted lookup'],
            ['Approach B', 'O(1) avg', 'Direct key indexing']
          ]
        }),
        createBlock('h2', 'Practice Self-Check'),
        createBlock('toggle', 'Self-Test Question 1: Why does this invariant hold?', {
          toggleOpen: false,
          toggleBody: 'Click to expand and write your model answer for active recall!'
        })
      ]
    },
    {
      id: 'lab',
      name: 'Engineering / Lab Report',
      icon: '💻',
      description: 'Clean technical documentation with objectives, code, results table, and conclusion.',
      coverImage: COVER_PRESETS[1].value,
      tags: ['lab', 'engineering'],
      blocks: [
        createBlock('h2', '1. Objective & Hypothesis'),
        createBlock('paragraph', 'State the experiment goals and expected system behavior.'),
        createBlock('h2', '2. Implementation Snippet'),
        createBlock('code', 'def run_experiment(data):\n    return sorted(data)', { language: 'python' }),
        createBlock('h2', '3. Observed Measurements'),
        createBlock('table', '', {
          tableHasHeader: true,
          tableRows: [
            ['Trial', 'Input Size', 'Observed Latency (ms)'],
            ['Trial 1', '1,000', '1.4 ms'],
            ['Trial 2', '10,000', '14.2 ms']
          ]
        }),
        createBlock('h2', '4. Conclusions'),
        createBlock('callout', 'Summarize experimental verification and potential sources of error.', { calloutTone: 'tip', calloutIcon: '✅' })
      ]
    }
  ];
}

