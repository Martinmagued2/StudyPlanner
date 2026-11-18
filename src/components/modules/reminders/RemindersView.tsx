import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  BookOpen,
  AlertTriangle,
  Eye,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { NotificationPreferences } from '../../../types';
import { parseDayIndex, toLocalDateKey, formatTime12h } from '../../../services/academicScheduleService';

const COMMON_TIMEZONES = [
  'Europe/London',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
];

export const RemindersView: React.FC = () => {
  const {
    user,
    courses,
    assignments,
    exams,
    tasks,
    activeAcademicMode,
    isClassSuspendedOnDate,
    notificationPreferences,
    updateNotificationPreferences,
    emailNotificationLogs,
    refreshEmailNotificationLogs,
    reminderLogs,
    triggerTestReminder
  } = useApp();

  const [draft, setDraft] = useState<NotificationPreferences>(notificationPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const [previewType, setPreviewType] = useState<'digest' | 'deadline' | 'nudge'>('digest');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'missing_env' | 'needs_restart'>('checking');
  const [maskedSender, setMaskedSender] = useState('');
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    setDraft(notificationPreferences);
  }, [notificationPreferences]);

  useEffect(() => {
    refreshEmailNotificationLogs().catch(() => {});
    fetch('/api/notifications/send-test')
      .then(async r => {
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          setServerStatus('needs_restart');
          return;
        }
        const json = await r.json();
        setMaskedSender(json.gmailUserMasked || '');
        setServerStatus(json.gmailConfigured ? 'ready' : 'missing_env');
      })
      .catch(() => setServerStatus('needs_restart'));
  }, []);

  const todayKey = toLocalDateKey(new Date());
  const todayDow = new Date().getDay();
  const suspension = isClassSuspendedOnDate(todayKey);

  // Real workspace snapshot for preview + test send
  const snapshot = useMemo(() => {
    const classesToday = suspension.suspended
      ? []
      : courses
          .filter(c => !c.isArchived)
          .flatMap(c =>
            (c.meetingSlots || [])
              .filter(slot => parseDayIndex(slot.day) === todayDow)
              .map(slot => ({
                courseCode: c.code,
                courseName: c.name,
                startTime: slot.startTime,
                endTime: slot.endTime,
                room: slot.location || c.location,
                lecturer: c.instructor,
                type: slot.type
              }))
          )
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const calcDays = (dateStr: string) => {
      const t = new Date(`${dateStr.slice(0, 10)}T00:00:00`).getTime();
      const b = new Date(`${todayKey}T00:00:00`).getTime();
      return Math.round((t - b) / 86400000);
    };

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const deadlinesSoon = [
      ...assignments
        .filter(a => a.status !== 'completed' && a.dueDate)
        .map(a => ({
          title: a.title,
          courseName: a.courseId ? courseMap.get(a.courseId)?.name : undefined,
          dueDate: a.dueDate.slice(0, 10),
          daysLeft: calcDays(a.dueDate),
          kind: 'assignment' as const
        })),
      ...exams
        .filter(e => e.date)
        .map(e => ({
          title: e.name,
          courseName: courseMap.get(e.courseId)?.name,
          dueDate: e.date.slice(0, 10),
          daysLeft: calcDays(e.date),
          kind: 'exam' as const,
          location: e.room
        })),
      ...tasks
        .filter(t => !t.completed && t.dueDate)
        .map(t => ({
          title: t.title,
          courseName: t.courseId ? courseMap.get(t.courseId)?.name : undefined,
          dueDate: t.dueDate!.slice(0, 10),
          daysLeft: calcDays(t.dueDate!),
          kind: 'task' as const
        }))
    ]
      .filter(d => d.daysLeft >= 0 && d.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const openTasksCount = tasks.filter(t => !t.completed).length;
    const recommendations: string[] = [];
    if (deadlinesSoon[0]) {
      recommendations.push(
        `Focus on "${deadlinesSoon[0].title}" (${
          deadlinesSoon[0].daysLeft === 0
            ? 'due today'
            : deadlinesSoon[0].daysLeft === 1
              ? 'due tomorrow'
              : `due in ${deadlinesSoon[0].daysLeft} days`
        }).`
      );
    }
    if (classesToday[0]) {
      recommendations.push(`Quick 10-min review before ${classesToday[0].courseCode} at ${formatTime12h(classesToday[0].startTime)}.`);
    }
    if (openTasksCount > 0) {
      recommendations.push(`Complete 1 high-priority item from your ${openTasksCount} open tasks.`);
    }

    return {
      studentName: user?.name || 'Student',
      dateLabel: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      academicMode:
        activeAcademicMode === 'normal'
          ? 'Normal Semester Mode'
          : activeAcademicMode === 'midterm'
            ? 'Midterm Exam Mode'
            : 'Final Exam Mode',
      suspensionReason: suspension.suspended ? suspension.reason : undefined,
      classesToday,
      deadlinesSoon,
      recommendations
    };
  }, [courses, assignments, exams, tasks, activeAcademicMode, suspension, todayDow, todayKey, user?.name]);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await updateNotificationPreferences(draft);
      setSaveFeedback('Notification preferences saved and synced to cloud scheduler.');
      setTimeout(() => setSaveFeedback(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    setDraft(prev => {
      const exists = prev.reminderDaysBefore.includes(day);
      const next = exists
        ? prev.reminderDaysBefore.filter(d => d !== day)
        : [...prev.reminderDaysBefore, day].sort((a, b) => b - a);
      return { ...prev, reminderDaysBefore: next };
    });
  };

  const handleSendTestEmail = async () => {
    const email = (draft.email || user?.email || '').trim();
    if (!email || !email.includes('@')) {
      setTestResult({ ok: false, message: 'Enter a valid recipient email address first.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      await updateNotificationPreferences(draft);
      const res = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || '',
          email,
          type: previewType,
          snapshot
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setServerStatus('needs_restart');
        const snippet = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 140);
        if (isLocalHost) {
          triggerTestReminder();
          setTestResult({
            ok: false,
            message:
              'Local dev server has not loaded the `/api/*` middleware yet. Stop `npm run dev` (Ctrl+C) and run `npm run dev` again with GMAIL_USER & GMAIL_APP_PASSWORD in `.env.local`.'
          });
        } else {
          setTestResult({
            ok: false,
            message: `Vercel endpoint /api/notifications/send-test returned HTTP ${res.status} (${contentType || 'non-JSON'}). Push the latest commit (including the api/ folder) so Vercel redeploys this serverless function, and check Vercel Function Logs.${snippet ? ` Response: "${snippet}"` : ''}`
          });
        }
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTestResult({
          ok: false,
          message: data.error || `Delivery failed (status ${res.status}).`
        });
      } else {
        setTestResult({
          ok: true,
          message: `Real ${previewType} email sent to ${email} via Google Gmail SMTP! (Message ID: ${data.id || 'queued'})`
        });
        await refreshEmailNotificationLogs();
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || 'Unable to reach notification endpoint.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 flex-wrap mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" /> Gmail SMTP Email Engine
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                serverStatus === 'ready'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : serverStatus === 'missing_env'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              {serverStatus === 'ready'
                ? `SMTP Ready (${maskedSender || 'Gmail Connected'})`
                : serverStatus === 'missing_env'
                  ? isLocalHost
                    ? 'Add GMAIL_USER & GMAIL_APP_PASSWORD in .env.local or Vercel'
                    : 'Add GMAIL_USER & GMAIL_APP_PASSWORD in Vercel Env Vars & Redeploy'
                  : serverStatus === 'needs_restart'
                    ? isLocalHost
                      ? 'Restart npm run dev (Ctrl+C -> npm run dev) to activate local /api'
                      : 'Vercel /api/notifications/send-test unavailable (Redeploy latest code & check Logs)'
                    : 'Checking Gmail SMTP status...'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Intelligent Email Reminders &amp; Daily Digest
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sends real academic digests, 3/2/1-day deadline alerts, and anti-procrastination check-ins directly via your Google Gmail SMTP account.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition shrink-0"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Save Notification Settings
        </button>
      </div>

      {saveFeedback && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {saveFeedback}
        </div>
      )}

      {/* Delivery Destination & Timezone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" /> Delivery Address &amp; Timezone
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="student@university.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  <Globe className="w-3.5 h-3.5 inline mr-1" /> Local Timezone
                </label>
                <select
                  value={COMMON_TIMEZONES.includes(draft.timezone) ? draft.timezone : 'custom'}
                  onChange={e => {
                    if (e.target.value !== 'custom') {
                      setDraft(prev => ({ ...prev, timezone: e.target.value }));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                  {!COMMON_TIMEZONES.includes(draft.timezone) && (
                    <option value="custom">{draft.timezone}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* A. Daily Academic Digest */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" /> A. Daily Academic Digest
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Morning email summarizing today's classes, next class timing, urgent deadlines, exams, and AI study priorities.
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.dailyDigestEnabled}
                  onChange={e => setDraft(prev => ({ ...prev, dailyDigestEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>

            {draft.dailyDigestEnabled && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    <Clock className="w-3 h-3 inline mr-1" /> Send Daily At
                  </label>
                  <input
                    type="time"
                    value={draft.dailyDigestTime}
                    onChange={e => setDraft(prev => ({ ...prev, dailyDigestTime: e.target.value }))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-wrap gap-3 pt-4">
                  {[
                    { key: 'enableClasses', label: 'Include Classes' },
                    { key: 'enableExams', label: 'Include Exams' },
                    { key: 'enableAssignments', label: 'Include Assignments' }
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean((draft as any)[opt.key])}
                        onChange={e => setDraft(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* B. 3-Day / 2-Day / 1-Day Deadline Reminders */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> B. Automatic 3 / 2 / 1-Day Deadline Reminders
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Deduplicated alerts before uncompleted assignments, exams, labs, and due tasks. Automatically adapts if dates change.
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.deadlineRemindersEnabled}
                  onChange={e => setDraft(prev => ({ ...prev, deadlineRemindersEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[''] after:top-0.5 after:left-0.5 after:absolute after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>

            {draft.deadlineRemindersEnabled && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {[3, 2, 1].map(day => {
                    const active = draft.reminderDaysBefore.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleReminderDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {day} {day === 1 ? 'Day Before' : 'Days Before'}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-slate-500">
                  Tracking <strong>{snapshot.deadlinesSoon.length}</strong> upcoming deadline(s)
                </span>
              </div>
            )}
          </div>

          {/* C. Anti-Procrastination & Weekly Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-500" /> C. Smart Anti-Procrastination &amp; Weekly Summary
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sends a gentle 15-minute focus check-in when deadlines loom and you haven't opened the app, plus a Sunday lookahead.
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.antiProcrastinationEnabled}
                  onChange={e => setDraft(prev => ({ ...prev, antiProcrastinationEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[''] after:top-0.5 after:left-0.5 after:absolute after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nudge Cadence</label>
                <select
                  value={draft.antiProcrastinationFrequency}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      antiProcrastinationFrequency: e.target.value as 'smart' | 'gentle' | 'weekly_only'
                    }))
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="smart">Smart (after 2 days inactive + open work)</option>
                  <option value="gentle">Gentle (after 3+ days inactive)</option>
                  <option value="weekly_only">Weekly Summary Only</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={draft.weeklySummaryEnabled}
                  onChange={e => setDraft(prev => ({ ...prev, weeklySummaryEnabled: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Send Sunday Weekly Academic Lookahead
              </label>
            </div>
          </div>
        </div>

        {/* Live Email Preview & Test Send Column */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-violet-600" /> Live Email Preview
              </h2>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                {(
                  [
                    { id: 'digest', label: 'Digest' },
                    { id: 'deadline', label: 'Deadline' },
                    { id: 'nudge', label: 'Nudge' }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewType(tab.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                      previewType === tab.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Email Card Built From Real App Data */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-950 text-xs">
              <div className="p-3.5 bg-gradient-to-r from-indigo-900 to-indigo-600 text-white">
                <div className="text-[10px] uppercase tracking-wider opacity-85 font-bold">
                  Nook StudyPlanner • {snapshot.academicMode}
                </div>
                <div className="text-sm font-bold mt-0.5">
                  {previewType === 'digest'
                    ? `Good morning, ${snapshot.studentName}!`
                    : previewType === 'deadline'
                      ? `Reminder: ${snapshot.deadlinesSoon[0]?.title || 'Upcoming Coursework'}`
                      : 'Quick 15-Minute Momentum Check-In'}
                </div>
              </div>

              <div className="p-3.5 space-y-3 text-slate-700 dark:text-slate-300">
                {previewType === 'digest' && (
                  <>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Today's Schedule ({snapshot.classesToday.length})
                      </div>
                      {snapshot.suspensionReason ? (
                        <p className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
                          {snapshot.suspensionReason}
                        </p>
                      ) : snapshot.classesToday.length === 0 ? (
                        <p className="text-slate-500">No regular classes scheduled today.</p>
                      ) : (
                        <ul className="space-y-1">
                          {snapshot.classesToday.slice(0, 4).map((c, idx) => (
                            <li key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">{c.courseCode}</span>{' '}
                              <span className="text-slate-500">
                                • {formatTime12h(c.startTime)} {c.room ? `(${c.room})` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-1">Upcoming Deadlines</div>
                      {snapshot.deadlinesSoon.length === 0 ? (
                        <p className="text-slate-500">No deadlines in the next 14 days.</p>
                      ) : (
                        <ul className="space-y-1">
                          {snapshot.deadlinesSoon.slice(0, 3).map((d, idx) => (
                            <li key={idx} className="flex justify-between gap-2">
                              <span className="truncate">{d.title}</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                {d.daysLeft === 0 ? 'Today' : `${d.daysLeft}d`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}

                {previewType === 'deadline' && (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {snapshot.deadlinesSoon[0]?.title || 'Sample Upcoming Assignment'}
                      </div>
                      <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                        {typeof snapshot.deadlinesSoon[0]?.daysLeft === 'number'
                          ? `${snapshot.deadlinesSoon[0].daysLeft} day(s) remaining (${snapshot.deadlinesSoon[0].dueDate})`
                          : '2 days remaining'}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Triggered automatically at 3 days, 2 days, and 1 day remaining while incomplete.
                    </p>
                  </div>
                )}

                {previewType === 'nudge' && (
                  <div className="space-y-2">
                    <p>
                      You have <strong>{tasks.filter(t => !t.completed).length}</strong> pending task(s). Start with just one 15-minute block today.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-60"
            >
              {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Real {previewType === 'digest' ? 'Digest' : previewType === 'deadline' ? 'Deadline' : 'Nudge'} Email Now
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delivery History Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Email Delivery &amp; Scheduler Logs
            </h2>
            <p className="text-xs text-slate-500">Live Gmail SMTP dispatch records stored in Supabase `email_notification_logs`</p>
          </div>
          <button
            type="button"
            onClick={() => refreshEmailNotificationLogs()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Subject / Event</th>
                <th className="py-2 pr-3 font-semibold">Recipient</th>
                <th className="py-2 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {emailNotificationLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 pr-3">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Sent
                      </span>
                    ) : (
                      <span
                        title={log.errorMessage}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold"
                      >
                        <XCircle className="w-3 h-3" /> {log.status}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {log.notificationType.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-900 dark:text-white">
                    <div>{log.subject}</div>
                    {log.errorMessage && <div className="text-[11px] text-rose-500">{log.errorMessage}</div>}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-500">{log.recipientEmail}</td>
                  <td className="py-2.5 text-slate-400 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {reminderLogs.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{r.category}</td>
                  <td className="py-2.5 pr-3 text-slate-900 dark:text-white">{r.title}</td>
                  <td className="py-2.5 pr-3 text-slate-500">{r.recipientEmail || draft.email || 'local'}</td>
                  <td className="py-2.5 text-slate-400">{r.actualTime || r.scheduledTime}</td>
                </tr>
              ))}
              {emailNotificationLogs.length === 0 && reminderLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No email logs recorded yet. Send a test email above to verify delivery end-to-end.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
