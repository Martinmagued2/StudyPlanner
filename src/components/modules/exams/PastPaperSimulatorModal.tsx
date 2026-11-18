import React, { useEffect, useState } from 'react';
import {
  Award,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import { Course, DocumentFile, Exam } from '../../../types';
import { extractTextFromFile } from '../../../services/fileAiService';
import { readImageFileAsBase64 } from '../../../services/visionScannerService';
import {
  gradePastPaperAttempt,
  PastPaperGradeResult,
  UploadedImagePayload
} from '../../../services/pastPaperService';

interface PastPaperSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  exams: Exam[];
  files: DocumentFile[];
  defaultExam?: Exam | null;
  onCreateFlashcards: (
    deckName: string,
    courseId: string | undefined,
    cards: Array<{ question: string; answer: string }>
  ) => void;
}

export const PastPaperSimulatorModal: React.FC<PastPaperSimulatorModalProps> = ({
  isOpen,
  onClose,
  courses,
  exams,
  files,
  defaultExam,
  onCreateFlashcards
}) => {
  const [paperTitle, setPaperTitle] = useState<string>('Past Exam Simulation');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [paperText, setPaperText] = useState<string>('');
  const [paperImages, setPaperImages] = useState<UploadedImagePayload[]>([]);
  const [markingScheme, setMarkingScheme] = useState<string>('');
  const [typedAnswers, setTypedAnswers] = useState<string>('');
  const [answerPhotos, setAnswerPhotos] = useState<UploadedImagePayload[]>([]);

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number>(60 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // Grading state
  const [isParsingPaper, setIsParsingPaper] = useState<boolean>(false);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [gradeResult, setGradeResult] = useState<PastPaperGradeResult | null>(null);
  const [cardsSavedMsg, setCardsSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultExam) {
      setPaperTitle(`${defaultExam.name} — Practice Paper`);
      setSelectedCourseId(defaultExam.courseId || '');
      const mins = defaultExam.durationMinutes || 60;
      setDurationMinutes(mins);
      setSecondsLeft(mins * 60);
    } else if (!selectedCourseId && courses[0]?.id) {
      setSelectedCourseId(courses[0].id);
    }
  }, [isOpen, defaultExam, courses]);

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, secondsLeft]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleUploadPastPaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;
    setIsParsingPaper(true);
    try {
      for (const f of fileList) {
        if (f.type.startsWith('image/')) {
          const img = await readImageFileAsBase64(f);
          setPaperImages(prev => [...prev, { name: f.name, ...img }]);
          if (paperTitle === 'Past Exam Simulation') {
            setPaperTitle(f.name.replace(/\.[^/.]+$/, ''));
          }
        } else {
          const parsed = await extractTextFromFile(f);
          setPaperText(prev => (prev ? `${prev}\n\n${parsed.text}` : parsed.text));
          setPaperTitle(f.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } finally {
      setIsParsingPaper(false);
    }
  };

  const handleLoadFromLibrary = (fileId: string) => {
    const doc = files.find(f => f.id === fileId);
    if (!doc) return;
    const text = doc.rawText || doc.chunks.map(c => c.content).join('\n\n') || doc.summary || '';
    setPaperText(text);
    setPaperTitle(`${doc.name.replace(/\.[^/.]+$/, '')} (Mock)`);
    if (doc.courseId) setSelectedCourseId(doc.courseId);
  };

  const handleAddAnswerPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    for (const f of fileList) {
      if (!f.type.startsWith('image/')) continue;
      const img = await readImageFileAsBase64(f);
      setAnswerPhotos(prev => [...prev, { name: f.name, ...img }]);
    }
    e.target.value = '';
  };

  const handleStartExam = () => {
    setSecondsLeft(durationMinutes * 60);
    setHasStarted(true);
    setTimerRunning(true);
    setGradeResult(null);
    setCardsSavedMsg(null);
  };

  const handleSubmitAndMark = async () => {
    setTimerRunning(false);
    setIsGrading(true);
    try {
      const elapsedSeconds = Math.max(60, durationMinutes * 60 - secondsLeft);
      const course = courses.find(c => c.id === selectedCourseId);
      const res = await gradePastPaperAttempt({
        paperTitle,
        paperText,
        paperImages,
        markingScheme,
        typedAnswers,
        answerPhotos,
        elapsedMinutes: Math.round(elapsedSeconds / 60),
        targetMinutes: durationMinutes,
        courseName: course ? `${course.code}: ${course.name}` : undefined
      });
      setGradeResult(res);
    } finally {
      setIsGrading(false);
    }
  };

  const handleSaveWeakFlashcards = () => {
    if (!gradeResult) return;
    const cards =
      gradeResult.flashcardsToCreate.length > 0
        ? gradeResult.flashcardsToCreate
        : gradeResult.questionBreakdown.map(q => ({
            question: `${paperTitle} — ${q.questionLabel}`,
            answer: q.modelAnswerHint || q.feedback
          }));
    onCreateFlashcards(
      `${paperTitle} Mistakes`,
      selectedCourseId || undefined,
      cards
    );
    setCardsSavedMsg(`Saved ${cards.length} revision flashcard(s) to Study Hub!`);
  };

  const timeCritical = secondsLeft <= 300 && hasStarted;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-6xl h-[92vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar with Live Exam Countdown */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                AI Past-Paper Timer & Photo Marker
              </h2>
              <p className="text-[11px] text-slate-500">
                Simulate real exam pressure, snap photos of handwritten working, and get examiner rubric marking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className={`px-3 py-1.5 rounded-xl font-mono text-sm font-bold flex items-center gap-2 border ${
                timeCritical
                  ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                  : timerRunning
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(secondsLeft)}</span>
            </div>

            {!hasStarted ? (
              <button
                type="button"
                onClick={handleStartExam}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Start Exam Clock
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTimerRunning(r => !r)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1"
              >
                {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{timerRunning ? 'Pause' : 'Resume'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Setup Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="md:col-span-2 space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">Paper Title</label>
              <input
                type="text"
                value={paperTitle}
                onChange={e => setPaperTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">Course</label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="">General Course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">Duration (mins)</label>
              <select
                value={durationMinutes}
                disabled={hasStarted}
                onChange={e => {
                  const m = Number(e.target.value);
                  setDurationMinutes(m);
                  setSecondsLeft(m * 60);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-60"
              >
                {[15, 30, 45, 60, 90, 120, 180].map(m => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Two-Column Exam View: Left = Past Paper + Rubric, Right = Typed + Handwritten Photo Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT: Past Paper & Mark Scheme */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Past Exam Paper
                </h3>
                <div className="flex items-center gap-2">
                  {files.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={e => handleLoadFromLibrary(e.target.value)}
                      className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-[160px]"
                    >
                      <option value="" disabled>
                        Pick from Library...
                      </option>
                      {files.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <label className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1">
                    {isParsingPaper ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                    <span>Upload Paper (PDF/Img)</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.md,.docx,image/*"
                      onChange={handleUploadPastPaper}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                rows={11}
                value={paperText}
                onChange={e => setPaperText(e.target.value)}
                placeholder="Paste past-paper questions here or upload a PDF / photo of your exam sheet above..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-500"
              />

              {paperImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {paperImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img.dataUrl}
                        alt={img.name || `Paper ${i + 1}`}
                        className="h-20 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setPaperImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-rose-600 text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">
                  Optional Marking Scheme / Rubric Hints
                </label>
                <textarea
                  rows={3}
                  value={markingScheme}
                  onChange={e => setMarkingScheme(e.target.value)}
                  placeholder="Optional: paste answer key points or mark allocation (e.g. Q1: 10 marks for Big-O proof, Q2: 15 marks...)"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* RIGHT: Student Answers + Handwritten Photo Upload */}
            <div className="space-y-3 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Your Exam Answers (Typed &amp; Handwritten Photos)
                </h3>
                <label className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  <span>Scan Answer Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleAddAnswerPhotos}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={10}
                value={typedAnswers}
                onChange={e => setTypedAnswers(e.target.value)}
                placeholder="Type your answers here (e.g., Q1: ..., Q2: ...) OR write on paper and snap photos with 'Scan Answer Photo' above!"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs leading-relaxed focus:outline-none focus:border-emerald-500"
              />

              {answerPhotos.length > 0 && (
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
                    Handwritten Answer Pages Attached ({answerPhotos.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {answerPhotos.map((img, i) => (
                      <div key={i} className="relative">
                        <img
                          src={img.dataUrl}
                          alt={img.name || `Answer ${i + 1}`}
                          className="h-20 w-24 object-cover rounded-lg border border-sky-300 dark:border-sky-700"
                        />
                        <button
                          type="button"
                          onClick={() => setAnswerPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-rose-600 text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={isGrading || (!typedAnswers.trim() && answerPhotos.length === 0)}
                onClick={handleSubmitAndMark}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Marking Exam Paper Against Rubric with AI Examiner...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>Finish &amp; Grade My Paper with AI Examiner</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grading Results Report */}
          {gradeResult && (
            <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/70 dark:border-emerald-800/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-center">
                    <div className="text-lg font-black leading-none">{gradeResult.scoreOutOf100}%</div>
                    <div className="text-[10px] font-bold mt-0.5">Grade {gradeResult.letterGrade}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Examiner Grading Report
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {gradeResult.overallFeedback}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWeakFlashcards}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Save Missed Marks to Flashcards</span>
                </button>
              </div>

              {cardsSavedMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {cardsSavedMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">Strengths</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                    {gradeResult.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-rose-700 dark:text-rose-400 mb-1.5">Where Marks Were Lost</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                    {gradeResult.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Question-by-Question Mark Breakdown
                </div>
                {gradeResult.questionBreakdown.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>{q.questionLabel}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                        {q.marksAwarded} / {q.maxMarks}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{q.feedback}</p>
                    {q.modelAnswerHint && (
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        <strong>Model Hint:</strong> {q.modelAnswerHint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
