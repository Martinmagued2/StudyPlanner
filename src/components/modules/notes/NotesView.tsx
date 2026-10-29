import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  FileText,
  Plus,
  Pin,
  Trash2,
  Sparkles,
  Download,
  Copy,
  Check,
  Search,
  BookOpen,
  Table as TableIcon,
  Tag,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link as LinkIcon,
  Printer,
  Layers,
  Undo,
  Redo,
  Highlighter,
  Palette,
  X,
  FileCode,
  CheckCheck
} from 'lucide-react';
import { Note } from '../../../types';

// Import Prism and core programming languages
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';

export const NotesView: React.FC = () => {
  const {
    notes,
    courses,
    addNote,
    updateNote,
    moveNoteToTrash,
    addFlashcardDeck,
    addFlashcard
  } = useApp();

  const activeNotes = notes.filter(n => !n.inTrash);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(activeNotes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [saveStatus, setSaveStatus] = useState<string>('All changes saved');

  // AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiToolType, setAiToolType] = useState<string>('');
  const [aiGeneratedText, setAiGeneratedText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Link insert modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Add Tag input
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Text / Highlight Color picker
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [highlightPickerPos, setHighlightPickerPos] = useState<{ top: number; left: number } | null>(null);

  // Dynamic Table Inserter State
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [hoverGridRow, setHoverGridRow] = useState(0);
  const [hoverGridCol, setHoverGridCol] = useState(0);

  // Generic Code Block Builder Modal
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<string>('cpp');
  const [codeContent, setCodeContent] = useState<string>(
`#include <iostream>
#include <vector>

using namespace std;

// AVL Node representation
template <typename T>
class AVLNode {
public:
    T data;
    int height;
    AVLNode* left;
    AVLNode* right;

    AVLNode(T val) : data(val), height(1), left(nullptr), right(nullptr) {}
};

int main() {
    vector<int> keys = {15, 27, 49, 82};
    cout << "Binary search tree in C++" << endl;
    return 0;
}`
  );

  const sampleSnippets: Record<string, string> = {
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

// AVL / Red-Black Tree rotation
int main() {
    vector<int> numbers = {10, 25, 40, 65, 80};
    auto it = lower_bound(numbers.begin(), numbers.end(), 40);
    cout << "Found target index: " << distance(numbers.begin(), it) << endl;
    return 0;
}`,
    java: `import java.util.*;

public class CourseworkSolver {
    public static void main(String[] args) {
        List<String> modules = Arrays.asList("CS302", "AI401", "MATH210");
        for (String mod : modules) {
            System.out.println("Processing academic module: " + mod);
        }
    }
}`,
    python: `def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

# Test algorithm
print("Index found:", binary_search([2, 5, 8, 12, 16, 23, 38], 16))`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int* ptr = (int*)malloc(sizeof(int) * 5);
    if (ptr == NULL) {
        fprintf(stderr, "Allocation failed\\n");
        return 1;
    }
    printf("Dynamic memory allocated successfully.\\n");
    free(ptr);
    return 0;
}`,
    typescript: `interface Student {
  id: string;
  name: string;
  gpa: number;
}

const calculateHonorRoll = (students: Student[]): Student[] => {
  return students.filter(s => s.gpa >= 3.8);
};`,
    sql: `SELECT 
    courses.code, 
    courses.name, 
    COUNT(assignments.id) AS pending_assignments
FROM courses
LEFT JOIN assignments ON assignments.course_id = courses.id
WHERE courses.is_archived = FALSE
GROUP BY courses.id, courses.code, courses.name
ORDER BY pending_assignments DESC;`,
    bash: `#!/bin/bash
# Compile and run academic solution
echo "Compiling C++ test suite..."
g++ -O2 -std=c++17 solution.cpp -o solution
./solution`
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const lastLoadedNoteId = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || activeNotes[0];

  // Selection preservation
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  useEffect(() => {
    if (!selectedNoteId && activeNotes.length > 0) {
      setSelectedNoteId(activeNotes[0].id);
    }
  }, [activeNotes, selectedNoteId]);

  // Normalize initial content to clean HTML
  const normalizeToHtml = (content: string) => {
    if (!content) return '<p><br></p>';
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    
    return content
      .split('\n\n')
      .map(block => {
        const trimmed = block.trim();
        if (trimmed.startsWith('# ')) return `<h1 class="text-2xl font-bold mt-4 mb-2">${trimmed.slice(2)}</h1>`;
        if (trimmed.startsWith('## ')) return `<h2 class="text-xl font-bold mt-3 mb-1.5">${trimmed.slice(3)}</h2>`;
        if (trimmed.startsWith('### ')) return `<h3 class="text-lg font-semibold mt-2 mb-1">${trimmed.slice(4)}</h3>`;
        if (trimmed.startsWith('> ')) return `<blockquote class="border-l-4 border-blue-500 pl-3 py-1 my-2 bg-blue-50/50 dark:bg-blue-950/20 italic">${trimmed.slice(2)}</blockquote>`;
        if (trimmed.startsWith('- [ ] ')) return `<div class="flex items-center gap-2 my-1"><input type="checkbox" class="rounded accent-blue-600" /><span>${trimmed.slice(6)}</span></div>`;
        if (trimmed.startsWith('- ')) {
          const items = trimmed.split('\n- ').map(item => `<li>${item.replace(/^- /, '')}</li>`).join('');
          return `<ul class="list-disc pl-5 my-2">${items}</ul>`;
        }
        return `<p class="mb-2 leading-relaxed">${trimmed.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  };

  useEffect(() => {
    if (selectedNote && editorRef.current) {
      if (lastLoadedNoteId.current !== selectedNote.id) {
        editorRef.current.innerHTML = normalizeToHtml(selectedNote.content);
        lastLoadedNoteId.current = selectedNote.id;
      }
    }
  }, [selectedNote?.id]);

  const filteredNotes = activeNotes.filter(n => {
    const matchesCourse = selectedCourseFilter === 'all' || n.courseId === selectedCourseFilter;
    if (!matchesCourse) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleTitleChange = (newTitle: string) => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { title: newTitle });
    triggerAutosave();
  };

  const handleEditorInput = () => {
    if (!selectedNote || !editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML;
    updateNote(selectedNote.id, { content: htmlContent });
    triggerAutosave();
  };

  const triggerAutosave = () => {
    setSaveStatus('Saving changes...');
    setTimeout(() => {
      setSaveStatus('All changes saved');
    }, 400);
  };

  const handleCreateNewNote = () => {
    const newNote = addNote({
      title: 'Untitled Lecture Note',
      content: '<p>Start typing your lecture notes, questions, or ideas directly here...</p>',
      courseId: courses[0]?.id,
      tags: ['lecture'],
      pinned: false,
      highlightedTerms: []
    });
    setSelectedNoteId(newNote.id);
    lastLoadedNoteId.current = null;
  };

  // Document Metrics
  const rawText = editorRef.current?.innerText || selectedNote?.content?.replace(/<[^>]*>/g, '') || '';
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Rock-solid Inline Color & Highlight Applicator
  const applyDirectStyle = (styles: { color?: string; backgroundColor?: string; isClearHighlight?: boolean }) => {
    restoreSelection();
    let sel = window.getSelection();
    let range: Range | null = null;
    
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    } else if (savedRange.current && !savedRange.current.collapsed) {
      range = savedRange.current;
    } else if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    } else if (savedRange.current) {
      range = savedRange.current;
    }

    if (!range && editorRef.current) {
      editorRef.current.focus();
      const newSel = window.getSelection();
      if (newSel && newSel.rangeCount > 0) {
        range = newSel.getRangeAt(0);
      }
    }

    if (!range) return;

    if (editorRef.current && !editorRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    // Clear highlight mode
    if (styles.isClearHighlight) {
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName === 'MARK' || el.style.backgroundColor) {
            el.style.backgroundColor = 'transparent';
            el.style.removeProperty('background-color');
            if (el.tagName === 'MARK') {
              const span = document.createElement('span');
              span.innerHTML = el.innerHTML;
              el.parentNode?.replaceChild(span, el);
            }
            break;
          }
        }
        node = node.parentNode;
      }
      handleEditorInput();
      setShowHighlightPicker(false);
      return;
    }

    try {
      if (range.collapsed) {
        // Collapsed cursor: create a styled span with a zero-width space
        const span = document.createElement(styles.backgroundColor ? 'mark' : 'span');
        if (styles.color) {
          span.style.color = styles.color;
          span.style.setProperty('color', styles.color, 'important');
        }
        if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
          span.style.backgroundColor = styles.backgroundColor;
          span.style.setProperty('background-color', styles.backgroundColor, 'important');
          span.style.color = 'inherit';
          span.style.padding = '1px 3px';
          span.style.borderRadius = '3px';
        }
        span.appendChild(document.createTextNode('\u200B'));
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.setStart(span.firstChild!, 1);
        newRange.setEnd(span.firstChild!, 1);
        sel?.removeAllRanges();
        sel?.addRange(newRange);
        savedRange.current = newRange.cloneRange();
      } else {
        // Non-collapsed: wrap extracted contents in styled span or mark
        const span = document.createElement(styles.backgroundColor ? 'mark' : 'span');
        if (styles.color) {
          span.style.color = styles.color;
          span.style.setProperty('color', styles.color, 'important');
        }
        if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
          span.style.backgroundColor = styles.backgroundColor;
          span.style.setProperty('background-color', styles.backgroundColor, 'important');
          span.style.color = 'inherit';
          span.style.padding = '1px 3px';
          span.style.borderRadius = '3px';
        }
        span.appendChild(range.extractContents());
        range.insertNode(span);

        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel?.removeAllRanges();
        sel?.addRange(newRange);
        savedRange.current = newRange.cloneRange();
      }
    } catch (e) {
      console.warn('DOM style wrapping error:', e);
    }

    handleEditorInput();
  };

  // Direct In-Place Formatting Execution
  const formatDoc = (cmd: string, val: string | undefined = undefined) => {
    restoreSelection();
    try {
      (document as any).execCommand('styleWithCSS', false, 'true');
      document.execCommand(cmd, false, val);
    } catch {}
    handleEditorInput();
  };

  // Text Color Applicator
  const applyTextColor = (color: string) => {
    restoreSelection();
    try {
      (document as any).execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color);
    } catch {}
    applyDirectStyle({ color });
    setShowColorPicker(false);
  };

  // Highlighter Applicator
  const applyHighlight = (color: string) => {
    restoreSelection();
    try {
      (document as any).execCommand('styleWithCSS', false, 'true');
      if (color === 'transparent') {
        document.execCommand('removeFormat', false, undefined);
      } else {
        document.execCommand('hiliteColor', false, color) || document.execCommand('backColor', false, color);
      }
    } catch {}

    if (color === 'transparent') {
      applyDirectStyle({ isClearHighlight: true });
    } else {
      applyDirectStyle({ backgroundColor: color });
    }
    setShowHighlightPicker(false);
  };

  // Blockquote Formatter (Clean & Guaranteed to format)
  const applyBlockquote = () => {
    restoreSelection();
    let success = false;
    try {
      success = document.execCommand('formatBlock', false, 'blockquote');
    } catch {}
    if (!success) {
      try {
        success = document.execCommand('formatBlock', false, '<blockquote>');
      } catch {}
    }

    if (!success) {
      const sel = window.getSelection();
      let range: Range | null = null;
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
      } else if (savedRange.current) {
        range = savedRange.current;
      }

      if (range && editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        let parent: Node | null = range.commonAncestorContainer;
        let existingBq: HTMLElement | null = null;
        while (parent && parent !== editorRef.current) {
          if (parent.nodeName === 'BLOCKQUOTE') {
            existingBq = parent as HTMLElement;
            break;
          }
          parent = parent.parentNode;
        }

        if (existingBq) {
          const p = document.createElement('p');
          p.innerHTML = existingBq.innerHTML;
          existingBq.parentNode?.replaceChild(p, existingBq);
        } else if (!range.collapsed) {
          const bq = document.createElement('blockquote');
          bq.appendChild(range.extractContents());
          range.insertNode(bq);
        } else {
          const bq = document.createElement('blockquote');
          bq.innerHTML = 'Quote text or citation...';
          range.insertNode(bq);
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          bq.after(p);
        }
      }
    }
    handleEditorInput();
  };

  // Custom Notion / Word Block Insertions
  const insertCalloutBox = () => {
    restoreSelection();
    const calloutHtml = `
      <div class="my-4 p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-slate-800 dark:text-slate-200 flex items-start gap-2.5">
        <span class="text-base select-none">💡</span>
        <div><strong>Key Takeaway:</strong> Write critical theorem, formula or definition here.</div>
      </div>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, calloutHtml);
    handleEditorInput();
  };

  const insertChecklistTask = () => {
    restoreSelection();
    const taskHtml = `
      <div class="flex items-center gap-2 my-1">
        <input type="checkbox" class="rounded accent-blue-600 w-4 h-4 cursor-pointer" />
        <span>Actionable coursework or revision task</span>
      </div>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, taskHtml);
    handleEditorInput();
  };

  // Dynamic Table Inserter (Custom Rows x Columns with Header toggle)
  const insertDynamicTable = (rows: number, cols: number, hasHeader: boolean) => {
    restoreSelection();
    const rCount = Math.max(1, Math.min(25, Number(rows) || 3));
    const cCount = Math.max(1, Math.min(12, Number(cols) || 3));

    let theadHtml = '';
    if (hasHeader) {
      const ths = Array.from({ length: cCount }, (_, i) =>
        `<th class="border border-slate-300 dark:border-slate-700 p-2.5 text-left font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">Column ${i + 1}</th>`
      ).join('');
      theadHtml = `<thead><tr>${ths}</tr></thead>`;
    }

    const tbodyRows = Array.from({ length: rCount }, (_, r) => {
      const tds = Array.from({ length: cCount }, (_, c) =>
        `<td class="border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200">Data ${r + 1}, ${c + 1}</td>`
      ).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    const fullTableHtml = `
      <div class="my-4 overflow-x-auto not-prose">
        <table class="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs sm:text-sm">
          ${theadHtml}
          <tbody>${tbodyRows}</tbody>
        </table>
      </div>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, fullTableHtml);
    handleEditorInput();
    setTableModalOpen(false);
  };

  // Generic Prism Code Block Inserter
  const insertCodeBlock = () => {
    restoreSelection();
    let highlightedHtml = '';
    try {
      const grammar = Prism.languages[codeLanguage] || Prism.languages.clike;
      highlightedHtml = Prism.highlight(codeContent, grammar, codeLanguage);
    } catch {
      highlightedHtml = codeContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    const languageNames: Record<string, string> = {
      cpp: 'C++',
      java: 'Java',
      python: 'Python',
      c: 'C',
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      sql: 'SQL',
      bash: 'Bash / Shell'
    };

    const blockHtml = `
      <div class="code-block-container my-4 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-md text-left" contenteditable="false">
        <div class="code-header flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-mono select-none">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
            <span class="text-blue-400 font-bold uppercase tracking-wider ml-1">${languageNames[codeLanguage] || codeLanguage}</span>
          </div>
          <button type="button" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-sans font-medium transition-colors" onclick="navigator.clipboard.writeText(this.closest('.code-block-container').querySelector('code').innerText); this.innerText='Copied!'; setTimeout(()=>this.innerText='Copy', 1500)">
            Copy Code
          </button>
        </div>
        <pre class="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-slate-100 bg-slate-950" contenteditable="true" spellcheck="false"><code class="language-${codeLanguage}">${highlightedHtml}</code></pre>
      </div>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, blockHtml);
    handleEditorInput();
    setCodeModalOpen(false);
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;
    restoreSelection();
    const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-800">${linkText || linkUrl}</a> `;
    document.execCommand('insertHTML', false, linkHtml);
    handleEditorInput();
    setLinkUrl('');
    setLinkText('');
    setLinkModalOpen(false);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote || !newTagInput.trim()) return;
    const tag = newTagInput.trim().toLowerCase();
    if (!selectedNote.tags.includes(tag)) {
      updateNote(selectedNote.id, { tags: [...selectedNote.tags, tag] });
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, {
      tags: selectedNote.tags.filter(t => t !== tagToRemove)
    });
  };

  // Export handlers
  const exportNote = (type: 'doc' | 'html' | 'print') => {
    if (!selectedNote) return;

    if (type === 'print') {
      const printWin = window.open('', '_blank', 'width=900,height=850');
      if (!printWin) {
        window.print();
        return;
      }

      const course = courses.find(c => c.id === selectedNote.courseId);
      const htmlBody = editorRef.current?.innerHTML || selectedNote.content;
      const formattedDate = new Date(selectedNote.updatedAt || Date.now()).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const printDocumentHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${selectedNote.title || 'Academic Note'}</title>
  <style>
    @page {
      size: portrait;
      margin: 18mm 20mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.65;
      font-size: 13.5px;
      margin: 0;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 24px;
    }
    .doc-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      line-height: 1.25;
    }
    .doc-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: #f1f5f9;
      font-weight: 600;
      font-size: 11px;
      color: #334155;
      margin-right: 6px;
    }
    .course-badge {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    
    h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h2 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 18px; margin-bottom: 8px; }
    h3 { font-size: 14px; font-weight: 600; color: #334155; margin-top: 14px; margin-bottom: 6px; }
    p { margin-top: 0; margin-bottom: 10px; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f8fafc;
      font-weight: 700;
      color: #1e293b;
    }
    
    blockquote {
      border-left: 4px solid #2563eb;
      background: #f0f7ff;
      padding: 10px 14px;
      margin: 14px 0;
      font-style: italic;
      color: #334155;
      border-radius: 0 4px 4px 0;
    }
    
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px;
      line-height: 1.5;
      page-break-inside: avoid;
      margin: 14px 0;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    
    mark {
      padding: 1px 3px;
      border-radius: 2px;
    }

    .code-header button { display: none !important; }
    
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1 class="doc-title">${selectedNote.title || 'Untitled Academic Note'}</h1>
    <div class="doc-meta">
      <div>
        ${course ? `<span class="badge course-badge">${course.code} — ${course.name}</span>` : ''}
        ${selectedNote.tags.map(t => `<span class="badge">#${t}</span>`).join('')}
      </div>
      <div>
        <span>Updated: <strong>${formattedDate}</strong></span>
        <span style="margin-left: 10px;">• ${wordCount} words</span>
      </div>
    </div>
  </div>

  <div class="doc-content">
    ${htmlBody}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

      printWin.document.open();
      printWin.document.write(printDocumentHtml);
      printWin.document.close();
      return;
    }

    const htmlBody = editorRef.current?.innerHTML || selectedNote.content;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${selectedNote.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 820px; margin: 40px auto; padding: 24px; color: #1e293b; }
    h1 { font-size: 28px; margin-bottom: 8px; color: #0f172a; }
    h2 { font-size: 22px; margin-top: 24px; margin-bottom: 8px; color: #0f172a; }
    h3 { font-size: 18px; margin-top: 18px; margin-bottom: 6px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 14px; margin: 16px 0; color: #475569; background: #eff6ff; padding: 10px 14px; border-radius: 4px; font-style: italic; }
    pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 8px; overflow-x: auto; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${selectedNote.title}</h1>
  <p style="color: #64748b; font-size: 13px;">Exported from Nook Workspace • ${new Date().toLocaleDateString()}</p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  ${htmlBody}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNote.title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Turn Note into Flashcards
  const handleTurnIntoFlashcards = () => {
    if (!selectedNote) return;

    const deckName = `${selectedNote.title} Flashcards`;
    addFlashcardDeck(deckName, selectedNote.courseId, 'note-export');

    const cleanSnippet = rawText.slice(0, 180) || 'Core takeaway from lecture.';
    addFlashcard({
      deckId: `deck_${Date.now()}`,
      courseId: selectedNote.courseId,
      question: `What is the core takeaway of "${selectedNote.title}"?`,
      answer: cleanSnippet
    });

    setAiGeneratedText(`✅ Created Flashcard Deck: "${deckName}" with SM-2 spaced repetition in Study Hub!`);
    setAiToolType('flashcard_export');
    setAiModalOpen(true);
  };

  // AI Note Tools logic
  const runAiNoteTool = (type: string) => {
    if (!selectedNote) return;
    setAiToolType(type);
    setAiModalOpen(true);

    if (type === 'summarize') {
      setAiGeneratedText(`### Executive Summary: ${selectedNote.title}

- **Core Academic Focus:** ${selectedNote.title} covers essential theoretical frameworks and analytical methods.
- **Key Concepts Identified:**
  1. Systematic decomposition into measurable principles.
  2. Bounded complexity equations and runtime implications.
  3. Real-world coursework and examination scenarios.
- **Recommended Action:** Review the highlighted terms and practice self-testing.`);
    } else if (type === 'study_guide') {
      setAiGeneratedText(`### Comprehensive Study Guide: ${selectedNote.title}

#### 1. Terminology & Formal Definitions
- **Foundational Thesis:** The core hypothesis established during this lecture block.
- **Boundary Conditions:** The specific parameters where standard formulas hold vs. degenerate.

#### 2. Diagnostic Self-Assessment
1. How does the primary mechanism behave when input size increases tenfold?
2. What are the major pitfalls to avoid on the final exam regarding this topic?`);
    } else if (type === 'practice_questions') {
      setAiGeneratedText(`### Practice Questions: ${selectedNote.title}

1. **[Multiple Choice]** Which of the following best characterizes the primary invariant?
   - A) Constant variance under scaling (Incorrect)
   - B) Bounded logarithmic recurrence relation (Correct)
   - C) Arbitrary polynomial degradation (Incorrect)

2. **[Short Answer]** Explain why boundary value edge-cases must be checked before recursive calls.
   Answer: To avoid stack overflow recursion and guarantee base-case termination.`);
    }
  };

  const applyAiContent = (mode: 'append' | 'replace') => {
    if (!editorRef.current || !selectedNote) return;
    const formattedHtml = `<div class="p-4 my-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
      <h3 class="font-bold text-sm mb-2 text-blue-600 dark:text-blue-400">✨ AI Generated Study Analysis:</h3>
      <p class="whitespace-pre-wrap text-xs leading-relaxed">${aiGeneratedText}</p>
    </div>`;

    if (mode === 'append') {
      editorRef.current.innerHTML += formattedHtml;
    } else {
      editorRef.current.innerHTML = formattedHtml;
    }
    handleEditorInput();
    setAiModalOpen(false);
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Left Sidebar: Notes Navigator */}
      <div className="w-64 sm:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Notes & Documents</span>
            </div>
            <button
              onClick={handleCreateNewNote}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1 transition-colors shadow-xs"
              title="New Note"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {/* Course Filter Dropdown */}
          <select
            value={selectedCourseFilter}
            onChange={e => setSelectedCourseFilter(e.target.value)}
            className="w-full p-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Courses ({activeNotes.length})</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 space-y-0.5">
          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">
              No notes found. Click "+ New" above to write your first note.
            </div>
          ) : (
            filteredNotes.map(n => {
              const isSelected = n.id === selectedNote?.id;
              const course = courses.find(c => c.id === n.courseId);
              const previewText = n.content.replace(/<[^>]*>/g, '').trim() || 'Empty document...';

              return (
                <div
                  key={n.id}
                  onClick={() => setSelectedNoteId(n.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all space-y-1 ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800/90 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <h3 className={`text-xs font-semibold truncate ${isSelected ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {n.title || 'Untitled Note'}
                    </h3>
                    {n.pinned && <Pin className="w-3 h-3 text-amber-600 fill-amber-600 shrink-0" />}
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {previewText}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="font-mono">
                      {new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {course && (
                      <span
                        className="px-1.5 py-0.2 rounded font-semibold truncate max-w-[100px]"
                        style={{ backgroundColor: `${course.color}20`, color: course.color }}
                      >
                        {course.code}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Living Document Workspace (Word / Notion Live WYSIWYG) */}
      {selectedNote ? (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {/* Top Document Status & Meta Ribbon */}
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => updateNote(selectedNote.id, { pinned: !selectedNote.pinned })}
                className={`p-1.5 rounded transition-colors ${
                  selectedNote.pinned
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={selectedNote.pinned ? 'Unpin note' : 'Pin note to top'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Course Selector Dropdown */}
              <select
                value={selectedNote.courseId || ''}
                onChange={e => updateNote(selectedNote.id, { courseId: e.target.value })}
                className="py-1 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">No Course Tag</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>

              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>{saveStatus}</span>
              </span>
            </div>

            {/* Document Action Tools */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTurnIntoFlashcards}
                className="px-2.5 py-1 text-xs rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 font-medium flex items-center gap-1 transition-colors"
                title="Create Spaced Repetition Flashcards"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden sm:inline">Make Flashcards</span>
              </button>

              <button
                type="button"
                onClick={() => runAiNoteTool('summarize')}
                className="px-2.5 py-1 text-xs rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1 font-medium transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Assist</span>
              </button>

              <button
                type="button"
                onClick={() => exportNote('html')}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Export HTML Document"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => exportNote('print')}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Print or Save PDF"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => moveNoteToTrash(selectedNote.id)}
                className="p-1.5 rounded text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Microsoft Word / Notion Live Formatting Ribbon */}
          <div className="px-4 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1 overflow-x-auto text-slate-600 dark:text-slate-400 text-xs shrink-0 select-none">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('undo')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('redo')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Typography Styles: H1, H2, H3, Paragraph */}
            <div className="flex items-center gap-1 px-1.5 border-r border-slate-200 dark:border-slate-800">
              <select
                onMouseDown={saveSelection}
                onChange={e => {
                  restoreSelection();
                  formatDoc('formatBlock', e.target.value);
                }}
                defaultValue="<p>"
                className="py-1 px-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="<p>">Normal Text</option>
                <option value="<h1>">Heading 1</option>
                <option value="<h2>">Heading 2</option>
                <option value="<h3>">Heading 3</option>
              </select>
            </div>

            {/* Font Styles: Bold, Italic, Underline, Strikethrough */}
            <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('bold')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('italic')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 italic"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('underline')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 underline"
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('strikeThrough')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text Color & Highlight Color (Fixed focus & floating popover) */}
            <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  saveSelection();
                  if (showColorPicker) {
                    setShowColorPicker(false);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setColorPickerPos({ top: rect.bottom + 6, left: Math.max(10, rect.left - 10) });
                    setShowColorPicker(true);
                    setShowHighlightPicker(false);
                  }
                }}
                className={`p-1.5 rounded transition-colors ${showColorPicker ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'}`}
                title="Text Color"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  saveSelection();
                  if (showHighlightPicker) {
                    setShowHighlightPicker(false);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHighlightPickerPos({ top: rect.bottom + 6, left: Math.max(10, rect.left - 10) });
                    setShowHighlightPicker(true);
                    setShowColorPicker(false);
                  }
                }}
                className={`p-1.5 rounded transition-colors ${showHighlightPicker ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400'}`}
                title="Highlight Background Color"
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Lists: Bullets, Numbered, Checklist */}
            <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('insertUnorderedList')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                title="Bulleted List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('insertOrderedList')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={insertChecklistTask}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                title="Interactive Checklist Task"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Rich Blocks: Quote (Fixed), Code Block (Generic), Callout, Table, Divider */}
            <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={applyBlockquote}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-serif"
                title="Blockquote (Quote Block)"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              {/* Generic Multi-Language Code Block Button */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  saveSelection();
                  setCodeModalOpen(true);
                }}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title="Insert Generic Code Block (C++, Java, Python, TS, SQL, etc.)"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>

              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={insertCalloutBox}
                className="px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 font-semibold"
                title="Callout Box"
              >
                💡
              </button>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  saveSelection();
                  setTableModalOpen(true);
                }}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                title="Insert Dynamic Table (Custom Rows & Columns)"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('insertHorizontalRule')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                title="Horizontal Divider"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hyperlink */}
            <div className="flex items-center gap-0.5 px-1.5">
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  saveSelection();
                  setLinkModalOpen(true);
                }}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                title="Insert Hyperlink"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatDoc('removeFormat')}
                className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] text-slate-500"
                title="Clear Formatting"
              >
                Clear
              </button>
            </div>

            {/* Word count metrics in ribbon */}
            <div className="ml-auto text-[11px] text-slate-400 font-mono flex items-center gap-2 shrink-0">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{readingTime}m read</span>
            </div>
          </div>

          {/* Living Document Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {/* Centered Paper Sheet Canvas (Word / Notion Page) */}
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 sm:p-12 min-h-[700px] flex flex-col space-y-4">
              {/* Document Title Header */}
              <div>
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Document Title..."
                  className="w-full text-2xl sm:text-3xl font-bold bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none tracking-tight placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />

                {/* Tags row */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  {selectedNote.tags.map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {isAddingTag ? (
                    <form onSubmit={handleAddTag} className="inline-flex items-center">
                      <input
                        type="text"
                        autoFocus
                        value={newTagInput}
                        onChange={e => setNewTagInput(e.target.value)}
                        onBlur={() => setIsAddingTag(false)}
                        placeholder="Tag name..."
                        className="px-2 py-0.5 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="px-2 py-0.5 text-[11px] rounded border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Tag</span>
                    </button>
                  )}
                </div>
              </div>

              {/* The Live Document Body (User writes normally here directly) */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onMouseUp={saveSelection}
                onKeyUp={saveSelection}
                className="note-content-editor flex-1 w-full outline-none text-slate-800 dark:text-slate-200 leading-relaxed font-sans text-sm sm:text-base selection:bg-blue-100 dark:selection:bg-blue-900/40 min-h-[500px]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          Select or create a note to begin.
        </div>
      )}

      {/* Generic Code Block Modal with Live Syntax Highlighting */}
      {codeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Insert Multi-Language Code Block
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Language Selector & Quick Switch Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    Programming Language
                  </label>
                  <select
                    value={codeLanguage}
                    onChange={e => {
                      const newLang = e.target.value;
                      setCodeLanguage(newLang);
                      if (sampleSnippets[newLang]) {
                        setCodeContent(sampleSnippets[newLang]);
                      }
                    }}
                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="cpp">C++ (cpp)</option>
                    <option value="java">Java (java)</option>
                    <option value="python">Python (py)</option>
                    <option value="c">C (c)</option>
                    <option value="typescript">TypeScript (ts)</option>
                    <option value="javascript">JavaScript (js)</option>
                    <option value="sql">SQL (sql)</option>
                    <option value="bash">Bash / Shell (sh)</option>
                  </select>
                </div>

                {/* Quick Language Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'cpp', name: 'C++' },
                    { id: 'java', name: 'Java' },
                    { id: 'python', name: 'Python' },
                    { id: 'c', name: 'C' },
                    { id: 'typescript', name: 'TypeScript' },
                    { id: 'sql', name: 'SQL' },
                    { id: 'bash', name: 'Bash' }
                  ].map(lang => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        setCodeLanguage(lang.id);
                        if (sampleSnippets[lang.id]) {
                          setCodeContent(sampleSnippets[lang.id]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                        codeLanguage === lang.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    Code Content
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (sampleSnippets[codeLanguage]) {
                        setCodeContent(sampleSnippets[codeLanguage]);
                      }
                    }}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Load Sample {codeLanguage.toUpperCase()} Snippet
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={codeContent}
                  onChange={e => setCodeContent(e.target.value)}
                  placeholder="Paste or write your code here..."
                  className="w-full p-3 font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none resize-y selection:bg-blue-200 dark:selection:bg-blue-900"
                />
              </div>

              {/* Real-time Syntax Highlighted Live Preview */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs block mb-1">
                  Live Highlighted Preview ({codeLanguage.toUpperCase()})
                </label>
                <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500/80"></span>
                      <span className="w-2 h-2 rounded-full bg-amber-500/80"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
                      <span className="text-blue-400 font-bold uppercase ml-1">{codeLanguage}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">Syntax Colored</span>
                  </div>
                  <pre
                    className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-slate-100 bg-slate-950 max-h-52"
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        try {
                          const grammar = Prism.languages[codeLanguage] || Prism.languages.clike;
                          return Prism.highlight(codeContent, grammar, codeLanguage);
                        } catch {
                          return codeContent.replace(/</g, '&lt;');
                        }
                      })()
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertCodeBlock}
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Insert Code Block</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Insert Hyperlink</h3>
            <form onSubmit={handleInsertLink} className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Display Text</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  placeholder="e.g. Course Lecture Slides"
                  className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">URL</label>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                >
                  Insert Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Table Inserter Modal */}
      {tableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Insert Dynamic Table
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {/* Interactive Grid Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-xs">Quick Grid Selector:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                  {hoverGridRow && hoverGridCol ? `${hoverGridRow} × ${hoverGridCol}` : `${tableRows} × ${tableCols}`} Table
                </span>
              </div>
              <div 
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col gap-1 items-center justify-center select-none"
                onMouseLeave={() => { setHoverGridRow(0); setHoverGridCol(0); }}
              >
                {Array.from({ length: 6 }, (_, r) => (
                  <div key={r} className="flex gap-1">
                    {Array.from({ length: 6 }, (_, c) => {
                      const rowNum = r + 1;
                      const colNum = c + 1;
                      const isHighlighted = (hoverGridRow >= rowNum && hoverGridCol >= colNum) || 
                        (!hoverGridRow && tableRows >= rowNum && tableCols >= colNum);
                      return (
                        <div
                          key={c}
                          onMouseEnter={() => { setHoverGridRow(rowNum); setHoverGridCol(colNum); }}
                          onClick={() => {
                            setTableRows(rowNum);
                            setTableCols(colNum);
                            insertDynamicTable(rowNum, colNum, tableHasHeader);
                          }}
                          className={`w-6 h-6 rounded cursor-pointer border transition-colors ${
                            isHighlighted
                              ? 'bg-blue-600 border-blue-700 dark:bg-blue-500 dark:border-blue-400'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Dimensions Input */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rows (1 - 20)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={e => setTableRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Columns (1 - 10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={e => setTableCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Include Header Row Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="tableHeaderCheck"
                checked={tableHasHeader}
                onChange={e => setTableHasHeader(e.target.checked)}
                className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="tableHeaderCheck" className="text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                Include Styled Header Row
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTableModalOpen(false)}
                className="px-3 py-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => insertDynamicTable(tableRows, tableCols, tableHasHeader)}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
              >
                Insert {tableRows} × {tableCols} Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Fixed Text Color Picker Popover (Unclipped by Ribbon) */}
      {showColorPicker && colorPickerPos && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onMouseDown={() => setShowColorPicker(false)}
          />
          <div
            style={{ top: `${colorPickerPos.top}px`, left: `${colorPickerPos.left}px` }}
            className="fixed z-50 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex items-center gap-2 select-none animate-in fade-in zoom-in-95 duration-100"
            onMouseDown={e => e.preventDefault()}
          >
            <div className="flex items-center gap-1.5">
              {[
                { label: 'Default', color: '#0f172a' },
                { label: 'Blue', color: '#2563eb' },
                { label: 'Emerald', color: '#059669' },
                { label: 'Red', color: '#dc2626' },
                { label: 'Amber', color: '#d97706' },
                { label: 'Purple', color: '#7c3aed' },
                { label: 'Pink', color: '#db2777' }
              ].map(({ label, color }) => (
                <button
                  key={color}
                  type="button"
                  title={label}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => applyTextColor(color)}
                  className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform shadow-xs"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Custom Color Input */}
            <label className="relative w-6 h-6 rounded-full border border-dashed border-slate-400 dark:border-slate-600 hover:border-blue-500 flex items-center justify-center cursor-pointer text-[10px]" title="Pick Custom Color">
              <span>🎨</span>
              <input
                type="color"
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                onChange={e => applyTextColor(e.target.value)}
              />
            </label>
          </div>
        </>
      )}

      {/* Floating Fixed Highlight Picker Popover (Unclipped by Ribbon) */}
      {showHighlightPicker && highlightPickerPos && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onMouseDown={() => setShowHighlightPicker(false)}
          />
          <div
            style={{ top: `${highlightPickerPos.top}px`, left: `${highlightPickerPos.left}px` }}
            className="fixed z-50 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex items-center gap-2 select-none animate-in fade-in zoom-in-95 duration-100"
            onMouseDown={e => e.preventDefault()}
          >
            <div className="flex items-center gap-1.5">
              {[
                { label: 'Yellow', color: '#fef08a' },
                { label: 'Green', color: '#bbf7d0' },
                { label: 'Blue', color: '#bfdbfe' },
                { label: 'Pink', color: '#fbcfe8' },
                { label: 'Orange', color: '#fed7aa' },
                { label: 'Purple', color: '#e9d5ff' },
                { label: 'Remove Highlight', color: 'transparent' }
              ].map(({ label, color }) => (
                <button
                  key={color}
                  type="button"
                  title={label}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => applyHighlight(color)}
                  className="w-6 h-6 rounded border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform shadow-xs flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                >
                  {color === 'transparent' ? '✕' : ''}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* AI Preview Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  AI Study Assistant ({aiToolType})
                </h3>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
              {aiGeneratedText}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(aiGeneratedText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
                {aiToolType !== 'flashcard_export' && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyAiContent('append')}
                      className="px-3 py-1.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      Append to Note
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiContent('replace')}
                      className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                    >
                      Replace Note
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
