import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  UploadCloud,
  X
} from 'lucide-react';
import { extractTextFromFile } from '../../../services/fileAiService';
import {
  ExtractedSyllabusBundle,
  parseSyllabusToCourseBundle
} from '../../../services/syllabusImporterService';

interface SyllabusImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (bundle: ExtractedSyllabusBundle) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SyllabusImporterModal: React.FC<SyllabusImporterModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport
}) => {
  const [rawSyllabus, setRawSyllabus] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [bundle, setBundle] = useState<ExtractedSyllabusBundle | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setFileName(file.name);
    try {
      const extracted = await extractTextFromFile(file);
      setRawSyllabus(extracted.text);
      const parsed = await parseSyllabusToCourseBundle(extracted.text, file.name);
      setBundle(parsed);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!rawSyllabus.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await parseSyllabusToCourseBundle(rawSyllabus, fileName || undefined);
      setBundle(parsed);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApply = () => {
    if (!bundle) return;
    onConfirmImport(bundle);
    setBundle(null);
    setRawSyllabus('');
    setFileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                AI Syllabus → Entire Semester Builder
              </h3>
              <p className="text-[11px] text-slate-500">
                Drop a course syllabus PDF/DOCX/TXT or paste text — AI builds the Course, Timetable Slots, Deadlines, Exams &amp; Grade Weights automatically.
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
          {/* Upload or Paste */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer flex items-center gap-1.5 shadow-sm">
              {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              <span>Upload Syllabus (PDF / DOCX / TXT)</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              disabled={!rawSyllabus.trim() || isParsing}
              onClick={handleAnalyzeText}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Extract Semester Structure with AI</span>
            </button>
          </div>

          <textarea
            rows={6}
            value={rawSyllabus}
            onChange={e => setRawSyllabus(e.target.value)}
            placeholder="Paste your university syllabus here (course code, instructor, Mon/Wed timings, assignment due dates, midterm/final weights)..."
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs focus:outline-none focus:border-indigo-500"
          />

          {/* Extracted Preview */}
          {bundle && (
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/70 dark:border-indigo-800/60 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                    {bundle.course.code}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {bundle.course.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {bundle.course.instructor} • {bundle.course.location} • {bundle.course.creditHours} Credits ({bundle.course.term})
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>{bundle.course.meetingSlots.length} weekly slot(s)</div>
                  <div>{bundle.assignments.length} assignment(s) • {bundle.exams.length} exam(s)</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Weekly Schedule
                  </div>
                  {bundle.course.meetingSlots.map((s, i) => (
                    <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300">
                      {DAY_NAMES[s.day]} {s.startTime}–{s.endTime} ({s.type}) • {s.location}
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    Assignments ({bundle.assignments.length})
                  </div>
                  {bundle.assignments.map((a, i) => (
                    <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      • {a.title} ({a.dueDate})
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    Exams &amp; Weights ({bundle.exams.length})
                  </div>
                  {bundle.exams.map((ex, i) => (
                    <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      • {ex.name} ({ex.date} • {ex.weightPercentage}%)
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Build Course, Schedule, Exams &amp; Deadlines</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
