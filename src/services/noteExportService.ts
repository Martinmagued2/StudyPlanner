import { Course, Note, NoteBlock } from '../types';
import { blocksToHtml, blocksToMarkdown, escapeHtml, parseHtmlOrMarkdownToBlocks } from './noteBlockService';

export interface PdfExportOptions {
  paperSize?: 'A4' | 'Letter';
  includePageNumbers?: boolean;
  includeHeaderFooter?: boolean;
  includeCoverAndMeta?: boolean;
}

/**
 * Collects KaTeX and loaded stylesheet CSS rules from the current page
 * so exported HTML / PDF renders mathematical expressions identically.
 */
function collectKatexAndTypographyCss(): string {
  const katexRules: string[] = [];
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const cssText = rules[j].cssText;
          if (cssText.includes('.katex') || cssText.includes('@font-face') && cssText.includes('KaTeX')) {
            katexRules.push(cssText);
          }
        }
      } catch {
        // Cross-origin stylesheet skip
      }
    }
  } catch { }
  return katexRules.join('\n');
}

/**
 * Builds a complete, standalone HTML document faithfully preserving all Notion block designs,
 * text colors, background highlights, syntax-highlighted code blocks, KaTeX equations,
 * callout boxes, tables, images, and multilingual (including Arabic RTL) typography.
 */
export function buildFormattedNoteDocumentHtml(
  note: Note,
  course?: Course,
  options: PdfExportOptions = {}
): string {
  const {
    paperSize = 'A4',
    includePageNumbers = true,
    includeHeaderFooter = true,
    includeCoverAndMeta = true
  } = options;

  const blocks: NoteBlock[] =
    Array.isArray(note.blocks) && note.blocks.length > 0
      ? note.blocks
      : parseHtmlOrMarkdownToBlocks(note.content || '');

  const bodyHtml = blocksToHtml(blocks);
  const katexCss = typeof document !== 'undefined' ? collectKatexAndTypographyCss() : '';
  const updatedStr = new Date(note.updatedAt || Date.now()).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const plainWords = (note.content || '').replace(/<[^>]+>/g, ' ').trim();
  const wordCount = plainWords ? plainWords.split(/\s+/).length : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(note.title || 'Untitled Note')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: ${paperSize} portrait;
      margin: 18mm 18mm 20mm 18mm;
      ${includeHeaderFooter ? `
      @top-left {
        content: "${escapeHtml((note.title || 'StudyPlanner Note').slice(0, 48))}";
        font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
        font-size: 8.5pt;
        color: #64748b;
      }
      @top-right {
        content: "${course ? escapeHtml(course.code) : 'StudyPlanner'}";
        font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
        font-size: 8.5pt;
        color: #64748b;
      }` : ''}
      ${includePageNumbers ? `
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
        font-size: 8.5pt;
        color: #64748b;
      }
      @bottom-left {
        content: "Exported from StudyPlanner • ${escapeHtml(updatedStr)}";
        font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
        font-size: 8.5pt;
        color: #94a3b8;
      }` : ''}
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Inter', 'Noto Sans Arabic', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, Arial, sans-serif;
      font-size: 13.5px;
      line-height: 1.72;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .document-shell {
      max-width: 800px;
      margin: 0 auto;
      padding: 28px 32px;
      background: #ffffff;
    }

    @media print {
      .document-shell {
        max-width: 100%;
        padding: 0;
      }
    }

    .doc-cover {
      height: 110px;
      border-radius: 12px;
      margin-bottom: 20px;
      background-size: cover;
      background-position: center;
      border: 1px solid #e2e8f0;
    }

    .doc-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
      break-inside: avoid;
    }

    .doc-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .doc-icon {
      font-size: 32px;
      line-height: 1;
    }

    .doc-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    .doc-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11.5px;
      color: #64748b;
    }

    .badge {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      font-size: 11px;
      margin-right: 5px;
      border: 1px solid #e2e8f0;
    }

    .course-badge {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    /* Typography & Block Styles */
    .nook-h1, h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 26px 0 10px 0;
      line-height: 1.3;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      break-after: avoid;
      page-break-after: avoid;
    }

    .nook-h2, h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin: 22px 0 8px 0;
      line-height: 1.35;
      break-after: avoid;
      page-break-after: avoid;
    }

    .nook-h3, h3 {
      font-size: 15px;
      font-weight: 700;
      color: #334155;
      margin: 16px 0 6px 0;
      line-height: 1.4;
      break-after: avoid;
      page-break-after: avoid;
    }

    .nook-p, p {
      margin: 0 0 10px 0;
    }

    .nook-ul, ul {
      margin: 6px 0 12px 0;
      padding-left: 24px;
      list-style-type: disc;
    }

    .nook-ol, ol {
      margin: 6px 0 12px 0;
      padding-left: 24px;
      list-style-type: decimal;
    }

    li {
      margin-bottom: 5px;
    }

    .nook-todo {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 6px 0;
      padding: 4px 6px;
      border-radius: 6px;
      background: #f8fafc;
      break-inside: avoid;
    }

    .nook-checkbox {
      font-size: 14px;
      color: #2563eb;
      font-weight: 700;
    }

    .nook-quote, blockquote {
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
      color: #1e293b;
      padding: 10px 16px;
      margin: 14px 0;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      break-inside: avoid;
    }

    .nook-callout {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      margin: 14px 0;
      border: 1px solid #cbd5e1;
      break-inside: avoid;
    }

    .nook-callout-info { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
    .nook-callout-tip { background: #ecfdf5; border-color: #a7f3d0; color: #064e3b; }
    .nook-callout-warning { background: #fffbeb; border-color: #fde68a; color: #78350f; }
    .nook-callout-danger { background: #fff1f2; border-color: #fecdd3; color: #881337; }
    .nook-callout-neutral { background: #f8fafc; border-color: #e2e8f0; color: #1e293b; }
    .nook-callout-icon { font-size: 17px; line-height: 1.4; flex-shrink: 0; }
    .nook-callout-body { flex: 1; }

    .nook-toggle {
      margin: 12px 0;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .nook-toggle-summary {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      list-style: none;
    }
    .nook-toggle-body {
      padding-left: 14px;
      border-left: 2px solid #cbd5e1;
      color: #334155;
      font-size: 12.5px;
    }

    .nook-code-block {
      margin: 16px 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #1e293b;
      background: #0f172a;
      color: #f8fafc;
      break-inside: avoid;
    }
    .nook-code-lang {
      background: #1e293b;
      color: #93c5fd;
      padding: 5px 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .nook-code-block pre {
      margin: 0;
      padding: 14px;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11.5px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
      background: #0f172a;
      color: #f8fafc;
    }

    code, .nook-inline-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: #f1f5f9;
      color: #1d4ed8;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    pre code {
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      color: inherit !important;
    }

    /* Prism syntax colors preserved in PDF */
    .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #94a3b8; font-style: italic; }
    .token.punctuation { color: #cbd5e1; }
    .token.property, .token.tag, .token.boolean, .token.number, .token.constant { color: #fb923c; }
    .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin { color: #4ade80; }
    .token.operator, .token.entity, .token.url { color: #38bdf8; }
    .token.atrule, .token.attr-value, .token.keyword { color: #60a5fa; font-weight: 600; }
    .token.function, .token.class-name { color: #facc15; }
    .token.regex, .token.important, .token.variable { color: #c084fc; }

    .nook-table-wrap {
      margin: 16px 0;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      break-inside: avoid;
    }
    .nook-table, table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .nook-table th, .nook-table td, th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 11px;
      text-align: left;
      vertical-align: top;
    }
    .nook-table th, th {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
    }
    .nook-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .nook-math-block {
      margin: 14px 0;
      padding: 12px 16px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      text-align: center;
      overflow-x: auto;
      break-inside: avoid;
    }

    .nook-figure {
      margin: 16px 0;
      text-align: center;
      break-inside: avoid;
    }
    .nook-figure img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .nook-figure figcaption {
      margin-top: 6px;
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }

    .nook-divider, hr {
      border: 0;
      border-top: 1px solid #cbd5e1;
      margin: 20px 0;
    }

    mark {
      padding: 1px 4px;
      border-radius: 3px;
    }

    a {
      color: #2563eb;
      text-decoration: underline;
    }

    /* Loaded KaTeX Rules */
    ${katexCss}
  </style>
</head>
<body>
  <div class="document-shell">
    ${includeCoverAndMeta && note.coverImage ? `
      <div class="doc-cover" style="${note.coverImage.startsWith('http') || note.coverImage.startsWith('data:')
        ? `background-image: url('${escapeHtml(note.coverImage)}');`
        : `background: ${escapeHtml(note.coverImage)};`}">
      </div>` : ''}

    ${includeCoverAndMeta ? `
    <div class="doc-header" dir="auto">
      <div class="doc-title-row">
        ${note.icon ? `<span class="doc-icon">${escapeHtml(note.icon)}</span>` : ''}
        <h1 class="doc-title">${escapeHtml(note.title || 'Untitled Note')}</h1>
      </div>
      <div class="doc-meta">
        <div>
          ${course ? `<span class="badge course-badge">${escapeHtml(course.code)} — ${escapeHtml(course.name)}</span>` : ''}
          ${(note.tags || []).map(t => `<span class="badge">#${escapeHtml(t)}</span>`).join('')}
        </div>
        <div>
          <span>Updated: <strong>${escapeHtml(updatedStr)}</strong></span>
          <span style="margin-left: 8px;">• ${wordCount} words</span>
        </div>
      </div>
    </div>` : ''}

    <div class="doc-content">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Exports Note to PDF using an invisible dedicated print iframe (bypassing popup blockers)
 * and waits for web fonts & images to finish loading so formatting, colors, highlights,
 * Arabic text, tables, and KaTeX formulas export faithfully.
 */
export async function exportNoteToPdf(
  note: Note,
  course?: Course,
  options: PdfExportOptions = {}
): Promise<void> {
  const fullHtml = buildFormattedNoteDocumentHtml(note, course, options);

  // Create hidden iframe for crisp native vector PDF printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    const win = window.open('', '_blank', 'width=960,height=850');
    if (win) {
      win.document.open();
      win.document.write(fullHtml + '<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script>');
      win.document.close();
    } else {
      window.print();
    }
    return;
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  const waitAndPrint = async () => {
    try {
      if ((doc as any).fonts?.ready) {
        await (doc as any).fonts.ready;
      }
      const images = Array.from(doc.images || []);
      await Promise.all(
        images.map(
          img =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>(resolve => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                  setTimeout(resolve, 2500);
                })
        )
      );
    } catch { }

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  };

  waitAndPrint();
}

export function exportNoteToHtml(note: Note, course?: Course): void {
  const fullHtml = buildFormattedNoteDocumentHtml(note, course, {
    includeCoverAndMeta: true,
    includeHeaderFooter: false,
    includePageNumbers: false
  });
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(note.title || 'note').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportNoteToMarkdown(note: Note): void {
  const blocks: NoteBlock[] =
    Array.isArray(note.blocks) && note.blocks.length > 0
      ? note.blocks
      : parseHtmlOrMarkdownToBlocks(note.content || '');
  const md = blocksToMarkdown(blocks, note.title || 'Untitled Note');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(note.title || 'note').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyNoteFormatted(note: Note): Promise<boolean> {
  const blocks: NoteBlock[] =
    Array.isArray(note.blocks) && note.blocks.length > 0
      ? note.blocks
      : parseHtmlOrMarkdownToBlocks(note.content || '');
  const html = `<h1>${escapeHtml(note.title)}</h1>\n${blocksToHtml(blocks)}`;
  const plain = blocksToMarkdown(blocks, note.title);

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      return true;
    }
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(plain);
      return true;
    } catch {
      return false;
    }
  }
}

