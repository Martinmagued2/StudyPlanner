import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { MeetingSlot } from '../../../types';
import { getLiveScheduleStatus } from '../../../services/academicScheduleService';
import {
  CheckSquare,
  FileCheck2,
  Clock,
  Sparkles,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  ChevronRight,
  TrendingUp,
  Brain,
  AlertCircle,
  Plus,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Sun,
  Smartphone,
  Flame,
  ShieldAlert,
  ListChecks
} from 'lucide-react';

export const TodayDashboard: React.FC = () => {
  const {
    user,
    courses,
    tasks,
    assignments,
    flashcards,
    exams,
    dailyPlan,
    regenerateDailyPlan,
    toggleDailyPlanBlock,
    toggleTaskComplete,
    startFocusTimer,
    getWhatShouldIDoNow,
    setActiveView,
    navigateToCourse,
    setIsAiDrawerOpen,
    openQuickCreate,
    setIsBriefingOpen,
    setIsSyncModalOpen,
    updateAssignment,
    generateRevisionPlanForExam
  } = useApp();

  const [timeWindow, setTimeWindow] = useState<number>(45);

  // Counters
  const openTasks = tasks.filter(t => !t.completed);
  const dueSoonAssignments = assignments.filter(a => a.status !== 'completed');
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueFlashcards = flashcards.filter(f => f.dueDate <= todayStr);
  const upcomingExams = exams;

  // Academic Radar: Impending Deadlines & Exam Alert calculations
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const radarAssignments = assignments
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
        courseCode: course?.code || 'Coursework',
        courseName: course?.name || '',
        courseColor: course?.color || '#3b82f6',
        formattedTime: due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    })
    .filter(a => a.diffDays <= 7)
    .sort((a, b) => a.diffDays - b.diffDays);

  const radarExams = exams
    .map(e => {
      const exDate = new Date(e.date);
      const exMidnight = new Date(exDate);
      exMidnight.setHours(0, 0, 0, 0);
      const diffDays = Math.round((exMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const course = courses.find(c => c.id === e.courseId);
      return {
        ...e,
        diffDays,
        courseCode: course?.code || 'Exam',
        courseName: course?.name || '',
        courseColor: course?.color || '#d97706'
      };
    })
    .filter(e => e.diffDays >= 0 && e.diffDays <= 14)
    .sort((a, b) => a.diffDays - b.diffDays);

  // Live Schedule & Next Class Logic dynamically derived from courses
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayNum = new Date().getDay();
  const currentDayName = days[currentDayNum];
  const liveSchedule = getLiveScheduleStatus(courses);
  const todayClasses = liveSchedule.todayClasses;
  const activeOrNext = liveSchedule.activeOrNextClass;

  // What should I do now
  const recommendation = getWhatShouldIDoNow(timeWindow);

  // Daily Review stats
  const completedTasksCount = tasks.filter(t => t.completed).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Greeting & Live Stats Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Good day, {user?.name || 'Student'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {courses.length === 0
              ? 'Your workspace is brand new and ready for your courses.'
              : `Today is ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}. Here is your live overview.`}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsBriefingOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Open Morning Academic Briefing"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Today's Briefing</span>
          </button>
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-2xs"
            title="Sync with Phone or Tablet"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            <span>Sync to Phone</span>
          </button>
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ask AI (Ctrl+J)</span>
          </button>
          <button
            onClick={() => startFocusTimer(25)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 shadow-2xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start 25m Focus</span>
          </button>
        </div>
      </div>

      {/* Onboarding Guide Card when Workspace is Fresh / Empty */}
      {courses.length === 0 && (
        <div className="p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-900">
                <Sparkles className="w-3 h-3" />
                <span>Quick Start Guide</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                How to use the "Ask AI" button & set up your workspace
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                Your new account is completely empty with 0 courses. You can set up your entire semester in seconds either by chatting with Ask AI or using manual forms:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Step 1: Ask AI */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Use the Ask AI Button
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Click <strong>"Ask AI"</strong> (or press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px]">Ctrl+J</kbd>) and tell it: <em className="text-slate-900 dark:text-slate-200">"I am taking CS 101 on Mon & Wed at 10 AM"</em>. It will generate a course card with 1-click confirmation!
              </p>
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(true)}
                className="w-full py-1.5 px-2.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Ask AI (Ctrl+J)</span>
              </button>
            </div>

            {/* Step 2: Add Courses Manually */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Or Add Courses Manually
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Prefer a standard form? Navigate to the <strong>Courses</strong> tab to input your course titles, instructor names, rooms, colors, and credit weights.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('courses')}
                className="w-full py-1.5 px-2.5 text-xs font-semibold rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Go to Courses Tab</span>
              </button>
            </div>

            {/* Step 3: Quick Create Tasks */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Log Tasks & Coursework
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px]">Ctrl+T</kbd> to quick-create tasks or assignments. AI can break large coursework into 4–7 manageable study milestones!
              </p>
              <button
                type="button"
                onClick={() => openQuickCreate('task')}
                className="w-full py-1.5 px-2.5 text-xs font-semibold rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Create (Ctrl+T)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Live Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveView('tasks')}
          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Open Tasks</span>
            <CheckSquare className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {openTasks.length}
          </div>
          <span className="text-[11px] text-slate-400">
            {openTasks.length === 0 ? 'No pending tasks' : `${tasks.filter(t => t.priority === 'high' && !t.completed).length} high priority`}
          </span>
        </div>

        <div
          onClick={() => setActiveView('assignments')}
          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Due Coursework</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {dueSoonAssignments.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {dueSoonAssignments.length === 0 ? '0 assignments logged' : `${dueSoonAssignments.length} active`}
          </span>
        </div>

        <div
          onClick={() => setActiveView('studyhub')}
          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Flashcards Due</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {dueFlashcards.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {dueFlashcards.length === 0 ? 'No reviews due today' : 'SM-2 spaced repetition active'}
          </span>
        </div>

        <div
          onClick={() => setActiveView('exams')}
          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Upcoming Exams</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {upcomingExams.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {upcomingExams.length === 0 ? '0 upcoming exams' : `${upcomingExams.length} scheduled`}
          </span>
        </div>
      </div>

      {/* ACADEMIC RADAR: Near Exams & Deadline Assignments Alert Section */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Academic Radar: Imminent Deadlines & Exam Alert
                </h2>
                {radarAssignments.length + radarExams.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-bold">
                    {radarAssignments.length + radarExams.length} urgent
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Active alerts for assignments due in the next 7 days and exams approaching in the next 14 days.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => openQuickCreate('assignment')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Assignment</span>
            </button>
            <button
              onClick={() => openQuickCreate('exam')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Exam</span>
            </button>
          </div>
        </div>

        {/* Radar Content Grid */}
        {radarAssignments.length === 0 && radarExams.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  All Clear! No urgent deadlines or near exams.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  You have 0 coursework items due in the next 7 days and 0 exams in the next 2 weeks. Great pacing!
                </p>
              </div>
            </div>

            <button
              onClick={() => openQuickCreate('assignment')}
              className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0"
            >
              + Log New Deadline
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Column 1: Impending Deadlines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                <span className="flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Assignments Due Soon ({radarAssignments.length})</span>
                </span>
                <button
                  onClick={() => setActiveView('assignments')}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View All
                </button>
              </div>

              {radarAssignments.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>No assignment deadlines in the next 7 days.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {radarAssignments.map(asg => {
                    const isOverdue = asg.diffDays < 0;
                    const isToday = asg.diffDays === 0;
                    const isTomorrow = asg.diffDays === 1;

                    const countdownClass = isOverdue
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900 font-bold'
                      : isToday
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900 font-bold'
                      : isTomorrow
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 font-semibold'
                      : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';

                    const countdownText = isOverdue
                      ? `Overdue by ${Math.abs(asg.diffDays)}d`
                      : isToday
                      ? 'Due Today!'
                      : isTomorrow
                      ? 'Due Tomorrow'
                      : `Due in ${asg.diffDays} days`;

                    return (
                      <div
                        key={asg.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: asg.courseColor }}
                            >
                              {asg.courseCode}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {asg.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] border shrink-0 ${countdownClass}`}>
                              {countdownText}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Due {new Date(asg.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {asg.formattedTime}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => startFocusTimer(25, undefined, asg.courseId, 'Work on ' + asg.title)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs"
                            title="Start 25m Focus Session"
                          >
                            <Play className="w-3 h-3 text-emerald-600" />
                            <span>Focus</span>
                          </button>
                          <button
                            onClick={() => updateAssignment(asg.id, { status: 'completed' })}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-2xs"
                            title="Mark Assignment Complete"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Done</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 2: Approaching Exams */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>Approaching Exams (Next 14 Days) ({radarExams.length})</span>
                </span>
                <button
                  onClick={() => setActiveView('exams')}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  View Revision
                </button>
              </div>

              {radarExams.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>No exams scheduled in the next 14 days.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {radarExams.map(ex => {
                    const isUrgent = ex.diffDays <= 3;
                    const countdownBadgeClass = ex.diffDays === 0
                      ? 'bg-rose-500 text-white animate-pulse'
                      : ex.diffDays <= 3
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900 font-bold'
                      : ex.diffDays <= 7
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-900 font-semibold'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700';

                    const countdownLabel = ex.diffDays === 0
                      ? 'Exam Today!'
                      : ex.diffDays === 1
                      ? 'Exam Tomorrow!'
                      : `In ${ex.diffDays} days`;

                    return (
                      <div
                        key={ex.id}
                        className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isUrgent
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                            : 'bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {ex.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                              {ex.courseCode}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] shrink-0 ${countdownBadgeClass}`}>
                              {countdownLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900 dark:text-amber-300 font-medium flex items-center gap-1">
                            <span>⚠️ Study Reminder: Exam date {new Date(ex.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            {ex.room && <span>• Room: {ex.room}</span>}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => startFocusTimer(25, undefined, ex.courseId, 'Revision for ' + ex.name)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs"
                            title="Start 25m Exam Revision"
                          >
                            <Play className="w-3 h-3 text-emerald-600" />
                            <span>Revise</span>
                          </button>
                          <button
                            onClick={() => {
                              generateRevisionPlanForExam(ex.id);
                              setActiveView('exams');
                            }}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1 shadow-2xs"
                            title="Open AI Revision Plan"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Plan</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: What Should I Do Now & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: What Should I Do Now Recommendation Card (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* "What Should I Do Now?" Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    What should I do now?
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Deterministic ranking based on deadlines, exam proximity, and available time.
                  </p>
                </div>
              </div>

              {/* Time window selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs font-medium">
                {[15, 30, 45, 60, 90].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setTimeWindow(mins)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      timeWindow === mins
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendation Body */}
            {recommendation.topTask ? (
              <div className="pt-4 space-y-3">
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Recommended Action
                        </span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          {recommendation.reason}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {recommendation.topTask.title}
                      </h3>
                      {recommendation.topTask.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {recommendation.topTask.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => startFocusTimer(timeWindow, recommendation.topTask?.id, recommendation.topTask?.courseId)}
                      className="px-3.5 py-2 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Focus ({timeWindow}m)</span>
                    </button>
                  </div>
                </div>

                {/* Alternative Next Tasks */}
                {recommendation.alternatives.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Alternative Options ({recommendation.alternatives.length})
                    </span>
                    <div className="space-y-1">
                      {recommendation.alternatives.map(alt => (
                        <div
                          key={alt.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                        >
                          <span className="text-slate-700 dark:text-slate-300 truncate">
                            {alt.title}
                          </span>
                          <button
                            onClick={() => startFocusTimer(25, alt.id, alt.courseId)}
                            className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 ml-2 shrink-0 font-medium"
                          >
                            Start Focus
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-6 pb-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No pending study tasks in queue
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click <strong>Ask AI</strong> to set up courses or press <strong>Ctrl+T</strong> to create your first task.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setIsAiDrawerOpen(true)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Ask AI (Ctrl+J)
                  </button>
                  <button
                    onClick={() => openQuickCreate('task')}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    + Add Task (Ctrl+T)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Plan My Day Table */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Plan My Day — Study Timetable
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {dailyPlan.generatedBy === 'ai' ? 'AI Optimized' : 'Deterministic'}
                </span>
              </div>
              <button
                onClick={regenerateDailyPlan}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
                title="Replan Remaining Day"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Replan</span>
              </button>
            </div>

            {dailyPlan.blocks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No scheduled blocks yet. Add a course or task to generate your timetable plan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 py-1">
                {dailyPlan.blocks.map(block => (
                  <div
                    key={block.id}
                    className={`py-2.5 px-2 flex items-center justify-between gap-3 text-xs rounded-md transition-colors ${
                      block.completed ? 'opacity-50 line-through' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleDailyPlanBlock(block.id)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <CheckCircle2 className={`w-4 h-4 ${block.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                      </button>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {block.title}
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {block.time}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                      block.type === 'class' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                      block.type === 'study' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                      block.type === 'review' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {block.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today's Classes & Daily Review */}
        <div className="space-y-6">
          {/* Next Class Banner & Countdown */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {activeOrNext.status === 'happening_now' ? 'Class In Progress' : 'Next Scheduled Class'}
            </div>
            {activeOrNext.classItem ? (
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                    activeOrNext.status === 'happening_now'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {activeOrNext.status === 'happening_now' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    )}
                    {activeOrNext.classItem.time}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${
                    activeOrNext.status === 'happening_now' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {activeOrNext.badgeLabel}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {activeOrNext.classItem.courseCode} — {activeOrNext.classItem.location}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeOrNext.classItem.courseName}
                </p>
                <div className="text-[11px] text-slate-400 font-medium">
                  {activeOrNext.subLabel}
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{activeOrNext.classItem.instructor}</span>
                  <button
                    onClick={() => navigateToCourse(activeOrNext.classItem!.courseId)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <span>Open course</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                <Clock className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto" />
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {courses.length === 0 ? 'No courses added yet' : 'No upcoming classes scheduled'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {courses.length === 0
                    ? 'Tell Ask AI what classes you have to build your timetable schedule.'
                    : 'All sessions are complete for now. Check the Timetable tab for the rest of your week.'}
                </p>
                {courses.length === 0 && (
                  <button
                    onClick={() => setIsAiDrawerOpen(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Ask AI to add a course
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Today's Classes List */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Today's Classes ({todayClasses.length})
              </h2>
              <button
                onClick={() => setActiveView('schedule')}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Full Timetable
              </button>
            </div>

            {todayClasses.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                0 classes on {currentDayName}.
              </div>
            ) : (
              <div className="space-y-2">
                {todayClasses.map((cls, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigateToCourse(cls.courseId)}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color }} />
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                          {cls.courseCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cls.status === 'in_progress' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                            Live
                          </span>
                        )}
                        {cls.status === 'completed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            Done
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono capitalize">
                          {cls.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {cls.courseName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                      <span>{cls.time}</span>
                      <span>{cls.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Review Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Daily Review Summary</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:divide-slate-800">
                <span>Completed Tasks</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{completedTasksCount} items</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Unfinished Backlog</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{openTasks.length} tasks</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Courses Enrolled</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{courses.length} courses</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Study Workspace</span>
                <span className="font-semibold text-emerald-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
