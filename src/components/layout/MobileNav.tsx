import React from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { LayoutDashboard, BookOpen, CheckSquare, Sparkles, FolderArchive, Plus } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, openQuickCreate } = useApp();

  const items: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'studyhub', label: 'Study Hub', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'files', label: 'Files', icon: <FolderArchive className="w-4 h-4" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-40 px-2 py-1.5 flex items-center justify-around">
      {items.map(item => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center gap-0.5 p-1 rounded-md text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* Floating Plus button */}
      <button
        onClick={() => openQuickCreate('task')}
        className="p-2 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md"
        title="Quick Create"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
