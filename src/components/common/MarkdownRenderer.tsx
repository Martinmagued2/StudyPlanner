import React, { useState } from 'react';
import {
  Check,
  Copy,
  Code2,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  BookOpen,
  ArrowRight
} from 'lucide-react';
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
  // Checkbox toggle state for interactive revision checklists
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    const tokenRegex =
      /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*]+\*|_[^_]+_)|(\[[^\]]+\]\([^)]+\))|(\$\$[^\$]+\$\$)|(\$[^\$\n]+?\$)/g;
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
            className="px-1.5 py-0.5 rounded font-mono text-[12px] bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700/60 font-semibold select-all"
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
          <em key={`italic_${keyIdx++}`} className="italic text-slate-800 dark:text-slate-200">
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
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
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

  // Split lines into rich academic blocks
  const renderBlocks = () => {
    // Normalize newlines
    const rawLines = content.replace(/\r\n/g, '\n').split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let blockKey = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // 1. Fenced Code Block: ```lang ... ``` OR ``lang ... ``
      const isTripleBacktick = trimmed.startsWith('```');
      const isDoubleBacktick = !isTripleBacktick && trimmed.startsWith('``');

      if (isTripleBacktick || isDoubleBacktick) {
        const delimiter = isTripleBacktick ? '```' : '``';
        const lang = trimmed.slice(delimiter.length).trim() || 'text';
        const codeLines: string[] = [];
        i++;
        while (i < rawLines.length && !rawLines[i].trim().startsWith(delimiter)) {
          codeLines.push(rawLines[i]);
          i++;
        }
        if (i < rawLines.length && rawLines[i].trim().startsWith(delimiter)) {
          i++; // skip closing delimiter
        }
        const rawCode = codeLines.join('\n');
        blocks.push(
          <AcademicCodeBlock
            key={`code_${blockKey++}`}
            code={rawCode}
            language={lang}
          />
        );
        continue;
      }

      // 2. Standalone Multi-line Display Math: $$ ... $$
      if (trimmed.startsWith('$$')) {
        let formula = trimmed.slice(2);
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
      if (
        trimmed.startsWith('$') &&
        trimmed.endsWith('$') &&
        trimmed.length > 2 &&
        !trimmed.slice(1, -1).includes('$')
      ) {
        blocks.push(renderLatex(trimmed.slice(1, -1), true, `single_math_${blockKey++}`));
        i++;
        continue;
      }

      // 4. Horizontal Rules: ---, ***, ___
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        blocks.push(
          <div key={`hr_${blockKey++}`} className="my-6 flex items-center gap-3">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>
        );
        i++;
        continue;
      }

      // 5. Exam Trap / Pitfall Alert Box
      // Matches: "Trap 1: ...", "Exam Trap: ...", "Common Pitfall: ..."
      const trapMatch = trimmed.match(/^(?:> \s*)?(?:⚠️\s*)?(Trap\s*\d*|Exam Trap|Common Pitfall|Edge Case|Pitfall)\s*:\s*(.*)$/i);
      if (trapMatch) {
        const trapTitle = trapMatch[1];
        const trapDesc = trapMatch[2];
        i++;

        // Check if next line is a correction or explanation
        let correctionText = '';
        if (i < rawLines.length) {
          const nextTrim = rawLines[i].trim();
          const corrMatch = nextTrim.match(/^(?:> \s*)?(?:✅\s*)?(Correction|Reality|Resolution)\s*:\s*(.*)$/i);
          if (corrMatch) {
            correctionText = corrMatch[2];
            i++;
          }
        }

        blocks.push(
          <div
            key={`trap_${blockKey++}`}
            className="my-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 shadow-2xs space-y-2"
          >
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{trapTitle}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed pl-6">
              {renderInline(trapDesc)}
            </p>
            {correctionText && (
              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/50 flex items-start gap-2 pl-6">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase tracking-wide shrink-0">
                  Key Correction
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {renderInline(correctionText)}
                </p>
              </div>
            )}
          </div>
        );
        continue;
      }

      // 6. Worked Scenario / Practical Illustration Callout
      // Matches: "Scenario: ...", "Worked Example: ...", "Case Study: ..."
      const scenarioMatch = trimmed.match(/^(?:> \s*)?(?:💡\s*)?(Scenario|Worked Example|Case Study|Practical Illustration)\s*:\s*(.*)$/i);
      if (scenarioMatch) {
        const scenarioTitle = scenarioMatch[1];
        const scenarioFirstLine = scenarioMatch[2];
        const scenarioBody: string[] = [scenarioFirstLine];
        i++;

        // Collect indented or following scenario lines until empty line or new section
        while (
          i < rawLines.length &&
          rawLines[i].trim().length > 0 &&
          !rawLines[i].trim().startsWith('---') &&
          !rawLines[i].trim().startsWith('#') &&
          !/^\d+\.\s+[A-Z]/.test(rawLines[i].trim())
        ) {
          scenarioBody.push(rawLines[i].trim());
          i++;
        }

        blocks.push(
          <div
            key={`scenario_${blockKey++}`}
            className="my-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/25 p-4 shadow-2xs space-y-2"
          >
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{scenarioTitle}</span>
            </div>
            <div className="space-y-1.5 pl-6 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {scenarioBody.map((l, sIdx) => {
                // If it has bold labels like "The Conflict:", "The Matrix Dilemma:", "Resolution Strategy:"
                const labelMatch = l.match(/^([^:]+):\s*(.*)$/);
                if (labelMatch && labelMatch[1].length < 35 && !l.startsWith('http')) {
                  return (
                    <p key={sIdx}>
                      <strong className="text-indigo-950 dark:text-indigo-300 font-semibold">{labelMatch[1]}: </strong>
                      {renderInline(labelMatch[2])}
                    </p>
                  );
                }
                return <p key={sIdx}>{renderInline(l)}</p>;
              })}
            </div>
          </div>
        );
        continue;
      }

      // 7. Markdown Tables: lines containing | with divider row
      if (
        trimmed.includes('|') &&
        i + 1 < rawLines.length &&
        rawLines[i + 1].includes('|') &&
        rawLines[i + 1].includes('---')
      ) {
        const headerRow = trimmed
          .split('|')
          .map(c => c.trim())
          .filter((_, idx, arr) => (idx > 0 && idx < arr.length - 1) || arr.length <= 2);

        i += 2; // skip header and separator
        const bodyRows: string[][] = [];

        while (i < rawLines.length && rawLines[i].trim().includes('|') && rawLines[i].trim().length > 1) {
          const cells = rawLines[i]
            .trim()
            .split('|')
            .map(c => c.trim())
            .filter((_, idx, arr) => (idx > 0 && idx < arr.length - 1) || arr.length <= 2);
          bodyRows.push(cells);
          i++;
        }

        blocks.push(
          <div key={`table_${blockKey++}`} className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {headerRow.map((head, hIdx) => (
                    <th key={hIdx} className="px-4 py-2.5">
                      {renderInline(head)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`transition-colors ${
                      rIdx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''
                    } hover:bg-blue-50/40 dark:hover:bg-slate-800/50`}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 leading-normal">
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

      // 8. Revision Checklist Items: [ ] or [x] or - [ ] or - [x]
      const checkMatch = trimmed.match(/^(?:[-*]\s*)?\[([ xX])\]\s*(.*)$/);
      if (checkMatch) {
        const isInitiallyChecked = checkMatch[1].toLowerCase() === 'x';
        const checkItems: { id: string; checked: boolean; text: string }[] = [];

        while (i < rawLines.length) {
          const curTrim = rawLines[i].trim();
          const curMatch = curTrim.match(/^(?:[-*]\s*)?\[([ xX])\]\s*(.*)$/);
          if (!curMatch) break;
          const itemId = `chk_${blockKey}_${checkItems.length}`;
          checkItems.push({
            id: itemId,
            checked: checkedItems[itemId] !== undefined ? checkedItems[itemId] : curMatch[1].toLowerCase() === 'x',
            text: curMatch[2]
          });
          i++;
        }

        blocks.push(
          <div
            key={`checklist_${blockKey++}`}
            className="my-4 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 space-y-2.5"
          >
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider mb-2">
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Revision Checklist</span>
            </div>
            {checkItems.map(item => (
              <label
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 cursor-pointer group p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800/50 transition-colors select-none"
              >
                <button
                  type="button"
                  className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center transition-colors shrink-0 ${
                    item.checked
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-blue-500'
                  }`}
                >
                  {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <span className={`flex-1 leading-relaxed ${item.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                  {renderInline(item.text)}
                </span>
              </label>
            ))}
          </div>
        );
        continue;
      }

      // 8.5 Context Callout Headers: e.g. "Why This Matters in CSE441"
      const whyMattersMatch = trimmed.match(/^(Why This Matters[^\n]*)$/i);
      if (whyMattersMatch) {
        blocks.push(
          <div
            key={`why_matters_${blockKey++}`}
            className="my-3 px-3.5 py-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-xs uppercase tracking-wide flex items-center gap-2 shadow-xs"
          >
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{whyMattersMatch[1]}</span>
          </div>
        );
        i++;
        continue;
      }

      // 8.6 Phase Sections: e.g. "Phase 1: Early Phases (Inception & Planning)"
      const phaseMatch = trimmed.match(/^(Phase\s+\d+:\s+[^\n]+)$/i);
      if (phaseMatch) {
        blocks.push(
          <div
            key={`phase_hdr_${blockKey++}`}
            className="mt-4 mb-2 p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-bold">
              MILESTONE
            </span>
            <span>{phaseMatch[1]}</span>
          </div>
        );
        i++;
        continue;
      }

      // 8.7 Standalone Category Heading Line Ending with Colon: e.g. "Functional Structure:"
      const labelHeadingMatch = trimmed.match(/^([A-Z][A-Za-z0-9 /()&-]{2,40}):\s*$/);
      if (labelHeadingMatch) {
        blocks.push(
          <div
            key={`label_heading_${blockKey++}`}
            className="mt-4 mb-1.5 flex items-center gap-1.5 font-bold text-xs sm:text-sm text-blue-700 dark:text-blue-400 font-mono uppercase tracking-wide"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{labelHeadingMatch[1]}</span>
          </div>
        );
        i++;
        continue;
      }

      // 9. Document Main Title: # Title OR (🎓 Title
      if (trimmed.startsWith('# ') || trimmed.startsWith('(🎓') || (trimmed.startsWith('🎓') && i === 0)) {
        const cleanTitle = trimmed
          .replace(/^#\s*/, '')
          .replace(/^\(\s*/, '')
          .replace(/\)\s*$/, '');
        blocks.push(
          <div key={`title_${blockKey++}`} className="mt-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>{cleanTitle}</span>
            </h1>
          </div>
        );
        i++;
        continue;
      }

      // 10. Major Numbered Chapter Sections: e.g. "1. Executive Summary & Big Picture" OR "## 1. ..."
      const chapterMatch = trimmed.match(/^(?:##\s*)?(\d+)\.\s+([A-Z].*)$/);
      if (chapterMatch && chapterMatch[2].length < 75) {
        const num = chapterMatch[1];
        const titleText = chapterMatch[2];
        blocks.push(
          <div key={`chapter_${blockKey++}`} className="mt-7 mb-3 flex items-center gap-2.5 pt-2">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
              {num}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {renderInline(titleText)}
            </h2>
          </div>
        );
        i++;
        continue;
      }

      // 11. Sub-sections: e.g. "A. The Three Basic Organizational Structures" OR "### A. ..."
      const letterSubMatch = trimmed.match(/^(?:###\s*)?([A-Z])\.\s+([A-Z].*)$/);
      if (letterSubMatch && letterSubMatch[2].length < 80) {
        const letter = letterSubMatch[1];
        const subTitle = letterSubMatch[2];
        blocks.push(
          <div key={`letter_sub_${blockKey++}`} className="mt-4 mb-2 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {letter}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {renderInline(subTitle)}
            </h3>
          </div>
        );
        i++;
        continue;
      }

      // 12. Standard Headings: ##, ###, ####
      if (trimmed.startsWith('## ')) {
        blocks.push(
          <h2 key={`h2_${blockKey++}`} className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2 first:mt-0">
            {renderInline(trimmed.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith('### ')) {
        blocks.push(
          <h3 key={`h3_${blockKey++}`} className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1.5 first:mt-0">
            {renderInline(trimmed.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith('#### ')) {
        blocks.push(
          <h4 key={`h4_${blockKey++}`} className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1 first:mt-0">
            {renderInline(trimmed.slice(5))}
          </h4>
        );
        i++;
        continue;
      }

      // 13. Blockquotes: > Quote
      if (trimmed.startsWith('> ')) {
        blocks.push(
          <blockquote
            key={`quote_${blockKey++}`}
            className="border-l-3 border-blue-500 pl-3.5 py-1.5 my-3 bg-blue-50/50 dark:bg-blue-950/25 text-slate-700 dark:text-slate-300 italic rounded-r text-xs sm:text-sm leading-relaxed"
          >
            {renderInline(trimmed.slice(2))}
          </blockquote>
        );
        i++;
        continue;
      }

      // 14. Unordered Lists: - item or * item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems: string[] = [];
        while (i < rawLines.length && (rawLines[i].trim().startsWith('- ') || rawLines[i].trim().startsWith('* '))) {
          listItems.push(rawLines[i].trim().slice(2));
          i++;
        }
        blocks.push(
          <ul key={`ul_${blockKey++}`} className="space-y-1.5 my-2.5 pl-2">
            {listItems.map((item, lIdx) => (
              <li key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                <span className="flex-1">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 15. Ordered Lists: 1. item, 2. item
      if (/^\d+\.\s/.test(trimmed)) {
        const listItems: { num: string; text: string }[] = [];
        while (i < rawLines.length && /^\d+\.\s/.test(rawLines[i].trim())) {
          const matchNum = rawLines[i].trim().match(/^(\d+)\.\s(.*)$/);
          if (matchNum) {
            listItems.push({ num: matchNum[1], text: matchNum[2] });
          }
          i++;
        }
        blocks.push(
          <ol key={`ol_${blockKey++}`} className="space-y-1.5 my-2.5 pl-2">
            {listItems.map((item, lIdx) => (
              <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs shrink-0 min-w-[20px]">
                  {item.num}.
                </span>
                <span className="flex-1">{renderInline(item.text)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 16. Term / Definition Pairs: e.g. "Definition: ...", "Structural Context: ...", "Deliverable: ..."
      const termDefMatch = trimmed.match(/^([A-Za-z\s/]{3,35}):\s+(.*)$/);
      if (
        termDefMatch &&
        !trimmed.startsWith('http') &&
        !trimmed.startsWith('Note:') &&
        termDefMatch[1].length < 35 &&
        termDefMatch[2].length > 10
      ) {
        const termName = termDefMatch[1].trim();
        const termDesc = termDefMatch[2].trim();
        blocks.push(
          <div key={`term_${blockKey++}`} className="my-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
            <strong className="text-slate-900 dark:text-slate-100 font-bold">{termName}: </strong>
            <span>{renderInline(termDesc)}</span>
          </div>
        );
        i++;
        continue;
      }

      // 17. Regular Paragraph
      if (trimmed.length > 0) {
        blocks.push(
          <p key={`p_${blockKey++}`} className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 my-2">
            {renderInline(trimmed)}
          </p>
        );
      } else {
        // Subtle vertical spacer
        blocks.push(<div key={`empty_${blockKey++}`} className="h-1.5" />);
      }

      i++;
    }

    return blocks;
  };

  return (
    <div className={`markdown-content academic-document space-y-1 ${className}`}>
      {renderBlocks()}
    </div>
  );
};

// Interactive Code & ASCII Architecture Diagram Block with Monospace Precision & Copy
interface AcademicCodeBlockProps {
  code: string;
  language: string;
}

const AcademicCodeBlock: React.FC<AcademicCodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  // Check if content is an ASCII diagram/flowchart (e.g. contains ^, |, \, /, +---, -->)
  const isAsciiDiagram =
    code.includes('^') ||
    code.includes('| \\') ||
    code.includes('| /') ||
    code.includes('+--') ||
    code.includes('-->') ||
    code.includes('<--') ||
    code.includes('---+') ||
    language.toLowerCase() === 'diagram' ||
    language.toLowerCase() === 'ascii' ||
    language.toLowerCase() === 'text';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    return null;
  };

  const highlightedHtml = React.useMemo(() => {
    if (isAsciiDiagram) return null;
    try {
      const grammar = getGrammar(language);
      if (grammar) {
        return Prism.highlight(code, grammar, language);
      }
    } catch {
      // Fallback
    }
    return null;
  }, [code, language, isAsciiDiagram]);

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-md">
      {/* Code / Diagram Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-mono uppercase font-bold text-slate-300">
          {isAsciiDiagram ? (
            <>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Conceptual Diagram / Architecture Flow</span>
            </>
          ) : (
            <>
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{language || 'code'}</span>
            </>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Monospace Canvas */}
      <div className="p-4 overflow-x-auto">
        {isAsciiDiagram ? (
          <pre className="font-mono text-xs sm:text-[13px] leading-snug text-emerald-300 dark:text-emerald-300 whitespace-pre select-all">
            {code}
          </pre>
        ) : highlightedHtml ? (
          <pre
            className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100 overflow-x-auto whitespace-pre select-all"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-200 overflow-x-auto whitespace-pre select-all">
            {code}
          </pre>
        )}
      </div>
    </div>
  );
};
