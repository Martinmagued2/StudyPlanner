import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, BookOpen, FileCheck2, Award, Info, X } from 'lucide-react';

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
