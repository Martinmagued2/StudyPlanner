import React, { useState } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { getLiveScheduleStatus } from '../../services/academicScheduleService';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  CheckSquare,
  FileText,
  Clock,
  Calendar,
  Inbox,
  FolderArchive,
  Sparkles,
  HelpCircle,
  Award,
  Network,
  Calculator,
  Bell,
  PlugZap,
  HardDriveDownload,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Moon,
  Sun,
  Timer,
  X,
  Smartphone,
  LogOut,
  Bot
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    courses,
    navigateToCourse,
    selectedCourseId,
    tasks,
    assignments,
    inboxItems,
    flashcards,
    exams,
    theme,
    setTheme,
    openQuickCreate,
    focusState,
    startFocusTimer,
    user,
    setIsAiDrawerOpen,
    isMobileNavOpen,
    setIsMobileNavOpen,
    setIsSyncModalOpen,
    logout
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const liveSchedule = getLiveScheduleStatus(courses);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // Live Counts
  const openTasksCount = tasks.filter(t => !t.completed).length;
  const dueSoonAssignmentsCount = assignments.filter(a => a.status !== 'completed').length;
  const unreadInboxCount = inboxItems.filter(i => !i.processed).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueFlashcardsCount = flashcards.filter(f => f.dueDate <= todayStr).length;
  const upcomingExamsCount = exams.length;

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'today', label: 'Today', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'ai-tutor', label: 'Ask AI Tutor', icon: <Bot className="w-4 h-4 text-blue-500" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" />, badge: courses.length },
    { id: 'assignments', label: 'Assignments', icon: <FileCheck2 className="w-4 h-4" />, badge: dueSoonAssignmentsCount },
    { id: 'tasks', label: 'Tasks & To-Do', icon: <CheckSquare className="w-4 h-4" />, badge: openTasksCount },
    { id: 'notes', label: 'Notes & Editor', icon: <FileText className="w-4 h-4" /> },
    { id: 'schedule', label: 'Class Schedule', icon: <Clock className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'inbox', label: 'Inbox & Capture', icon: <Inbox className="w-4 h-4" />, badge: unreadInboxCount },
    { id: 'files', label: 'File Library', icon: <FolderArchive className="w-4 h-4" /> },
    { id: 'studyhub', label: 'Study Hub', icon: <Sparkles className="w-4 h-4" />, badge: dueFlashcardsCount },
    { id: 'quizzes', label: 'AI Quizzes', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'exams', label: 'Exams & Revision', icon: <Award className="w-4 h-4" />, badge: upcomingExamsCount },
    { id: 'grades', label: 'Grades & GPA', icon: <Calculator className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <PlugZap className="w-4 h-4" /> },
    { id: 'reminders', label: 'Reminders & Logs', icon: <Bell className="w-4 h-4" /> },
    { id: 'backups', label: 'Backup & Restore', icon: <HardDriveDownload className="w-4 h-4" /> },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-slate-800">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-sm">
                  N
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-none">
                    Nook Workspace
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Academic Intelligence
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsMobileNavOpen(false);
                  openQuickCreate('task');
                }}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setIsSyncModalOpen(true);
                }}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Sync</span>
              </button>
            </div>

            {/* Navigation Links Scrollable */}
            <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {navItems.map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name?.slice(0, 2).toUpperCase() || 'ST'}
                </div>
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {user?.name || 'Student'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex relative flex-col border-r bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-200 select-none z-30 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-sm">
            N
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                Nook
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Academic Workspace
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Action Button */}
      {!isCollapsed ? (
        <div className="p-3 pb-1">
          <button
            onClick={() => openQuickCreate('task')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Create</span>
            <kbd className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-mono">Ctrl+T</kbd>
          </button>
        </div>
      ) : (
        <div className="p-2 flex justify-center">
          <button
            onClick={() => openQuickCreate('task')}
            className="p-2 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
            title="Quick Create"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2 py-1 tracking-wider uppercase">
          {!isCollapsed && 'Workspace'}
        </div>
        {navItems.slice(0, 7).map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {/* Courses Section with Colors */}
        {!isCollapsed && (
          <div className="pt-3 pb-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              <span>My Courses</span>
              <button
                onClick={() => openQuickCreate('assignment')}
                className="hover:text-slate-700 dark:hover:text-slate-200"
                title="Add Course"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {courses.map(course => {
                const isSelected = activeView === 'course-detail' && selectedCourseId === course.id;
                return (
                  <button
                    key={course.id}
                    onClick={() => navigateToCourse(course.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="truncate">{course.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Intelligence & Advanced Tools */}
        <div className="pt-3 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2 py-1 tracking-wider uppercase">
          {!isCollapsed && 'Intelligence'}
        </div>
        {navItems.slice(7).map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Next Class / Workspace Status card in sidebar */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          {courses.length === 0 ? (
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-medium">Workspace Status</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Empty & Ready</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                0 active courses
              </div>
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(true)}
                className="mt-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Ask AI to add course</span>
              </button>
            </div>
          ) : activeView === 'course-detail' && selectedCourse ? (
            <button
              type="button"
              onClick={() => navigateToCourse(selectedCourse.id)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedCourse.color }} />
                  Active Course
                </span>
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-500">Details →</span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedCourse.code} — {selectedCourse.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {selectedCourse.instructor} • {selectedCourse.location || 'Campus'}
              </div>
            </button>
          ) : liveSchedule.activeOrNextClass.status === 'happening_now' && liveSchedule.currentClass ? (
            <button
              type="button"
              onClick={() => navigateToCourse(liveSchedule.currentClass!.courseId)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  In Session Now
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {liveSchedule.currentClass.remainingMinutes}m left
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {liveSchedule.currentClass.courseCode} — {liveSchedule.currentClass.courseName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {liveSchedule.currentClass.time} • {liveSchedule.currentClass.location}
              </div>
            </button>
          ) : liveSchedule.activeOrNextClass.classItem ? (
            <button
              type="button"
              onClick={() => navigateToCourse(liveSchedule.activeOrNextClass.classItem!.courseId)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-blue-500" />
                  Next Class
                </span>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {liveSchedule.activeOrNextClass.badgeLabel}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {liveSchedule.activeOrNextClass.classItem.courseCode} — {liveSchedule.activeOrNextClass.classItem.courseName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {liveSchedule.activeOrNextClass.subLabel} • {liveSchedule.activeOrNextClass.classItem.location}
              </div>
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-medium">Academic Workspace</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{courses.length} enrolled</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                All Courses Active
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                No classes scheduled for today
              </div>
            </div>
          )}
        </div>
      )}

      {/* User & Theme Toggle Footer */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-medium text-xs text-slate-700 dark:text-slate-200 shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || 'AR'}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                {user?.name || 'Alex Rivera'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.isDemo ? 'Demo Workspace' : user?.email}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-medium text-xs text-slate-700 dark:text-slate-200">
            {user?.name?.slice(0, 2).toUpperCase() || 'AR'}
          </div>
        )}

        {!isCollapsed && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </aside>
  </>
  );
};
