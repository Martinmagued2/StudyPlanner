import React, { useState, useEffect, useRef } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import {
  Search,
  BookOpen,
  CheckSquare,
  FileText,
  FileCheck2,
  FolderArchive,
  Sparkles,
  Timer,
  Plus,
  HelpCircle,
  Award,
  X,
  Bot
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    courses,
    tasks,
    assignments,
    notes,
    files,
    setActiveView,
    navigateToCourse,
    openQuickCreate,
    startFocusTimer,
    setIsAiDrawerOpen
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        openQuickCreate('task');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openQuickCreate('note');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsAiDrawerOpen(true);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const q = query.toLowerCase().trim();

  // Core Actions
  const actions = [
    { id: 'act_new_task', label: 'Create New Task', icon: <Plus className="w-4 h-4" />, action: () => openQuickCreate('task') },
    { id: 'act_new_note', label: 'Create New Lecture Note', icon: <FileText className="w-4 h-4" />, action: () => openQuickCreate('note') },
    { id: 'act_new_asg', label: 'Add Course Assignment', icon: <FileCheck2 className="w-4 h-4" />, action: () => openQuickCreate('assignment') },
    { id: 'act_focus_25', label: 'Start 25-Minute Focus Session', icon: <Timer className="w-4 h-4" />, action: () => startFocusTimer(25) },
    { id: 'act_full_ai', label: 'Open Full-Page AI Tutor Workspace', icon: <Bot className="w-4 h-4 text-blue-500" />, action: () => setActiveView('ai-tutor') },
    { id: 'act_ask_ai', label: 'Ask AI Tutor Assistant (Drawer)', icon: <Sparkles className="w-4 h-4" />, action: () => setIsAiDrawerOpen(true) },
    { id: 'act_plan_day', label: 'Open Smart Day Planner', icon: <Sparkles className="w-4 h-4" />, action: () => setActiveView('today') },
    { id: 'act_flashcards', label: 'Review Due Flashcards', icon: <HelpCircle className="w-4 h-4" />, action: () => setActiveView('studyhub') },
    { id: 'act_exams', label: 'View Exams & Revision Plans', icon: <Award className="w-4 h-4" />, action: () => setActiveView('exams') }
  ].filter(a => !q || a.label.toLowerCase().includes(q));

  // Courses
  const matchingCourses = courses
    .filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    .slice(0, 3)
    .map(c => ({
      id: `course_${c.id}`,
      label: `${c.code}: ${c.name}`,
      icon: <BookOpen className="w-4 h-4" style={{ color: c.color }} />,
      action: () => navigateToCourse(c.id)
    }));

  // Tasks
  const matchingTasks = tasks
    .filter(t => !t.completed && (!q || t.title.toLowerCase().includes(q)))
    .slice(0, 4)
    .map(t => ({
      id: `task_${t.id}`,
      label: t.title,
      icon: <CheckSquare className="w-4 h-4 text-slate-500" />,
      action: () => setActiveView('tasks')
    }));

  // Assignments
  const matchingAssignments = assignments
    .filter(a => !q || a.title.toLowerCase().includes(q))
    .slice(0, 3)
    .map(a => ({
      id: `asg_${a.id}`,
      label: a.title,
      icon: <FileCheck2 className="w-4 h-4 text-blue-600" />,
      action: () => setActiveView('assignments')
    }));

  // Notes
  const matchingNotes = notes
    .filter(n => !n.inTrash && (!q || n.title.toLowerCase().includes(q)))
    .slice(0, 3)
    .map(n => ({
      id: `note_${n.id}`,
      label: n.title,
      icon: <FileText className="w-4 h-4 text-emerald-600" />,
      action: () => setActiveView('notes')
    }));

  // Files
  const matchingFiles = files
    .filter(f => !q || f.name.toLowerCase().includes(q))
    .slice(0, 2)
    .map(f => ({
      id: `file_${f.id}`,
      label: f.name,
      icon: <FolderArchive className="w-4 h-4 text-amber-600" />,
      action: () => setActiveView('files')
    }));

  const allItems = [
    ...actions,
    ...matchingCourses,
    ...matchingAssignments,
    ...matchingTasks,
    ...matchingNotes,
    ...matchingFiles
  ];

  const handleSelect = (item: any) => {
    item.action();
    setIsCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(allItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(allItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, course, task or note..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or academic records found.
            </div>
          ) : (
            allItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate flex-1">{item.label}</span>
                  {isSelected && (
                    <span className="text-[10px] text-slate-400 font-mono">↵ select</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div>Universal Search</div>
        </div>
      </div>
    </div>
  );
};
