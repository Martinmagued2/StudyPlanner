import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { MeetingSlot } from '../../../types';
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
  HelpCircle
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
    openQuickCreate
  } = useApp();

  const [timeWindow, setTimeWindow] = useState<number>(45);

  // Counters
  const openTasks = tasks.filter(t => !t.completed);
  const dueSoonAssignments = assignments.filter(a => a.status !== 'completed');
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueFlashcards = flashcards.filter(f => f.dueDate <= todayStr);
  const upcomingExams = exams;

  // Next Class Logic dynamically derived from courses
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayNum = new Date().getDay();
  const currentDayName = days[currentDayNum];
  const todayClasses = courses.flatMap(c =>
    (c.meetingSlots || [])
      .filter((s: MeetingSlot) => s.day === currentDayNum)
      .map((s: MeetingSlot) => ({
        code: c.code,
        name: c.name,
        time: `${s.startTime} - ${s.endTime}`,
        location: s.location || c.location || 'Campus Room',
        type: s.type || 'Lecture',
        color: c.color,
        courseId: c.id,
        instructor: c.instructor
      }))
  );

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ask AI (Ctrl+J)</span>
          </button>
          <button
            onClick={() => startFocusTimer(25)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 shadow-xs"
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
              Next Scheduled Class
            </div>
            {todayClasses.length > 0 ? (
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {todayClasses[0].time}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold">Today</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {todayClasses[0].code} — {todayClasses[0].location}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {todayClasses[0].name}
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{todayClasses[0].instructor}</span>
                  <button
                    onClick={() => navigateToCourse(todayClasses[0].courseId)}
                    className="text-blue-600 hover:underline flex items-center gap-0.5"
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
                  {courses.length === 0 ? 'No courses added yet' : 'No classes scheduled today'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {courses.length === 0
                    ? 'Tell Ask AI what classes you have to build your timetable schedule.'
                    : 'Check the Timetable tab for the rest of your week.'}
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
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color }} />
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {cls.code}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {cls.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {cls.name}
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
