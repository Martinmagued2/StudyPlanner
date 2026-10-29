import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  HardDriveDownload,
  Upload,
  Download,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database
} from 'lucide-react';

export const BackupsView: React.FC = () => {
  const {
    exportWorkspaceJson,
    importWorkspaceJson,
    resetAllDemoData,
    courses,
    assignments,
    tasks,
    notes,
    files
  } = useApp();

  const [restoreJson, setRestoreJson] = useState('');
  const [snapshotPreview, setSnapshotPreview] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const handleDownloadBackup = () => {
    const jsonStr = exportWorkspaceJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nook_Full_Workspace_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({ text: 'Full workspace snapshot downloaded successfully.' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setRestoreJson(content);
      try {
        const parsed = JSON.parse(content);
        setSnapshotPreview(parsed);
        setStatusMessage(null);
      } catch {
        setStatusMessage({ text: 'Invalid JSON backup file format.', error: true });
      }
    };
    reader.readAsText(file);
  };

  const handleCommitRestore = () => {
    if (!restoreJson) return;
    const success = importWorkspaceJson(restoreJson);
    if (success) {
      setStatusMessage({ text: 'Workspace successfully restored with relationship integrity preserved!' });
      setSnapshotPreview(null);
      setRestoreJson('');
    } else {
      setStatusMessage({ text: 'Failed to restore workspace. Corrupted data schema.', error: true });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Data Protection, Backup & Restore
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Full JSON exports, relational integrity verification, multi-layer local snapshots, and safe workspace restoration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadBackup}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
          statusMessage.error
            ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900'
        }`}>
          {statusMessage.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Current Workspace Snapshot Overview */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Active Workspace Relational Counts</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-400 text-[11px]">Courses</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{courses.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-400 text-[11px]">Assignments</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{assignments.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-400 text-[11px]">Tasks</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{tasks.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-400 text-[11px]">Lecture Notes</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{notes.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-400 text-[11px]">Indexed Files</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{files.length}</div>
          </div>
        </div>
      </div>

      {/* Restore Section & Snapshot Preview */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-600" />
          <span>Restore from Backup File</span>
        </h3>

        <div className="p-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
          <label className="cursor-pointer font-semibold text-blue-600 hover:underline">
            <span>Choose a Nook .json backup file</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-slate-400 text-[11px]">
            Preview records and verify ID remapping before committing changes to your workspace.
          </p>
        </div>

        {/* Snapshot Preview modal/box */}
        {snapshotPreview && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Snapshot Validation Preview:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
              <div>Courses: {snapshotPreview.courses?.length || 0}</div>
              <div>Assignments: {snapshotPreview.assignments?.length || 0}</div>
              <div>Tasks: {snapshotPreview.tasks?.length || 0}</div>
              <div>Notes: {snapshotPreview.notes?.length || 0}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSnapshotPreview(null)}
                className="px-3 py-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitRestore}
                className="px-4 py-1.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-sm"
              >
                Confirm & Restore Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Demo Data Protection */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100">Reset to Academic Demo Dataset</h4>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Safely reset your workspace to the realistic sample academic dataset (CS 302, AI 401, MATH 210, WEB 250).
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Are you sure you want to restore the default academic demo dataset? Custom items will be replaced.')) {
              resetAllDemoData();
              setStatusMessage({ text: 'Workspace reset to realistic sample academic data.' });
            }
          }}
          className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium shrink-0 flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>
    </div>
  );
};
