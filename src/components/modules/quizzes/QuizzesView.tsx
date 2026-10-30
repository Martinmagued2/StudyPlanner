import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  HelpCircle,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronRight,
  BookOpen,
  Award,
  AlertTriangle,
  FileText,
  Layers,
  Settings2,
  Loader2,
  X,
  GraduationCap
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizAttempt, DocumentFile } from '../../../types';
import { generateQuizFromFiles } from '../../../services/fileAiService';

export const QuizzesView: React.FC = () => {
  const {
    quizzes,
    courses,
    notes,
    files,
    addQuiz,
    submitQuizAttempt,
    createFlashcardsFromQuizErrors
  } = useApp();

  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizzes[0]?.id || '');
  const [activeQuizRunning, setActiveQuizRunning] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [activeAttemptResult, setActiveAttemptResult] = useState<QuizAttempt | null>(null);

  // New Quiz Builder Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [sourceType, setSourceType] = useState<'all' | 'files' | 'notes' | 'curriculum'>('all');
  const [quizDifficulty, setQuizDifficulty] = useState<Quiz['difficulty']>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [focusTopic, setFocusTopic] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId) || quizzes[0];

  const startQuiz = (quiz: Quiz) => {
    setActiveQuizRunning(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setActiveAttemptResult(null);
  };

  const handleSelectOption = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (!activeQuizRunning) return;
    if (currentQuestionIndex < activeQuizRunning.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Submit quiz
      const attempt = submitQuizAttempt(activeQuizRunning.id, userAnswers);
      setActiveAttemptResult(attempt);
    }
  };

  const handleConvertMissedToCards = () => {
    if (!activeQuizRunning || !activeAttemptResult) return;

    const errors: { question: string; answer: string; courseId?: string }[] = [];
    activeQuizRunning.questions.forEach(q => {
      const uAns = (activeAttemptResult.userAnswers[q.id] || '').trim().toLowerCase();
      const cAns = q.correctAnswer.trim().toLowerCase();
      if (uAns !== cAns) {
        errors.push({
          question: q.prompt,
          answer: `${q.correctAnswer} — ${q.explanation}`,
          courseId: activeQuizRunning.courseId
        });
      }
    });

    createFlashcardsFromQuizErrors(activeQuizRunning.title, errors);
    alert(`Converted ${errors.length} missed questions into target flashcards in Study Hub!`);
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationError('');

    try {
      const course = courses.find(c => c.id === selectedCourseId) || courses[0];
      const courseFiles = files.filter(f => f.courseId === selectedCourseId);
      const courseNotes = notes.filter(n => n.courseId === selectedCourseId);

      const docFiles: DocumentFile[] = [];

      // 1. Files
      if (sourceType === 'all' || sourceType === 'files') {
        if (courseFiles.length > 0) {
          docFiles.push(...courseFiles);
        } else if (files.length > 0) {
          docFiles.push(...files);
        }
      }

      // 2. Notes
      if (sourceType === 'all' || sourceType === 'notes') {
        const notesToUse = courseNotes.length > 0 ? courseNotes : notes;
        notesToUse.forEach(n => {
          docFiles.push({
            id: `doc_note_${n.id}`,
            name: `${n.title}.md`,
            fileType: 'md',
            sizeBytes: n.content.length,
            status: 'fully_read',
            isFavorite: false,
            uploadedAt: n.updatedAt,
            courseId: n.courseId,
            chunks: [{ id: `chunk_note_${n.id}`, content: n.content, page: 1, hasVisuals: false }],
            pageCount: 1,
            rawText: n.content
          });
        });
      }

      // 3. Curriculum / Syllabus Fallback
      if (sourceType === 'all' || sourceType === 'curriculum' || docFiles.length === 0) {
        const curriculumText = `Course: ${course?.name || 'Academic Studies'} (${course?.code || 'GEN'})\nInstructor: ${course?.instructor || 'Faculty'}\nFocus Topic: ${focusTopic || 'Course Curriculum & Fundamentals'}`;
        docFiles.push({
          id: `doc_curriculum_${Date.now()}`,
          name: `${course?.code || 'Course'}_Curriculum.txt`,
          fileType: 'txt',
          sizeBytes: curriculumText.length,
          status: 'fully_read',
          isFavorite: false,
          uploadedAt: new Date().toISOString(),
          courseId: course?.id,
          chunks: [{ id: `chunk_curr_1`, content: curriculumText, page: 1, hasVisuals: false }],
          pageCount: 1,
          rawText: curriculumText
        });
      }

      const generatedTitle = focusTopic.trim()
        ? `${course?.code || 'Course'}: ${focusTopic.trim()} Practice Quiz`
        : `${course?.code || 'Course'} AI Practice Quiz (${quizDifficulty.toUpperCase()})`;

      const generated = await generateQuizFromFiles(docFiles, {
        difficulty: (quizDifficulty === 'exam' ? 'hard' : quizDifficulty) as 'easy' | 'medium' | 'hard',
        questionCount,
        courseId: course?.id,
        title: generatedTitle
      });

      const savedQuiz = addQuiz({
        title: generated.title,
        courseId: generated.courseId,
        fileId: generated.fileId,
        difficulty: generated.difficulty,
        questions: generated.questions
      });

      setIsCreateModalOpen(false);
      setFocusTopic('');
      startQuiz(savedQuiz);
    } catch (err: any) {
      console.error('Quiz generation failed:', err);
      setGenerationError(err?.message || 'Quiz generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            AI Quizzes & Diagnostic Practice Tests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Grounded diagnostic quizzes built directly from your lecture slides, notes, and course curriculum.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate New Quiz</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {!activeQuizRunning ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map(quiz => {
            const course = courses.find(c => c.id === quiz.courseId);
            const latestAttempt = quiz.attempts[0];

            return (
              <div
                key={quiz.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    {course ? (
                      <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: course.color, color: course.color }}>
                        {course.code}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Diagnostic</span>
                    )}

                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono capitalize">
                      {quiz.difficulty}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {quiz.title}
                  </h3>

                  <div className="text-xs text-slate-500 font-mono">
                    {quiz.questions.length} Questions (MCQ, True/False & Short Answer)
                  </div>

                  {latestAttempt && (
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-500">Last Score:</span>
                      <span className={`font-mono font-bold ${latestAttempt.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {latestAttempt.score}%
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => startQuiz(quiz)}
                  className="w-full py-2 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{latestAttempt ? 'Retake Quiz' : 'Start Diagnostic Quiz'}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : activeAttemptResult ? (
        /* Quiz Completed & Results Screen */
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center space-y-4">
            <div className="text-xs font-mono font-semibold uppercase text-slate-400">
              Diagnostic Attempt Completed
            </div>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {activeAttemptResult.score}%
            </div>
            <p className="text-xs text-slate-500">
              Answers evaluated instantly. Weak topics identified and ready to consolidate into spaced repetition flashcards.
            </p>

            {activeAttemptResult.weakTopics.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Identified Weak Topics: {activeAttemptResult.weakTopics.join(', ')}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleConvertMissedToCards}
                className="px-4 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convert Errors to Flashcards</span>
              </button>
              <button
                onClick={() => setActiveQuizRunning(null)}
                className="px-4 py-2 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
              >
                Back to Quizzes
              </button>
            </div>
          </div>

          {/* Breakdown of Every Question */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Question Breakdown & Explanations
            </h4>
            {activeQuizRunning.questions.map((q, idx) => {
              const uAns = (activeAttemptResult.userAnswers[q.id] || '').trim();
              const isCorrect = uAns.toLowerCase() === q.correctAnswer.toLowerCase() || (q.type === 'short' && uAns.toLowerCase().includes(q.correctAnswer.toLowerCase()));

              return (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>Question {idx + 1} • {q.topic}</span>
                    <span className={`font-sans font-semibold flex items-center gap-1 ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{isCorrect ? 'Correct' : 'Missed'}</span>
                    </span>
                  </div>

                  <h5 className="font-semibold text-slate-900 dark:text-slate-100">{q.prompt}</h5>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="text-slate-600 dark:text-slate-400">
                      <strong>Your Answer:</strong> {uAns || 'None (Skipped)'}
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      <strong>Correct Answer:</strong> {q.correctAnswer}
                    </div>
                    <div className="text-slate-500 italic mt-1">
                      {q.explanation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Quiz Running Screen (One question at a time) */
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Question {currentQuestionIndex + 1} of {activeQuizRunning.questions.length}</span>
            <button
              onClick={() => setActiveQuizRunning(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              Exit Quiz
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-slate-900 dark:bg-slate-100 h-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / activeQuizRunning.questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          {(() => {
            const currentQ = activeQuizRunning.questions[currentQuestionIndex];
            const currentSelected = userAnswers[currentQ.id] || '';

            return (
              <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Topic: {currentQ.topic}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-2 leading-relaxed">
                    {currentQ.prompt}
                  </h3>
                </div>

                {/* Multiple Choice Options */}
                {currentQ.type === 'mcq' && currentQ.options && (
                  <div className="space-y-2">
                    {currentQ.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(currentQ.id, opt)}
                        className={`w-full p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                          currentSelected === opt
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* True / False */}
                {currentQ.type === 'tf' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(currentQ.id, opt)}
                        className={`p-4 rounded-lg border text-center text-xs font-bold transition-colors ${
                          currentSelected === opt
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Short Answer */}
                {currentQ.type === 'short' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={currentSelected}
                      onChange={e => handleSelectOption(currentQ.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                    />
                  </div>
                )}

                {/* Next / Submit button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleNextQuestion}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Skip Question
                  </button>

                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <span>{currentQuestionIndex === activeQuizRunning.questions.length - 1 ? 'Submit Answers' : 'Next Question'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* AI Quiz Generator Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Generate Grounded AI Quiz
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Based on your actual lecture files, course notes, and syllabus.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              {/* Course Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Target Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Knowledge Source Material
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('all')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sourceType === 'all'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>All Materials</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Files + Notes + Syllabus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('files')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sourceType === 'files'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Uploaded Files</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {files.filter(f => f.courseId === selectedCourseId).length} course slide(s)/PDFs
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('notes')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sourceType === 'notes'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Student Notes</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {notes.filter(n => n.courseId === selectedCourseId).length} saved study note(s)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('curriculum')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sourceType === 'curriculum'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                      <span>Curriculum Core</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Syllabus & Course Objectives</span>
                  </button>
                </div>
              </div>

              {/* Topic Focus */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Specific Topic Focus (Optional)
                </label>
                <input
                  type="text"
                  value={focusTopic}
                  onChange={e => setFocusTopic(e.target.value)}
                  placeholder="e.g. Dynamic Programming, Midterm Review, Lecture 4"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {/* Difficulty & Question Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={quizDifficulty}
                    onChange={e => setQuizDifficulty(e.target.value as Quiz['difficulty'])}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none capitalize"
                  >
                    <option value="easy">Easy (Definitions & Recall)</option>
                    <option value="medium">Medium (Application & Concepts)</option>
                    <option value="hard">Hard (Analysis & Edge Cases)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Number of Questions
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {[3, 5, 10, 15, 20].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`py-2 rounded font-semibold text-center transition-colors ${
                          questionCount === cnt
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {generationError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Generate Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
