import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Course, Note, NoteBlock, NoteBlockType } from '../../../types';
import {
  blocksToHtml,
  COVER_PRESETS,
  createBlock,
  generateBlockId,
  highlightCodeSafe,
  NOTE_EMOJI_ICONS,
  parseHtmlOrMarkdownToBlocks,
  renderKatexSafe,
  stripHtmlTags
} from '../../../services/noteBlockService';
import { queryGemini } from '../../../services/fileAiService';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Palette,
  Link as LinkIcon,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Sigma,
  Lightbulb,
  Undo,
  Redo,
  Check,
  Smile,
  ImagePlus,
  X,
  Upload,
  Loader2,
  Indent,
  Outdent,
  CheckCheck
} from 'lucide-react';

interface NotionBlockEditorProps {
  note: Note;
  courses: Course[];
  onSaveNote: (noteId: string, updates: Partial<Note>) => void;
  onSaveStatusChange?: (status: 'saving' | 'saved') => void;
}

const SLASH_ITEMS: Array<{
  type: NoteBlockType;
  label: string;
  desc: string;
  keywords: string;
  icon: React.ReactNode;
}> = [
  { type: 'paragraph', label: 'Text', desc: 'Plain paragraph text', keywords: 'text paragraph p', icon: <span className="font-serif text-xs font-bold">Aa</span> },
  { type: 'h1', label: 'Heading 1', desc: 'Big section title', keywords: 'h1 title heading 1', icon: <Heading1 className="w-4 h-4" /> },
  { type: 'h2', label: 'Heading 2', desc: 'Medium section heading', keywords: 'h2 subtitle heading 2', icon: <Heading2 className="w-4 h-4" /> },
  { type: 'h3', label: 'Heading 3', desc: 'Small subsection heading', keywords: 'h3 heading 3', icon: <Heading3 className="w-4 h-4" /> },
  { type: 'bullet', label: 'Bulleted List', desc: 'Simple unordered bullet point', keywords: 'bullet list ul', icon: <List className="w-4 h-4" /> },
  { type: 'numbered', label: 'Numbered List', desc: 'Ordered step-by-step list', keywords: 'number ordered list ol', icon: <ListOrdered className="w-4 h-4" /> },
  { type: 'todo', label: 'To-Do Checklist', desc: 'Track revision tasks with checkboxes', keywords: 'todo check task checklist', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'toggle', label: 'Toggle Section', desc: 'Collapsible section for active recall', keywords: 'toggle collapse dropdown spoiler', icon: <ChevronRight className="w-4 h-4" /> },
  { type: 'callout', label: 'Callout Box', desc: 'Highlight key concepts, tips, or traps', keywords: 'callout box note tip warning', icon: <Lightbulb className="w-4 h-4" /> },
  { type: 'quote', label: 'Quote', desc: 'Capture a theorem or citation', keywords: 'quote blockquote cite', icon: <Quote className="w-4 h-4" /> },
  { type: 'code', label: 'Code Block', desc: 'Syntax-highlighted programming snippet', keywords: 'code snippet python cpp java sql', icon: <Code className="w-4 h-4" /> },
  { type: 'math', label: 'Math Equation', desc: 'LaTeX mathematical formula (KaTeX)', keywords: 'math latex equation formula', icon: <Sigma className="w-4 h-4" /> },
  { type: 'table', label: 'Table', desc: 'Editable multi-column comparison grid', keywords: 'table grid matrix rows columns', icon: <TableIcon className="w-4 h-4" /> },
  { type: 'image', label: 'Image', desc: 'Upload or embed diagram URL', keywords: 'image img photo diagram upload', icon: <ImageIcon className="w-4 h-4" /> },
  { type: 'divider', label: 'Divider', desc: 'Clean horizontal section break', keywords: 'divider hr line separator', icon: <Minus className="w-4 h-4" /> }
];

const TEXT_COLORS = [
  { label: 'Default', value: 'inherit', swatch: '#64748b' },
  { label: 'Slate', value: '#334155', swatch: '#334155' },
  { label: 'Blue', value: '#2563eb', swatch: '#2563eb' },
  { label: 'Indigo', value: '#4f46e5', swatch: '#4f46e5' },
  { label: 'Emerald', value: '#059669', swatch: '#059669' },
  { label: 'Amber', value: '#d97706', swatch: '#d97706' },
  { label: 'Rose', value: '#e11d48', swatch: '#e11d48' },
  { label: 'Purple', value: '#9333ea', swatch: '#9333ea' }
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: 'transparent', swatch: '#ffffff' },
  { label: 'Sun Yellow', value: '#fef08a', swatch: '#fef08a' },
  { label: 'Sky Blue', value: '#bae6fd', swatch: '#bae6fd' },
  { label: 'Mint Green', value: '#bbf7d0', swatch: '#bbf7d0' },
  { label: 'Soft Rose', value: '#fecdd3', swatch: '#fecdd3' },
  { label: 'Lavender', value: '#e9d5ff', swatch: '#e9d5ff' },
  { label: 'Peach', value: '#fed7aa', swatch: '#fed7aa' }
];

const LANGUAGES = ['python', 'cpp', 'java', 'typescript', 'javascript', 'c', 'sql', 'bash', 'json'];

interface EditableInlineProps {
  html: string;
  placeholder?: string;
  className?: string;
  onChangeHtml: (nextHtml: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onFocus?: () => void;
  innerRef?: (el: HTMLDivElement | null) => void;
  onSlashTrigger?: (query: string, rect: DOMRect) => void;
  onSlashClose?: () => void;
}

const EditableInline: React.FC<EditableInlineProps> = ({
  html,
  placeholder,
  className = '',
  onChangeHtml,
  onKeyDown,
  onFocus,
  innerRef,
  onSlashTrigger,
  onSlashClose
}) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef<string>(html);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    if (el.innerHTML !== html && (document.activeElement !== el || html !== lastHtmlRef.current)) {
      el.innerHTML = html || '';
      lastHtmlRef.current = html;
    }
  }, [html]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nextHtml = el.innerHTML;
    lastHtmlRef.current = nextHtml;
    onChangeHtml(nextHtml);

    // Detect slash command "/"
    const text = el.innerText || '';
    const trimmed = text.trim();
    if (trimmed.startsWith('/')) {
      const rect = el.getBoundingClientRect();
      onSlashTrigger?.(trimmed.slice(1).toLowerCase(), rect);
    } else {
      onSlashClose?.();
    }
  };

  return (
    <div
      ref={node => {
        localRef.current = node;
        innerRef?.(node);
      }}
      contentEditable
      suppressContentEditableWarning
      dir="auto"
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className={`outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 dark:empty:before:text-slate-500 empty:before:pointer-events-none ${className}`}
    />
  );
};

export const NotionBlockEditor: React.FC<NotionBlockEditorProps> = ({
  note,
  courses,
  onSaveNote,
  onSaveStatusChange
}) => {
  const initialBlocks =
    Array.isArray(note.blocks) && note.blocks.length > 0
      ? note.blocks
      : parseHtmlOrMarkdownToBlocks(note.content || '');

  const [title, setTitle] = useState<string>(note.title || '');
  const [blocks, setBlocks] = useState<NoteBlock[]>(initialBlocks);
  const [undoStack, setUndoStack] = useState<NoteBlock[][]>([]);
  const [redoStack, setRedoStack] = useState<NoteBlock[][]>([]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(initialBlocks[0]?.id || null);

  // Slash Menu
  const [slashState, setSlashState] = useState<{
    blockId: string;
    query: string;
    top: number;
    left: number;
    activeIndex: number;
  } | null>(null);

  // Contextual Block Menu (drag handle click)
  const [blockMenu, setBlockMenu] = useState<{ blockId: string; top: number; left: number } | null>(null);
  const [aiBlockBusyId, setAiBlockBusyId] = useState<string | null>(null);

  // Drag & Drop state
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  // UI Popovers (Icon, Cover, Color, Highlight, Link, Image)
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [editingMathId, setEditingMathId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Refs for focus & stale-request-safe autosave
  const blockInputRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef<number>(0);
  const savedRangeRef = useRef<Range | null>(null);

  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  // Request-ordered debounced autosave (prevents older requests overwriting newer edits)
  const scheduleAutosave = useCallback(
    (nextTitle: string, nextBlocks: NoteBlock[]) => {
      const currentVersion = ++saveVersionRef.current;
      onSaveStatusChange?.('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        if (currentVersion !== saveVersionRef.current) return; // stale request aborted!
        const semanticHtml = blocksToHtml(nextBlocks);
        onSaveNote(note.id, {
          title: nextTitle,
          blocks: nextBlocks,
          content: semanticHtml
        });
        onSaveStatusChange?.('saved');
      }, 420);
    },
    [note.id, onSaveNote, onSaveStatusChange]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const commitBlocks = useCallback(
    (updater: (prev: NoteBlock[]) => NoteBlock[], recordHistory = true) => {
      setBlocks(prev => {
        const next = updater(prev);
        if (recordHistory) {
          setUndoStack(h => [...h.slice(-39), prev]);
          setRedoStack([]);
        }
        scheduleAutosave(title, next);
        return next;
      });
    },
    [scheduleAutosave, title]
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleAutosave(val, blocks);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevSnapshot = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(r => [...r, blocks]);
    setBlocks(prevSnapshot);
    scheduleAutosave(title, prevSnapshot);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    setUndoStack(s => [...s, blocks]);
    setBlocks(nextSnapshot);
    scheduleAutosave(title, nextSnapshot);
  };

  const focusBlock = (blockId: string, toEnd = true) => {
    setFocusedBlockId(blockId);
    setTimeout(() => {
      const el = blockInputRefs.current[blockId];
      if (!el) return;
      el.focus();
      if (toEnd) {
        try {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch { }
      }
    }, 15);
  };

  const insertBlockAfter = (afterId: string, newBlock: NoteBlock) => {
    commitBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId);
      if (idx === -1) return [...prev, newBlock];
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    focusBlock(newBlock.id, false);
  };

  const convertBlockType = (blockId: string, newType: NoteBlockType, clearSlash = false) => {
    const template = createBlock(newType, '');
    commitBlocks(prev =>
      prev.map(b => {
        if (b.id !== blockId) return b;
        const cleanContent = clearSlash && stripHtmlTags(b.content).trim().startsWith('/') ? '' : b.content;
        return {
          ...template,
          id: b.id,
          content: newType === 'divider' || newType === 'image' || newType === 'table' ? '' : cleanContent,
          indent: b.indent || 0,
          props: {
            ...template.props,
            ...(newType === b.type ? b.props : {})
          }
        };
      })
    );
    setSlashState(null);
    setBlockMenu(null);
    if (newType === 'math') setEditingMathId(blockId);
    if (newType !== 'divider' && newType !== 'table' && newType !== 'image') {
      focusBlock(blockId);
    }
  };

  const moveBlock = (blockId: string, dir: 'up' | 'down') => {
    commitBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx === -1) return prev;
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
    setBlockMenu(null);
  };

  const duplicateBlock = (blockId: string) => {
    commitBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx === -1) return prev;
      const clone: NoteBlock = {
        ...JSON.parse(JSON.stringify(prev[idx])),
        id: generateBlockId()
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
    setBlockMenu(null);
  };

  const deleteBlock = (blockId: string) => {
    commitBlocks(prev => {
      if (prev.length <= 1) return [createBlock('paragraph', '')];
      const idx = prev.findIndex(b => b.id === blockId);
      const next = prev.filter(b => b.id !== blockId);
      const focusTarget = next[Math.max(0, idx - 1)];
      if (focusTarget) focusBlock(focusTarget.id);
      return next;
    });
    setBlockMenu(null);
  };

  const handleDropOnBlock = (targetId: string) => {
    if (!draggedBlockId || draggedBlockId === targetId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }
    commitBlocks(prev => {
      const fromIdx = prev.findIndex(b => b.id === draggedBlockId);
      const toIdx = prev.findIndex(b => b.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  // Inline rich formatting commands
  const execInlineFormat = (cmd: string, val?: string) => {
    restoreCurrentSelection();
    try {
      (document as any).execCommand('styleWithCSS', false, 'true');
      document.execCommand(cmd, false, val);
    } catch { }
    // Sync currently focused editable element immediately
    if (focusedBlockId && blockInputRefs.current[focusedBlockId]) {
      const html = blockInputRefs.current[focusedBlockId]!.innerHTML;
      commitBlocks(prev => prev.map(b => b.id === focusedBlockId ? { ...b, content: html } : b), false);
    }
  };

  const applyInlineColorOrHighlight = (type: 'color' | 'highlight', value: string) => {
    restoreCurrentSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (type === 'color') {
      if (value === 'inherit') {
        execInlineFormat('removeFormat');
      } else {
        try {
          (document as any).execCommand('styleWithCSS', false, 'true');
          document.execCommand('foreColor', false, value);
        } catch { }
        if (!range.collapsed) {
          const span = document.createElement('span');
          span.style.color = value;
          span.appendChild(range.extractContents());
          range.insertNode(span);
        }
      }
      setShowTextColorMenu(false);
    } else {
      if (value === 'transparent') {
        execInlineFormat('removeFormat');
      } else if (!range.collapsed) {
        const mark = document.createElement('mark');
        mark.style.backgroundColor = value;
        mark.style.color = '#0f172a';
        mark.style.padding = '1px 4px';
        mark.style.borderRadius = '3px';
        mark.appendChild(range.extractContents());
        range.insertNode(mark);
      }
      setShowHighlightMenu(false);
    }

    if (focusedBlockId && blockInputRefs.current[focusedBlockId]) {
      const html = blockInputRefs.current[focusedBlockId]!.innerHTML;
      commitBlocks(prev => prev.map(b => b.id === focusedBlockId ? { ...b, content: html } : b));
    }
  };

  const applyInlineCode = () => {
    restoreCurrentSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const code = document.createElement('code');
    code.className = 'nook-inline-code px-1.5 py-0.5 rounded font-mono text-xs bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400';
    code.appendChild(range.extractContents());
    range.insertNode(code);
    if (focusedBlockId && blockInputRefs.current[focusedBlockId]) {
      const html = blockInputRefs.current[focusedBlockId]!.innerHTML;
      commitBlocks(prev => prev.map(b => b.id === focusedBlockId ? { ...b, content: html } : b));
    }
  };

  const handleInsertHyperlink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    restoreCurrentSelection();
    const anchor = `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline">${linkText.trim() || linkUrl.trim()}</a>`;
    document.execCommand('insertHTML', false, anchor);
    if (focusedBlockId && blockInputRefs.current[focusedBlockId]) {
      const html = blockInputRefs.current[focusedBlockId]!.innerHTML;
      commitBlocks(prev => prev.map(b => b.id === focusedBlockId ? { ...b, content: html } : b));
    }
    setLinkUrl('');
    setLinkText('');
    setLinkModalOpen(false);
  };

  // AI Actions directly on an individual block!
  const handleAiBlockTransform = async (blockId: string, mode: 'explain' | 'rewrite' | 'simplify') => {
    const target = blocks.find(b => b.id === blockId);
    if (!target) return;
    const plain = stripHtmlTags(target.content);
    if (!plain) return;

    setBlockMenu(null);
    setAiBlockBusyId(blockId);

    const promptMap = {
      explain: `Explain this concept clearly for a university student in 3-4 concise bullet points or sentences:\n\n"${plain}"`,
      rewrite: `Rewrite and polish this academic paragraph cleanly with better clarity and scholarly precision (return only the improved text):\n\n"${plain}"`,
      simplify: `Simplify this difficult explanation into intuitive, easy-to-understand language with an analogy:\n\n"${plain}"`
    };

    try {
      const aiText = await queryGemini(promptMap[mode], 'You are a concise university tutor.');
      if (aiText && aiText.trim()) {
        if (mode === 'rewrite') {
          commitBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: aiText.trim() } : b));
        } else {
          insertBlockAfter(
            blockId,
            createBlock(
              'callout',
              `<strong>${mode === 'explain' ? 'AI Explanation' : 'Simplified View'}:</strong> ${aiText.trim()}`,
              { calloutTone: 'info', calloutIcon: '✨' }
            )
          );
        }
      } else {
        // Offline / no-key structured fallback
        if (mode === 'explain') {
          insertBlockAfter(
            blockId,
            createBlock('callout', `<strong>Concept Breakdown:</strong> "${plain}" establishes the core relationship or mechanism studied in this module. Focus on its inputs, constraints, and why it holds in edge cases.`, { calloutTone: 'info', calloutIcon: '💡' })
          );
        } else if (mode === 'simplify') {
          insertBlockAfter(
            blockId,
            createBlock('callout', `<strong>Plain English Summary:</strong> In simpler terms, ${plain.charAt(0).toLowerCase() + plain.slice(1)}`, { calloutTone: 'tip', calloutIcon: '✨' })
          );
        }
      }
    } finally {
      setAiBlockBusyId(null);
    }
  };

  // Filtered slash menu items
  const filteredSlashItems = slashState
    ? SLASH_ITEMS.filter(
        it =>
          !slashState.query ||
          it.label.toLowerCase().includes(slashState.query) ||
          it.keywords.includes(slashState.query)
      )
    : [];

  // Keyboard handling inside editable blocks
  const handleBlockKeyDown = (block: NoteBlock, e: React.KeyboardEvent<HTMLDivElement>) => {
    // Slash menu navigation
    if (slashState && slashState.blockId === block.id && filteredSlashItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashState(s => s ? { ...s, activeIndex: (s.activeIndex + 1) % filteredSlashItems.length } : null);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashState(s => s ? { ...s, activeIndex: (s.activeIndex - 1 + filteredSlashItems.length) % filteredSlashItems.length } : null);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = filteredSlashItems[slashState.activeIndex] || filteredSlashItems[0];
        convertBlockType(block.id, chosen.type, true);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashState(null);
        return;
      }
    }

    // Undo / Redo shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Link shortcut Ctrl+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      saveCurrentSelection();
      setLinkModalOpen(true);
      return;
    }

    // Indent / Outdent with Tab / Shift+Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      const delta = e.shiftKey ? -1 : 1;
      commitBlocks(prev =>
        prev.map(b => b.id === block.id ? { ...b, indent: Math.max(0, Math.min(3, (b.indent || 0) + delta)) } : b)
      );
      return;
    }

    // Enter -> create new block (preserve bullet/numbered/todo continuation, or exit if empty!)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const plain = stripHtmlTags(block.content);
      if ((block.type === 'bullet' || block.type === 'numbered' || block.type === 'todo') && plain === '') {
        convertBlockType(block.id, 'paragraph');
        return;
      }
      const nextType: NoteBlockType =
        block.type === 'bullet' || block.type === 'numbered' || block.type === 'todo' ? block.type : 'paragraph';
      insertBlockAfter(block.id, createBlock(nextType, '', undefined, block.indent || 0));
      return;
    }

    // Backspace on empty block -> turn into paragraph or delete block & focus previous
    if (e.key === 'Backspace') {
      const plain = stripHtmlTags(block.content);
      if (plain === '') {
        if (block.type !== 'paragraph') {
          e.preventDefault();
          convertBlockType(block.id, 'paragraph');
        } else if (blocks.length > 1) {
          e.preventDefault();
          deleteBlock(block.id);
        }
      }
    }

    // Arrow Up/Down between blocks
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorOffset === 0) {
        const idx = blocks.findIndex(b => b.id === block.id);
        if (idx > 0) {
          const prev = blocks[idx - 1];
          if (blockInputRefs.current[prev.id]) {
            e.preventDefault();
            focusBlock(prev.id, true);
          }
        }
      }
    }
    if (e.key === 'ArrowDown' && !e.shiftKey) {
      const idx = blocks.findIndex(b => b.id === block.id);
      if (idx < blocks.length - 1) {
        const el = blockInputRefs.current[block.id];
        const sel = window.getSelection();
        if (el && sel && sel.isCollapsed && sel.anchorOffset >= (el.textContent?.length || 0)) {
          const next = blocks[idx + 1];
          if (blockInputRefs.current[next.id]) {
            e.preventDefault();
            focusBlock(next.id, false);
          }
        }
      }
    }
  };

  // Document metrics
  const allPlainText = blocks.map(b => stripHtmlTags(b.content) + ' ' + stripHtmlTags(b.props?.toggleBody || '')).join(' ').trim();
  const wordCount = allPlainText ? allPlainText.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Track numbered list sequences cleanly
  let runningNumber = 0;

  // Compute callout tone styling
  const getCalloutClasses = (tone: string = 'info') => {
    switch (tone) {
      case 'tip':
        return 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100';
      case 'warning':
        return 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-100';
      case 'danger':
        return 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70 text-rose-950 dark:text-rose-100';
      case 'neutral':
        return 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100';
      case 'info':
      default:
        return 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/70 text-blue-950 dark:text-blue-100';
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-slate-50/60 dark:bg-slate-950"
      onClick={() => {
        if (blockMenu) setBlockMenu(null);
      }}
    >
      {/* Top Formatting & Inline Controls Ribbon */}
      <div className="px-4 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1 overflow-x-auto text-slate-600 dark:text-slate-300 text-xs shrink-0 select-none">
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={undoStack.length === 0}
            onMouseDown={e => e.preventDefault()}
            onClick={handleUndo}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={redoStack.length === 0}
            onMouseDown={e => e.preventDefault()}
            onClick={handleRedo}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Turn Focused Block Into Type */}
        <div className="flex items-center gap-1 px-1.5 border-r border-slate-200 dark:border-slate-800">
          <select
            value={blocks.find(b => b.id === focusedBlockId)?.type || 'paragraph'}
            onChange={e => focusedBlockId && convertBlockType(focusedBlockId, e.target.value as NoteBlockType)}
            className="py-1 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="paragraph">Text Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="bullet">Bulleted List</option>
            <option value="numbered">Numbered List</option>
            <option value="todo">Checklist</option>
            <option value="quote">Blockquote</option>
            <option value="callout">Callout Box</option>
            <option value="toggle">Toggle Section</option>
          </select>
        </div>

        {/* Inline Rich Formatting */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
          <button type="button" onMouseDown={e => { e.preventDefault(); saveCurrentSelection(); }} onClick={() => execInlineFormat('bold')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Bold (Ctrl+B)"><Bold className="w-3.5 h-3.5" /></button>
          <button type="button" onMouseDown={e => { e.preventDefault(); saveCurrentSelection(); }} onClick={() => execInlineFormat('italic')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Italic (Ctrl+I)"><Italic className="w-3.5 h-3.5" /></button>
          <button type="button" onMouseDown={e => { e.preventDefault(); saveCurrentSelection(); }} onClick={() => execInlineFormat('underline')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Underline (Ctrl+U)"><Underline className="w-3.5 h-3.5" /></button>
          <button type="button" onMouseDown={e => { e.preventDefault(); saveCurrentSelection(); }} onClick={() => execInlineFormat('strikeThrough')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
          <button type="button" onMouseDown={e => { e.preventDefault(); saveCurrentSelection(); }} onClick={applyInlineCode} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-[11px]" title="Inline Code">{`</>`}</button>
        </div>

        {/* Text Color & Highlight */}
        <div className="relative flex items-center gap-0.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              saveCurrentSelection();
              setShowTextColorMenu(v => !v);
              setShowHighlightMenu(false);
            }}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Text Color"
          >
            <Palette className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </button>
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              saveCurrentSelection();
              setShowHighlightMenu(v => !v);
              setShowTextColorMenu(false);
            }}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Highlight Color"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          </button>
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              saveCurrentSelection();
              setLinkModalOpen(true);
            }}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Insert Link (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Insert Block Buttons */}
        <div className="flex items-center gap-0.5 px-1.5">
          <button type="button" onClick={() => insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, createBlock('todo', ''))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Checklist"><CheckSquare className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, createBlock('callout', 'Write key insight here...'))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Callout"><Lightbulb className="w-3.5 h-3.5 text-amber-500" /></button>
          <button type="button" onClick={() => insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, createBlock('toggle', 'Toggle question or section'))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Toggle Section"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, createBlock('code', '// Code snippet'))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Code Block"><Code className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /></button>
          <button type="button" onClick={() => { const b = createBlock('math', '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}'); insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, b); setEditingMathId(b.id); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Math Formula (KaTeX)"><Sigma className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /></button>
          <button type="button" onClick={() => insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, createBlock('table'))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Table"><TableIcon className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, createBlock('image'))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Image"><ImageIcon className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => insertBlockAfter(focusedBlockId || blocks[blocks.length - 1].id, createBlock('divider'))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Insert Divider"><Minus className="w-3.5 h-3.5" /></button>
        </div>

        {/* Word Count & Read Time */}
        <div className="ml-auto flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0 pl-2">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>
      </div>

      {/* Color & Highlight Floating Popovers */}
      {showTextColorMenu && (
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs z-20">
          <span className="font-semibold text-slate-500">Text Color:</span>
          {TEXT_COLORS.map(c => (
            <button
              key={c.label}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => applyInlineColorOrHighlight('color', c.value)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: c.swatch }} />
              <span className="text-[11px]">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {showHighlightMenu && (
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs z-20">
          <span className="font-semibold text-slate-500">Highlight:</span>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.label}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => applyInlineColorOrHighlight('highlight', c.value)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="w-3 h-3 rounded border border-slate-300" style={{ backgroundColor: c.swatch }} />
              <span className="text-[11px]">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Distraction-Free Document Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Document Cover Banner */}
          {note.coverImage && (
            <div
              className="h-32 sm:h-40 w-full relative group bg-cover bg-center border-b border-slate-200 dark:border-slate-800"
              style={
                note.coverImage.startsWith('http') || note.coverImage.startsWith('data:')
                  ? { backgroundImage: `url(${note.coverImage})` }
                  : { background: note.coverImage }
              }
            >
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCoverPicker(true)}
                  className="px-2.5 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-[11px] font-semibold shadow-sm"
                >
                  Change Cover
                </button>
                <button
                  type="button"
                  onClick={() => onSaveNote(note.id, { coverImage: '' })}
                  className="px-2.5 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 text-rose-600 text-[11px] font-semibold shadow-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className="px-6 sm:px-14 py-8 sm:py-10 space-y-5">
            {/* Hover Controls for Icon & Cover */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => { setShowIconPicker(v => !v); setShowCoverPicker(false); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <Smile className="w-3.5 h-3.5" />
                <span>{note.icon ? 'Change Icon' : 'Add Icon'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowCoverPicker(v => !v); setShowIconPicker(false); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{note.coverImage ? 'Change Cover' : 'Add Cover'}</span>
              </button>
            </div>

            {showIconPicker && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap items-center gap-2">
                {NOTE_EMOJI_ICONS.map(ico => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => {
                      onSaveNote(note.id, { icon: ico });
                      setShowIconPicker(false);
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-lg flex items-center justify-center transition-transform hover:scale-110"
                  >
                    {ico}
                  </button>
                ))}
                {note.icon && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveNote(note.id, { icon: '' });
                      setShowIconPicker(false);
                    }}
                    className="px-2 py-1 text-[11px] text-rose-600 hover:underline ml-auto"
                  >
                    Remove icon
                  </button>
                )}
              </div>
            )}

            {showCoverPicker && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 space-y-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-200">
                  <span>Choose Cover Gradient or Custom URL</span>
                  <button type="button" onClick={() => setShowCoverPicker(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COVER_PRESETS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSaveNote(note.id, { coverImage: p.value });
                        setShowCoverPicker(false);
                      }}
                      className="h-10 rounded-lg border border-white/40 shadow-sm hover:scale-105 transition-transform"
                      style={{ background: p.value }}
                      title={p.label}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Paste cover image URL (https://...)"
                    value={customCoverUrl}
                    onChange={e => setCustomCoverUrl(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customCoverUrl.trim()) {
                        onSaveNote(note.id, { coverImage: customCoverUrl.trim() });
                        setCustomCoverUrl('');
                        setShowCoverPicker(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Document Title */}
            <div className="flex items-center gap-3">
              {note.icon && (
                <button
                  type="button"
                  onClick={() => setShowIconPicker(v => !v)}
                  className="text-3xl sm:text-4xl hover:scale-110 transition-transform shrink-0"
                  title="Change Icon"
                >
                  {note.icon}
                </button>
              )}
              <input
                type="text"
                dir="auto"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Untitled Document"
                className="w-full text-2xl sm:text-4xl font-extrabold bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none tracking-tight placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />
            </div>

            {/* Metadata Sub-bar */}
            <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 pb-4 border-b border-slate-100 dark:border-slate-800">
              {note.courseId && (() => {
                const c = courses.find(cr => cr.id === note.courseId);
                return c ? (
                  <span
                    className="px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: `${c.color}18`, color: c.color }}
                  >
                    {c.code} — {c.name}
                  </span>
                ) : null;
              })()}
              {(note.tags || []).map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  #{tag}
                </span>
              ))}
              <span className="ml-auto font-mono text-[10px] text-slate-400">
                Type <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">/</kbd> for commands
              </span>
            </div>

            {/* Notion Blocks Stream */}
            <div className="space-y-1.5 min-h-[420px]">
              {blocks.map(block => {
                if (block.type === 'numbered') {
                  runningNumber += 1;
                } else {
                  runningNumber = 0;
                }

                const indentPx = (block.indent || 0) * 24;
                const isDragging = draggedBlockId === block.id;
                const isDragOver = dragOverBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={e => {
                      setDraggedBlockId(block.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                      if (dragOverBlockId !== block.id) setDragOverBlockId(block.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverBlockId === block.id) setDragOverBlockId(null);
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      handleDropOnBlock(block.id);
                    }}
                    onDragEnd={() => {
                      setDraggedBlockId(null);
                      setDragOverBlockId(null);
                    }}
                    style={{ paddingLeft: `${indentPx}px` }}
                    className={`group relative flex items-start gap-1.5 rounded-lg transition-all ${
                      isDragging ? 'opacity-40' : ''
                    } ${isDragOver ? 'ring-2 ring-blue-500/60 bg-blue-50/30 dark:bg-blue-950/20' : ''}`}
                  >
                    {/* Block Hover Controls (+ & Drag Handle) */}
                    <div className="flex items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none shrink-0 -ml-1 sm:-ml-6">
                      <button
                        type="button"
                        onClick={() => insertBlockAfter(block.id, createBlock('paragraph', ''))}
                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Add block below"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setBlockMenu(
                            blockMenu?.blockId === block.id
                              ? null
                              : { blockId: block.id, top: Math.min(window.innerHeight - 280, rect.bottom + 4), left: Math.max(12, rect.left) }
                          );
                        }}
                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing"
                        title="Drag to reorder or click for block menu"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Block Content Renderer */}
                    <div className="flex-1 min-w-0 relative">
                      {aiBlockBusyId === block.id && (
                        <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>AI processing block...</span>
                        </div>
                      )}

                      {block.type === 'h1' && (
                        <EditableInline
                          html={block.content}
                          placeholder="Heading 1"
                          innerRef={el => (blockInputRefs.current[block.id] = el)}
                          onFocus={() => setFocusedBlockId(block.id)}
                          onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                          onKeyDown={e => handleBlockKeyDown(block, e)}
                          onSlashTrigger={(q, r) => setSlashState({ blockId: block.id, query: q, top: Math.min(window.innerHeight - 300, r.bottom + 4), left: r.left, activeIndex: 0 })}
                          onSlashClose={() => slashState?.blockId === block.id && setSlashState(null)}
                          className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-4 mb-1 leading-snug tracking-tight"
                        />
                      )}

                      {block.type === 'h2' && (
                        <EditableInline
                          html={block.content}
                          placeholder="Heading 2"
                          innerRef={el => (blockInputRefs.current[block.id] = el)}
                          onFocus={() => setFocusedBlockId(block.id)}
                          onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                          onKeyDown={e => handleBlockKeyDown(block, e)}
                          onSlashTrigger={(q, r) => setSlashState({ blockId: block.id, query: q, top: Math.min(window.innerHeight - 300, r.bottom + 4), left: r.left, activeIndex: 0 })}
                          onSlashClose={() => slashState?.blockId === block.id && setSlashState(null)}
                          className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1 leading-snug"
                        />
                      )}

                      {block.type === 'h3' && (
                        <EditableInline
                          html={block.content}
                          placeholder="Heading 3"
                          innerRef={el => (blockInputRefs.current[block.id] = el)}
                          onFocus={() => setFocusedBlockId(block.id)}
                          onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                          onKeyDown={e => handleBlockKeyDown(block, e)}
                          onSlashTrigger={(q, r) => setSlashState({ blockId: block.id, query: q, top: Math.min(window.innerHeight - 300, r.bottom + 4), left: r.left, activeIndex: 0 })}
                          onSlashClose={() => slashState?.blockId === block.id && setSlashState(null)}
                          className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-2 mb-0.5 leading-snug"
                        />
                      )}

                      {block.type === 'paragraph' && (
                        <EditableInline
                          html={block.content}
                          placeholder="Type '/' for commands, or start writing..."
                          innerRef={el => (blockInputRefs.current[block.id] = el)}
                          onFocus={() => setFocusedBlockId(block.id)}
                          onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                          onKeyDown={e => handleBlockKeyDown(block, e)}
                          onSlashTrigger={(q, r) => setSlashState({ blockId: block.id, query: q, top: Math.min(window.innerHeight - 300, r.bottom + 4), left: r.left, activeIndex: 0 })}
                          onSlashClose={() => slashState?.blockId === block.id && setSlashState(null)}
                          className="text-sm sm:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed py-0.5"
                        />
                      )}

                      {block.type === 'bullet' && (
                        <div className="flex items-start gap-2.5 py-0.5">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300 shrink-0" />
                          <EditableInline
                            html={block.content}
                            placeholder="List item..."
                            innerRef={el => (blockInputRefs.current[block.id] = el)}
                            onFocus={() => setFocusedBlockId(block.id)}
                            onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                            onKeyDown={e => handleBlockKeyDown(block, e)}
                            onSlashTrigger={(q, r) => setSlashState({ blockId: block.id, query: q, top: Math.min(window.innerHeight - 300, r.bottom + 4), left: r.left, activeIndex: 0 })}
                            onSlashClose={() => slashState?.blockId === block.id && setSlashState(null)}
                            className="flex-1 text-sm sm:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed"
                          />
                        </div>
                      )}

                      {block.type === 'numbered' && (
                        <div className="flex items-start gap-2.5 py-0.5">
                          <span className="mt-0.5 text-sm font-semibold font-mono text-slate-500 dark:text-slate-400 shrink-0 min-w-[20px]">
                            {runningNumber}.
                          </span>
                          <EditableInline
                            html={block.content}
                            placeholder="List item..."
                            innerRef={el => (blockInputRefs.current[block.id] = el)}
                            onFocus={() => setFocusedBlockId(block.id)}
                            onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                            onKeyDown={e => handleBlockKeyDown(block, e)}
                            onSlashTrigger={(q, r) => setSlashState({ blockId: block.id, query: q, top: Math.min(window.innerHeight - 300, r.bottom + 4), left: r.left, activeIndex: 0 })}
                            onSlashClose={() => slashState?.blockId === block.id && setSlashState(null)}
                            className="flex-1 text-sm sm:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed"
                          />
                        </div>
                      )}

                      {block.type === 'todo' && (
                        <div className="flex items-start gap-2.5 py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <input
                            type="checkbox"
                            checked={Boolean(block.props?.checked)}
                            onChange={e =>
                              commitBlocks(prev =>
                                prev.map(b =>
                                  b.id === block.id ? { ...b, props: { ...b.props, checked: e.target.checked } } : b
                                )
                              )
                            }
                            className="mt-1 w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                          />
                          <EditableInline
                            html={block.content}
                            placeholder="To-do item..."
                            innerRef={el => (blockInputRefs.current[block.id] = el)}
                            onFocus={() => setFocusedBlockId(block.id)}
                            onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                            onKeyDown={e => handleBlockKeyDown(block, e)}
                            className={`flex-1 text-sm sm:text-[15px] leading-relaxed ${
                              block.props?.checked
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          />
                        </div>
                      )}

                      {block.type === 'quote' && (
                        <blockquote className="my-2 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/25 px-4 py-2.5 rounded-r-lg">
                          <EditableInline
                            html={block.content}
                            placeholder="Write quote or theorem..."
                            innerRef={el => (blockInputRefs.current[block.id] = el)}
                            onFocus={() => setFocusedBlockId(block.id)}
                            onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                            onKeyDown={e => handleBlockKeyDown(block, e)}
                            className="italic text-sm sm:text-[15px] text-slate-700 dark:text-slate-200 leading-relaxed"
                          />
                        </blockquote>
                      )}

                      {block.type === 'callout' && (
                        <div className={`my-2 p-3.5 rounded-xl border flex items-start gap-3 ${getCalloutClasses(block.props?.calloutTone)}`}>
                          <button
                            type="button"
                            onClick={() => {
                              const icons = ['💡', '⚠️', '✅', '📌', '🧠', '🔥'];
                              const nextIdx = (icons.indexOf(block.props?.calloutIcon || '💡') + 1) % icons.length;
                              commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, calloutIcon: icons[nextIdx] } } : b));
                            }}
                            className="text-lg shrink-0 hover:scale-110 transition-transform"
                            title="Click to cycle callout icon"
                          >
                            {block.props?.calloutIcon || '💡'}
                          </button>
                          <div className="flex-1 min-w-0 space-y-2">
                            <EditableInline
                              html={block.content}
                              placeholder="Write key insight or reminder..."
                              innerRef={el => (blockInputRefs.current[block.id] = el)}
                              onFocus={() => setFocusedBlockId(block.id)}
                              onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                              onKeyDown={e => handleBlockKeyDown(block, e)}
                              className="text-sm leading-relaxed"
                            />
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                              {(['info', 'tip', 'warning', 'danger', 'neutral'] as const).map(tone => (
                                <button
                                  key={tone}
                                  type="button"
                                  onClick={() => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, calloutTone: tone } } : b))}
                                  className={`px-1.5 py-0.5 rounded capitalize ${
                                    block.props?.calloutTone === tone ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold' : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {tone}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {block.type === 'toggle' && (
                        <div className="my-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                commitBlocks(prev =>
                                  prev.map(b =>
                                    b.id === block.id
                                      ? { ...b, props: { ...b.props, toggleOpen: !(b.props?.toggleOpen ?? true) } }
                                      : b
                                  )
                                )
                              }
                              className="p-0.5 mt-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
                            >
                              {block.props?.toggleOpen !== false ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <EditableInline
                              html={block.content}
                              placeholder="Toggle heading or quiz question..."
                              innerRef={el => (blockInputRefs.current[block.id] = el)}
                              onFocus={() => setFocusedBlockId(block.id)}
                              onChangeHtml={html => commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: html } : b))}
                              onKeyDown={e => handleBlockKeyDown(block, e)}
                              className="flex-1 font-semibold text-sm text-slate-900 dark:text-slate-100"
                            />
                          </div>
                          {block.props?.toggleOpen !== false && (
                            <div className="pl-7 border-l-2 border-slate-200 dark:border-slate-700 ml-2">
                              <EditableInline
                                html={block.props?.toggleBody || ''}
                                placeholder="Hidden details, proofs, or revision answers..."
                                onChangeHtml={bodyHtml =>
                                  commitBlocks(prev =>
                                    prev.map(b =>
                                      b.id === block.id ? { ...b, props: { ...b.props, toggleBody: bodyHtml } } : b
                                    )
                                  )
                                }
                                className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {block.type === 'code' && (
                        <div className="my-3 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                              <select
                                value={block.props?.language || 'python'}
                                onChange={e =>
                                  commitBlocks(prev =>
                                    prev.map(b =>
                                      b.id === block.id ? { ...b, props: { ...b.props, language: e.target.value } } : b
                                    )
                                  )
                                }
                                className="ml-2 bg-slate-800 text-blue-300 font-bold uppercase text-[10px] px-2 py-0.5 rounded border border-slate-700 focus:outline-none"
                              >
                                {LANGUAGES.map(l => (
                                  <option key={l} value={l}>{l.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(stripHtmlTags(block.content));
                                setCopiedCodeId(block.id);
                                setTimeout(() => setCopiedCodeId(null), 1500);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1"
                            >
                              {copiedCodeId === block.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedCodeId === block.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <textarea
                            value={stripHtmlTags(block.content)}
                            onChange={e =>
                              commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: e.target.value } : b))
                            }
                            rows={Math.max(3, Math.min(18, stripHtmlTags(block.content).split('\n').length + 1))}
                            spellCheck={false}
                            className="w-full p-3.5 font-mono text-xs bg-slate-950 text-slate-100 focus:outline-none resize-y border-b border-slate-800"
                          />
                          <pre
                            className="p-3.5 text-xs font-mono leading-relaxed overflow-x-auto text-slate-100 bg-slate-950/90"
                            dangerouslySetInnerHTML={{
                              __html: highlightCodeSafe(stripHtmlTags(block.content), block.props?.language || 'python')
                            }}
                          />
                        </div>
                      )}

                      {block.type === 'math' && (
                        <div className="my-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 space-y-2">
                          <div
                            onClick={() => setEditingMathId(editingMathId === block.id ? null : block.id)}
                            className="cursor-pointer py-2 text-center overflow-x-auto text-slate-900 dark:text-slate-100"
                            title="Click to edit LaTeX formula"
                            dangerouslySetInnerHTML={{
                              __html: renderKatexSafe(stripHtmlTags(block.content), block.props?.displayMode !== false)
                            }}
                          />
                          {editingMathId === block.id && (
                            <div className="pt-2 border-t border-purple-200 dark:border-purple-800/60 flex items-center gap-2">
                              <input
                                type="text"
                                value={stripHtmlTags(block.content)}
                                onChange={e =>
                                  commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: e.target.value } : b))
                                }
                                placeholder="e.g. \int_a^b f(x)\,dx = F(b) - F(a)"
                                className="flex-1 px-2.5 py-1.5 rounded-md border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setEditingMathId(null)}
                                className="px-2.5 py-1.5 rounded-md bg-purple-600 text-white text-xs font-semibold"
                              >
                                Done
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {block.type === 'table' && (() => {
                        const rows = block.props?.tableRows || [['Col 1', 'Col 2'], ['Cell 1', 'Cell 2']];
                        const hasHeader = block.props?.tableHasHeader !== false;
                        return (
                          <div className="my-3 space-y-1.5">
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                              <table className="w-full text-xs border-collapse">
                                <tbody>
                                  {rows.map((row, rIdx) => (
                                    <tr key={rIdx} className={hasHeader && rIdx === 0 ? 'bg-slate-100 dark:bg-slate-800 font-bold' : 'bg-white dark:bg-slate-900'}>
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="border border-slate-200 dark:border-slate-700 p-0">
                                          <input
                                            type="text"
                                            dir="auto"
                                            value={cell}
                                            onChange={e => {
                                              const nextRows = rows.map((r, ri) =>
                                                ri === rIdx ? r.map((val, ci) => (ci === cIdx ? e.target.value : val)) : r
                                              );
                                              commitBlocks(prev =>
                                                prev.map(b =>
                                                  b.id === block.id ? { ...b, props: { ...b.props, tableRows: nextRows } } : b
                                                )
                                              );
                                            }}
                                            className={`w-full px-3 py-2 bg-transparent focus:outline-none focus:bg-blue-50/40 dark:focus:bg-blue-950/30 ${
                                              hasHeader && rIdx === 0
                                                ? 'font-bold text-slate-900 dark:text-slate-100'
                                                : 'text-slate-800 dark:text-slate-200'
                                            }`}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  const colsCount = rows[0]?.length || 2;
                                  const nextRows = [...rows, Array.from({ length: colsCount }, () => '')];
                                  commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, tableRows: nextRows } } : b));
                                }}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                              >
                                + Row
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextRows = rows.map((r, i) => [...r, i === 0 ? `Col ${r.length + 1}` : '']);
                                  commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, tableRows: nextRows } } : b));
                                }}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                              >
                                + Column
                              </button>
                              {rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextRows = rows.slice(0, -1);
                                    commitBlocks(prev => prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, tableRows: nextRows } } : b));
                                  }}
                                  className="px-2 py-0.5 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  - Row
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {block.type === 'image' && (
                        <div className="my-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-3">
                          {block.props?.imageUrl ? (
                            <div className="space-y-2 text-center">
                              <img
                                src={block.props.imageUrl}
                                alt={block.props.imageCaption || 'Note image'}
                                style={{ width: `${block.props.imageWidth || 100}%` }}
                                className="mx-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-[420px] object-contain"
                              />
                              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
                                <input
                                  type="text"
                                  placeholder="Add caption..."
                                  value={block.props.imageCaption || ''}
                                  onChange={e =>
                                    commitBlocks(prev =>
                                      prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, imageCaption: e.target.value } } : b)
                                    )
                                  }
                                  className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-center"
                                />
                                {[25, 50, 75, 100].map(pct => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() =>
                                      commitBlocks(prev =>
                                        prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, imageWidth: pct } } : b)
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded font-mono ${
                                      (block.props?.imageWidth || 100) === pct
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {pct}%
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    commitBlocks(prev =>
                                      prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, imageUrl: '' } } : b)
                                    )
                                  }
                                  className="text-rose-600 hover:underline px-2"
                                >
                                  Replace
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                              <input
                                type="url"
                                placeholder="Paste image URL (https://...) and press Enter"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const url = (e.currentTarget as HTMLInputElement).value.trim();
                                    if (url) {
                                      commitBlocks(prev =>
                                        prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, imageUrl: url, imageWidth: 100 } } : b)
                                      );
                                    }
                                  }
                                }}
                                className="flex-1 w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                              <label className="px-3 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold cursor-pointer flex items-center gap-1.5 shrink-0">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = ev => {
                                      const dataUrl = ev.target?.result as string;
                                      if (dataUrl) {
                                        commitBlocks(prev =>
                                          prev.map(b => b.id === block.id ? { ...b, props: { ...b.props, imageUrl: dataUrl, imageWidth: 100 } } : b)
                                        );
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}

                      {block.type === 'divider' && (
                        <div className="py-3">
                          <hr className="border-t border-slate-200 dark:border-slate-700" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Clickable empty footer area to append paragraph effortlessly */}
              <div
                onClick={() => {
                  const last = blocks[blocks.length - 1];
                  if (last && last.type === 'paragraph' && stripHtmlTags(last.content) === '') {
                    focusBlock(last.id);
                  } else {
                    insertBlockAfter(last?.id || '', createBlock('paragraph', ''));
                  }
                }}
                className="h-24 cursor-text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Slash Command Floating Palette */}
      {slashState && filteredSlashItems.length > 0 && (
        <div
          style={{ top: slashState.top, left: Math.min(window.innerWidth - 280, slashState.left) }}
          className="fixed z-50 w-64 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-1.5 space-y-0.5 text-xs"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Turn Into / Insert Block
          </div>
          {filteredSlashItems.map((item, idx) => (
            <button
              key={item.type}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                convertBlockType(slashState.blockId, item.type, true);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                idx === slashState.activeIndex
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{item.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Contextual Block Menu (Drag Handle Click) */}
      {blockMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ top: blockMenu.top, left: blockMenu.left }}
          className="fixed z-50 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-1.5 space-y-0.5 text-xs"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Block Actions
          </div>
          <button
            type="button"
            onClick={() => moveBlock(blockMenu.blockId, 'up')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Move Up</span>
          </button>
          <button
            type="button"
            onClick={() => moveBlock(blockMenu.blockId, 'down')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Move Down</span>
          </button>
          <button
            type="button"
            onClick={() => {
              commitBlocks(prev => prev.map(b => b.id === blockMenu.blockId ? { ...b, indent: Math.min(3, (b.indent || 0) + 1) } : b));
              setBlockMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Indent className="w-3.5 h-3.5" />
            <span>Indent (Tab)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              commitBlocks(prev => prev.map(b => b.id === blockMenu.blockId ? { ...b, indent: Math.max(0, (b.indent || 0) - 1) } : b));
              setBlockMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Outdent className="w-3.5 h-3.5" />
            <span>Outdent (Shift+Tab)</span>
          </button>
          <button
            type="button"
            onClick={() => duplicateBlock(blockMenu.blockId)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate Block</span>
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>AI on Block</span>
          </div>
          <button
            type="button"
            onClick={() => handleAiBlockTransform(blockMenu.blockId, 'explain')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explain Paragraph</span>
          </button>
          <button
            type="button"
            onClick={() => handleAiBlockTransform(blockMenu.blockId, 'rewrite')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Polish & Rewrite</span>
          </button>
          <button
            type="button"
            onClick={() => handleAiBlockTransform(blockMenu.blockId, 'simplify')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Simplify Concept</span>
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            type="button"
            onClick={() => deleteBlock(blockMenu.blockId)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Block</span>
          </button>
        </div>
      )}

      {/* Insert Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Insert Hyperlink</h3>
            <form onSubmit={handleInsertHyperlink} className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Display Text</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  placeholder="e.g. Lecture Slides"
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
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
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setLinkModalOpen(false)} className="px-3 py-1.5 rounded text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold">Insert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

