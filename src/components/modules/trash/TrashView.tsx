import React from 'react';
import { useApp } from '../../../context/AppContext';
import { Trash2, RotateCcw, FileText, AlertCircle } from 'lucide-react';

export const TrashView: React.FC = () => {
  const { notes, restoreNote, deleteNotePermanently } = useApp();

  const trashedNotes = notes.filter(n => n.inTrash);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Trash & Soft-Deleted Items
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Recover deleted lecture notes and coursework records, or permanently purge them.
          </p>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Deleted Notes ({trashedNotes.length})</span>
        </div>

        {trashedNotes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Trash is currently empty.
          </div>
        ) : (
          trashedNotes.map(n => (
            <div key={n.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Updated {new Date(n.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => restoreNote(n.id)}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => deleteNotePermanently(n.id)}
                  className="px-2.5 py-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Forever</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
