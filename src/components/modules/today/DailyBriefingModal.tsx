import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { MeetingSlot } from '../../../types';
import {
  Sparkles,
  BookOpen,
  FileCheck2,
  Award,
  Clock,
  MapPin,
  Calendar,
  Play,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';

export const DailyBriefingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const {
    user,
    courses,
    assignments,
    exams,
    startFocusTimer,
    setActiveView
  } = useApp();

  const [dontShowAgainToday, setDontShowAgainToday] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const todayDay = now.getDay();
  const todayDateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  const todayIsoDate = now.toISOString().slice(0, 10);

  // 1. Classes Today
  const todayClasses = courses.flatMap(c =>
    (c.meetingSlots || [])
      .filter((s: MeetingSlot) => s.day === todayDay)
      .map((s: MeetingSlot) => ({
        id: s.id,
        courseId: c.id,
        courseCode: c.code,
        courseName: c.name,
        color: c.color,
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type || 'Lecture',
        location: s.location || c.location || 'Campus Hall',
        instructor: c.instructor
      }))
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 2. Assignments Due in Next 3 Days
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const urgentAssignments = assignments
    .filter(a => a.status !== 'completed' && a.dueDate)
    .map(a => {
      const due = new Date(a.dueDate);
      const dueMidnight = new Date(due);
      dueMidnight.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const course = courses.find(c => c.id === a.courseId);
      return {
        ...a,
        diffDays,
        courseCode: course?.code || 'General',
        courseColor: course?.color || '#3b82f6',
        formattedTime: due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    })
    .filter(a => a.diffDays <= 3)
    .sort((a, b) => a.diffDays - b.diffDays);

  // 3. Upcoming Exams in Next 7 Days
  const upcomingExams = exams
    .map(e => {
      const examDate = new Date(e.date);
      const examMidnight = new Date(examDate);
      examMidnight.setHours(0, 0, 0, 0);
      const diffDays = Math.round((examMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const course = courses.find(c => c.id === e.courseId);
      return {
        ...e,
        diffDays,
        courseCode: course?.code || 'Course',
        courseName: course?.name || '',
        courseColor: course?.color || '#d97706'
      };
    })
    .filter(e => e.diffDays >= 0 && e.diffDays <= 7)
    .sort((a, b) => a.diffDays - b.diffDays);

  const handleDismiss = () => {
    if (dontShowAgainToday) {
      localStorage.setItem(`nook_briefing_dismissed_${todayIsoDate}`, 'true');
    }
    onClose();
  };

  const handleStartFocus = () => {
    handleDismiss();
    startFocusTimer(25);
  };

  const handleViewSchedule = () => {
    handleDismiss();
    setActiveView('schedule');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with decorative gradient bar */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 p-5 text-white">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Daily Academic Briefing</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                {greeting}, {user?.name || 'Scholar'}!
              </h1>
              <p className="text-xs text-blue-100 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>{todayDateStr}</span>
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
              title="Close briefing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Snapshot Badges */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/15 text-[11px] font-medium flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-white/15">
              {todayClasses.length} {todayClasses.length === 1 ? 'class' : 'classes'} today
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/15">
              {urgentAssignments.length} {urgentAssignments.length === 1 ? 'assignment' : 'assignments'} due soon
            </span>
            {upcomingExams.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-semibold flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>{upcomingExams.length} {upcomingExams.length === 1 ? 'exam' : 'exams'} this week</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* SECTION 1: TODAY'S CLASSES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Today's Classes ({todayClasses.length})</span>
              </span>
              {todayClasses.length > 0 && (
                <button
                  onClick={handleViewSchedule}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View Timetable
                </button>
              )}
            </div>

            {todayClasses.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-2">
                <span className="text-base">🏖️</span>
                <span>No scheduled lectures today — an excellent opportunity for focused revision or self-study!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {todayClasses.map(cls => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2.5 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: cls.color || '#3b82f6' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {cls.courseCode}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 capitalize">
                            {cls.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {cls.courseName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                        {cls.startTime} - {cls.endTime}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[100px]">{cls.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: ASSIGNMENTS DUE SOON */}
          <div className="space-y-2 pt-1">
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Coursework Due Soon (Next 3 Days)</span>
            </span>

            {urgentAssignments.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>All clear! No assignments due within the next 3 days.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentAssignments.map(asg => {
                  const isOverdue = asg.diffDays < 0;
                  const isToday = asg.diffDays === 0;
                  const isTomorrow = asg.diffDays === 1;

                  const badgeClass = isOverdue
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                    : isToday
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300';

                  const badgeText = isOverdue
                    ? `Overdue by ${Math.abs(asg.diffDays)}d`
                    : isToday
                    ? 'Due Today!'
                    : isTomorrow
                    ? 'Due Tomorrow'
                    : `Due in ${asg.diffDays} days`;

                  return (
                    <div
                      key={asg.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: asg.courseColor }}
                          >
                            {asg.courseCode}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                            {asg.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Due {new Date(asg.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {asg.formattedTime}
                        </p>
                      </div>

                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold shrink-0 ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: UPCOMING EXAM ALERT */}
          {upcomingExams.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Exam Warning: Approaching in Next 7 Days</span>
              </span>

              <div className="space-y-2">
                {upcomingExams.map(ex => {
                  const countdownText =
                    ex.diffDays === 0
                      ? 'Exam is Today!'
                      : ex.diffDays === 1
                      ? 'Exam Tomorrow!'
                      : `In ${ex.diffDays} days (${new Date(ex.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })})`;

                  return (
                    <div
                      key={ex.id}
                      className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {ex.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-semibold">
                            {ex.courseCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                          ⚠️ Make sure to study! Exam is {countdownText}.
                        </p>
                        {ex.room && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Location: {ex.room} • Weight: {ex.weightPercentage}%
                          </p>
                        )}
                      </div>

                      <span className="px-2.5 py-1 rounded-md bg-amber-500 text-white font-bold text-[10px] shrink-0">
                        {ex.diffDays === 0 ? 'Today' : `${ex.diffDays}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={dontShowAgainToday}
              onChange={e => setDontShowAgainToday(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Don't show again today</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleStartFocus}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Play className="w-3 h-3 text-emerald-600" />
              <span>Start 25m Focus</span>
            </button>

            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center justify-center gap-1 transition-colors shadow-2xs"
            >
              <span>Let's Study</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
