import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { AiMemoryCategory } from '../../../types';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Brain,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  BookOpen,
  Calendar,
  Layers,
  Key,
  ExternalLink,
  Maximize2,
  Edit2
} from 'lucide-react';
import { MarkdownRenderer } from '../../common/MarkdownRenderer';

export const GlobalAiDrawer: React.FC = () => {
  const {
    courses,
    isAiDrawerOpen,
    setIsAiDrawerOpen,
    aiMessages,
    sendAiMessage,
    clearAiChat,
    isAiReasoning,
    setIsAiReasoning,
    aiMemories,
    addAiMemory,
    updateAiMemory,
    deleteAiMemory,
    handleActionProposal,
    setActiveView
  } = useApp();

  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'guide'>('chat');
  const [inputText, setInputText] = useState('');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<AiMemoryCategory>('preference');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editMemoryText, setEditMemoryText] = useState('');
  const [editMemoryCategory, setEditMemoryCategory] = useState<AiMemoryCategory>('preference');
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [geminiApiKey, setGeminiApiKey] = useState(() => ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || localStorage.getItem('nook_gemini_api_key') || '');
  const [apiKeySavedStatus, setApiKeySavedStatus] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSaveApiKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('nook_gemini_api_key', geminiApiKey.trim());
    setApiKeySavedStatus(geminiApiKey.trim() ? 'Google Gemini API key connected successfully!' : 'Key cleared. Using local assistant.');
    setTimeout(() => setApiKeySavedStatus(''), 3500);
  };

  const handleTestKey = async () => {
    if (!geminiApiKey.trim()) return;
    setIsTestingKey(true);
    setApiKeySavedStatus('Verifying with Google Gemini...');

    // Prioritize high-throughput, low-latency models to avoid 503 / high demand bottlenecks
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash'
    ];

    let verified = false;
    let lastError = '';

    for (const model of candidateModels) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello' }] }]
            })
          }
        );
        const data = await resp.json();
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          localStorage.setItem('nook_gemini_api_key', geminiApiKey.trim());
          setApiKeySavedStatus(`✓ Connected! Google Gemini (${model}) is active.`);
          verified = true;
          break;
        } else if (data?.error?.message) {
          lastError = data.error.message;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Network error';
      }
    }

    if (!verified) {
      setApiKeySavedStatus('⚠ Key error: ' + (lastError || 'Experiencing high demand, please retry.'));
    }

    setIsTestingKey(false);
    setTimeout(() => setApiKeySavedStatus(''), 6000);
  };

  useEffect(() => {
    if (isAiDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiDrawerOpen]);

  if (!isAiDrawerOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendAiMessage(inputText);
    setInputText('');
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    addAiMemory(newMemoryText.trim(), newMemoryCategory, 'explicit');
    setNewMemoryText('');
  };

  const handleSaveMemoryEdit = (id: string) => {
    if (!editMemoryText.trim()) return;
    updateAiMemory(id, { content: editMemoryText.trim(), category: editMemoryCategory });
    setEditingMemoryId(null);
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Nook AI Assistant</span>
              <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Reasoning Active
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAiReasoning(!isAiReasoning)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
              isAiReasoning
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Toggle Deep Reasoning mode"
          >
            <Brain className="w-3 h-3" />
            <span className="hidden sm:inline">Reasoning</span>
          </button>
          <button
            onClick={clearAiChat}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setIsAiDrawerOpen(false);
              setActiveView('ai-tutor');
            }}
            className="p-1.5 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="Open Full Page AI Tutor"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsAiDrawerOpen(false)}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('chat')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Assistant Chat
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'memory'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>Memories</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
            {aiMemories.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'guide'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Study with AI & Key</span>
        </button>
      </div>

      {/* Body */}
      {activeTab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span>{msg.sender === 'user' ? 'You' : 'Nook AI'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60'
                  }`}
                >
                  {/* Reasoning Trace Steps */}
                  {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => toggleThinking(msg.id)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <Brain className="w-3 h-3 text-blue-600" />
                        <span>Thinking Process ({msg.reasoningSteps.length} steps)</span>
                        {expandedThinking[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {expandedThinking[msg.id] && (
                        <div className="mt-2 space-y-1 pl-3 border-l-2 border-blue-400 dark:border-blue-500 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {msg.reasoningSteps.map((step, idx) => (
                            <div key={idx}>↳ {step}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  {msg.sender === 'user' ? (
                    <div className="whitespace-pre-wrap text-[13px] font-normal leading-relaxed text-white select-text">
                      {msg.content}
                    </div>
                  ) : (
                    <>
                      <MarkdownRenderer content={msg.content} />
                      {msg.memoriesUsed && msg.memoriesUsed.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-start gap-1.5 text-[10px] text-blue-600 dark:text-blue-400">
                          <Brain className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>
                            <strong>Personalized using your preferences:</strong> {msg.memoriesUsed.join(' • ')}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Document Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Source Citations
                      </div>
                      {msg.citations.map((cite, i) => (
                        <div key={i} className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px]">
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            [{i + 1}] {cite.file} • Page {cite.page}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 italic mt-0.5">
                            "{cite.quote}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Proposals */}
                  {msg.actionProposals && msg.actionProposals.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Proposed Action Card</span>
                      </div>
                      {msg.actionProposals.map(proposal => (
                        <div
                          key={proposal.id}
                          className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900"
                        >
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                            {proposal.payload.title}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {proposal.reasoning}
                          </p>

                          {proposal.status === 'pending' ? (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <button
                                onClick={() => handleActionProposal(proposal.id, true)}
                                className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm & Create</span>
                              </button>
                              <button
                                onClick={() => handleActionProposal(proposal.id, false)}
                                className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                              >
                                Dismiss
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Action {proposal.status}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-950/20">
            {courses.length === 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => sendAiMessage("How do I use Ask AI?")}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 font-medium text-blue-600 dark:text-blue-400"
                >
                  💡 How do I use Ask AI?
                </button>
                <button
                  type="button"
                  onClick={() => sendAiMessage("I prefer studying at night in 45-minute sessions with 10-minute breaks")}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
                >
                  🧠 Save study preference
                </button>
                <button
                  type="button"
                  onClick={() => sendAiMessage("I am taking CS 101 on Mondays at 10 AM")}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
                >
                  🏫 Add CS 101 Mon 10am
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => sendAiMessage("Plan my study timetable for today")}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 shrink-0"
                >
                  Plan my day
                </button>
                <button
                  type="button"
                  onClick={() => sendAiMessage("I prefer studying in 45-minute sessions with 10-minute breaks")}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 shrink-0"
                >
                  🧠 Set 45m / 10m break rule
                </button>
                <button
                  type="button"
                  onClick={() => sendAiMessage("What should I focus on right now?")}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 shrink-0"
                >
                  What should I do now?
                </button>
              </>
            )}
          </div>

          {/* Chat Composer */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask questions or state a preference (e.g. 'I prefer studying at night')..."
              className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
            />
            <button
              type="submit"
              className="p-2 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      ) : activeTab === 'memory' ? (
        /* Persistent AI Memory & Personalization Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Persistent AI Memory & Personalization</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
              Preferences saved here (or stated in chat) automatically personalize your <strong>Plan My Day</strong> schedule, session durations, break intervals, and study advice across all sessions.
            </p>
          </div>

          {/* Quick 1-Click Preference Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Quick Add Common Preferences
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🌙 Study at night', text: 'I prefer studying at night (after 3 PM)', cat: 'preference' as AiMemoryCategory },
                { label: '☀️ Study in morning', text: 'I prefer studying in the morning', cat: 'preference' as AiMemoryCategory },
                { label: '⏱️ 45m sessions + 10m breaks', text: 'My study sessions should be 45 minutes with 10-minute breaks', cat: 'habit' as AiMemoryCategory },
                { label: '🗓️ No study on Fridays', text: "I don't study on Fridays", cat: 'commitment' as AiMemoryCategory },
                { label: '😴 Sleep by 11 PM', text: 'I go to bed at 11 PM', cat: 'sleep' as AiMemoryCategory }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => addAiMemory(preset.text, preset.cat, 'explicit')}
                  className="px-2 py-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddMemory} className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <select
                value={newMemoryCategory}
                onChange={e => setNewMemoryCategory(e.target.value as AiMemoryCategory)}
                className="px-2 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="preference">Study Preference</option>
                <option value="habit">Session / Break Habit</option>
                <option value="schedule">Availability / Schedule</option>
                <option value="sleep">Sleep Schedule</option>
                <option value="commitment">Personal Commitment</option>
                <option value="weakness">Course Weakness</option>
                <option value="goal">Academic Goal</option>
              </select>
              <button
                type="submit"
                className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800"
              >
                Save Memory
              </button>
            </div>
            <input
              type="text"
              value={newMemoryText}
              onChange={e => setNewMemoryText(e.target.value)}
              placeholder="e.g. I prefer 45-minute study sessions with 10-minute breaks..."
              className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </form>

          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Saved User Memories ({aiMemories.length})
            </h4>
            {aiMemories.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                No memories saved yet. Add a preference above or tell the AI in chat!
              </div>
            ) : (
              aiMemories.map(mem => {
                const memContent = mem.content || mem.fact || '';
                const isEditing = editingMemoryId === mem.id;
                return (
                  <div
                    key={mem.id}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2 text-xs shadow-2xs"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={editMemoryCategory}
                            onChange={e => setEditMemoryCategory(e.target.value as AiMemoryCategory)}
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          >
                            <option value="preference">Preference</option>
                            <option value="habit">Habit</option>
                            <option value="schedule">Schedule</option>
                            <option value="sleep">Sleep</option>
                            <option value="commitment">Commitment</option>
                            <option value="weakness">Weakness</option>
                            <option value="goal">Goal</option>
                          </select>
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveMemoryEdit(mem.id)}
                              className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-medium"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemoryId(null)}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={editMemoryText}
                          onChange={e => setEditMemoryText(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 capitalize font-semibold">
                              {mem.category}
                            </span>
                            {mem.source && (
                              <span className="text-[10px] text-slate-400">
                                • {mem.source === 'explicit' ? 'User stated' : 'Learned'}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{memContent}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMemoryId(mem.id);
                              setEditMemoryText(memContent);
                              setEditMemoryCategory(mem.category);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            title="Edit memory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAiMemory(mem.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Study with AI & Gemini Key Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Live Google Gemini Integration Card */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Google Gemini AI Engine</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                geminiApiKey.trim()
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                {geminiApiKey.trim() ? '● Gemini Live Connected' : '● Built-in Local Engine'}
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Connect your own <strong>free Google Gemini API key</strong> to unlock live generative tutoring for any academic discipline (mathematics, programming, biology, essays, research).
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-2">
              <div className="relative">
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="Paste Gemini API key (AIzaSy...)"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Get Free Key at Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTestingKey}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {isTestingKey ? 'Verifying...' : 'Test Key'}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
                  >
                    Save API Key
                  </button>
                </div>
              </div>

              {apiKeySavedStatus && (
                <div className="p-2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{apiKeySavedStatus}</span>
                </div>
              )}
            </form>
          </div>

          {/* Quick Study Prompts (Click to Use) */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Click to Try Study Prompts</span>
            </h4>
            
            <div className="space-y-1.5">
              {[
                {
                  title: '🎓 Concept Tutoring',
                  prompt: 'Explain the core intuition of Big-O time complexity and binary search trees with code examples.'
                },
                {
                  title: '📝 Auto-Breakdown Essay',
                  prompt: 'I have a 2,000-word Research Essay due next Friday. Break it down into 5 actionable daily steps.'
                },
                {
                  title: '📅 Auto-Add Course to Timetable',
                  prompt: 'I am taking Introduction to Algorithms on Monday and Wednesday at 10:00 AM in Turing Hall 101.'
                },
                {
                  title: '🧪 Practice Exam Quiz',
                  prompt: 'Quiz me on my studies: ask me 3 challenging multiple-choice questions one at a time and grade my answers.'
                },
                {
                  title: '🎯 Daily Study Timetable',
                  prompt: 'Analyze my upcoming course tasks and plan an optimal 3-hour study schedule for tonight.'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setInputText(item.prompt);
                    setActiveTab('chat');
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer transition-all space-y-1 group"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-xs">
                    {item.title}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    "{item.prompt}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Features Guide across the app */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11.5px] text-slate-600 dark:text-slate-300">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Where AI Works Inside Nook:
            </h4>
            <ul className="space-y-1.5 list-disc pl-4">
              <li><strong>In Notes:</strong> Click the <span className="font-semibold text-blue-600">✨ AI Assist</span> button on any note to summarize, extract key terms, or generate revision flashcards.</li>
              <li><strong>In Study Hub:</strong> Click <span className="font-semibold text-blue-600">Generate AI Quiz</span> to test your knowledge with automatic scoring.</li>
              <li><strong>In Files:</strong> Upload lecture PDFs or slides and ask the AI specific questions with citations and page numbers.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
