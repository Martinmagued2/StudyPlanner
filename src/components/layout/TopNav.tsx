import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Bell,
  Plus,
  Play,
  Pause,
  Timer,
  Square,
  CheckCheck,
  BookOpen,
  FileCheck2,
  Award,
  Info,
  X
} from 'lucide-react';

export const NotificationCenter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, setActiveView } = useApp();

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'class': return <BookOpen className="w-3.5 h-3.5 text-emerald-600" />;
      case 'exam': return <Award className="w-3.5 h-3.5 text-amber-600" />;
      default: return <Info className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const handleNotificationClick = (n: any) => {
    markNotificationRead(n.id);
    if (n.link) {
      setActiveView(n.link);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllNotificationsRead}
            className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            <span>Mark all read</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-1">
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No notifications right now
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-2.5 flex items-start gap-2.5 rounded-md cursor-pointer transition-colors ${
                n.read
                  ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${n.read ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-1">{n.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const TopNav: React.FC = () => {
  const {
    activeView,
    selectedCourseId,
    courses,
    goBack,
    goForward,
    navHistory,
    setIsCommandPaletteOpen,
    setIsAiDrawerOpen,
    openQuickCreate,
    notifications,
    focusState,
    pauseFocusTimer,
    resumeFocusTimer,
    stopFocusTimer
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentCourse = courses.find(c => c.id === selectedCourseId);

  // Format Timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getBreadcrumbs = () => {
    const base = 'Workspace';
    if (activeView === 'today') return `${base} / Today`;
    if (activeView === 'courses') return `${base} / Courses`;
    if (activeView === 'course-detail') return `${base} / Courses / ${currentCourse?.code || 'Detail'}`;
    if (activeView === 'assignments') return `${base} / Assignments`;
    if (activeView === 'tasks') return `${base} / Tasks & To-Do`;
    if (activeView === 'notes') return `${base} / Notes`;
    if (activeView === 'schedule') return `${base} / Timetable Schedule`;
    if (activeView === 'calendar') return `${base} / Calendar`;
    if (activeView === 'inbox') return `${base} / Inbox Capture`;
    if (activeView === 'files') return `${base} / File Library & AI Reading`;
    if (activeView === 'studyhub') return `${base} / Study Hub (Flashcards & Focus)`;
    if (activeView === 'ai-tutor') return `${base} / Academic AI Tutor`;
    if (activeView === 'quizzes') return `${base} / AI Quizzes & Diagnostics`;
    if (activeView === 'exams') return `${base} / Exams & Revision Planning`;
    if (activeView === 'grades') return `${base} / Grades & GPA Target Calculator`;
    if (activeView === 'integrations') return `${base} / External Integrations`;
    if (activeView === 'reminders') return `${base} / Reminders & Dispatch Logs`;
    if (activeView === 'backups') return `${base} / Data Protection & Snapshots`;
    if (activeView === 'trash') return `${base} / Trash`;
    if (activeView === 'settings') return `${base} / Settings`;
    return base;
  };

  return (
    <header className="h-13 px-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-between sticky top-0 z-20">
      {/* History & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            className="p-1.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            className="p-1.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Go forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline-block">
          {getBreadcrumbs()}
        </span>
      </div>

      {/* Center Search Pill */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search courses, notes, tasks, files...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Active Focus Timer Pill */}
        {focusState.isRunning && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <Timer className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {formatTime(focusState.timeLeft)}
            </span>
            <button
              onClick={pauseFocusTimer}
              className="p-1 hover:text-slate-900 dark:hover:text-white"
              title="Pause timer"
            >
              <Pause className="w-3 h-3" />
            </button>
            <button
              onClick={stopFocusTimer}
              className="p-1 text-slate-400 hover:text-rose-600"
              title="Stop & log session"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Global Ask AI button */}
        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Ask AI Assistant (Ctrl+J)"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Ask AI</span>
          <kbd className="hidden md:inline text-[10px] text-slate-400 font-mono ml-0.5">Ctrl+J</kbd>
        </button>

        {/* Quick Create Button */}
        <button
          onClick={() => openQuickCreate()}
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Quick Create (Ctrl+T)"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {isNotifOpen && (
            <NotificationCenter onClose={() => setIsNotifOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
};
