import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  X
} from 'lucide-react';
import { Course, PriorityLevel } from '../../../types';
import {
  DetectedLectureDeadline,
  ProcessedLectureResult,
  processLectureTranscript
} from '../../../services/lectureRecorderService';
import { MarkdownRenderer } from '../../common/MarkdownRenderer';

interface LectureRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  defaultCourseId?: string;
  onSaveLectureNote: (params: {
    title: string;
    markdown: string;
    courseId?: string;
  }) => void;
  onAddTaskDeadline: (deadline: DetectedLectureDeadline, courseId?: string) => void;
}

export const LectureRecorderModal: React.FC<LectureRecorderModalProps> = ({
  isOpen,
  onClose,
  courses,
  defaultCourseId,
  onSaveLectureNote,
  onAddTaskDeadline
}) => {
  const [courseId, setCourseId] = useState<string>(defaultCourseId || '');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processed, setProcessed] = useState<ProcessedLectureResult | null>(null);
  const [addedIdx, setAddedIdx] = useState<Set<number>>(new Set());

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultCourseId) setCourseId(defaultCourseId);
  }, [isOpen, defaultCourseId]);

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  if (!isOpen) return null;

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleRecording = () => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
      setIsRecording(false);
      setInterimText('');
      return;
    }

    setSpeechError(null);
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechError(
        'Live SpeechRecognition is unavailable in this browser (use Chrome/Edge or paste/type lecture notes below).'
      );
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalized = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalized += piece + ' ';
        else interim += piece;
      }
      if (finalized) {
        setTranscript(prev => (prev ? `${prev.trim()} ${finalized.trim()}` : finalized.trim()));
      }
      setInterimText(interim);
    };

    recognition.onerror = (ev: any) => {
      if (ev.error !== 'no-speech') {
        setSpeechError(`Microphone status: ${ev.error}. You can continue typing or pasting transcript.`);
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleGenerateNotes = async () => {
    if (!transcript.trim()) return;
    if (isRecording) toggleRecording();
    setIsProcessing(true);
    setAddedIdx(new Set());
    try {
      const course = courses.find(c => c.id === courseId);
      const res = await processLectureTranscript({
        transcript,
        courseCode: course?.code,
        courseName: course?.name,
        durationLabel: formatElapsed(elapsedSec)
      });
      setProcessed(res);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToWorkspace = () => {
    if (!processed) return;
    onSaveLectureNote({
      title: processed.title,
      markdown: processed.notesMarkdown,
      courseId: courseId || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Live Lecture Recorder → Notion Notes &amp; Deadlines
              </h3>
              <p className="text-[11px] text-slate-500">
                Record live lectures (or paste a lecture transcript) and auto-extract structured Notion blocks + announced due dates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
            >
              <option value="">General Note (No Course)</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                {formatElapsed(elapsedSec)}
              </span>
              <button
                type="button"
                onClick={toggleRecording}
                className={`px-3.5 py-2 rounded-xl font-bold text-white flex items-center gap-1.5 shadow-sm ${
                  isRecording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Stop Recording' : 'Start Live Mic'}</span>
              </button>
            </div>
          </div>

          {speechError && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
              {speechError}
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-300">
              Live Transcript (Editable)
            </label>
            <textarea
              rows={6}
              value={interimText ? `${transcript} ${interimText}`.trim() : transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Click 'Start Live Mic' during class or paste lecture transcript / audio notes here..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs leading-relaxed focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            disabled={!transcript.trim() || isProcessing}
            onClick={handleGenerateNotes}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Structuring Notion Notes &amp; Detecting Deadlines...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Convert Transcript into Notion Lecture Page + Deadlines</span>
              </>
            )}
          </button>

          {processed && (
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{processed.title}</h4>
                <button
                  type="button"
                  onClick={handleSaveToWorkspace}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save as Notion Page
                </button>
              </div>

              {processed.extractedDeadlines.length > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-amber-700 dark:text-amber-400">
                    Detected Announced Deadlines &amp; Study Actions ({processed.extractedDeadlines.length})
                  </div>
                  {processed.extractedDeadlines.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{d.title}</span>{' '}
                        <span className="text-slate-400">({d.dueDate} • {d.kind})</span>
                      </div>
                      <button
                        type="button"
                        disabled={addedIdx.has(idx)}
                        onClick={() => {
                          onAddTaskDeadline(d, courseId || undefined);
                          setAddedIdx(prev => new Set(prev).add(idx));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold flex items-center gap-1 disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{addedIdx.has(idx) ? 'Added' : 'Add Task'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto">
                <MarkdownRenderer content={processed.notesMarkdown} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
