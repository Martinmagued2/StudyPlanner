import React from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { LayoutDashboard, Calendar, BookOpen, CheckSquare, Plus, Menu } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, openQuickCreate, setIsMobileNavOpen } = useApp();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-40 px-3 py-1 flex items-center justify-between safe-area-bottom">
      {/* Today */}
      <button
        onClick={() => setActiveView('today')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[10px] font-medium transition-colors ${
          activeView === 'today'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>Today</span>
      </button>

      {/* Schedule */}
      <button
        onClick={() => setActiveView('schedule')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[10px] font-medium transition-colors ${
          activeView === 'schedule'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>Schedule</span>
      </button>

      {/* Centered Floating Quick Create */}
      <button
        onClick={() => openQuickCreate()}
        className="p-2 -mt-3 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-2 border-white dark:border-slate-900"
        title="Quick Create"
        aria-label="Quick Create"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Courses */}
      <button
        onClick={() => setActiveView('courses')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[10px] font-medium transition-colors ${
          activeView === 'courses' || activeView === 'course-detail'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>Courses</span>
      </button>

      {/* Full Menu Drawer Trigger */}
      <button
        onClick={() => setIsMobileNavOpen(true)}
        className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        title="Full Menu & Tools"
      >
        <Menu className="w-4 h-4" />
        <span>Menu</span>
      </button>
    </div>
  );
};
