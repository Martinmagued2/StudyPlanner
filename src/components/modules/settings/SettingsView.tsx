import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Settings,
  User,
  Moon,
  Sun,
  Globe,
  Bell,
  HardDrive,
  LogOut,
  RotateCcw,
  CheckCircle2,
  Shield,
  Key
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, logout, theme, setTheme, clearAllWorkspaceData, exportWorkspaceJson } = useApp();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [name, setName] = useState(user?.name || 'Alex Rivera');
  const [email, setEmail] = useState(user?.email || 'alex.rivera@uel.ac.uk');
  const [timezone, setTimezone] = useState('Europe/London (BST / GMT+01:00)');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Settings & Workspace Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your student profile, theme preferences, timezones, data protection, and session security.
          </p>
        </div>

        {savedSuccess && (
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully</span>
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

      {/* Appearance & Theme (Simple, crisp, no violet or gradients!) */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>Appearance & Design Theme</span>
        </h3>
        <p className="text-slate-500">
          Clean monochrome and neutral slate palette. Zero purple or violent gradients.
        </p>

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
            <span>Reset Workspace to Clean Slate</span>
          </h4>
          <p className="text-slate-500 mt-0.5">
            Remove all demo data and start 100% fresh with 0 courses, 0 assignments, and 0 notes so you can build your own setup.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to wipe all workspace data and start completely fresh?')) {
              clearAllWorkspaceData();
            }
          }}
          className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear All Data & Start Fresh</span>
        </button>
      </div>

      {/* Account Security & Sign Out */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100">Session & Workspace Security</h4>
          <p className="text-slate-500 mt-0.5">
            Signed session cookie active for {user?.email}. Workspace data strictly isolated.
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
