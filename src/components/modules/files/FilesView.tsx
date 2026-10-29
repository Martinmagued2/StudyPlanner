import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  FolderArchive,
  UploadCloud,
  FileText,
  Star,
  Trash2,
  RefreshCw,
  Sparkles,
  Bot,
  Send,
  Video,
  FileCheck2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { DocumentFile, FileReadStatus } from '../../../types';

export const FilesView: React.FC = () => {
  const { files, addFile, deleteFile, toggleFavoriteFile, reindexFile, courses, addFlashcardDeck, addFlashcard } = useApp();

  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id || '');
  const [qaInput, setQaInput] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string; citations: Array<{ page: number; text: string }> }>>([
    {
      q: 'What triggers an AVL tree double rotation?',
      a: 'A double rotation (Left-Right or Right-Left) is triggered when an insertion creates a zigzag imbalance. For instance, in an LR case, the node has balance factor +2 and its left child has -1. First a left rotation on the child is performed, followed by a right rotation on the parent.',
      citations: [
        { page: 14, text: 'Left-Right Double Rotation: When a new key is added into the right subtree of the left child...' }
      ]
    }
  ]);

  // YouTube / Transcript modal state
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTranscript, setYtTranscript] = useState('');

  const selectedFile = files.find(f => f.id === selectedFileId) || files[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert('Upload error: Document exceeds maximum 30 MB file size limit.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const fileType = (ext === 'pdf' || ext === 'pptx' || ext === 'docx' || ext === 'md' ? ext : 'pdf') as any;

    const newDoc = addFile({
      name: file.name,
      sizeBytes: file.size,
      fileType,
      status: 'fully_read',
      pageCount: Math.floor(Math.random() * 25) + 10,
      courseId: courses[0]?.id,
      isFavorite: false,
      summary: `Automated index of ${file.name}. Vectorized text chunks, diagrams, and figures extracted.`
    }, `Parsed contents of ${file.name} covering introductory definitions, algorithmic formulations, and boundary theorems.`);

    setSelectedFileId(newDoc.id);
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim() || !selectedFile) return;

    const userQ = qaInput;
    setQaInput('');

    setTimeout(() => {
      const chunk = selectedFile.chunks[0];
      setQaHistory(prev => [
        ...prev,
        {
          q: userQ,
          a: `Based on page ${chunk?.page || 1} of "${selectedFile.name}": ${chunk?.content || 'The document establishes structural guarantees and algorithmic bounds.'}`,
          citations: [
            { page: chunk?.page || 1, text: chunk?.content || 'Document excerpt' }
          ]
        }
      ]);
    }, 500);
  };

  const handleGenerateStudyPack = (type: 'flashcards' | 'quiz' | 'summary') => {
    if (!selectedFile) return;
    if (type === 'flashcards') {
      const deckName = `${selectedFile.name.replace(/\.[^/.]+$/, '')} Pack`;
      addFlashcardDeck(deckName, selectedFile.courseId, 'From-Document');
      addFlashcard({
        deckId: 'deck_cs302',
        courseId: selectedFile.courseId,
        question: `Key definition from ${selectedFile.name}: What is the primary invariant?`,
        answer: selectedFile.chunks[0]?.content.slice(0, 120) || 'Invariant verified.',
        citation: { file: selectedFile.name, pageOrSlide: `Page 1` }
      });
      alert(`Generated flashcard deck "${deckName}" from document! Check Study Hub.`);
    } else {
      alert(`Generated ${type} from ${selectedFile.name}.`);
    }
  };

  const handleImportYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    const docName = ytUrl ? `YouTube_Lecture_Captions_${Date.now().toString().slice(-4)}.txt` : 'Pasted_Lecture_Transcript.txt';
    addFile({
      name: docName,
      sizeBytes: 85000,
      fileType: 'txt',
      status: 'fully_read',
      pageCount: 12,
      courseId: courses[0]?.id,
      isFavorite: false,
      summary: 'Timestamped lecture transcription extracted from video captions.'
    }, ytTranscript || '00:01:20 [Lecturer] In today’s lecture we examine self-balancing trees and recurrence relations...');
    setIsYoutubeModalOpen(false);
    setYtUrl('');
    setYtTranscript('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            File Library & AI Document Reading
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Full document indexing for PDFs, slides, and Word files with visual diagram analysis and cited QA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsYoutubeModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5 text-rose-600" />
            <span>YouTube Captions</span>
          </button>

          <label className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 shadow-sm">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Document</span>
            <input
              type="file"
              accept=".pdf,.pptx,.docx,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Main Grid: Left Files List & Right Ask Your Files QA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Files Table / List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Documents ({files.length})</span>
            <span className="text-[10px] font-mono">Max 30MB/file</span>
          </div>

          <div className="space-y-2">
            {files.map(file => {
              const isSelected = file.id === selectedFileId;
              const course = courses.find(c => c.id === file.courseId);

              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-colors space-y-2 text-xs ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <FolderArchive className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleFavoriteFile(file.id);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-500"
                    >
                      <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{file.pageCount} pages • {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-sans">
                      {file.status.replace('_', ' ')}
                    </span>
                  </div>

                  {course && (
                    <div className="text-[10px] font-semibold" style={{ color: course.color }}>
                      {course.code}: {course.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: "Ask Your Files" QA & Study Pack Generator (Span 2) */}
        {selectedFile ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Document Header & Study Pack Buttons */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{selectedFile.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {selectedFile.fileType.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedFile.summary}</p>
                </div>

                <button
                  onClick={() => reindexFile(selectedFile.id)}
                  className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1 text-slate-600 shrink-0"
                  title="Re-run AI visual parsing"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-index</span>
                </button>
              </div>

              {/* Study Pack Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Study Pack:</span>
                <button
                  onClick={() => handleGenerateStudyPack('flashcards')}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Flashcards Deck</span>
                </button>
                <button
                  onClick={() => handleGenerateStudyPack('quiz')}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3 h-3 text-emerald-600" />
                  <span>Practice Quiz</span>
                </button>
                <button
                  onClick={() => handleGenerateStudyPack('summary')}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 font-medium"
                >
                  <BookOpen className="w-3 h-3 text-amber-600" />
                  <span>Study Guide Note</span>
                </button>
              </div>
            </div>

            {/* Document Chunks / Page Locators Preview */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Indexed Pages & Diagram Extractions ({selectedFile.chunks.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFile.chunks.map(chunk => (
                  <div key={chunk.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-blue-600">
                      <span>Page {chunk.page}</span>
                      {chunk.hasVisuals && (
                        <span className="text-emerald-600 font-sans font-semibold">Diagram Extracted</span>
                      )}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{chunk.content}</p>
                    {chunk.visualDescription && (
                      <p className="text-[11px] text-slate-500 italic">
                        Vision Model: {chunk.visualDescription}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* "Ask Your Files" QA with Citations */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Ask Your Files (Grounded QA with Citations)
                </h4>
              </div>

              {/* QA History */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {qaHistory.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Q: {item.q}
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.a}
                    </div>
                    {item.citations.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                          Source Details:
                        </span>
                        {item.citations.map((c, i) => (
                          <div key={i} className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                            [{i + 1}] Page {c.page}: "{c.text}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Question Input */}
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={qaInput}
                  onChange={e => setQaInput(e.target.value)}
                  placeholder={`Ask a question grounded in ${selectedFile.name}...`}
                  className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask Document</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center p-12 text-xs text-slate-400">
            Upload or select a file to begin document understanding and study packs.
          </div>
        )}
      </div>

      {/* YouTube Modal */}
      {isYoutubeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Video className="w-4 h-4 text-rose-600" />
              <span>Import Lecture Video Captions</span>
            </h3>
            <p className="text-slate-500">
              Fetch automated captions from YouTube or paste transcript text if automated fetching fails.
            </p>
            <form onSubmit={handleImportYoutube} className="space-y-3">
              <div>
                <label className="block font-medium mb-1">YouTube URL</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={ytUrl}
                  onChange={e => setYtUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Manual Transcript Fallback (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Paste timestamped lecture transcript here..."
                  value={ytTranscript}
                  onChange={e => setYtTranscript(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsYoutubeModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium"
                >
                  Import Captions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
