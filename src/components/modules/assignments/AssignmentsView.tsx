import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  FileCheck2,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  Play,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Filter,
  Check
} from 'lucide-react';
import { Assignment, AssignmentStatus, PriorityLevel, AssignmentType } from '../../../types';

export const AssignmentsView: React.FC = () => {
  const {
    assignments,
    courses,
    addAssignment,
    updateAssignment,
    breakdownAssignmentWithAi,
    toggleAssignmentStep,
    startFocusTimer,
    openQuickCreate
  } = useApp();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const filteredAssignments = assignments.filter(a => {
    if (selectedCourseFilter !== 'all' && a.courseId !== selectedCourseFilter) return false;
    return true;
  });

  const getDueBadge = (dueDateStr: string) => {
    const diffHours = (new Date(dueDateStr).getTime() - Date.now()) / (3600 * 1000);
    if (diffHours < 0) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Overdue</span>;
    } else if (diffHours <= 24) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Due Today</span>;
    } else if (diffHours <= 48) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Due Tomorrow</span>;
    }
    return <span className="text-[10px] text-slate-400 font-mono">Due {new Date(dueDateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>;
  };

  const columns: { status: AssignmentStatus; label: string; count: number }[] = [
    { status: 'todo', label: 'To Do', count: filteredAssignments.filter(a => a.status === 'todo').length },
    { status: 'in_progress', label: 'In Progress', count: filteredAssignments.filter(a => a.status === 'in_progress').length },
    { status: 'completed', label: 'Completed', count: filteredAssignments.filter(a => a.status === 'completed').length },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Assignments & Coursework
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage coursework with Kanban boards, list views, and AI breakdown into actionable study steps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'board' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500'}`}
              title="Kanban Board"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500'}`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => openQuickCreate('assignment')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {/* Course Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Course:</span>
        </span>
        <button
          onClick={() => setSelectedCourseFilter('all')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
            selectedCourseFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All ({assignments.length})
        </button>
        {courses.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCourseFilter(c.id)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              selectedCourseFilter === c.id
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
            <span>{c.code}</span>
          </button>
        ))}
      </div>

      {/* Main Content: Board vs List */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columns.map(col => {
            const colAssignments = filteredAssignments.filter(a => a.status === col.status);
            return (
              <div key={col.status} className="flex flex-col space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{col.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono">
                      {col.count}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 min-h-[300px] p-2 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  {colAssignments.map(asg => {
                    const course = courses.find(c => c.id === asg.courseId);
                    const doneSteps = asg.steps.filter(s => s.completed).length;

                    return (
                      <div
                        key={asg.id}
                        onClick={() => setSelectedAssignment(asg)}
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer space-y-3 transition-colors"
                      >
                        {/* Course & Due Badge */}
                        <div className="flex items-center justify-between text-xs">
                          {course ? (
                            <span
                              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border"
                              style={{ borderColor: course.color, color: course.color }}
                            >
                              {course.code}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Standalone</span>
                          )}
                          {getDueBadge(asg.dueDate)}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {asg.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {asg.description}
                          </p>
                        </div>

                        {/* Step breakdown progress */}
                        {asg.steps.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                            <div className="flex justify-between mb-1">
                              <span>Actionable Steps</span>
                              <span className="font-mono font-semibold">{doneSteps}/{asg.steps.length}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all"
                                style={{ width: `${(doneSteps / asg.steps.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-[10px] font-mono text-slate-400">
                            ~{asg.estimatedMinutes}m est
                          </span>

                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {!asg.isBrokenDown && (
                              <button
                                onClick={() => breakdownAssignmentWithAi(asg.id)}
                                className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1"
                                title="Break into actionable steps"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>AI Plan</span>
                              </button>
                            )}

                            {col.status === 'todo' && (
                              <button
                                onClick={() => updateAssignment(asg.id, { status: 'in_progress' })}
                                className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                              >
                                Start →
                              </button>
                            )}
                            {col.status === 'in_progress' && (
                              <button
                                onClick={() => updateAssignment(asg.id, { status: 'completed' })}
                                className="px-2 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200"
                              >
                                Done ✓
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredAssignments.map(asg => {
            const course = courses.find(c => c.id === asg.courseId);
            return (
              <div
                key={asg.id}
                onClick={() => setSelectedAssignment(asg)}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    asg.status === 'completed' ? 'bg-emerald-600' :
                    asg.status === 'in_progress' ? 'bg-blue-600' : 'bg-slate-300'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{asg.title}</span>
                      {course && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {course.code}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{asg.description}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {getDueBadge(asg.dueDate)}
                  <span className="capitalize font-mono text-slate-500">{asg.status.replace('_', ' ')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Detail Drawer */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 capitalize">
                {selectedAssignment.type} • {selectedAssignment.priority} priority
              </span>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Close Drawer ✕
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedAssignment.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {selectedAssignment.description}
              </p>
            </div>

            {/* Quick Status toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Status:</span>
              {(['todo', 'in_progress', 'completed'] as AssignmentStatus[]).map(st => (
                <button
                  key={st}
                  onClick={() => {
                    updateAssignment(selectedAssignment.id, { status: st });
                    setSelectedAssignment(prev => prev ? { ...prev, status: st } : null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    selectedAssignment.status === st
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* AI Breakdown Steps section */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    AI Actionable Breakdown
                  </h4>
                </div>
                {!selectedAssignment.isBrokenDown && (
                  <button
                    onClick={() => {
                      breakdownAssignmentWithAi(selectedAssignment.id);
                      setSelectedAssignment(null);
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Generate Steps
                  </button>
                )}
              </div>

              {selectedAssignment.steps.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {selectedAssignment.steps.map(step => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <button
                        onClick={() => toggleAssignmentStep(selectedAssignment.id, step.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${step.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className={step.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                          {step.title}
                        </span>
                      </button>
                      <button
                        onClick={() => startFocusTimer(25, step.linkedTaskId, selectedAssignment.courseId, step.title)}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        title="Start focus timer on this step"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Break this large coursework assignment into 4–7 manageable study tasks with real timer integration.
                </p>
              )}
            </div>

            {/* Submission URLs & Info */}
            {selectedAssignment.submissionUrl && (
              <div className="text-xs space-y-1">
                <span className="text-slate-400 font-medium">Submission Portal:</span>
                <div>
                  <a
                    href={selectedAssignment.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>{selectedAssignment.submissionUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
