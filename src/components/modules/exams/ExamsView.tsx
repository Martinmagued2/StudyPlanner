import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Award,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  MapPin,
  Play
} from 'lucide-react';
import { Exam, RevisionSession } from '../../../types';

export const ExamsView: React.FC = () => {
  const { exams, courses, addExam, generateRevisionPlanForExam, toggleRevisionSession, startFocusTimer, openQuickCreate } = useApp();

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const selectedExam = exams.find(e => e.id === selectedExamId) || exams[0];

  const getDaysRemaining = (examDateStr: string) => {
    const diffTime = new Date(examDateStr).getTime() - Date.now();
    return Math.ceil(diffTime / (86400 * 1000));
  };

  const getUrgencyBadge = (days: number) => {
    if (days < 0) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">Past Exam</span>;
    } else if (days <= 3) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">{days} Days Left (Urgent)</span>;
    } else if (days <= 7) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">{days} Days Left</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{days} Days Remaining</span>;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Exams & Spaced Revision Planning
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-generate spaced revision blocks leading up to finals, with eve-of-exam formula reviews and readiness tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openQuickCreate('exam')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Major Exam</span>
          </button>
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {exams.map(exam => {
          const course = courses.find(c => c.id === exam.courseId);
          const daysLeft = getDaysRemaining(exam.date);
          const isSelected = exam.id === selectedExamId;

          return (
            <div
              key={exam.id}
              onClick={() => setSelectedExamId(exam.id)}
              className={`p-5 rounded-xl border cursor-pointer transition-colors space-y-4 ${
                isSelected
                  ? 'border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 shadow-md ring-1 ring-slate-900 dark:ring-slate-100'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  {course && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border" style={{ borderColor: course.color, color: course.color }}>
                      {course.code} • Weight: {exam.weightPercentage}%
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                    {exam.name}
                  </h3>
                </div>
                {getUrgencyBadge(daysLeft)}
              </div>

              {/* Readiness Progress Bar */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Exam Readiness Score</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {exam.readinessPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      exam.readinessPercent >= 70 ? 'bg-emerald-600' :
                      exam.readinessPercent >= 45 ? 'bg-amber-600' : 'bg-rose-600'
                    }`}
                    style={{ width: `${exam.readinessPercent}%` }}
                  />
                </div>
              </div>

              {/* Room & Revision Sessions Count */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{exam.room || 'Main Hall'}</span>
                </span>
                <span>{exam.revisionSessions.length} Spaced Sessions</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Exam Revision Schedule Detail */}
      {selectedExam && (
        <div className="p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Automated Revision Schedule & Task Links
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {selectedExam.name}
              </h2>
            </div>

            <button
              onClick={() => generateRevisionPlanForExam(selectedExam.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{selectedExam.revisionSessions.length > 0 ? 'Rebuild Revision Schedule' : 'Generate Revision Plan'}</span>
            </button>
          </div>

          {selectedExam.revisionSessions.length > 0 ? (
            <div className="space-y-3">
              {selectedExam.revisionSessions.map(session => (
                <div
                  key={session.id}
                  className={`p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-4 text-xs ${
                    session.completed
                      ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleRevisionSession(selectedExam.id, session.id)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <CheckCircle2 className={`w-4 h-4 ${session.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </button>

                    <div>
                      <span className={`font-semibold text-slate-900 dark:text-slate-100 ${session.completed ? 'line-through text-slate-400' : ''}`}>
                        {session.title}
                      </span>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>Date: {session.date}</span>
                        <span>•</span>
                        <span>{session.durationMinutes} mins</span>
                        <span>•</span>
                        <span className="capitalize font-sans px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                          {session.focusArea.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!session.completed && (
                    <button
                      onClick={() => startFocusTimer(session.durationMinutes, session.linkedTaskId, selectedExam.courseId, session.title)}
                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 font-medium shrink-0"
                    >
                      <Play className="w-3 h-3" />
                      <span>Start Session</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-2 text-xs text-slate-500">
              <Award className="w-8 h-8 mx-auto text-slate-300" />
              <p>No revision sessions generated yet for this exam.</p>
              <button
                onClick={() => generateRevisionPlanForExam(selectedExam.id)}
                className="text-blue-600 font-semibold hover:underline"
              >
                Click here to automatically generate up to 5 spaced revision blocks.
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
