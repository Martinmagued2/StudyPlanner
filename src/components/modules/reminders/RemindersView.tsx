import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Bell,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Calendar
} from 'lucide-react';

export const RemindersView: React.FC = () => {
  const { reminderLogs, triggerTestReminder, user } = useApp();

  const [digestTime, setDigestTime] = useState('08:00');
  const [leadTimeHours, setLeadTimeHours] = useState(24);
  const [enableClasses, setEnableClasses] = useState(true);
  const [enableDeadlines, setEnableDeadlines] = useState(true);
  const [enableEvening, setEnableEvening] = useState(true);
  const [destinationEmail, setDestinationEmail] = useState(user?.email || 'alex.rivera@uel.ac.uk');
  const [timezone, setTimezone] = useState('Europe/London (GMT+01:00)');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Reminders & Dispatch Activity Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure automated daily morning digests, deadline warning lead times, and audit dispatch lateness logs.
          </p>
        </div>

        <button
          onClick={triggerTestReminder}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch Diagnostic Test</span>
        </button>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Timing & Categories */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Automated Digest Timing</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Morning Digest Time</label>
              <input
                type="time"
                value={digestTime}
                onChange={e => setDigestTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Deadline Lead Warning</label>
              <select
                value={leadTimeHours}
                onChange={e => setLeadTimeHours(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value={12}>12 Hours Ahead</option>
                <option value={24}>24 Hours Ahead (Standard)</option>
                <option value={48}>48 Hours Ahead</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Enabled Notification Categories:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableClasses}
                onChange={e => setEnableClasses(e.target.checked)}
                className="rounded text-slate-900"
              />
              <span>Daily Class Meeting Schedule (Morning Digest)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableDeadlines}
                onChange={e => setEnableDeadlines(e.target.checked)}
                className="rounded text-slate-900"
              />
              <span>Coursework & Assignment Deadlines</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableEvening}
                onChange={e => setEnableEvening(e.target.checked)}
                className="rounded text-slate-900"
              />
              <span>Evening Overdue Task Roundup & Slipped Work Summary</span>
            </label>
          </div>
        </div>

        {/* Delivery Destination */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600" />
            <span>Delivery Destination & Timezone</span>
          </h3>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Destination Email</label>
            <input
              type="email"
              value={destinationEmail}
              onChange={e => setDestinationEmail(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Timezone Adjustment</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="Europe/London (GMT+01:00)">Europe/London (BST / GMT+01:00)</option>
              <option value="America/New_York (EST)">America/New_York (EST)</option>
              <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
              <option value="UTC">Universal Coordinated Time (UTC)</option>
            </select>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-slate-500 text-[11px]">
            In-app desktop notifications are automatically dispatched simultaneously even if SMTP delivery encounters temporary latency.
          </div>
        </div>
      </div>

      {/* Send Activity Log Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Dispatch Audit Logs ({reminderLogs.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Real-time lateness verification</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {reminderLogs.map(log => (
            <div key={log.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{log.title}</span>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Scheduled: {log.scheduledTime} • Actual: {log.actualTime} • Category: {log.category}
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Delivered ({log.latenessMinutes}s latency)</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
