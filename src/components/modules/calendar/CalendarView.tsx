import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  FileCheck2,
  Award,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import { Assignment, Exam, CalendarEvent, Course } from '../../../types';

interface UnifiedCalendarItem {
  id: string;
  originalId: string;
  sourceKind: 'event' | 'exam' | 'assignment';
  title: string;
  description?: string;
  dateStr: string; // YYYY-MM-DD (local)
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  allDay: boolean;
  courseId?: string;
  location?: string;
  type: string; // 'exam' | 'deadline' | 'event' | 'meeting' | 'milestone'
  provider?: string;
  meta?: {
    weightPercentage?: number;
    readinessPercent?: number;
    assignmentStatus?: string;
    priority?: string;
  };
}

export const CalendarView: React.FC = () => {
  const {
    events,
    assignments,
    exams,
    courses,
    openQuickCreate,
    syncIntegration,
    setActiveView
  } = useApp();

  const [calendarMode, setCalendarMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'exam' | 'assignment' | 'event'>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedItemDetail, setSelectedItemDetail] = useState<UnifiedCalendarItem | null>(null);

  // Helper: Normalize date to YYYY-MM-DD in local time
  const toLocalDateStr = (d: Date | string): string => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) {
      // In case string is already YYYY-MM-DD
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
      return '';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper: Extract HH:mm from ISO or time string
  const extractTimeStr = (isoOrTime?: string): string => {
    if (!isoOrTime) return '';
    if (/^\d{2}:\d{2}$/.test(isoOrTime)) return isoOrTime;
    if (/^\d{2}:\d{2}:/.test(isoOrTime)) return isoOrTime.slice(0, 5);
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Helper: Calculate duration label e.g. "09:00 - 11:30 (2h 30m)"
  const formatTimeRange = (start?: string, end?: string): string => {
    if (!start && !end) return '';
    if (start && end) {
      if (start === end) return start;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        const diffMin = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
        const durStr = diffMin > 0 ? ` (${Math.floor(diffMin / 60)}h${diffMin % 60 ? ` ${diffMin % 60}m` : ''})` : '';
        return `${start} – ${end}${durStr}`;
      }
      return `${start} – ${end}`;
    }
    return start || end || '';
  };

  // Unified items synthesis: events + assignments + exams
  const allUnifiedItems = useMemo<UnifiedCalendarItem[]>(() => {
    // 1. Calendar Events
    const eventItems: UnifiedCalendarItem[] = events.map(evt => {
      const dateStr = toLocalDateStr(evt.start);
      const startTime = evt.allDay ? undefined : extractTimeStr(evt.start);
      const endTime = evt.allDay ? undefined : extractTimeStr(evt.end);
      return {
        id: `event_${evt.id}`,
        originalId: evt.id,
        sourceKind: 'event',
        title: evt.title,
        description: evt.description,
        dateStr,
        startTime,
        endTime,
        allDay: !!evt.allDay,
        courseId: evt.courseId,
        location: evt.location,
        type: evt.type || 'event',
        provider: evt.provider
      };
    });

    // 2. Exams (with start & end times, weight, room)
    const examItems: UnifiedCalendarItem[] = exams.map(exam => {
      const dateStr = exam.date.slice(0, 10);
      return {
        id: `exam_${exam.id}`,
        originalId: exam.id,
        sourceKind: 'exam',
        title: `🎓 ${exam.name}`,
        description: exam.description || `Weight: ${exam.weightPercentage}% of final grade. Readiness: ${exam.readinessPercent}%`,
        dateStr,
        startTime: exam.startTime || '09:00',
        endTime: exam.endTime || '11:00',
        allDay: !exam.startTime,
        courseId: exam.courseId,
        location: exam.room || 'Exam Hall',
        type: 'exam',
        provider: 'local',
        meta: {
          weightPercentage: exam.weightPercentage,
          readinessPercent: exam.readinessPercent
        }
      };
    });

    // 3. Assignment Deadlines
    const assignmentItems: UnifiedCalendarItem[] = assignments.map(asg => {
      const dateStr = toLocalDateStr(asg.dueDate);
      const dueTime = extractTimeStr(asg.dueDate) || '23:59';
      return {
        id: `asg_${asg.id}`,
        originalId: asg.id,
        sourceKind: 'assignment',
        title: `📝 Due: ${asg.title}`,
        description: asg.description,
        dateStr,
        startTime: dueTime,
        endTime: dueTime,
        allDay: false,
        courseId: asg.courseId,
        location: asg.submissionUrl || 'Submission Portal',
        type: 'deadline',
        provider: 'local',
        meta: {
          assignmentStatus: asg.status,
          priority: asg.priority
        }
      };
    });

    return [...eventItems, ...examItems, ...assignmentItems];
  }, [events, exams, assignments]);

  // Filter items by type and course
  const filteredItems = useMemo(() => {
    return allUnifiedItems.filter(item => {
      if (selectedTypeFilter !== 'all' && item.sourceKind !== selectedTypeFilter) {
        return false;
      }
      if (selectedCourseFilter !== 'all' && item.courseId !== selectedCourseFilter) {
        return false;
      }
      return true;
    });
  }, [allUnifiedItems, selectedTypeFilter, selectedCourseFilter]);

  // Calendar Date Navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Navigation handlers
  const handlePrev = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (calendarMode === 'week') {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 7);
      setCurrentDate(nextDate);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (calendarMode === 'week') {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 7);
      setCurrentDate(nextDate);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Week calculation
  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay(); // 0 is Sun
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; dayNum: number; dayName: string; isToday: boolean }[] = [];
    const todayStr = toLocalDateStr(new Date());

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + i);
      const dateStr = toLocalDateStr(dayDate);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.push({
        date: dayDate,
        dateStr,
        dayNum: dayDate.getDate(),
        dayName: dayNames[i],
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [startOfWeek]);

  // Helper for styling item chips
  const getItemBadgeStyle = (item: UnifiedCalendarItem, course?: Course) => {
    const courseBorderColor = course?.color || '#64748b';
    if (item.sourceKind === 'exam') {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500'
      };
    }
    if (item.sourceKind === 'assignment') {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500'
      };
    }
    return {
      bg: 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
      dot: 'bg-blue-500'
    };
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Academic Calendar & Deadlines</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Synced exams, assignment deadlines, study blocks, and university timetable in one unified schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar mode switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
            {(['month', 'week', 'agenda'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setCalendarMode(mode)}
                className={`px-3 py-1 rounded-md capitalize transition-colors ${
                  calendarMode === mode
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => syncIntegration('google')}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Sync external calendars"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => openQuickCreate('exam')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Award className="w-3.5 h-3.5" />
            <span>+ Exam</span>
          </button>

          <button
            onClick={() => openQuickCreate('event')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Event</span>
          </button>
        </div>
      </div>

      {/* Filter and Navigation Toolbar */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation arrows & current title */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 min-w-[140px]">
            {calendarMode === 'week'
              ? `${weekDays[0].date.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekDays[6].date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
              : `${monthNames[month]} ${year}`}
          </span>

          <button
            onClick={handleNext}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Today
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({allUnifiedItems.length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('exam')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                selectedTypeFilter === 'exam'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Award className="w-3 h-3 text-amber-500" />
              <span>Exams ({allUnifiedItems.filter(i => i.sourceKind === 'exam').length})</span>
            </button>
            <button
              onClick={() => setSelectedTypeFilter('assignment')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                selectedTypeFilter === 'assignment'
                  ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileCheck2 className="w-3 h-3 text-rose-500" />
              <span>Due ({allUnifiedItems.filter(i => i.sourceKind === 'assignment').length})</span>
            </button>
            <button
              onClick={() => setSelectedTypeFilter('event')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                selectedTypeFilter === 'event'
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarIcon className="w-3 h-3 text-blue-500" />
              <span>Events ({allUnifiedItems.filter(i => i.sourceKind === 'event').length})</span>
            </button>
          </div>

          {/* Course filter dropdown */}
          <select
            value={selectedCourseFilter}
            onChange={e => setSelectedCourseFilter(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none text-xs"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MONTH VIEW */}
      {calendarMode === 'month' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2.5">
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
              <div key={`empty_${i}`} className="min-h-[115px] p-2 bg-slate-50/30 dark:bg-slate-950/10 text-slate-300" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayItems = filteredItems.filter(item => item.dateStr === dateStr);
              const isToday = toLocalDateStr(new Date()) === dateStr;

              return (
                <div
                  key={dayNum}
                  className={`min-h-[120px] p-1.5 sm:p-2 relative flex flex-col space-y-1 transition-colors ${
                    isToday ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono font-medium ${
                      isToday ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {dayNum}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[92px] pr-0.5">
                    {dayItems.map(item => {
                      const course = courses.find(c => c.id === item.courseId);
                      const badgeStyle = getItemBadgeStyle(item, course);

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItemDetail(item)}
                          className={`p-1 sm:p-1.5 rounded-md text-[11px] font-medium border cursor-pointer hover:shadow-xs transition-all leading-tight truncate flex items-center gap-1.5 ${badgeStyle.bg}`}
                          title={`${item.title} ${item.startTime ? `(${item.startTime})` : ''} - Click for details`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: course?.color || '#3b82f6' }}
                          />
                          <span className="truncate flex-1">{item.title}</span>
                          {item.startTime && (
                            <span className="text-[10px] font-mono shrink-0 opacity-80">
                              {item.startTime}
                            </span>
                          )}
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

      {/* WEEK VIEW */}
      {calendarMode === 'week' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {/* Week Columns Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 divide-x divide-slate-200 dark:divide-slate-800 text-center py-2">
            {weekDays.map(day => (
              <div key={day.dateStr} className={`px-2 py-1 ${day.isToday ? 'bg-blue-50/60 dark:bg-blue-950/40 rounded-md mx-1' : ''}`}>
                <div className="text-[11px] font-medium text-slate-500 uppercase">{day.dayName}</div>
                <div className={`text-base font-bold font-mono ${day.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {day.dayNum}
                </div>
              </div>
            ))}
          </div>

          {/* All-Day / Deadlines row */}
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 min-h-[50px] p-1">
            {weekDays.map(day => {
              const allDayItems = filteredItems.filter(item => item.dateStr === day.dateStr && (item.allDay || item.sourceKind === 'assignment'));
              return (
                <div key={`allday_${day.dateStr}`} className="p-1 space-y-1">
                  {allDayItems.map(item => {
                    const course = courses.find(c => c.id === item.courseId);
                    const badgeStyle = getItemBadgeStyle(item, course);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemDetail(item)}
                        className={`p-1 rounded text-[10px] font-semibold border cursor-pointer hover:shadow-xs transition-colors truncate flex items-center gap-1 ${badgeStyle.bg}`}
                        title={item.title}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: course?.color || '#3b82f6' }} />
                        <span className="truncate">{item.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Timetable Hourly Grid */}
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800 min-h-[600px] text-xs">
            {weekDays.map(day => {
              const timedItems = filteredItems.filter(item => item.dateStr === day.dateStr && !item.allDay && item.sourceKind !== 'assignment');

              return (
                <div
                  key={`timed_${day.dateStr}`}
                  className={`p-2 space-y-2 relative transition-colors ${
                    day.isToday ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                  }`}
                >
                  {timedItems.length === 0 ? (
                    <div className="py-12 text-center text-[11px] text-slate-300 dark:text-slate-700 italic">
                      No events
                    </div>
                  ) : (
                    timedItems.map(item => {
                      const course = courses.find(c => c.id === item.courseId);
                      const badgeStyle = getItemBadgeStyle(item, course);

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItemDetail(item)}
                          className={`p-2.5 rounded-lg border cursor-pointer hover:scale-[1.01] hover:shadow-sm transition-all space-y-1.5 ${badgeStyle.bg}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50">
                              {item.sourceKind === 'exam' ? '🎓 Exam' : item.type}
                            </span>
                            {course && (
                              <span className="text-[10px] font-mono font-bold" style={{ color: course.color }}>
                                {course.code}
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                            {item.title}
                          </div>

                          <div className="flex flex-col gap-0.5 text-[11px] opacity-80 font-mono">
                            {item.startTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{item.startTime} {item.endTime ? `– ${item.endTime}` : ''}</span>
                              </div>
                            )}
                            {item.location && (
                              <div className="flex items-center gap-1 font-sans truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {calendarMode === 'agenda' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 p-2 shadow-sm">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <span>No exams, deadlines, or events match your current filter.</span>
            </div>
          ) : (
            filteredItems
              .slice()
              .sort((a, b) => {
                const cmp = a.dateStr.localeCompare(b.dateStr);
                if (cmp !== 0) return cmp;
                return (a.startTime || '').localeCompare(b.startTime || '');
              })
              .map(item => {
                const course = courses.find(c => c.id === item.courseId);
                const badgeStyle = getItemBadgeStyle(item, course);
                const itemDate = new Date(item.dateStr);
                const todayStr = toLocalDateStr(new Date());
                const isToday = item.dateStr === todayStr;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemDetail(item)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {itemDate.toLocaleDateString([], { month: 'short' })}
                        </span>
                        <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                          {itemDate.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {item.title}
                          </span>

                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase border ${badgeStyle.bg}`}>
                            {item.sourceKind === 'exam' ? '🎓 Major Exam' : item.sourceKind === 'assignment' ? '📝 Assignment Due' : item.type}
                          </span>

                          {course && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border"
                              style={{ borderColor: course.color, color: course.color }}
                            >
                              {course.code}
                            </span>
                          )}

                          {isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold">
                              TODAY
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                        )}

                        <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-400 font-mono">
                          {item.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeRange(item.startTime, item.endTime)}</span>
                            </span>
                          )}
                          {item.location && (
                            <span className="flex items-center gap-1 font-sans">
                              <MapPin className="w-3 h-3" />
                              <span>{item.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.meta?.readinessPercent !== undefined && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400 uppercase font-mono">Exam Readiness</div>
                        <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {item.meta.readinessPercent}%
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Item Detail Popover / Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {selectedItemDetail.sourceKind === 'exam' ? (
                  <Award className="w-4 h-4 text-amber-500" />
                ) : selectedItemDetail.sourceKind === 'assignment' ? (
                  <FileCheck2 className="w-4 h-4 text-rose-500" />
                ) : (
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500">
                  {selectedItemDetail.sourceKind === 'exam' ? 'Exam Information' : selectedItemDetail.sourceKind === 'assignment' ? 'Assignment Deadline' : 'Calendar Event'}
                </span>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedItemDetail.title}
                </h3>
                {selectedItemDetail.courseId && (
                  <div className="mt-1">
                    {(() => {
                      const c = courses.find(course => course.id === selectedItemDetail.courseId);
                      return c ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border inline-flex items-center gap-1.5"
                          style={{ borderColor: c.color, color: c.color }}
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>{c.code} — {c.name}</span>
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Schedule Info Box */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold">
                    {new Date(selectedItemDetail.dateStr).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {selectedItemDetail.startTime && (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-mono font-medium">
                      {formatTimeRange(selectedItemDetail.startTime, selectedItemDetail.endTime)}
                    </span>
                  </div>
                )}

                {selectedItemDetail.location && (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{selectedItemDetail.location}</span>
                  </div>
                )}
              </div>

              {/* Extra Meta for Exam or Assignment */}
              {selectedItemDetail.sourceKind === 'exam' && selectedItemDetail.meta && (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="text-[10px] text-slate-400 font-mono uppercase">Grade Weight</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      {selectedItemDetail.meta.weightPercentage}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="text-[10px] text-slate-400 font-mono uppercase">Exam Readiness</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {selectedItemDetail.meta.readinessPercent}%
                    </div>
                  </div>
                </div>
              )}

              {selectedItemDetail.sourceKind === 'assignment' && selectedItemDetail.meta && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Status: </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase font-mono">
                      {selectedItemDetail.meta.assignmentStatus?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Priority: </span>
                    <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                      {selectedItemDetail.meta.priority}
                    </span>
                  </div>
                </div>
              )}

              {selectedItemDetail.description && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500">Details / Description:</span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                    {selectedItemDetail.description}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {selectedItemDetail.sourceKind === 'exam' && (
                  <button
                    onClick={() => {
                      setSelectedItemDetail(null);
                      setActiveView('exams');
                    }}
                    className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open Spaced Revision</span>
                  </button>
                )}

                {selectedItemDetail.sourceKind === 'assignment' && (
                  <button
                    onClick={() => {
                      setSelectedItemDetail(null);
                      setActiveView('assignments');
                    }}
                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Open Assignment</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
