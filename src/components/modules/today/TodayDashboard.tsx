import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { MeetingSlot, AcademicMode } from '../../../types';
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
  ListChecks,
  ArrowUp,
  ArrowDown,
  Edit3,
  Trash2,
  MapPin,
  Info,
  Zap,
  Settings,
  X,
  Check
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
    updateDailyPlanBlock,
    deleteDailyPlanBlock,
    moveDailyPlanBlock,
    addCustomDailyPlanBlock,
    adaptDailyPlan,
    academicConfig,
    updateAcademicConfig,
    activeAcademicMode,
    isClassSuspendedOnDate,
    aiMemories,
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
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editBlockTime, setEditBlockTime] = useState('');
  const [editBlockTitle, setEditBlockTitle] = useState('');
  const [showAddBlockForm, setShowAddBlockForm] = useState(false);
  const [newBlockStart, setNewBlockStart] = useState('14:00');
  const [newBlockEnd, setNewBlockEnd] = useState('15:00');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockType, setNewBlockType] = useState<'study' | 'review' | 'break' | 'class'>('study');
  const [showExplanation, setShowExplanation] = useState(true);

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
  const isExamMode = activeAcademicMode === 'midterm' || activeAcademicMode === 'final';
  const isHolidayOrSuspendedToday = isClassSuspendedOnDate(todayStr);

  // Regular classes are suspended during Midterm Mode, Final Exam Mode, or University Holidays
  const liveSchedule = getLiveScheduleStatus(isExamMode ? [] : courses);
  const todayClasses = isExamMode
    ? []
    : liveSchedule.todayClasses.filter(cls => !isClassSuspendedOnDate(todayStr, cls.courseId));
  const activeOrNext = isExamMode || isHolidayOrSuspendedToday
    ? { status: 'none' as const, classItem: null, badgeLabel: '', subLabel: '' }
    : liveSchedule.activeOrNextClass;

  // Filtered exams for current mode or all upcoming exams
  const modeExams = exams
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
    .filter(e => {
      if (activeAcademicMode === 'midterm') {
        if (e.examType && e.examType !== 'midterm') return false;
      } else if (activeAcademicMode === 'final') {
        if (e.examType && e.examType !== 'final') return false;
      }
      return e.diffDays >= -1;
    })
    .sort((a, b) => a.diffDays - b.diffDays);

  const todayExams = modeExams.filter(e => e.date === todayStr || e.diffDays === 0);

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

      {/* ACADEMIC PERIOD / MODE BANNER & SWITCHER */}
      <div className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        activeAcademicMode === 'midterm'
          ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80'
          : activeAcademicMode === 'final'
          ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
      }`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold ${
            activeAcademicMode === 'midterm'
              ? 'bg-amber-600 text-white'
              : activeAcademicMode === 'final'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          }`}>
            {activeAcademicMode === 'normal' ? <Calendar className="w-4 h-4" /> : <Award className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeAcademicMode === 'midterm'
                  ? 'Midterm Examination Week Mode'
                  : activeAcademicMode === 'final'
                  ? 'Final Examination Period Mode'
                  : 'Normal Semester Teaching Mode'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                activeAcademicMode === 'midterm'
                  ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/80 dark:text-amber-100'
                  : activeAcademicMode === 'final'
                  ? 'bg-rose-200/80 text-rose-900 dark:bg-rose-900/80 dark:text-rose-100'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {academicConfig.modePreference === 'auto' ? 'Auto Date-Synced' : 'Manual Mode'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              {activeAcademicMode === 'midterm'
                ? 'Regular weekly lectures are temporarily suspended. Dashboard and AI planner are focused exclusively on your Midterm Exams & Revision.'
                : activeAcademicMode === 'final'
                ? 'Regular weekly lectures are temporarily suspended. Dashboard and AI planner are dedicated to your Final Examinations & Readiness.'
                : 'Regular weekly class timetable is active. Switch modes anytime or configure exam week dates in Settings.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {([
            { id: 'auto', label: 'Auto' },
            { id: 'normal', label: 'Normal Semester' },
            { id: 'midterm', label: 'Midterm Week' },
            { id: 'final', label: 'Final Exams' }
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => updateAcademicConfig({ modePreference: opt.id })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                academicConfig.modePreference === opt.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setActiveView('settings')}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
            title="Configure Academic Calendar & Exam Period Dates"
          >
            <Settings className="w-3.5 h-3.5" />
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

          {/* Plan My Day Table (Intelligent & Realistic AI Daily Planner) */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Plan My Day — Intelligent Study Timetable
                  </h2>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-semibold">
                    {activeAcademicMode === 'midterm'
                      ? 'Midterm Revision Mode'
                      : activeAcademicMode === 'final'
                      ? 'Finals Revision Mode'
                      : 'AI Conflict-Free Planner'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Respects class timetable, exam schedules, deadline weights, realistic breaks, and your AI memories.
                </p>
              </div>

              {/* Adaptive Daily Planning & Replan Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => adaptDailyPlan('completed_early')}
                  className="px-2 py-1 text-[11px] font-medium rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                  title="Finished a task early? Pull forward or suggest the next best task"
                >
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>Done Early</span>
                </button>
                <button
                  onClick={() => adaptDailyPlan('missed_session')}
                  className="px-2 py-1 text-[11px] font-medium rounded border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 flex items-center gap-1 transition-colors"
                  title="Missed a study session? Reorganize remaining day around current time"
                >
                  <RotateCcw className="w-3 h-3 text-amber-600" />
                  <span>Missed Session</span>
                </button>
                <button
                  onClick={() => setShowAddBlockForm(prev => !prev)}
                  className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                  title="Manually add a block to today's plan"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Block</span>
                </button>
                <button
                  onClick={regenerateDailyPlan}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1 transition-colors"
                  title="Generate fresh intelligent plan for today"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Plan My Day</span>
                </button>
              </div>
            </div>

            {/* Memory Transparency Banner */}
            {(dailyPlan.explanation?.memoriesApplied && dailyPlan.explanation.memoriesApplied.length > 0) || aiMemories.length > 0 ? (
              <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-start justify-between gap-2 text-[11px]">
                <div className="flex items-start gap-2 text-blue-900 dark:text-blue-200">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Personalized using your preferences: </span>
                    <span className="text-blue-800 dark:text-blue-300">
                      {(dailyPlan.explanation?.memoriesApplied && dailyPlan.explanation.memoriesApplied.length > 0
                        ? dailyPlan.explanation.memoriesApplied
                        : aiMemories.slice(0, 3).map(m => m.fact)
                      ).join(' • ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiDrawerOpen(true)}
                  className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 hover:underline shrink-0"
                >
                  Edit Memory
                </button>
              </div>
            ) : null}

            {/* Manual Add Block Form */}
            {showAddBlockForm && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!newBlockTitle.trim()) return;
                  addCustomDailyPlanBlock({
                    time: `${newBlockStart} - ${newBlockEnd}`,
                    startTime: newBlockStart,
                    endTime: newBlockEnd,
                    title: newBlockTitle.trim(),
                    type: newBlockType,
                    completed: false,
                    reason: 'Manually added by you'
                  });
                  setNewBlockTitle('');
                  setShowAddBlockForm(false);
                }}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>Add Custom Schedule Block</span>
                  <button type="button" onClick={() => setShowAddBlockForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Activity or study topic..."
                    value={newBlockTitle}
                    onChange={e => setNewBlockTitle(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={newBlockStart}
                      onChange={e => setNewBlockStart(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="time"
                      value={newBlockEnd}
                      onChange={e => setNewBlockEnd(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={newBlockType}
                      onChange={e => setNewBlockType(e.target.value as 'study' | 'review' | 'break' | 'class')}
                      className="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="study">Study</option>
                      <option value="review">Revision</option>
                      <option value="break">Break</option>
                      <option value="class">Commitment</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            )}

            {dailyPlan.blocks.length === 0 ? (
              <div className="py-6 text-center space-y-2 text-xs text-slate-400">
                <p>No scheduled blocks yet. Click "Plan My Day" to generate a realistic, conflict-free schedule.</p>
                <button
                  onClick={regenerateDailyPlan}
                  className="px-3 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Today's Plan</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 py-1">
                {dailyPlan.blocks.map((block, index) => {
                  const isEditingThis = editingBlockId === block.id;
                  return (
                    <div
                      key={block.id}
                      className={`py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs rounded-md transition-colors group ${
                        block.completed ? 'opacity-50 bg-slate-50/40 dark:bg-slate-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => toggleDailyPlanBlock(block.id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mt-0.5 sm:mt-0 shrink-0"
                          title={block.completed ? 'Mark incomplete' : 'Mark completed'}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${block.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                        </button>

                        {isEditingThis ? (
                          <div className="flex flex-wrap items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editBlockTime}
                              onChange={e => setEditBlockTime(e.target.value)}
                              className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                              placeholder="09:00 - 10:00"
                            />
                            <input
                              type="text"
                              value={editBlockTitle}
                              onChange={e => setEditBlockTitle(e.target.value)}
                              className="flex-1 min-w-[160px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateDailyPlanBlock(block.id, {
                                  time: editBlockTime.trim() || block.time,
                                  title: editBlockTitle.trim() || block.title
                                });
                                setEditingBlockId(null);
                              }}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBlockId(null)}
                              className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-slate-900 dark:text-slate-100 ${block.completed ? 'line-through' : ''}`}>
                                {block.title}
                              </span>
                              {block.priority === 'critical' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  Priority
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                              <span className="font-mono font-medium text-slate-600 dark:text-slate-400">{block.time}</span>
                              {block.reason && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500 dark:text-slate-400 italic">{block.reason}</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {!block.completed && (block.type === 'study' || block.type === 'review') && (
                          <button
                            onClick={() => startFocusTimer(block.durationMinutes || 45, block.taskId, block.courseId, block.title)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                            title="Start Focus Timer for this block"
                          >
                            <Play className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Focus</span>
                          </button>
                        )}

                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                          block.type === 'class' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                          block.type === 'exam' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold' :
                          block.type === 'study' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                          block.type === 'review' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {block.type}
                        </span>

                        {/* Manual Reorder / Edit / Delete Controls */}
                        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveDailyPlanBlock(block.id, 'up')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                            title="Move earlier"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === dailyPlan.blocks.length - 1}
                            onClick={() => moveDailyPlanBlock(block.id, 'down')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                            title="Move later"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBlockId(block.id);
                              setEditBlockTime(block.time);
                              setEditBlockTitle(block.title);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                            title="Edit time or title"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDailyPlanBlock(block.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                            title="Remove from today's plan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Plan Explanation Section (Why prioritized, Deadlines considered, What was postponed) */}
            {dailyPlan.explanation && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowExplanation(prev => !prev)}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Why this schedule was generated (AI Reasoning & Prioritization)</span>
                  </span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400">
                    {showExplanation ? 'Hide Details' : 'Show Details'}
                  </span>
                </button>

                {showExplanation && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {dailyPlan.explanation.summary}
                    </div>
                    {dailyPlan.explanation.academicModeReason && (
                      <div className="p-2 rounded bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
                        <strong>Academic Period Rule:</strong> {dailyPlan.explanation.academicModeReason}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dailyPlan.explanation.prioritizationReasons.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                            Why Tasks Were Prioritized
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                            {dailyPlan.explanation.prioritizationReasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {dailyPlan.explanation.deadlinesConsidered.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                            Deadlines & Exams Influencing Plan
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                            {dailyPlan.explanation.deadlinesConsidered.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {dailyPlan.explanation.postponedItems.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 space-y-1">
                        <div className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[10px]">
                          Postponed to Prevent Daily Overload ({dailyPlan.explanation.postponedItems.length})
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                          {dailyPlan.explanation.postponedItems.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mode-Aware Schedule (Midterm/Final Examination Hub OR Normal Classes) & Daily Review */}
        <div className="space-y-6">
          {isExamMode ? (
            <>
              {/* MIDTERM / FINAL EXAMINATION MODE SCHEDULE CARD */}
              <div className={`p-4 sm:p-5 rounded-xl border shadow-sm space-y-3 ${
                activeAcademicMode === 'midterm'
                  ? 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900'
                  : 'border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    activeAcademicMode === 'midterm'
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {activeAcademicMode === 'midterm' ? 'Midterm Week Active' : 'Final Exam Period Active'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    Regular Classes Suspended
                  </span>
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {todayExams.length > 0
                      ? `Today's Examination Schedule (${todayExams.length})`
                      : activeAcademicMode === 'midterm'
                      ? 'Midterm Examination Timetable'
                      : 'Final Examination Timetable'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Weekly lectures are paused during this period and will automatically return when the exam period ends.
                  </p>
                </div>

                {/* Today's Exams Highlight */}
                {todayExams.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {todayExams.map(ex => (
                      <div
                        key={ex.id}
                        className="p-3 rounded-lg border-2 border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase">
                            Exam Today • {ex.startTime || '09:00'} – {ex.endTime || '11:00'}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-rose-800 dark:text-rose-300">
                            {ex.courseCode}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {ex.name}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                          <span>📍 {ex.room || 'Main Exam Hall'}</span>
                          {ex.building && <span>• {ex.building}</span>}
                          {ex.instructions && <span>• Note: {ex.instructions}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Complete Midterm / Final Exam Schedule List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Scheduled Examinations ({modeExams.length})</span>
                    <button
                      onClick={() => openQuickCreate('exam')}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold normal-case"
                    >
                      + Add Exam
                    </button>
                  </div>

                  {modeExams.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <Award className="w-6 h-6 text-amber-500 mx-auto" />
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        No {activeAcademicMode === 'midterm' ? 'Midterm' : 'Final'} Exams Logged Yet
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Add your exam dates, times, rooms, and instructions so the AI planner can build your revision schedule.
                      </p>
                      <button
                        onClick={() => openQuickCreate('exam')}
                        className="px-3 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold"
                      >
                        + Add {activeAcademicMode === 'midterm' ? 'Midterm' : 'Final'} Exam
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {modeExams.map(ex => (
                        <div
                          key={ex.id}
                          onClick={() => setActiveView('exams')}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-amber-400 transition-colors cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: ex.courseColor }}
                              />
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                {ex.courseCode}: {ex.name}
                              </span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              ex.diffDays === 0
                                ? 'bg-rose-600 text-white'
                                : ex.diffDays === 1
                                ? 'bg-amber-500 text-white'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {ex.diffDays === 0 ? 'Today' : ex.diffDays === 1 ? 'Tomorrow' : `In ${ex.diffDays}d`}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono flex items-center justify-between">
                            <span>{new Date(ex.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            <span>{ex.startTime || '09:00'} – {ex.endTime || '11:00'}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{ex.room || 'Exam Hall'}{ex.building ? ` (${ex.building})` : ''}</span>
                            </span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              Readiness: {ex.readinessPercent}%
                            </span>
                          </div>

                          {/* Course Preparation Progress Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${ex.readinessPercent || 20}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Next Class Banner & Countdown (Normal Semester Mode) */}
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
                      {isHolidayOrSuspendedToday
                        ? 'University Holiday / Classes Cancelled Today'
                        : courses.length === 0
                        ? 'No courses added yet'
                        : 'No upcoming classes scheduled'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isHolidayOrSuspendedToday
                        ? 'Regular classes are suspended today per your Academic Calendar settings.'
                        : courses.length === 0
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
                        key={`${cls.courseId}_${cls.time}_${idx}`}
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
            </>
          )}

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
