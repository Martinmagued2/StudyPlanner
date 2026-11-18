import React, { useState, useEffect } from 'react';
import {
  Share2,
  X,
  Download,
  Check,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Users,
  Search
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { fetchSharedStudyItem, SharedStudyPayload } from '../../../services/shareService';
import { blocksToHtml, stripHtmlTags } from '../../../services/noteBlockService';

interface SharedViewerModalProps {
  initialShareParam?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SharedViewerModal: React.FC<SharedViewerModalProps> = ({
  initialShareParam,
  isOpen,
  onClose
}) => {
  const { addNote, addQuiz, addFlashcardDeck, addFlashcard, setActiveView, setNotesNavTarget, courses } = useApp();

  const [lookupInput, setLookupInput] = useState(initialShareParam || '');
  const [sharedData, setSharedData] = useState<SharedStudyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clonedDone, setClonedDone] = useState(false);

  const loadShare = async (raw: string) => {
    if (!raw.trim()) return;
    setLoading(true);
    setError(null);
    setClonedDone(false);
    try {
      const res = await fetchSharedStudyItem(raw);
      if (!res) {
        setSharedData(null);
        setError('Shared study room not found or expired.');
      } else {
        setSharedData(res);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialShareParam) {
      setLookupInput(initialShareParam);
      loadShare(initialShareParam);
    }
  }, [isOpen, initialShareParam]);

  if (!isOpen) return null;

  const handleClone = () => {
    if (!sharedData) return;
    if (sharedData.itemType === 'note' && sharedData.note) {
      const blocks = sharedData.note.blocks;
      const created = addNote({
        title: `${sharedData.note.title} (Shared Copy)`,
        courseId: courses[0]?.id || '',
        content: blocks && blocks.length > 0 ? blocksToHtml(blocks) : sharedData.note.content,
        blocks,
        icon: sharedData.note.icon || '🤝',
        coverImage: sharedData.note.coverImage,
        tags: Array.from(new Set([...(sharedData.note.tags || []), 'shared-room'])),
        pinned: false,
        highlightedTerms: []
      });
      setClonedDone(true);
      setTimeout(() => {
        onClose();
        setActiveView('notes');
        setNotesNavTarget({ noteId: created.id });
      }, 650);
    } else if (sharedData.itemType === 'quiz' && sharedData.quiz) {
      addQuiz({
        title: `${sharedData.quiz.title} (Shared Copy)`,
        courseId: courses[0]?.id || undefined,
        difficulty: sharedData.quiz.difficulty || 'medium',
        questions: sharedData.quiz.questions || []
      });
      setClonedDone(true);
      setTimeout(() => {
        onClose();
        setActiveView('quizzes');
      }, 650);
    } else if (sharedData.itemType === 'deck' && sharedData.deck) {
      const deckId = `deck_${Date.now()}`;
      addFlashcardDeck(`${sharedData.deck.name} (Shared)`, courses[0]?.id || undefined, sharedData.deck.tag || 'shared');
      sharedData.deck.cards.forEach(c => {
        addFlashcard({
          deckId,
          courseId: courses[0]?.id || undefined,
          question: c.question,
          answer: c.answer,
          citation: c.citation
        });
      });
      setClonedDone(true);
      setTimeout(() => {
        onClose();
        setActiveView('studyhub');
      }, 650);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[88vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Collaborative Study Room
              </h3>
              <p className="text-[11px] text-slate-500">
                Inspect &amp; clone shared notes, quizzes, or flashcard decks safely — private grades &amp; tasks stay hidden.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Manual Lookup Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            loadShare(lookupInput);
          }}
          className="px-5 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={lookupInput}
              onChange={e => setLookupInput(e.target.value)}
              placeholder="Paste classmate's share link or room ID (sh_...)"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !lookupInput.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Open Room'}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              Loading shared study resource...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {!loading && !sharedData && !error && (
            <div className="py-10 text-center space-y-2 text-xs text-slate-500">
              <Share2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Paste a Share Link or Room ID above
              </p>
              <p>
                You can share any Note, Quiz, or Flashcard Deck from its Share button to collaborate with classmates.
              </p>
            </div>
          )}

          {sharedData && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase mb-1.5">
                    {sharedData.itemType === 'note' ? (
                      <>
                        <FileText className="w-3 h-3" /> Shared Note
                      </>
                    ) : sharedData.itemType === 'quiz' ? (
                      <>
                        <HelpCircle className="w-3 h-3" /> Shared Quiz
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3" /> Shared Flashcards
                      </>
                    )}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{sharedData.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Shared by <strong>{sharedData.authorName}</strong>
                    {sharedData.courseLabel ? ` • ${sharedData.courseLabel}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClone}
                  disabled={clonedDone}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  {clonedDone ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {clonedDone ? 'Cloned to Workspace!' : 'Clone to My Workspace'}
                </button>
              </div>

              {sharedData.itemType === 'note' && sharedData.note && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {sharedData.note.blocks && sharedData.note.blocks.length > 0
                    ? sharedData.note.blocks.map(b => stripHtmlTags(b.content)).filter(Boolean).join('\n\n')
                    : stripHtmlTags(sharedData.note.content)}
                </div>
              )}

              {sharedData.itemType === 'quiz' && sharedData.quiz && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {sharedData.quiz.questions.length} Questions ({sharedData.quiz.difficulty})
                  </div>
                  {sharedData.quiz.questions.slice(0, 4).map((q, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {idx + 1}. {q.prompt}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {sharedData.itemType === 'deck' && sharedData.deck && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {sharedData.deck.cards.length} Spaced-Repetition Flashcards
                  </div>
                  {sharedData.deck.cards.slice(0, 5).map((c, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">Q: {c.question}</div>
                      <div className="text-slate-500">A: {c.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
