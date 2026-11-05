import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, CheckSquare, FileText, FileCheck2, Award, Calendar, Clock } from 'lucide-react';
import { AssignmentType, PriorityLevel, EventType, ExamPeriodType } from '../../types';

export const QuickCreateModal: React.FC = () => {
  const {
    isQuickCreateOpen,
    setIsQuickCreateOpen,
    quickCreateType,
    courses,
    addTask,
    addNote,
    addAssignment,
    addExam,
    addEvent,
    setActiveView
  } = useApp();

  const [activeTab, setActiveTab] = useState<'task' | 'note' | 'assignment' | 'exam' | 'event'>(quickCreateType);

  // Form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string>(courses[0]?.id || '');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('homework');
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [examWeight, setExamWeight] = useState(25);
  const [examStartTime, setExamStartTime] = useState('09:00');
  const [examEndTime, setExamEndTime] = useState('11:00');
  const [examType, setExamType] = useState<ExamPeriodType>('midterm');
  const [examBuilding, setExamBuilding] = useState('');
  const [examOnline, setExamOnline] = useState(false);
  const [eventType, setEventType] = useState<EventType>('event');
  const [location, setLocation] = useState('');

  if (!isQuickCreateOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (activeTab === 'task') {
      addTask({
        title,
        description,
        courseId: courseId || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        tags: ['quick-create'],
        completed: false,
        source: 'user'
      });
      setActiveView('tasks');
    } else if (activeTab === 'note') {
      addNote({
        title,
        content: description ? `<p>${description}</p>` : `<p><br></p>`,
        courseId: courseId || undefined,
        tags: ['quick-note'],
        pinned: false,
        highlightedTerms: []
      });
      setActiveView('notes');
    } else if (activeTab === 'assignment') {
      addAssignment({
        title,
        description,
        courseId: courseId || undefined,
        type: assignmentType,
        status: 'todo',
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        estimatedMinutes: Number(estimatedMinutes) || 60,
        links: []
      });
      setActiveView('assignments');
    } else if (activeTab === 'exam') {
      const [sh, sm] = (examStartTime || '09:00').split(':').map(Number);
      const [eh, em] = (examEndTime || '11:00').split(':').map(Number);
      const calcDuration = !isNaN(sh) && !isNaN(eh) ? Math.max(30, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))) : 120;
      addExam({
        name: title,
        courseId: courseId || courses[0]?.id || 'course_cs302',
        date: dueDate ? dueDate.slice(0, 10) : new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10),
        startTime: examStartTime || '09:00',
        endTime: examEndTime || '11:00',
        durationMinutes: calcDuration,
        examType,
        weightPercentage: Number(examWeight) || 25,
        room: location || 'Exam Hall',
        building: examBuilding || undefined,
        isOnline: examOnline,
        description: description || undefined,
        instructions: description || undefined
      });
      setActiveView('exams');
    } else if (activeTab === 'event') {
      addEvent({
        title,
        description,
        location,
        start: dueDate || new Date().toISOString().slice(0, 16),
        end: dueDate || new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
        allDay: false,
        type: eventType,
        courseId: courseId || undefined,
        provider: 'local'
      });
      setActiveView('calendar');
    }

    setIsQuickCreateOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('task')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'task'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Task</span>
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'note'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Note</span>
            </button>
            <button
              onClick={() => setActiveTab('assignment')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'assignment'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Assignment</span>
            </button>
            <button
              onClick={() => setActiveTab('exam')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'exam'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Exam</span>
            </button>
            <button
              onClick={() => setActiveTab('event')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'event'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Event</span>
            </button>
          </div>
          <button
            onClick={() => setIsQuickCreateOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {activeTab === 'task' ? 'Task Title' : activeTab === 'note' ? 'Note Title' : activeTab === 'exam' ? 'Exam Name' : activeTab === 'event' ? 'Event Title' : 'Assignment Title'}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Implement Left-Right AVL Tree double rotation"
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Associated Course
              </label>
              <select
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="">No Course (Standalone)</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {activeTab !== 'note' && activeTab !== 'exam' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {activeTab === 'event' ? 'Start Time' : 'Due Date'}
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Conditional Fields */}
          {(activeTab === 'task' || activeTab === 'assignment') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              {activeTab === 'assignment' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={assignmentType}
                    onChange={e => setAssignmentType(e.target.value as AssignmentType)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="homework">Homework</option>
                    <option value="lab">Lab</option>
                    <option value="project">Project</option>
                    <option value="essay">Essay</option>
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="reading">Reading</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exam' && (
            <div className="space-y-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={e => setExamType(e.target.value as ExamPeriodType)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="midterm">Midterm Exam</option>
                    <option value="final">Final Exam</option>
                    <option value="quiz">Quiz / Test</option>
                    <option value="practical">Practical / Viva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Room / Exam Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Great Hall 2A"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Building / Campus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Turing Building, Docklands"
                    value={examBuilding}
                    onChange={e => setExamBuilding(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examOnline}
                    onChange={e => setExamOnline(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Online / Remote Examination</span>
                </label>
              </div>

              {/* Exam Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Start Time</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={examStartTime}
                    onChange={e => {
                      const newStart = e.target.value;
                      setExamStartTime(newStart);
                      if (newStart >= examEndTime) {
                        const [h, m] = newStart.split(':').map(Number);
                        const endH = (h + 2) % 24;
                        setExamEndTime(`${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>End Time</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={examEndTime}
                    onChange={e => setExamEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Exam Duration Presets */}
              <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-500">
                <span className="font-medium">Quick Duration:</span>
                {[
                  { label: '1 hr', hours: 1 },
                  { label: '1.5 hrs', hours: 1.5 },
                  { label: '2 hrs', hours: 2 },
                  { label: '2.5 hrs', hours: 2.5 },
                  { label: '3 hrs', hours: 3 }
                ].map(dur => (
                  <button
                    key={dur.label}
                    type="button"
                    onClick={() => {
                      const [h, m] = examStartTime.split(':').map(Number);
                      const totalMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m) + dur.hours * 60;
                      const endH = Math.floor(totalMinutes / 60) % 24;
                      const endM = Math.floor(totalMinutes % 60);
                      setExamEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
                    }}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                  >
                    {dur.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Grade Weight (% of Final Grade)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={examWeight}
                  onChange={e => setExamWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details, rubric links, or reminders..."
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
            >
              Create {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
