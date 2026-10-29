import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  CheckSquare,
  Plus,
  Play,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Task, PriorityLevel } from '../../../types';

export const TasksView: React.FC = () => {
  const {
    tasks,
    courses,
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    addSubtask,
    toggleSubtask,
    startFocusTimer
  } = useApp();

  const [filterMode, setFilterMode] = useState<'open' | 'today' | 'week' | 'overdue' | 'all'>('open');
  const [quickInput, setQuickInput] = useState('');
  const [selectedCourseForNew, setSelectedCourseForNew] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<Record<string, string>>({});

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    addTask({
      title: quickInput.trim(),
      courseId: selectedCourseForNew || undefined,
      priority: 'medium',
      tags: ['to-do'],
      completed: false,
      source: 'user'
    });
    setQuickInput('');
  };

  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now + 7 * 86400 * 1000);

  const filteredTasks = tasks.filter(t => {
    if (filterMode === 'open') return !t.completed;
    if (filterMode === 'all') return true;
    if (filterMode === 'overdue') {
      return !t.completed && t.dueDate && new Date(t.dueDate).getTime() < now;
    }
    if (filterMode === 'today') {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate).getTime();
      return d <= todayEnd.getTime();
    }
    if (filterMode === 'week') {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate).getTime();
      return d <= weekEnd.getTime();
    }
    return true;
  });

  // Group by Course
  const courseGroups = courses.map(course => {
    const courseTasks = filteredTasks.filter(t => t.courseId === course.id);
    const totalCourseTasks = tasks.filter(t => t.courseId === course.id);
    const completedCount = totalCourseTasks.filter(t => t.completed).length;
    const progressPercent = totalCourseTasks.length > 0 ? Math.round((completedCount / totalCourseTasks.length) * 100) : 0;
    return {
      id: course.id,
      name: `${course.code}: ${course.name}`,
      color: course.color,
      tasks: courseTasks,
      progressPercent,
      completedCount,
      totalCount: totalCourseTasks.length
    };
  });

  const standaloneTasks = filteredTasks.filter(t => !t.courseId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Tasks & Action Items
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Hierarchical task management with subtasks, course progress bars, focus timers, and smart filters.
          </p>
        </div>
      </div>

      {/* Quick Add Input Bar */}
      <form onSubmit={handleQuickAdd} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center gap-2">
        <input
          type="text"
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          placeholder="Add a new academic task... (Press Enter)"
          className="flex-1 w-full px-3 py-2 text-xs bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={selectedCourseForNew}
            onChange={e => setSelectedCourseForNew(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">No Course (Standalone)</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
        {(['open', 'today', 'week', 'overdue', 'all'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
              filterMode === mode
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {mode === 'open' ? `Open (${tasks.filter(t => !t.completed).length})` :
             mode === 'overdue' ? `Overdue (${tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate).getTime() < now).length})` :
             mode}
          </button>
        ))}
      </div>

      {/* Task Groups by Course */}
      <div className="space-y-4">
        {courseGroups.map(group => {
          const isCollapsed = collapsedGroups[group.id];
          return (
            <div
              key={group.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
            >
              {/* Group Header */}
              <div
                onClick={() => toggleGroupCollapse(group.id)}
                className="p-3.5 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{group.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                    {group.tasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="text-[11px] font-mono">{group.progressPercent}% completed</span>
                  <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${group.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks List in Group */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 p-1">
                  {group.tasks.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No matching tasks in this course.
                    </div>
                  ) : (
                    group.tasks.map(task => renderTaskItem(task))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Standalone Tasks Group */}
        {standaloneTasks.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div
              onClick={() => toggleGroupCollapse('standalone')}
              className="p-3.5 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {collapsedGroups['standalone'] ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Standalone Tasks</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono">
                  {standaloneTasks.length}
                </span>
              </div>
            </div>
            {!collapsedGroups['standalone'] && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 p-1">
                {standaloneTasks.map(task => renderTaskItem(task))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function renderTaskItem(task: Task) {
    const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate).getTime() < now;

    return (
      <div
        key={task.id}
        className={`p-3 space-y-2 rounded-lg transition-colors ${
          task.completed ? 'opacity-55' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
        }`}
      >
        <div className="flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <button
              onClick={() => toggleTaskComplete(task.id)}
              className="mt-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <CheckCircle2 className={`w-4 h-4 ${task.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
            </button>

            <div className="space-y-0.5 min-w-0 flex-1">
              <span className={`font-medium text-slate-900 dark:text-slate-100 ${task.completed ? 'line-through text-slate-400' : ''}`}>
                {task.title}
              </span>
              {task.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Subtasks checklist */}
              {task.subtasks.length > 0 && (
                <div className="pt-1 space-y-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                  {task.subtasks.map(st => (
                    <div
                      key={st.id}
                      onClick={() => toggleSubtask(task.id, st.id)}
                      className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    >
                      <CheckCircle2 className={`w-3 h-3 ${st.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span className={st.completed ? 'line-through text-slate-400' : ''}>{st.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right badges & timer */}
          <div className="flex items-center gap-2 shrink-0">
            {task.dueDate && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isOverdue
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            )}

            {!task.completed && (
              <button
                onClick={() => startFocusTimer(25, task.id, task.courseId, task.title)}
                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Launch 25m focus timer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => deleteTask(task.id)}
              className="p-1 text-slate-300 hover:text-rose-600"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
};
