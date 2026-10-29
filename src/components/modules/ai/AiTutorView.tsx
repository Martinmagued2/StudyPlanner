import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Bot,
  Send,
  Copy,
  FileText,
  CheckSquare,
  Key,
  Download,
  Eraser,
  MessageSquare,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { MarkdownRenderer } from '../../common/MarkdownRenderer';

export const AiTutorView: React.FC = () => {
  const {
    chatSessions,
    activeChatSessionId,
    createNewChatSession,
    selectChatSession,
    deleteChatSession,
    renameChatSession,
    clearChatSessionMessages,
    sendAiMessage,
    courses,
    tasks,
    addNote,
    addTask,
    setIsAiDrawerOpen,
    setActiveView
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedNoteMsgId, setSavedNoteMsgId] = useState<string | null>(null);
  const [savedTaskMsgId, setSavedTaskMsgId] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = chatSessions.find(s => s.id === activeChatSessionId) || chatSessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isGenerating]);

  // Adjust textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSend = () => {
    const text = inputPrompt.trim();
    if (!text || isGenerating) return;

    setInputPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsGenerating(true);
    sendAiMessage(text);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditingTitleText(currentTitle);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitleText.trim()) {
      renameChatSession(id, editingTitleText.trim());
    }
    setEditingSessionId(null);
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSaveAsNote = (content: string, id: string) => {
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim() || 'AI Study Notes';
    addNote({
      title: firstLine.slice(0, 40),
      content: `<div class="ai-generated-notes"><h3>${firstLine}</h3><p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p></div>`,
      tags: ['ai-study', 'gemini'],
      pinned: false,
      highlightedTerms: []
    });
    setSavedNoteMsgId(id);
    setTimeout(() => setSavedNoteMsgId(null), 2500);
  };

  const handleCreateTaskFromMsg = (content: string, id: string) => {
    const firstSentence = content.split('.')[0].replace(/^#+\s*/, '').trim() || 'Review AI Tutor Study Summary';
    addTask({
      title: firstSentence.slice(0, 50),
      priority: 'medium',
      completed: false,
      tags: ['ai-tutor'],
      source: 'ai'
    });
    setSavedTaskMsgId(id);
    setTimeout(() => setSavedTaskMsgId(null), 2500);
  };

  const handleExportTranscript = () => {
    if (!activeSession) return;
    const markdown = `# ${activeSession.title}\n\n*Exported from Nook Academic AI Tutor on ${new Date().toLocaleDateString()}*\n\n---\n\n` +
      activeSession.messages.map(m => `### ${m.sender === 'user' ? 'Student' : 'Gemini AI'} (${m.timestamp})\n\n${m.content}\n\n---\n`).join('\n');
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeSession.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_transcript.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter sessions by search
  const filteredSessions = chatSessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const samplePrompts = [
    {
      title: '🧬 Explain Difficult Concepts',
      desc: 'Break down complex theory simply with structured analogies & tables',
      prompt: 'Explain the difference between stack and heap memory in C++ and Java with a clear comparison table and code example.'
    },
    {
      title: '💻 Code Generation & Debugging',
      desc: 'Write algorithms with clean syntax, time complexity, and inline comments',
      prompt: 'Write an implementation of QuickSort in Python with time complexity analysis and detailed inline comments.'
    },
    {
      title: '📝 Generate Practice Exam Questions',
      desc: 'Create realistic multiple choice and short answer quiz questions with answers',
      prompt: 'Generate 5 challenging university-level exam questions on my enrolled courses with full solutions and answer explanations.'
    },
    {
      title: '📅 Plan Focus Study Schedule',
      desc: 'Optimize your revision time with Pomodoro intervals and target tasks',
      prompt: 'Help me plan a 3-hour focused revision timetable for tonight covering my upcoming tasks and classes, with strategic breaks.'
    }
  ];

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Left Chat Sessions Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-72 sm:w-80' : 'w-0'
        } transition-all duration-200 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden select-none z-20`}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <button
            onClick={() => createNewChatSession()}
            className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-semibold flex items-center justify-between shadow-xs transition-all group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>New Study Chat</span>
            </div>
            <span className="text-[10px] font-mono opacity-70 bg-white/20 dark:bg-black/10 px-1.5 py-0.5 rounded">
              Ctrl+K
            </span>
          </button>

          {/* Search Chats */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
              No matching chats found
            </div>
          ) : (
            filteredSessions.map(session => {
              const isActive = session.id === activeChatSessionId;
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => selectChatSession(session.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold border border-blue-200/80 dark:border-blue-900/50'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                      }`}
                    />
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingTitleText}
                        onChange={e => setEditingTitleText(e.target.value)}
                        onBlur={() => handleSaveRename(session.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-blue-400 text-xs focus:outline-none"
                      />
                    ) : (
                      <span className="truncate">{session.title}</span>
                    )}
                  </div>

                  {/* Actions on hover or active */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditing && (
                      <button
                        onClick={e => handleStartRename(session.id, session.title, e)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Rename Chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteChatSession(session.id);
                      }}
                      className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Delete Chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Model Status & Key Settings */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gemini 3.5 Flash-Lite</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
              ● Active
            </span>
          </div>
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="w-full py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Key className="w-3 h-3 text-blue-500" />
            <span>Manage Gemini API Key</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Chat Conversation Screen */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Top Navbar */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title={isSidebarOpen ? 'Hide chat history' : 'Show chat history'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {activeSession?.title || 'Academic AI Tutor'}
              </h1>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTranscript}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Download conversation as Markdown"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => activeSession && clearChatSessionMessages(activeSession.id)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Clear conversation"
            >
              <Eraser className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={() => setActiveView('today')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* If New Chat with only 1 initial welcome message */}
            {activeSession && activeSession.messages.length <= 1 && (
              <div className="py-6 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    How can I assist your studies today?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Ask questions across math, science, programming, and humanities. Responses format equations, structured tables, and highlighted code.
                  </p>
                </div>

                {/* Enrolled Courses Context Indicator */}
                {courses.length > 0 && (
                  <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      Active Courses:
                    </span>
                    {courses.map(c => (
                      <span
                        key={c.id}
                        className="px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold border"
                        style={{
                          backgroundColor: `${c.color}15`,
                          borderColor: `${c.color}40`,
                          color: c.color
                        }}
                      >
                        {c.code}
                      </span>
                    ))}
                  </div>
                )}

                {/* Starter Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {samplePrompts.map((card, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setInputPrompt(card.prompt);
                        textareaRef.current?.focus();
                      }}
                      className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm cursor-pointer transition-all space-y-1 group"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span>{card.title}</span>
                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">↳</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {card.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Render Messages */}
            {activeSession?.messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Avatar */}
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-500/10'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between gap-3 text-[10px] mb-2 pb-1 border-b ${
                      msg.sender === 'user'
                        ? 'border-blue-500/40 text-blue-100'
                        : 'border-slate-100 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className={`font-semibold ${msg.sender === 'user' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                      {msg.sender === 'user' ? 'You' : 'Google Gemini Tutor'}
                    </span>
                    <span className={msg.sender === 'user' ? 'text-blue-100 font-mono' : 'text-slate-400 font-mono'}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Thinking Steps Disclosure */}
                  {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                    <div className="mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() =>
                          setExpandedThinking(prev => ({
                            ...prev,
                            [msg.id]: !prev[msg.id]
                          }))
                        }
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <Brain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Reasoning Steps ({msg.reasoningSteps.length})</span>
                        {expandedThinking[msg.id] ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {expandedThinking[msg.id] && (
                        <div className="mt-2 space-y-1 pl-3 border-l-2 border-blue-400 dark:border-blue-500 font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                          {msg.reasoningSteps.map((step, idx) => (
                            <div key={idx}>↳ {step}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content: Clean high-contrast text for user, Markdown + KaTeX + Prism for assistant */}
                  {msg.sender === 'user' ? (
                    <div className="whitespace-pre-wrap text-[13px] font-normal leading-relaxed text-white select-text">
                      {msg.content}
                    </div>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}

                  {/* Assistant Message Actions (Copy, Save Note, Task) */}
                  {msg.sender === 'assistant' && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                          title="Copy response to clipboard"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSaveAsNote(msg.content, msg.id)}
                          className="px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                          title="Save response into Notes & Editor"
                        >
                          {savedNoteMsgId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Saved to Notes!</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3 text-blue-500" />
                              <span>Save to Notes</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCreateTaskFromMsg(msg.content, msg.id)}
                          className="px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                          title="Create a study task"
                        >
                          {savedTaskMsgId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Task Created!</span>
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-3 h-3 text-amber-500" />
                              <span>Create Task</span>
                            </>
                          )}
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        Gemini 3.5 Flash-Lite
                      </span>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 shadow-sm">
                    U
                  </div>
                )}
              </div>
            ))}

            {/* Generating Indicator */}
            {isGenerating && (
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>Gemini is thinking and drafting your answer...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 3. Bottom Prompt Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="relative flex items-end gap-2 p-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask your tutor anything (e.g. explain AVL trees, solve math, write Python code, quiz me)..."
                className="flex-1 bg-transparent border-0 resize-none text-sm font-normal text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none p-1.5 max-h-44 leading-relaxed"
              />

              <button
                onClick={handleSend}
                disabled={!inputPrompt.trim() || isGenerating}
                className={`p-2 rounded-xl transition-all shrink-0 ${
                  inputPrompt.trim() && !isGenerating
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:scale-105'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Enter</kbd> to send</span>
                <span>•</span>
                <span><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Shift+Enter</kbd> for new line</span>
              </div>
              <span className="hidden sm:inline text-slate-400">
                Connected to Google Gemini AI Engine
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
