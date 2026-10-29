import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Inbox,
  Plus,
  Mail,
  Bookmark,
  FileText,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Code2,
  Trash2,
  Check
} from 'lucide-react';
import { InboxType } from '../../../types';

export const InboxView: React.FC = () => {
  const { inboxItems, addInboxItem, convertInboxItem, deleteInboxItem } = useApp();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<InboxType>('note');
  const [url, setUrl] = useState('');
  const [showBookmarkletModal, setShowBookmarkletModal] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addInboxItem({
      title,
      content,
      type,
      url: url || undefined
    });

    setTitle('');
    setContent('');
    setUrl('');
  };

  const bookmarkletCode = `javascript:(function(){var title=document.title;var url=location.href;var sel=window.getSelection().toString();alert('Captured to Nook Inbox: '+title);})();`;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Inbox & Quick Capture
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Capture thoughts, bookmarks, and high-priority emails without breaking your study flow. Convert them into tasks or notes later.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBookmarkletModal(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Browser Bookmarklet</span>
          </button>
        </div>
      </div>

      {/* Capture Input Card */}
      <form onSubmit={handleCreate} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setType('note')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
              type === 'note'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quick Idea</span>
          </button>
          <button
            type="button"
            onClick={() => setType('bookmark')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
              type === 'bookmark'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Web Bookmark</span>
          </button>
          <button
            type="button"
            onClick={() => setType('email')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
              type === 'email'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Imported Email</span>
          </button>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={type === 'bookmark' ? 'Resource Title...' : type === 'email' ? 'Subject...' : 'Quick idea or thought...'}
            className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
          />

          {type === 'bookmark' && (
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://arxiv.org/abs/..."
              className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none font-mono"
            />
          )}

          <textarea
            rows={2}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Context, takeaways, or snippets..."
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800"
          >
            Capture to Inbox
          </button>
        </div>
      </form>

      {/* Captured Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inboxItems.map(item => {
          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-colors flex flex-col justify-between space-y-3 ${
                item.processed
                  ? 'opacity-60 bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-500 capitalize">
                    {item.type === 'bookmark' && <Bookmark className="w-3.5 h-3.5 text-blue-600" />}
                    {item.type === 'email' && <Mail className="w-3.5 h-3.5 text-amber-600" />}
                    {item.type === 'note' && <FileText className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{item.type}</span>
                  </span>

                  {item.processed ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
                      Converted to {item.convertedTo}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">Unprocessed</span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                  {item.content}
                </p>

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 truncate"
                  >
                    <span>{item.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>

              {/* Conversion Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {!item.processed ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => convertInboxItem(item.id, 'task')}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                    >
                      → Task
                    </button>
                    <button
                      onClick={() => convertInboxItem(item.id, 'note')}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                    >
                      → Note
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Processed</span>
                  </div>
                )}

                <button
                  onClick={() => deleteInboxItem(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bookmarklet Modal */}
      {showBookmarkletModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Web Page Quick-Capture Bookmarklet
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Drag this button to your browser bookmarks bar to save research papers, article links, and highlights directly into Nook:
            </p>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] break-all select-all">
              {bookmarkletCode}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bookmarkletCode);
                  setCopiedBookmarklet(true);
                  setTimeout(() => setCopiedBookmarklet(false), 2000);
                }}
                className="px-3 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium flex items-center gap-1"
              >
                {copiedBookmarklet ? <Check className="w-3 h-3" /> : null}
                <span>{copiedBookmarklet ? 'Copied' : 'Copy JavaScript Snippet'}</span>
              </button>
              <button
                onClick={() => setShowBookmarkletModal(false)}
                className="px-3 py-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
