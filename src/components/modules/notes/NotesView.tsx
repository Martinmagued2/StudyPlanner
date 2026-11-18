import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Star,
  Trash2,
  RotateCcw,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Archive,
  Copy,
  Sparkles,
  Download,
  FileDown,
  FileCode2,
  ClipboardCopy,
  Check,
  Tag,
  BookOpen,
  LayoutTemplate,
  Wand2,
  Brain,
  ListChecks,
  HelpCircle,
  Loader2,
  X,
  ArrowUpDown,
  Clock,
  Layers,
  Camera,
  Share2,
  UploadCloud,
  Mic
} from 'lucide-react';
import { LectureRecorderModal } from './LectureRecorderModal';
import { useApp } from '../../../context/AppContext';
import { Note, NoteFolder, NoteBlock } from '../../../types';
import { NotionBlockEditor } from './NotionBlockEditor';
import {
  readImageFileAsBase64,
  analyzeStudyImageWithVision,
  VisionScanMode
} from '../../../services/visionScannerService';
import { createSharedStudyLink } from '../../../services/shareService';
import {
  createBlock,
  blocksToHtml,
  blocksToMarkdown,
  parseHtmlOrMarkdownToBlocks,
  stripHtmlTags,
  getNoteTemplates,
  NoteTemplate
} from '../../../services/noteBlockService';
import {
  buildFormattedNoteDocumentHtml,
  exportNoteToPdf,
  exportNoteToHtml,
  exportNoteToMarkdown,
  copyNoteFormatted,
  PdfExportOptions
} from '../../../services/noteExportService';
import { queryGemini, generateQuizFromFiles } from '../../../services/fileAiService';

type NavFilter = 'all' | 'favorites' | 'recent' | 'archived' | 'trash' | { folderId: string };
type SortMode = 'updated' | 'created' | 'title';

export const NotesView: React.FC = () => {
  const {
    user,
    notes,
    courses,
    files,
    flashcardDecks,
    addNote,
    updateNote,
    duplicateNote,
    moveNoteToTrash,
    restoreNote,
    deleteNotePermanently,
    noteFolders,
    addNoteFolder,
    updateNoteFolder,
    deleteNoteFolder,
    notesNavTarget,
    setNotesNavTarget,
    addFlashcard,
    addFlashcardDeck,
    addQuiz,
    addTask,
    setActiveView
  } = useApp();

  const [isLectureRecorderOpen, setIsLectureRecorderOpen] = useState(false);

  const [navFilter, setNavFilter] = useState<NavFilter>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => {
    const active = notes.filter(n => !n.inTrash && !n.isArchived);
    return active[0]?.id || null;
  });

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved');

  // Modals & Drawers
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);
  const [aiTopicPrompt, setAiTopicPrompt] = useState('');
  const [aiSourceFileId, setAiSourceFileId] = useState('');
  const [aiTargetCourseId, setAiTargetCourseId] = useState('');
  const [aiBusyLabel, setAiBusyLabel] = useState<string | null>(null);
  const [aiToast, setAiToast] = useState<{ message: string; type: 'success' | 'info' | 'error'; actionLabel?: string; onAction?: () => void } | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfExportOptions>({
    paperSize: 'A4',
    includePageNumbers: true,
    includeHeaderFooter: true,
    includeCoverAndMeta: true
  });
  const [copiedHtmlFeedback, setCopiedHtmlFeedback] = useState(false);

  const [newTagInput, setNewTagInput] = useState('');
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  // Vision Handwriting / Diagram Scanner State
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [visionMode, setVisionMode] = useState<VisionScanMode>('handwriting');
  const [visionFilePreview, setVisionFilePreview] = useState<{ base64: string; mimeType: string; dataUrl: string; name: string } | null>(null);
  const [visionExtraPrompt, setVisionExtraPrompt] = useState('');
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [appendToCurrentNote, setAppendToCurrentNote] = useState(false);

  const handleVisionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVisionError(null);
    try {
      const parsed = await readImageFileAsBase64(file);
      setVisionFilePreview({ ...parsed, name: file.name });
    } catch (err: any) {
      setVisionError(err?.message || 'Unable to read image.');
    }
  };

  const handleRunVisionScan = async () => {
    if (!visionFilePreview) return;
    setVisionLoading(true);
    setVisionError(null);
    try {
      const result = await analyzeStudyImageWithVision({
        base64: visionFilePreview.base64,
        mimeType: visionFilePreview.mimeType,
        mode: visionMode,
        courseName: selectedCourse ? `${selectedCourse.code} ${selectedCourse.name}` : undefined,
        extraNotes: visionExtraPrompt
      });
      const scannedBlocks = parseHtmlOrMarkdownToBlocks(result.markdown);
      if (appendToCurrentNote && selectedNote) {
        const existing =
          selectedNote.blocks && selectedNote.blocks.length > 0
            ? selectedNote.blocks
            : parseHtmlOrMarkdownToBlocks(selectedNote.content);
        const merged = [
          ...existing,
          createBlock('divider', ''),
          createBlock('callout', `<strong>Scanned via Vision AI (${visionMode}):</strong> ${result.title}`, {
            calloutTone: 'info',
            calloutIcon: '📷'
          }),
          ...scannedBlocks
        ];
        updateNote(selectedNote.id, { blocks: merged, content: blocksToHtml(merged) });
        showToast('Imported scanned image blocks into your active note!', 'success');
      } else {
        handleCreateBlankNote({
          title: result.title,
          courseId: selectedNote?.courseId || (selectedCourseFilter !== 'all' ? selectedCourseFilter : courses[0]?.id || ''),
          icon: visionMode === 'handwriting' ? '✍️' : visionMode === 'diagram' ? '📐' : '🧮',
          tags: ['vision-scan', visionMode],
          blocks: scannedBlocks,
          content: blocksToHtml(scannedBlocks)
        });
        showToast('Created Notion page from your photo/handwriting!', 'success');
      }
      setIsVisionOpen(false);
      setVisionFilePreview(null);
      setVisionExtraPrompt('');
    } catch (err: any) {
      setVisionError(err?.message || 'Vision analysis failed.');
    } finally {
      setVisionLoading(false);
    }
  };

  const handleShareSelectedNote = async () => {
    if (!selectedNote) return;
    const res = await createSharedStudyLink({
      itemType: 'note',
      title: selectedNote.title || 'Shared Note',
      authorName: user?.name || 'Classmate',
      courseLabel: selectedCourse ? `${selectedCourse.code} ${selectedCourse.name}` : undefined,
      note: {
        title: selectedNote.title,
        content: selectedNote.content,
        blocks: selectedNote.blocks,
        icon: selectedNote.icon,
        coverImage: selectedNote.coverImage,
        tags: selectedNote.tags
      }
    });
    try {
      await navigator.clipboard.writeText(res.shareUrl);
      showToast(
        res.storedInCloud
          ? `Share link copied! (${res.shareId}) — friends can view & clone cleanly.`
          : 'Portable share link copied to clipboard!',
        'success'
      );
    } catch {
      showToast(`Share Room Ready: ${res.shareUrl}`, 'info');
    }
  };

  // Consume external navigation target (e.g. from Voice Assistant or Dashboard)
  useEffect(() => {
    if (!notesNavTarget) return;
    if (notesNavTarget.noteId) {
      const target = notes.find(n => n.id === notesNavTarget.noteId);
      if (target) {
        if (target.inTrash) setNavFilter('trash');
        else if (target.isArchived) setNavFilter('archived');
        else setNavFilter('all');
        setSelectedNoteId(target.id);
      }
    }
    if (notesNavTarget.searchQuery !== undefined) {
      setSearchQuery(notesNavTarget.searchQuery);
      setNavFilter('all');
    }
    if (notesNavTarget.courseId !== undefined) {
      setSelectedCourseFilter(notesNavTarget.courseId || 'all');
    }
    setNotesNavTarget(null);
  }, [notesNavTarget, notes, setNotesNavTarget]);

  // Helper: collect folder + descendant folder IDs
  const getFolderDescendantIds = useCallback(
    (folderId: string): Set<string> => {
      const ids = new Set<string>([folderId]);
      let changed = true;
      while (changed) {
        changed = false;
        noteFolders.forEach(f => {
          if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
            ids.add(f.id);
            changed = true;
          }
        });
      }
      return ids;
    },
    [noteFolders]
  );

  // Compute searchable plain text for a note
  const getNoteSearchText = useCallback((note: Note): string => {
    const blocksText = (note.blocks || [])
      .map(b => `${stripHtmlTags(b.content)} ${stripHtmlTags(b.props?.toggleBody || '')}`)
      .join(' ');
    return `${note.title} ${note.tags.join(' ')} ${blocksText} ${stripHtmlTags(note.content)}`.toLowerCase();
  }, []);

  // All distinct tags across non-trashed notes
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    notes
      .filter(n => !n.inTrash)
      .forEach(n => {
        (n.tags || []).forEach(t => {
          counts.set(t, (counts.get(t) || 0) + 1);
        });
      });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  // Counts
  const counts = useMemo(() => {
    const active = notes.filter(n => !n.inTrash && !n.isArchived);
    const fav = active.filter(n => n.isFavorite || n.pinned);
    const archived = notes.filter(n => !n.inTrash && n.isArchived);
    const trash = notes.filter(n => n.inTrash);
    return {
      all: active.length,
      favorites: fav.length,
      recent: active.length,
      archived: archived.length,
      trash: trash.length
    };
  }, [notes]);

  // Filtered & sorted notes list
  const filteredNotes = useMemo(() => {
    let list = notes.slice();

    if (navFilter === 'trash') {
      list = list.filter(n => n.inTrash);
    } else if (navFilter === 'archived') {
      list = list.filter(n => !n.inTrash && n.isArchived);
    } else if (navFilter === 'favorites') {
      list = list.filter(n => !n.inTrash && !n.isArchived && (n.isFavorite || n.pinned));
    } else if (typeof navFilter === 'object' && navFilter.folderId) {
      const folderSet = getFolderDescendantIds(navFilter.folderId);
      list = list.filter(n => !n.inTrash && !n.isArchived && n.folderId && folderSet.has(n.folderId));
    } else {
      // 'all' or 'recent'
      list = list.filter(n => !n.inTrash && !n.isArchived);
    }

    if (selectedCourseFilter !== 'all') {
      list = list.filter(n => n.courseId === selectedCourseFilter);
    }

    if (selectedTagFilter) {
      list = list.filter(n => (n.tags || []).includes(selectedTagFilter));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(n => getNoteSearchText(n).includes(q));
    }

    list.sort((a, b) => {
      // Pin / Favorite priority inside normal views
      if (navFilter === 'all') {
        const aFav = a.isFavorite || a.pinned ? 1 : 0;
        const bFav = b.isFavorite || b.pinned ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
      }
      if (sortMode === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortMode === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [notes, navFilter, selectedCourseFilter, selectedTagFilter, searchQuery, sortMode, getFolderDescendantIds, getNoteSearchText]);

  const selectedNote = useMemo(
    () => notes.find(n => n.id === selectedNoteId) || filteredNotes[0] || null,
    [notes, selectedNoteId, filteredNotes]
  );

  // Keep selectedNoteId aligned if current selection vanished
  useEffect(() => {
    if (selectedNoteId && !notes.some(n => n.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0]?.id || null);
    }
  }, [notes, selectedNoteId, filteredNotes]);

  const selectedCourse = useMemo(
    () => (selectedNote?.courseId ? courses.find(c => c.id === selectedNote.courseId) : undefined),
    [selectedNote, courses]
  );

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setAiToast({ message, type, actionLabel, onAction });
    setTimeout(() => {
      setAiToast(prev => (prev?.message === message ? null : prev));
    }, 6500);
  };

  const handleCreateBlankNote = (overrides?: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'inTrash'>>) => {
    const activeFolderId = typeof navFilter === 'object' ? navFilter.folderId : undefined;
    const starterBlocks = overrides?.blocks || [createBlock('paragraph', '')];
    const created = addNote({
      title: overrides?.title || 'Untitled Note',
      courseId: overrides?.courseId || (selectedCourseFilter !== 'all' ? selectedCourseFilter : courses[0]?.id || ''),
      folderId: overrides?.folderId !== undefined ? overrides.folderId : activeFolderId,
      tags: overrides?.tags || [],
      content: overrides?.content || blocksToHtml(starterBlocks),
      blocks: starterBlocks,
      icon: overrides?.icon || '📝',
      coverImage: overrides?.coverImage,
      pinned: false,
      highlightedTerms: [],
      isFavorite: false,
      isArchived: false
    });
    if (navFilter === 'trash' || navFilter === 'archived') {
      setNavFilter('all');
    }
    setSelectedNoteId(created.id);
    setShowSidebarMobile(false);
  };

  const handleApplyTemplate = (tpl: NoteTemplate) => {
    const clonedBlocks = tpl.blocks.map(b => createBlock(b.type, b.content, b.props ? { ...b.props } : undefined, b.indent || 0));
    handleCreateBlankNote({
      title: tpl.id === 'blank' ? 'Untitled Note' : tpl.name,
      icon: tpl.icon,
      coverImage: tpl.coverImage,
      tags: [...tpl.tags],
      blocks: clonedBlocks,
      content: blocksToHtml(clonedBlocks)
    });
    setIsTemplateModalOpen(false);
  };

  const handleSaveNote = useCallback(
    (noteId: string, updates: Partial<Note>) => {
      updateNote(noteId, updates);
    },
    [updateNote]
  );

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const created = addNoteFolder({
      name: newFolderName.trim(),
      parentId: newFolderParentId || undefined,
      icon: newFolderIcon || '📁'
    });
    if (newFolderParentId) {
      setExpandedFolders(prev => ({ ...prev, [newFolderParentId]: true }));
    }
    setNavFilter({ folderId: created.id });
    setNewFolderName('');
    setNewFolderParentId('');
    setIsNewFolderOpen(false);
  };

  const getPlainTextFromNote = (note: Note): string => {
    if (note.blocks && note.blocks.length > 0) {
      return blocksToMarkdown(note.blocks, note.title);
    }
    return `${note.title}\n\n${stripHtmlTags(note.content)}`;
  };

  // ==================== AI NOTES STUDIO ACTIONS ====================
  const handleAiGenerateNewNote = async () => {
    const sourceFile = files.find(f => f.id === aiSourceFileId);
    const topic = aiTopicPrompt.trim();
    if (!topic && !sourceFile) {
      showToast('Enter a topic or pick an uploaded study file first.', 'info');
      return;
    }

    setAiBusyLabel('Generating structured Notion notes...');
    try {
      const targetCourse = courses.find(c => c.id === (aiTargetCourseId || selectedCourseFilter));
      const materialText = sourceFile
        ? (sourceFile.rawText || sourceFile.chunks.map(c => c.content).join('\n')).slice(0, 12000)
        : '';

      const prompt = sourceFile
        ? `Create comprehensive, university-level structured study notes in Markdown from the uploaded material "${sourceFile.name}"${topic ? ` focusing on: ${topic}` : ''}.\nCourse context: ${targetCourse ? `${targetCourse.code} ${targetCourse.name}` : 'General University Course'}.\nInclude:\n- Clear H1/H2/H3 headings\n- Concise definitions and key concepts\n- Callouts using > [!TIP] or > [!WARNING] for exam pitfalls\n- Concrete examples or code blocks / LaTeX equations ($...$ or $$...$$) where appropriate\n- A Markdown comparison table if comparing concepts\n- An actionable revision checklist using - [ ]\n\nMaterial:\n${materialText}`
        : `Create comprehensive, university-level structured study notes in Markdown on the topic: "${topic}".\nCourse context: ${targetCourse ? `${targetCourse.code} ${targetCourse.name}` : 'General University Course'}.\nInclude:\n- Clear H2/H3 headings\n- Intuitive explanations and formal definitions\n- Callouts using > [!TIP] or > [!WARNING] for common mistakes\n- Concrete examples, LaTeX formulas, or code snippets where relevant\n- A Markdown summary table\n- A short self-test revision checklist using - [ ]`;

      const aiMd = await queryGemini(
        prompt,
        'You are an expert academic professor who produces clean, scannable Notion-ready Markdown notes.'
      );

      let finalMd = aiMd;
      if (!finalMd) {
        // Offline / No Gemini Key deterministic academic scaffold built from real material
        const titleLabel = topic || sourceFile?.name.replace(/\.[^/.]+$/, '') || 'Study Notes';
        const snippet = materialText
          ? materialText
            .split(/\n+/)
            .map(s => s.trim())
            .filter(s => s.length > 25)
            .slice(0, 6)
            .map(s => `- ${s}`)
            .join('\n')
          : '- Core principle 1: Define key terminology and boundaries.\n- Core principle 2: Trace step-by-step mechanisms and examples.\n- Core principle 3: Identify edge cases and exam applications.';

        finalMd = `## Overview\nStructured study notes for **${titleLabel}**${targetCourse ? ` (${targetCourse.code} — ${targetCourse.name})` : ''}.\n\n> [!TIP] Key Objective: Focus on understanding the core invariant and applying it to unseen exam scenarios.\n\n## Key Concepts & Extracted Points\n${snippet}\n\n## Summary Matrix\n| Concept | Definition | Application |\n| --- | --- | --- |\n| Fundamentals | Core rules and notation | Foundation questions |\n| Edge Cases | Boundary conditions & limits | High-weight exam problems |\n\n## Revision Checklist\n- [ ] Review main definitions without looking at notes\n- [ ] Work through 2 practice examples\n- [ ] Test recall using flashcards or a quick quiz`;
      }

      const generatedBlocks = parseHtmlOrMarkdownToBlocks(finalMd);
      const generatedTitle = topic || (sourceFile ? `${sourceFile.name.replace(/\.[^/.]+$/, '')} — Study Notes` : 'AI Study Notes');
      handleCreateBlankNote({
        title: generatedTitle,
        courseId: targetCourse?.id || '',
        icon: '🧠',
        tags: ['ai-generated', ...(targetCourse?.code ? [targetCourse.code.toLowerCase()] : [])],
        blocks: generatedBlocks,
        content: blocksToHtml(generatedBlocks)
      });

      setIsAiStudioOpen(false);
      setAiTopicPrompt('');
      showToast('Created structured AI study note!', 'success');
    } finally {
      setAiBusyLabel(null);
    }
  };

  const handleAiTransformActiveNote = async (
    mode: 'summarize' | 'rewrite' | 'simplify' | 'key_concepts' | 'revision_sheet' | 'auto_format'
  ) => {
    if (!selectedNote) return;
    const rawText = getPlainTextFromNote(selectedNote);
    if (stripHtmlTags(rawText).trim().length < 8) {
      showToast('Write a bit more content in the note first so AI has material to work with.', 'info');
      return;
    }

    setAiBusyLabel(`Running AI ${mode.replace('_', ' ')}...`);
    try {
      const existingBlocks: NoteBlock[] =
        selectedNote.blocks && selectedNote.blocks.length > 0
          ? selectedNote.blocks
          : parseHtmlOrMarkdownToBlocks(selectedNote.content);

      if (mode === 'auto_format') {
        const reformatted = await queryGemini(
          `Reformat and organize the following raw student note into clean, scannable Markdown with H2/H3 headings, bullet lists, > [!TIP] callouts, and - [ ] checklists without losing any facts:\n\n${rawText.slice(0, 10000)}`,
          'Preserve all factual information while elevating structure and readability.'
        );
        const nextBlocks = reformatted
          ? parseHtmlOrMarkdownToBlocks(reformatted)
          : parseHtmlOrMarkdownToBlocks(rawText);
        updateNote(selectedNote.id, {
          blocks: nextBlocks,
          content: blocksToHtml(nextBlocks)
        });
        showToast('Note formatting upgraded cleanly!', 'success');
        return;
      }

      if (mode === 'summarize') {
        const aiSummary = await queryGemini(
          `Write a concise 3-bullet executive summary and a 1-sentence core takeaway in Markdown for these lecture notes:\n\n${rawText.slice(0, 10000)}`,
          'Be concise, crisp, and high-yield.'
        );
        const cleanSummary =
          aiSummary ||
          `Core summary of "${selectedNote.title}": ${stripHtmlTags(rawText).slice(0, 260)}...`;
        const summaryBlocks = parseHtmlOrMarkdownToBlocks(cleanSummary);
        const headerCallout = createBlock(
          'callout',
          `<strong>AI Executive Summary:</strong> ${stripHtmlTags(summaryBlocks[0]?.content || cleanSummary)}`,
          { calloutTone: 'info', calloutIcon: '✨' }
        );
        const restBlocks = summaryBlocks.slice(1, 5);
        const nextBlocks = [headerCallout, ...restBlocks, createBlock('divider', ''), ...existingBlocks];
        updateNote(selectedNote.id, { blocks: nextBlocks, content: blocksToHtml(nextBlocks) });
        showToast('Inserted AI Executive Summary at the top of your note.', 'success');
        return;
      }

      if (mode === 'rewrite' || mode === 'simplify') {
        const instruction =
          mode === 'rewrite'
            ? 'Rewrite and polish these university notes for academic clarity, flow, and precision while preserving all equations, code, and concepts.'
            : 'Simplify and explain these notes clearly as if tutoring a first-year student: keep key terms accurate, add intuitive analogies, and break long ideas into digestible bullets.';
        const output = await queryGemini(
          `${instruction}\nOutput clean Markdown.\n\n${rawText.slice(0, 10000)}`,
          'You are an academic tutor writing clear Markdown notes.'
        );
        if (!output) {
          showToast('Add a Gemini API key in Settings / .env to run full AI rewriting.', 'info');
          return;
        }
        const nextBlocks = parseHtmlOrMarkdownToBlocks(output);
        updateNote(selectedNote.id, { blocks: nextBlocks, content: blocksToHtml(nextBlocks) });
        showToast(mode === 'rewrite' ? 'Note polished!' : 'Note simplified cleanly!', 'success');
        return;
      }

      if (mode === 'key_concepts' || mode === 'revision_sheet') {
        const prompt =
          mode === 'key_concepts'
            ? `Extract the 5-8 most important key concepts and definitions from these notes as a Markdown H2 "Key Concepts" section with bold terms and concise explanations:\n\n${rawText.slice(0, 10000)}`
            : `Turn these notes into a compact Exam Revision Sheet in Markdown: include High-Yield Definitions, Common Exam Traps (> [!WARNING]), and a Self-Test Recall Checklist (- [ ]):\n\n${rawText.slice(0, 10000)}`;

        const aiSection = await queryGemini(prompt, 'You are an expert university exam coach.');
        const fallbackMd =
          mode === 'key_concepts'
            ? `## Key Concepts (${selectedNote.title})\n` +
            rawText
              .split(/[.!?]\s+/)
              .filter(s => s.trim().length > 20)
              .slice(0, 5)
              .map(s => `- ${s.trim()}`)
              .join('\n')
            : `## Exam Revision Sheet\n> [!WARNING] Double-check edge cases, units, and formal definitions.\n- [ ] Summarize "${selectedNote.title}" from memory\n- [ ] Practice applying each concept to a sample exam question`;

        const appended = parseHtmlOrMarkdownToBlocks(aiSection || fallbackMd);
        const nextBlocks = [...existingBlocks, createBlock('divider', ''), ...appended];
        updateNote(selectedNote.id, { blocks: nextBlocks, content: blocksToHtml(nextBlocks) });
        showToast(
          mode === 'key_concepts' ? 'Appended Key Concepts section.' : 'Appended Exam Revision Sheet.',
          'success'
        );
      }
    } finally {
      setAiBusyLabel(null);
    }
  };

  const handleGenerateFlashcardsFromNote = async () => {
    if (!selectedNote) return;
    const rawText = getPlainTextFromNote(selectedNote);
    if (stripHtmlTags(rawText).trim().length < 15) {
      showToast('Add more content to this note before generating flashcards.', 'info');
      return;
    }

    setAiBusyLabel('Creating spaced-repetition flashcards...');
    try {
      const targetCourseId = selectedNote.courseId || courses[0]?.id;
      let targetDeck = flashcardDecks.find(d => d.courseId === targetCourseId) || flashcardDecks[0];
      if (!targetDeck) {
        addFlashcardDeck(`${selectedNote.title} Deck`, targetCourseId, 'notes');
      }
      const deckId = targetDeck?.id || 'deck_cs302';

      const aiJson = await queryGemini(
        `Extract 6 high-yield study flashcards from these notes. Return ONLY valid JSON array of {"question": string, "answer": string} without markdown fences:\n\n${rawText.slice(0, 9000)}`,
        'Return only a raw JSON array of flashcards.'
      );

      let cards: Array<{ question: string; answer: string }> = [];
      if (aiJson) {
        try {
          const cleaned = aiJson.replace(/```json|```/gi, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            cards = parsed
              .filter(c => c?.question && c?.answer)
              .slice(0, 8)
              .map(c => ({ question: String(c.question), answer: String(c.answer) }));
          }
        } catch {
          // Fall back to structured block extraction
        }
      }

      if (cards.length === 0) {
        const lines = rawText
          .split('\n')
          .map(l => l.replace(/^#+\s*|[-*]\s*|\[\s*[x ]?\s*\]\s*/gi, '').trim())
          .filter(l => l.length > 18);
        cards = lines.slice(0, 5).map((line, i) => ({
          question: `Key Concept ${i + 1} from "${selectedNote.title}": Explain "${line.slice(0, 58)}${line.length > 58 ? '...' : ''}"`,
          answer: line
        }));
      }

      if (cards.length === 0) {
        showToast('Could not extract enough concepts for flashcards yet.', 'info');
        return;
      }

      cards.forEach((c, idx) => {
        addFlashcard({
          deckId,
          courseId: targetCourseId,
          question: c.question,
          answer: c.answer,
          citation: { file: selectedNote.title, pageOrSlide: `Note Section ${idx + 1}` }
        });
      });

      showToast(`Added ${cards.length} flashcards to Study Hub!`, 'success', 'Open Study Hub', () =>
        setActiveView('studyhub')
      );
    } finally {
      setAiBusyLabel(null);
    }
  };

  const handleGenerateQuizFromNote = async () => {
    if (!selectedNote) return;
    const rawText = getPlainTextFromNote(selectedNote);
    if (stripHtmlTags(rawText).trim().length < 20) {
      showToast('Add more content to this note before generating a quiz.', 'info');
      return;
    }

    setAiBusyLabel('Building practice quiz from note...');
    try {
      const virtualFile = {
        id: `virt_${selectedNote.id}`,
        name: `${selectedNote.title}.md`,
        courseId: selectedNote.courseId || undefined,
        sizeBytes: rawText.length,
        fileType: 'md' as const,
        status: 'indexed' as const,
        pageCount: 1,
        uploadedAt: new Date().toISOString(),
        isFavorite: false,
        rawText,
        chunks: [{ id: 'c1', content: rawText, page: 1, hasVisuals: false }]
      };
      const generated = await generateQuizFromFiles([virtualFile], {
        difficulty: 'medium',
        questionCount: 5,
        courseId: selectedNote.courseId || undefined,
        title: `${selectedNote.title} — Practice Quiz`
      });
      addQuiz({
        title: generated.title,
        courseId: selectedNote.courseId || undefined,
        difficulty: generated.difficulty,
        questions: generated.questions
      });
      showToast(`Created a ${generated.questions.length}-question practice quiz!`, 'success', 'Open Quizzes', () =>
        setActiveView('quizzes')
      );
    } finally {
      setAiBusyLabel(null);
    }
  };

  // ==================== FOLDER TREE RENDERER ====================
  const renderFolderTree = (parentId?: string, depth: number = 0) => {
    const children = noteFolders.filter(f => (f.parentId || undefined) === parentId);
    if (children.length === 0) return null;

    return children.map(folder => {
      const hasKids = noteFolders.some(f => f.parentId === folder.id);
      const isExpanded = expandedFolders[folder.id] ?? true;
      const isSelected = typeof navFilter === 'object' && navFilter.folderId === folder.id;
      const folderSet = getFolderDescendantIds(folder.id);
      const folderNoteCount = notes.filter(
        n => !n.inTrash && !n.isArchived && n.folderId && folderSet.has(n.folderId)
      ).length;

      return (
        <div key={folder.id}>
          <div
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${isSelected
              ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/50 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            onClick={() => setNavFilter({ folderId: folder.id })}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {hasKids ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setExpandedFolders(prev => ({ ...prev, [folder.id]: !isExpanded }));
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              ) : (
                <span className="w-4 inline-block" />
              )}
              <span>{folder.icon || '📁'}</span>
              <span className="truncate">{folder.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">{folderNoteCount}</span>
              <button
                type="button"
                title="Add Subfolder"
                onClick={e => {
                  e.stopPropagation();
                  setNewFolderParentId(folder.id);
                  setIsNewFolderOpen(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="Delete Folder"
                onClick={e => {
                  e.stopPropagation();
                  deleteNoteFolder(folder.id);
                  if (isSelected) setNavFilter('all');
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          {hasKids && isExpanded && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  // ==================== EXPORT PREVIEW HTML ====================
  const exportPreviewHtml = useMemo(() => {
    if (!isExportModalOpen || !selectedNote) return '';
    return buildFormattedNoteDocumentHtml(selectedNote, selectedCourse, pdfOptions);
  }, [isExportModalOpen, selectedNote, selectedCourse, pdfOptions]);

  const handleAddTagToSelected = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote || !newTagInput.trim()) return;
    const tag = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (!selectedNote.tags.includes(tag)) {
      updateNote(selectedNote.id, { tags: [...selectedNote.tags, tag] });
    }
    setNewTagInput('');
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Toast Notification */}
      {aiToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium transition-all ${aiToast.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
            : 'bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700'
            }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{aiToast.message}</span>
          {aiToast.actionLabel && aiToast.onAction && (
            <button
              type="button"
              onClick={() => {
                aiToast.onAction?.();
                setAiToast(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
            >
              {aiToast.actionLabel}
            </button>
          )}
          <button type="button" onClick={() => setAiToast(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 3-Pane Notion Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* PANE 1: Library / Folders / Views */}
        <aside
          className={`${showSidebarMobile ? 'flex fixed inset-y-0 left-0 z-40' : 'hidden lg:flex'
            } w-60 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto`}
        >
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Notion Notes</h2>
                <p className="text-[10px] text-slate-400">Blocks • Folders • PDF</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSidebarMobile(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2.5 space-y-1.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleCreateBlankNote()}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" /> New Note
              </button>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                title="Create from Template"
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsAiStudioOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Generate Notes
            </button>
          </div>

          {/* Core Views */}
          <div className="px-2.5 py-1 space-y-0.5">
            {(
              [
                { id: 'all', label: 'All Notes', icon: Layers, count: counts.all },
                { id: 'favorites', label: 'Favorites', icon: Star, count: counts.favorites },
                { id: 'recent', label: 'Recent', icon: Clock, count: counts.recent },
                { id: 'archived', label: 'Archived', icon: Archive, count: counts.archived },
                { id: 'trash', label: 'Trash', icon: Trash2, count: counts.trash }
              ] as const
            ).map(item => {
              const Icon = item.icon;
              const active = navFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setNavFilter(item.id);
                    setSelectedTagFilter(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/50 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.count}</span>
                </button>
              );
            })}
          </div>

          {/* Folders Tree */}
          <div className="px-2.5 pt-3 pb-2 border-t border-slate-100 dark:border-slate-800 mt-2">
            <div className="flex items-center justify-between px-1.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Folders</span>
              <button
                type="button"
                onClick={() => {
                  setNewFolderParentId('');
                  setIsNewFolderOpen(true);
                }}
                title="New Folder"
                className="p-1 text-slate-400 hover:text-indigo-600 rounded"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
            {noteFolders.length === 0 ? (
              <p className="text-[11px] text-slate-400 px-2 py-1">No folders yet.</p>
            ) : (
              <div className="space-y-0.5">{renderFolderTree(undefined, 0)}</div>
            )}
          </div>

          {/* Course Filters */}
          <div className="px-2.5 pt-3 pb-2 border-t border-slate-100 dark:border-slate-800">
            <span className="block px-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Courses
            </span>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setSelectedCourseFilter('all')}
                className={`w-full text-left px-2.5 py-1 rounded-lg text-xs transition ${selectedCourseFilter === 'all'
                  ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
              >
                All Courses
              </button>
              {courses
                .filter(c => !c.isArchived)
                .map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourseFilter(c.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs transition ${selectedCourseFilter === c.id
                      ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.code || c.name}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="px-3 pt-3 pb-4 border-t border-slate-100 dark:border-slate-800">
              <span className="block mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {allTags.slice(0, 14).map(([tag, count]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTagFilter(prev => (prev === tag ? null : tag))}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition ${selectedTagFilter === tag
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    #{tag} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* PANE 2: Note Cards List */}
        <section className="w-72 xl:w-80 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSidebarMobile(true)}
                className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                <Folder className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search notes, blocks, tags..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSortMode(prev => (prev === 'updated' ? 'created' : prev === 'created' ? 'title' : 'updated'))
                }
                className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
              >
                <ArrowUpDown className="w-3 h-3" />
                Sort: {sortMode === 'updated' ? 'Updated' : sortMode === 'created' ? 'Created' : 'Title'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No notes match this view</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Create a fresh note or pick a Notion template to start writing.
                </p>
                {navFilter !== 'trash' && (
                  <button
                    type="button"
                    onClick={() => handleCreateBlankNote()}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    + Create Note
                  </button>
                )}
              </div>
            ) : (
              filteredNotes.map(note => {
                const isSelected = selectedNote?.id === note.id;
                const course = courses.find(c => c.id === note.courseId);
                const snippet =
                  note.blocks && note.blocks.length > 0
                    ? stripHtmlTags(note.blocks.map(b => b.content).join(' ')).trim()
                    : stripHtmlTags(note.content).trim();

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`p-3 rounded-xl cursor-pointer border transition ${isSelected
                      ? 'bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{note.icon || '📝'}</span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {note.title || 'Untitled Note'}
                        </h3>
                      </div>
                      {(note.isFavorite || note.pinned) && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {snippet || 'Empty page — click to start writing...'}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/70">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {course && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white truncate"
                            style={{ backgroundColor: course.color }}
                          >
                            {course.code}
                          </span>
                        )}
                        {note.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-[9px] text-slate-400 truncate">
                            #{t}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* PANE 3: Notion Block Editor & Toolbar */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 overflow-hidden">
          {selectedNote ? (
            <>
              {/* Note Action Bar */}
              <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* Metadata Pickers */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedNote.courseId || ''}
                    onChange={e => updateNote(selectedNote.id, { courseId: e.target.value })}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
                    title="Link to Course"
                  >
                    <option value="">No Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedNote.folderId || ''}
                    onChange={e => updateNote(selectedNote.id, { folderId: e.target.value || undefined })}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
                    title="Move to Folder"
                  >
                    <option value="">No Folder</option>
                    {noteFolders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.icon || '📁'} {f.name}
                      </option>
                    ))}
                  </select>

                  {/* Inline Tags */}
                  <div className="hidden xl:flex items-center gap-1 flex-wrap">
                    {selectedNote.tags.map(t => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() =>
                            updateNote(selectedNote.id, {
                              tags: selectedNote.tags.filter(item => item !== t)
                            })
                          }
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    <form onSubmit={handleAddTagToSelected} className="inline-flex items-center">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={e => setNewTagInput(e.target.value)}
                        placeholder="+ tag"
                        className="w-16 focus:w-24 transition-all px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none"
                      />
                    </form>
                  </div>
                </div>

                {/* Status, AI Study Tools & Export Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${saveStatus === 'saving'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                  </span>

                  {/* AI Actions Dropdown Group */}
                  <div className="relative group">
                    <button
                      type="button"
                      disabled={!!aiBusyLabel}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-semibold transition"
                    >
                      {aiBusyLabel ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      {aiBusyLabel ? 'Working...' : 'AI Tools'}
                    </button>
                    <div className="hidden group-hover:block absolute right-0 top-full pt-1 z-30 w-60">
                      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => handleAiTransformActiveNote('summarize')}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Summarize at Top
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiTransformActiveNote('key_concepts')}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Extract Key Concepts
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiTransformActiveNote('revision_sheet')}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <ListChecks className="w-3.5 h-3.5 text-amber-500" /> Build Revision Sheet
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiTransformActiveNote('rewrite')}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-violet-500" /> Rewrite & Polish
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiTransformActiveNote('simplify')}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Brain className="w-3.5 h-3.5 text-sky-500" /> Simplify Explanation
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiTransformActiveNote('auto_format')}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Tag className="w-3.5 h-3.5 text-slate-500" /> Auto-Format Blocks
                        </button>
                        <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                        <button
                          type="button"
                          onClick={handleGenerateFlashcardsFromNote}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        >
                          <Layers className="w-3.5 h-3.5" /> Generate Flashcards
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateQuizFromNote}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        >
                          <HelpCircle className="w-3.5 h-3.5" /> Generate Practice Quiz
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scan Handwriting / Whiteboard Photo */}
                  <button
                    type="button"
                    onClick={() => {
                      setVisionError(null);
                      setIsVisionOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-xs font-semibold transition"
                    title="Scan handwriting, whiteboard, or problem photo into Notion blocks"
                  >
                    <Camera className="w-3.5 h-3.5" /> Scan Photo
                  </button>

                  {/* Live Lecture Audio Recorder */}
                  <button
                    type="button"
                    onClick={() => setIsLectureRecorderOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition"
                    title="Record live lecture audio into Notion notes and extract deadlines"
                  >
                    <Mic className="w-3.5 h-3.5" /> Record Lecture
                  </button>

                  {/* Export PDF / Preview */}
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Export / PDF
                  </button>

                  {/* Share Collaborative Note */}
                  <button
                    type="button"
                    onClick={handleShareSelectedNote}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                    title="Copy collaborative Study Room link for classmates"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Share
                  </button>

                  {/* Favorite */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextFav = !(selectedNote.isFavorite || selectedNote.pinned);
                      updateNote(selectedNote.id, { isFavorite: nextFav, pinned: nextFav });
                    }}
                    title="Favorite Note"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${selectedNote.isFavorite || selectedNote.pinned
                        ? 'text-amber-500 fill-amber-400'
                        : 'text-slate-400'
                        }`}
                    />
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => {
                      const copy = duplicateNote(selectedNote.id);
                      if (copy) {
                        setSelectedNoteId(copy.id);
                        showToast('Note duplicated.', 'info');
                      }
                    }}
                    title="Duplicate Note"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Archive */}
                  {!selectedNote.inTrash && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextArc = !selectedNote.isArchived;
                        updateNote(selectedNote.id, { isArchived: nextArc });
                        showToast(nextArc ? 'Note moved to Archive.' : 'Note restored from Archive.', 'info');
                      }}
                      title={selectedNote.isArchived ? 'Unarchive' : 'Archive Note'}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Trash / Restore / Delete Forever */}
                  {selectedNote.inTrash ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          restoreNote(selectedNote.id);
                          setNavFilter('all');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteNotePermanently(selectedNote.id);
                          setSelectedNoteId(null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        moveNoteToTrash(selectedNote.id);
                        setSelectedNoteId(null);
                      }}
                      title="Move to Trash"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-500 dark:text-slate-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Block Editor keyed strictly by selectedNote.id to guarantee zero state leakage */}
              <div className="flex-1 overflow-y-auto">
                <NotionBlockEditor
                  key={selectedNote.id}
                  note={selectedNote}
                  courses={courses}
                  onSaveNote={handleSaveNote}
                  onSaveStatusChange={setSaveStatus}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select or create a Notion note</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
                Write with `/` slash commands, drag-and-drop blocks, tables, KaTeX math, Prism code blocks, and export print-ready PDFs.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => handleCreateBlankNote()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm"
                >
                  + Blank Note
                </button>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold"
                >
                  Browse Templates
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== NEW FOLDER MODAL ==================== */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFolder}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {newFolderParentId ? 'Create Subfolder' : 'Create Note Folder'}
              </h3>
              <button type="button" onClick={() => setIsNewFolderOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderIcon}
                onChange={e => setNewFolderIcon(e.target.value)}
                className="w-12 text-center px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base"
                maxLength={2}
              />
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name (e.g. Week 4 Lectures)"
                autoFocus
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Parent Folder (optional)</label>
              <select
                value={newFolderParentId}
                onChange={e => setNewFolderParentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Top-level Folder</option>
                {noteFolders.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.icon || '📁'} {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TEMPLATES MODAL ==================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notion Note Templates</h3>
                <p className="text-xs text-slate-500">Pick a structured template tailored for university coursework</p>
              </div>
              <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getNoteTemplates().map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/60 transition space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{tpl.icon}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{tpl.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tpl.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== AI NOTE GENERATOR MODAL ==================== */}
      {isAiStudioOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Study Notes Studio</h3>
              </div>
              <button type="button" onClick={() => setIsAiStudioOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic or Prompt
                </label>
                <input
                  type="text"
                  value={aiTopicPrompt}
                  onChange={e => setAiTopicPrompt(e.target.value)}
                  placeholder="e.g. Dynamic Programming & Memoization, Database B+ Trees..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Or Generate From Uploaded File (Optional)
                </label>
                <select
                  value={aiSourceFileId}
                  onChange={e => setAiSourceFileId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">None (topic-based generation)</option>
                  {files.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.fileType.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Course
                </label>
                <select
                  value={aiTargetCourseId}
                  onChange={e => setAiTargetCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">Auto / Unassigned</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAiStudioOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!aiBusyLabel}
                onClick={handleAiGenerateNewNote}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {aiBusyLabel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Notion Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PRINT-PERFECT PDF & EXPORT MODAL ==================== */}
      {isExportModalOpen && selectedNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Export & Print Preview</h3>
                <p className="text-xs text-slate-500">
                  Preserves headings, highlights, tables, code syntax, KaTeX math, callouts, and Arabic RTL formatting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              {/* Export Options & Format Buttons */}
              <div className="w-full lg:w-72 shrink-0 p-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 space-y-4 overflow-y-auto bg-slate-50/70 dark:bg-slate-900">
                <div className="space-y-2.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    PDF Layout Options
                  </span>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Paper Size</label>
                    <select
                      value={pdfOptions.paperSize}
                      onChange={e =>
                        setPdfOptions(prev => ({ ...prev, paperSize: e.target.value as 'A4' | 'Letter' }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="Letter">US Letter (8.5 × 11 in)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includeCoverAndMeta}
                      onChange={e => setPdfOptions(prev => ({ ...prev, includeCoverAndMeta: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    Include Cover & Course Banner
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includeHeaderFooter}
                      onChange={e => setPdfOptions(prev => ({ ...prev, includeHeaderFooter: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    Include Running Header & Footer
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includePageNumbers}
                      onChange={e => setPdfOptions(prev => ({ ...prev, includePageNumbers: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    Include Page Numbers
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Export Formats
                  </span>
                  <button
                    type="button"
                    onClick={() => exportNoteToPdf(selectedNote, selectedCourse, pdfOptions)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Save / Print as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => exportNoteToHtml(selectedNote, selectedCourse)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <FileCode2 className="w-4 h-4 text-emerald-600" /> Export Standalone HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => exportNoteToMarkdown(selectedNote)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <FileDown className="w-4 h-4 text-sky-600" /> Export Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyNoteFormatted(selectedNote);
                      if (ok) {
                        setCopiedHtmlFeedback(true);
                        setTimeout(() => setCopiedHtmlFeedback(false), 2000);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {copiedHtmlFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" /> Copied Rich Formatting!
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="w-4 h-4 text-violet-500" /> Copy Formatted Content
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Styled Document Preview */}
              <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-4 overflow-hidden flex flex-col">
                <iframe
                  title="PDF Export Preview"
                  srcDoc={exportPreviewHtml}
                  className="w-full flex-1 rounded-xl bg-white shadow-xl border border-slate-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MULTIMODAL VISION SCANNER MODAL ==================== */}
      {isVisionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Handwriting, Whiteboard &amp; Diagram Scanner
                </h3>
              </div>
              <button type="button" onClick={() => setIsVisionOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(
                [
                  { id: 'handwriting', label: '✍️ Handwriting → Notes' },
                  { id: 'homework_hints', label: '🧮 Problem Hints' },
                  { id: 'diagram', label: '📐 Explain Diagram' }
                ] as const
              ).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setVisionMode(m.id)}
                  className={`py-2 px-2 rounded-xl font-semibold border transition ${visionMode === m.id
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <label className="block border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 text-center cursor-pointer hover:border-sky-500 transition">
              {visionFilePreview ? (
                <div className="space-y-2">
                  <img
                    src={visionFilePreview.dataUrl}
                    alt="Scan preview"
                    className="max-h-48 mx-auto rounded-xl object-contain shadow-sm"
                  />
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {visionFilePreview.name} (Click to replace)
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs text-slate-500">
                  <UploadCloud className="w-8 h-8 mx-auto text-sky-500" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Take photo or upload notebook / whiteboard / worksheet
                  </p>
                  <p className="text-[11px]">Supports handwritten math (KaTeX), diagrams, &amp; PNG/JPG/WEBP</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleVisionFileChange}
                className="hidden"
              />
            </label>

            <input
              type="text"
              value={visionExtraPrompt}
              onChange={e => setVisionExtraPrompt(e.target.value)}
              placeholder="Optional hint (e.g. 'Focus on the recurrence relation on the right')"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />

            {selectedNote && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appendToCurrentNote}
                  onChange={e => setAppendToCurrentNote(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600"
                />
                Append scanned blocks to "{selectedNote.title}" instead of creating a new note
              </label>
            )}

            {visionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {visionError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsVisionOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!visionFilePreview || visionLoading}
                onClick={handleRunVisionScan}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {visionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{visionLoading ? 'Analyzing Image...' : 'Convert with Vision AI'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <LectureRecorderModal
        isOpen={isLectureRecorderOpen}
        onClose={() => setIsLectureRecorderOpen(false)}
        courses={courses}
        defaultCourseId={
          selectedNote?.courseId ||
          (selectedCourseFilter !== 'all' ? selectedCourseFilter : courses[0]?.id)
        }
        onSaveLectureNote={({ title, markdown, courseId }) => {
          const blocks = parseHtmlOrMarkdownToBlocks(markdown);
          handleCreateBlankNote({
            title,
            courseId: courseId || '',
            icon: '🎙️',
            tags: ['lecture-recording', 'ai-notes'],
            blocks,
            content: blocksToHtml(blocks)
          });
          showToast('Saved live lecture transcript as a Notion page!', 'success');
        }}
        onAddTaskDeadline={(deadline, courseId) => {
          addTask({
            title: deadline.title,
            courseId,
            dueDate: deadline.dueDate,
            priority: deadline.priority,
            tags: ['lecture-detected', deadline.kind],
            completed: false,
            source: 'ai'
          });
          showToast(`Added "${deadline.title}" (${deadline.dueDate}) to Tasks!`, 'success');
        }}
      />
    </div>
  );
};
