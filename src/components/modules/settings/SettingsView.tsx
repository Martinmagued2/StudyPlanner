import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  User,
  Moon,
  Sun,
  Globe,
  LogOut,
  RotateCcw,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Plus,
  Trash2,
  Brain,
  AlertTriangle
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    logout,
    theme,
    setTheme,
    clearAllWorkspaceData,
    academicConfig,
    updateAcademicConfig,
    activeAcademicMode,
    courses,
    aiMemories,
    addAiMemory,
    deleteAiMemory,
    regenerateDailyPlan
  } = useApp();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [timezone, setTimezone] = useState('Europe/London (BST / GMT+01:00)');

  // Holiday form
  const [holidayName, setHolidayName] = useState('');
  const [holidayStart, setHolidayStart] = useState('');
  const [holidayEnd, setHolidayEnd] = useState('');

  // Cancelled class form
  const [cancelCourseId, setCancelCourseId] = useState(courses[0]?.id || '');
  const [cancelDate, setCancelDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Quick memory input
  const [newMemoryInput, setNewMemoryInput] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayStart) return;
    const nextHolidays = [
      ...(academicConfig.holidays || []),
      {
        id: `hol_${Date.now()}`,
        name: holidayName.trim(),
        date: holidayStart,
        endDate: holidayEnd || holidayStart
      }
    ];
    updateAcademicConfig({ holidays: nextHolidays });
    setHolidayName('');
    setHolidayStart('');
    setHolidayEnd('');
  };

  const handleRemoveHoliday = (id: string) => {
    updateAcademicConfig({
      holidays: (academicConfig.holidays || []).filter(h => h.id !== id)
    });
  };

  const handleAddCancelledClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelCourseId || !cancelDate) return;
    const nextCancelled = [
      ...(academicConfig.cancelledClasses || []),
      {
        id: `canc_${Date.now()}`,
        courseId: cancelCourseId,
        date: cancelDate,
        reason: cancelReason.trim() || 'Lecture cancelled'
      }
    ];
    updateAcademicConfig({ cancelledClasses: nextCancelled });
    setCancelDate('');
    setCancelReason('');
  };

  const handleRemoveCancelledClass = (id: string) => {
    updateAcademicConfig({
      cancelledClasses: (academicConfig.cancelledClasses || []).filter(c => c.id !== id)
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Settings & Academic Calendar Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure Academic Modes (Normal Semester, Midterm Week, Final Exams), holidays, AI memories, and account security.
          </p>
        </div>

        {savedSuccess && (
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Academic Calendar & Academic Modes Management */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Academic Calendar & Examination Modes</span>
            </h3>
            <p className="text-slate-500 mt-0.5">
              During Midterm Week and Final Exam Period, regular weekly classes are temporarily suspended without deleting your timetable.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full font-bold text-[11px] self-start sm:self-auto ${
              activeAcademicMode === 'midterm'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : activeAcademicMode === 'final'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}
          >
            Active: {activeAcademicMode === 'normal' ? 'Normal Semester Mode' : activeAcademicMode === 'midterm' ? 'Midterm Exam Mode (Classes Suspended)' : 'Final Exam Mode (Classes Suspended)'}
          </span>
        </div>

        {/* Mode Selection Override */}
        <div className="space-y-2">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            Academic Mode Switching Behavior
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'auto', label: '🔄 Auto (By Dates)', desc: 'Switches automatically when Midterm or Final period starts' },
              { id: 'normal', label: '🏫 Normal Semester', desc: 'Regular weekly lectures & timetable active' },
              { id: 'midterm', label: '📝 Midterm Mode', desc: 'Suspends regular classes; focuses on midterms' },
              { id: 'final', label: '🎓 Final Exam Mode', desc: 'Suspends regular classes; focuses on finals' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  updateAcademicConfig({ modePreference: opt.id as any });
                  setTimeout(() => regenerateDailyPlan(), 50);
                }}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  academicConfig.modePreference === opt.id
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100 ring-1 ring-blue-600'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="font-bold text-xs">{opt.label}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Period Dates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Semester Dates */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Normal Semester Period</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Semester Name</label>
              <input
                type="text"
                value={academicConfig.semesterName || ''}
                onChange={e => updateAcademicConfig({ semesterName: e.target.value })}
                placeholder="e.g. Fall Semester 2026"
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={academicConfig.semesterStartDate || ''}
                  onChange={e => updateAcademicConfig({ semesterStartDate: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">End Date</label>
                <input
                  type="date"
                  value={academicConfig.semesterEndDate || ''}
                  onChange={e => updateAcademicConfig({ semesterEndDate: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Midterm Period Dates */}
          <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-2.5">
            <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>2. Midterm Week Period</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Regular classes are suspended between these dates; timetable returns automatically when Midterm Week ends.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Midterm Start</label>
                <input
                  type="date"
                  value={academicConfig.midtermStartDate || ''}
                  onChange={e => updateAcademicConfig({ midtermStartDate: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Midterm End</label>
                <input
                  type="date"
                  value={academicConfig.midtermEndDate || ''}
                  onChange={e => updateAcademicConfig({ midtermEndDate: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Final Exam Period Dates */}
          <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-2.5">
            <div className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-rose-600" />
              <span>3. Final Examination Period</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Regular classes are suspended during Finals; dashboard & AI planner switch to Final Exam Revision Mode.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Finals Start</label>
                <input
                  type="date"
                  value={academicConfig.finalStartDate || ''}
                  onChange={e => updateAcademicConfig({ finalStartDate: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Finals End</label>
                <input
                  type="date"
                  value={academicConfig.finalEndDate || ''}
                  onChange={e => updateAcademicConfig({ finalEndDate: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Holidays & Class Cancellations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* University Holidays */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">University Holidays & Reading Days</h4>
            <form onSubmit={handleAddHoliday} className="flex flex-wrap gap-1.5">
              <input
                type="text"
                value={holidayName}
                onChange={e => setHolidayName(e.target.value)}
                placeholder="Holiday name..."
                className="flex-1 min-w-[120px] px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="date"
                value={holidayStart}
                onChange={e => setHolidayStart(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </form>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(academicConfig.holidays || []).map(h => (
                <div
                  key={h.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
                >
                  <span>
                    <strong>{h.name}</strong> ({h.date})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHoliday(h.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cancelled Classes */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Single-Day Class Cancellations</h4>
            <form onSubmit={handleAddCancelledClass} className="flex flex-wrap gap-1.5">
              <select
                value={cancelCourseId}
                onChange={e => setCancelCourseId(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">Select Course...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={cancelDate}
                onChange={e => setCancelDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Cancel Class</span>
              </button>
            </form>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(academicConfig.cancelledClasses || []).map(cc => {
                const course = courses.find(c => c.id === cc.courseId);
                return (
                  <div
                    key={cc.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
                  >
                    <span>
                      <strong>{course?.code || 'Course'}</strong> cancelled on {cc.date}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCancelledClass(cc.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* AI Memory & Study Preferences Quick Management */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" />
          <span>Saved AI Study Preferences & Memory ({aiMemories.length})</span>
        </h3>
        <p className="text-slate-500">
          Your AI planner uses these saved rules to schedule study sessions, breaks, and preferred hours.
        </p>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!newMemoryInput.trim()) return;
            addAiMemory(newMemoryInput.trim(), 'preference', 'explicit');
            setNewMemoryInput('');
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newMemoryInput}
            onChange={e => setNewMemoryInput(e.target.value)}
            placeholder="e.g. I prefer 45-minute study sessions with 10-minute breaks, and I study best at night..."
            className="flex-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
          >
            Add Preference
          </button>
        </form>
        {aiMemories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {aiMemories.map(m => (
              <div
                key={m.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40"
              >
                <span className="text-slate-800 dark:text-slate-200">{m.content || m.fact}</span>
                <button
                  type="button"
                  onClick={() => deleteAiMemory(m.id)}
                  className="text-slate-400 hover:text-rose-600 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile & Account Information */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <span>Student Account & Profile</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">University Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium hover:bg-slate-800"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* Appearance & Theme */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>Appearance & Design Theme</span>
        </h3>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`px-4 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              theme === 'light'
                ? 'bg-slate-900 text-white border-transparent'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light Mode</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`px-4 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              theme === 'dark'
                ? 'bg-white text-slate-900 border-transparent'
                : 'border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark Mode</span>
          </button>
        </div>
      </div>

      {/* Timezone Preference */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-600" />
          <span>Academic Timezone</span>
        </h3>
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          className="w-full max-w-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          <option value="Europe/London (BST / GMT+01:00)">Europe/London (BST / GMT+01:00)</option>
          <option value="America/New_York (EST)">America/New_York (EST)</option>
          <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
          <option value="UTC">Universal Coordinated Time (UTC)</option>
        </select>
      </div>

      {/* Fresh Start / Reset Workspace Data */}
      <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-950/80 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset Current Account Workspace</span>
          </h4>
          <p className="text-slate-500 mt-0.5">
            Clear your current account's workspace data to start fresh. Other accounts on this device are unaffected.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear your current workspace data and start fresh?')) {
              clearAllWorkspaceData();
            }
          }}
          className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear My Workspace Data</span>
        </button>
      </div>

      {/* Account Security & Sign Out */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100">Session & Workspace Security</h4>
          <p className="text-slate-500 mt-0.5">
            Signed in as <strong>{user?.name}</strong> ({user?.email}). Strictly isolated user storage (`{user?.id}`).
          </p>
        </div>

        <button
          onClick={logout}
          className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
