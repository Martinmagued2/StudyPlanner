import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  FileCheck2,
  Share2,
  RefreshCw,
  Filter
} from 'lucide-react';
import { CalendarEvent, EventType } from '../../../types';

export const CalendarView: React.FC = () => {
  const { events, assignments, courses, openQuickCreate, syncIntegration } = useApp();

  const [calendarMode, setCalendarMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Combine calendar events with assignment deadlines
  const assignmentDeadlinesAsEvents: CalendarEvent[] = assignments.map(asg => {
    const course = courses.find(c => c.id === asg.courseId);
    return {
      id: `deadline_${asg.id}`,
      title: `Due: ${asg.title}`,
      description: asg.description,
      start: asg.dueDate,
      end: asg.dueDate,
      allDay: false,
      type: 'deadline',
      courseId: asg.courseId,
      provider: 'local',
      assignmentId: asg.id
    };
  });

  const allItems = [...events, ...assignmentDeadlinesAsEvents];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Academic Calendar & Deadlines
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Integrated deadlines, milestones, external calendar entries, and course office hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar mode switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs font-medium">
            {(['month', 'week', 'agenda'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setCalendarMode(mode)}
                className={`px-3 py-1 rounded capitalize transition-colors ${
                  calendarMode === mode
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-500'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => syncIntegration('google')}
            className="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            title="Sync external calendars"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => openQuickCreate('event')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Month Navigator Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
        >
          Today
        </button>
      </div>

      {/* Mode Render */}
      {calendarMode === 'month' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {/* Days of Week */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-center text-xs font-semibold text-slate-500 py-2.5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Matrix */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty_${i}`} className="min-h-[100px] p-2 bg-slate-50/30 dark:bg-slate-950/10 text-slate-300" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = allItems.filter(e => e.start.startsWith(dateStr));
              const isToday = new Date().toISOString().slice(0, 10) === dateStr;

              return (
                <div
                  key={dayNum}
                  className={`min-h-[110px] p-2 relative flex flex-col space-y-1 transition-colors ${
                    isToday ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-mono ${
                      isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayEvents.length} items
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[85px] pt-1">
                    {dayEvents.map(evt => {
                      const isDeadline = evt.type === 'deadline';
                      return (
                        <div
                          key={evt.id}
                          className={`p-1 rounded text-[10px] truncate leading-tight font-medium ${
                            isDeadline
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
                              : 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                          }`}
                          title={`${evt.title} (${evt.type})`}
                        >
                          {evt.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {calendarMode === 'agenda' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 p-2">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No events or deadlines recorded.</div>
          ) : (
            allItems.map(evt => (
              <div key={evt.id} className="p-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{evt.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono capitalize">
                      {evt.type}
                    </span>
                    {evt.provider !== 'local' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 font-mono uppercase">
                        {evt.provider}
                      </span>
                    )}
                  </div>
                  {evt.description && <p className="text-[11px] text-slate-500 mt-0.5">{evt.description}</p>}
                </div>
                <div className="text-[11px] text-slate-400 font-mono shrink-0">
                  {new Date(evt.start).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
