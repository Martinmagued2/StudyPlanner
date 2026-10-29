import React, { useState } from 'react';
import { Check, Copy, Code2 } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-typescript';
import katex from 'katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Helper to safely render LaTeX math formula
  const renderLatex = (formula: string, displayMode: boolean = false, key: string) => {
    try {
      const renderedHtml = katex.renderToString(formula.trim(), {
        displayMode,
        throwOnError: false
      });
      return displayMode ? (
        <div
          key={key}
          className="my-3 py-3 px-4 overflow-x-auto text-center rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs text-slate-900 dark:text-slate-100"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <span
          key={key}
          className="inline-katex inline-block px-1 py-0.5 rounded bg-slate-100/70 dark:bg-slate-800/60 align-middle text-slate-900 dark:text-slate-100 mx-0.5"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      );
    } catch {
      return (
        <span key={key} className="font-mono text-indigo-600 dark:text-indigo-400">
          {formula}
        </span>
      );
    }
  };

  // Helper to render inline elements (bold, italic, code, math, links)
  const renderInline = (text: string): React.ReactNode[] => {
    // Regex matching inline code, bold, italic, links, and LaTeX math ($...$ or $$...$$)
    // 1: `code`
    // 2: **bold** or __bold__
    // 3: *italic* or _italic_
    // 4: [link](url)
    // 5: $$math$$
    // 6: $math$
    const tokenRegex = /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*]+\*|_[^_]+_)|(\[[^\]]+\]\([^)]+\))|(\$\$[^\$]+\$\$)|(\$[^\$\n]+?\$)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let keyIdx = 0;
    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.slice(lastIndex, match.index));
      }

      const matchStr = match[0];
      if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        // Inline Code
        elements.push(
          <code
            key={`inline_code_${keyIdx++}`}
            className="px-1.5 py-0.5 rounded font-mono text-[11.5px] bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700 select-all"
          >
            {matchStr.slice(1, -1)}
          </code>
        );
      } else if (
        (matchStr.startsWith('**') && matchStr.endsWith('**')) ||
        (matchStr.startsWith('__') && matchStr.endsWith('__'))
      ) {
        // Bold
        elements.push(
          <strong key={`bold_${keyIdx++}`} className="font-bold text-slate-900 dark:text-slate-100">
            {matchStr.slice(2, -2)}
          </strong>
        );
      } else if (
        (matchStr.startsWith('*') && matchStr.endsWith('*')) ||
        (matchStr.startsWith('_') && matchStr.endsWith('_'))
      ) {
        // Italic
        elements.push(
          <em key={`italic_${keyIdx++}`} className="italic">
            {matchStr.slice(1, -1)}
          </em>
        );
      } else if (matchStr.startsWith('[') && matchStr.includes('](') && matchStr.endsWith(')')) {
        // Link
        const labelEnd = matchStr.indexOf('](');
        const label = matchStr.slice(1, labelEnd);
        const url = matchStr.slice(labelEnd + 2, -1);
        elements.push(
          <a
            key={`link_${keyIdx++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {label}
          </a>
        );
      } else if (matchStr.startsWith('$$') && matchStr.endsWith('$$')) {
        // Display LaTeX Math
        elements.push(renderLatex(matchStr.slice(2, -2), true, `math_disp_${keyIdx++}`));
      } else if (matchStr.startsWith('$') && matchStr.endsWith('$')) {
        // Inline LaTeX Math
        elements.push(renderLatex(matchStr.slice(1, -1), false, `math_inl_${keyIdx++}`));
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return elements;
  };

  // Split lines into blocks (fenced code, display math, tables, headings, lists, blockquotes, paragraphs)
  const renderBlocks = () => {
    const rawLines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let blockKey = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];

      // 1. Fenced Code Block: ```lang ... ```
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'plaintext';
        const codeLines: string[] = [];
        i++;
        while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
          codeLines.push(rawLines[i]);
          i++;
        }
        i++; // skip closing ```
        const rawCode = codeLines.join('\n');
        blocks.push(
          <CodeBlock
            key={`code_${blockKey++}`}
            code={rawCode}
            language={lang}
          />
        );
        continue;
      }

      // 2. Standalone Multi-line Display Math: $$ ... $$
      if (line.trim().startsWith('$$')) {
        let formula = line.trim().slice(2);
        if (formula.endsWith('$$') && formula.length > 2) {
          formula = formula.slice(0, -2);
          blocks.push(renderLatex(formula, true, `block_math_${blockKey++}`));
          i++;
          continue;
        } else {
          const mathLines: string[] = [formula];
          i++;
          while (i < rawLines.length && !rawLines[i].trim().endsWith('$$')) {
            mathLines.push(rawLines[i]);
            i++;
          }
          if (i < rawLines.length) {
            const endL = rawLines[i].trim();
            mathLines.push(endL.slice(0, -2));
            i++;
          }
          blocks.push(renderLatex(mathLines.join('\n'), true, `block_math_${blockKey++}`));
          continue;
        }
      }

      // 3. Standalone Single-line Math: $formula$ alone on its own line
      if (line.trim().startsWith('$') && line.trim().endsWith('$') && line.trim().length > 2 && !line.trim().slice(1, -1).includes('$')) {
        blocks.push(renderLatex(line.trim().slice(1, -1), true, `single_math_${blockKey++}`));
        i++;
        continue;
      }

      // 4. Markdown Table Detection
      if (
        line.trim().startsWith('|') &&
        line.trim().endsWith('|') &&
        i + 1 < rawLines.length &&
        rawLines[i + 1].trim().startsWith('|') &&
        rawLines[i + 1].includes('---')
      ) {
        const headerRow = line
          .trim()
          .slice(1, -1)
          .split('|')
          .map(c => c.trim());
        
        i += 2; // skip header & separator
        const bodyRows: string[][] = [];

        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          const cells = rawLines[i]
            .trim()
            .slice(1, -1)
            .split('|')
            .map(c => c.trim());
          bodyRows.push(cells);
          i++;
        }

        blocks.push(
          <div key={`table_${blockKey++}`} className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {headerRow.map((head, hIdx) => (
                    <th key={hIdx} className="px-3.5 py-2">
                      {renderInline(head)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2 text-slate-700 dark:text-slate-300">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // 5. Headings
      if (line.startsWith('# ')) {
        blocks.push(
          <h1 key={`h1_${blockKey++}`} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2 first:mt-0">
            {renderInline(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push(
          <h2 key={`h2_${blockKey++}`} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1.5 first:mt-0">
            {renderInline(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        blocks.push(
          <h3 key={`h3_${blockKey++}`} className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2.5 mb-1 first:mt-0">
            {renderInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('#### ')) {
        blocks.push(
          <h4 key={`h4_${blockKey++}`} className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-1 first:mt-0">
            {renderInline(line.slice(5))}
          </h4>
        );
        i++;
        continue;
      }

      // 6. Blockquotes
      if (line.trim().startsWith('> ')) {
        blocks.push(
          <blockquote
            key={`quote_${blockKey++}`}
            className="border-l-3 border-blue-500 pl-3 py-1 my-2 bg-blue-50/40 dark:bg-blue-950/20 text-slate-700 dark:text-slate-300 italic rounded-r text-xs leading-relaxed"
          >
            {renderInline(line.trim().slice(2))}
          </blockquote>
        );
        i++;
        continue;
      }

      // 7. Unordered List Items
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listItems: string[] = [];
        while (i < rawLines.length && (rawLines[i].trim().startsWith('- ') || rawLines[i].trim().startsWith('* '))) {
          listItems.push(rawLines[i].trim().slice(2));
          i++;
        }
        blocks.push(
          <ul key={`ul_${blockKey++}`} className="space-y-1 my-2 pl-2">
            {listItems.map((item, lIdx) => (
              <li key={lIdx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span className="flex-1">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 8. Ordered List Items
      if (/^\d+\.\s/.test(line.trim())) {
        const listItems: { num: string; text: string }[] = [];
        while (i < rawLines.length && /^\d+\.\s/.test(rawLines[i].trim())) {
          const matchNum = rawLines[i].trim().match(/^(\d+)\.\s(.*)$/);
          if (matchNum) {
            listItems.push({ num: matchNum[1], text: matchNum[2] });
          }
          i++;
        }
        blocks.push(
          <ol key={`ol_${blockKey++}`} className="space-y-1 my-2 pl-2">
            {listItems.map((item, lIdx) => (
              <li key={lIdx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-[11px] shrink-0 min-w-[16px]">
                  {item.num}.
                </span>
                <span className="flex-1">{renderInline(item.text)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 9. Horizontal Rule
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        blocks.push(
          <hr key={`hr_${blockKey++}`} className="border-t border-slate-200 dark:border-slate-800 my-3" />
        );
        i++;
        continue;
      }

      // 10. Regular paragraph
      if (line.trim().length > 0) {
        blocks.push(
          <p key={`p_${blockKey++}`} className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 my-1.5">
            {renderInline(line)}
          </p>
        );
      } else {
        // Empty spacer
        blocks.push(<div key={`empty_${blockKey++}`} className="h-1" />);
      }

      i++;
    }

    return blocks;
  };

  return <div className={`markdown-content space-y-0.5 ${className}`}>{renderBlocks()}</div>;
};

// Interactive Code Block with syntax highlighting & Copy Button
interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Map common aliases to Prism grammars
  const getGrammar = (lang: string) => {
    const l = lang.toLowerCase().trim();
    if (l === 'js' || l === 'javascript') return Prism.languages.javascript;
    if (l === 'ts' || l === 'typescript') return Prism.languages.typescript || Prism.languages.javascript;
    if (l === 'py' || l === 'python') return Prism.languages.python;
    if (l === 'java') return Prism.languages.java;
    if (l === 'cpp' || l === 'c++' || l === 'c') return Prism.languages.cpp || Prism.languages.clike;
    if (l === 'sql') return Prism.languages.sql;
    if (l === 'json') return Prism.languages.json || Prism.languages.javascript;
    if (l === 'bash' || l === 'sh' || l === 'shell') return Prism.languages.bash;
    if (l === 'html' || l === 'xml') return Prism.languages.markup;
    if (l === 'css') return Prism.languages.css;
    return Prism.languages.clike || Prism.languages.plain;
  };

  const highlightedHtml = React.useMemo(() => {
    try {
      const grammar = getGrammar(language);
      if (grammar) {
        return Prism.highlight(code, grammar, language);
      }
    } catch {
      // Fallback
    }
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }, [code, language]);

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-100 shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-mono uppercase font-bold text-slate-300">
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span>{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto text-[11.5px] font-mono leading-relaxed select-all">
        <pre className="m-0 p-0">
          <code
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            className={`language-${language}`}
          />
        </pre>
      </div>
    </div>
  );
};
