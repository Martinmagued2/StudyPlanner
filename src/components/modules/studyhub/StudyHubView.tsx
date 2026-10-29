import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Sparkles,
  Timer,
  BarChart3,
  RotateCw,
  Play,
  Pause,
  Plus,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Brain,
  Keyboard,
  Award
} from 'lucide-react';
import { Flashcard } from '../../../types';

export const StudyHubView: React.FC = () => {
  const {
    flashcards,
    flashcardDecks,
    reviewFlashcard,
    addFlashcard,
    courses,
    tasks,
    focusSessions,
    focusState,
    startFocusTimer,
    pauseFocusTimer,
    resumeFocusTimer,
    stopFocusTimer,
    addFocusMinutes
  } = useApp();

  const [activeTab, setActiveTab] = useState<'flashcards' | 'timer' | 'insights'>('flashcards');

  // Flashcard review state
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueCards = flashcards.filter(f => f.dueDate <= todayStr && !f.suspended);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string>('all');

  const activeReviewCards = dueCards.filter(c => selectedDeckFilter === 'all' || c.deckId === selectedDeckFilter);
  const activeCard = activeReviewCards[currentCardIndex];

  // Custom Timer inputs
  const [customMinutes, setCustomMinutes] = useState(25);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Keyboard shortcuts 1-4 & Space to flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'flashcards' || !activeCard) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleGrade(1);
        else if (e.key === '2') handleGrade(2);
        else if (e.key === '3') handleGrade(3);
        else if (e.key === '4') handleGrade(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeCard, isFlipped]);

  const handleGrade = (grade: 1 | 2 | 3 | 4) => {
    if (!activeCard) return;
    reviewFlashcard(activeCard.id, grade);
    setIsFlipped(false);
    if (currentCardIndex >= activeReviewCards.length - 1) {
      setCurrentCardIndex(0);
    }
  };

  // Timer format
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const timerProgress = focusState.initialDuration > 0
    ? ((focusState.initialDuration - focusState.timeLeft) / focusState.initialDuration) * 100
    : 0;

  // Study Insights calculations
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.actualMinutes, 0);
  const streakDays = 5;
  const retentionRate = 88;

  const past14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400 * 1000);
    const dayLabel = d.toLocaleDateString([], { weekday: 'narrow' });
    const minutes = [45, 50, 25, 60, 40, 75, 90, 50, 45, 60, 70, 80, 50, 65][i];
    return { dayLabel, minutes };
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Study Hub: Flashcards, Focus & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            SM-2 spaced repetition flashcards, customizable Pomodoro focus sessions, and 14-day study retention insights.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs font-medium">
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Spaced Flashcards ({dueCards.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('timer')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'timer'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Focus Timer</span>
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'insights'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>Study Insights</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FLASHCARDS (SM-2) */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Deck selector */}
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-slate-400 font-medium">Decks:</span>
              <button
                onClick={() => { setSelectedDeckFilter('all'); setCurrentCardIndex(0); }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedDeckFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Decks ({dueCards.length} due)
              </button>
              {flashcardDecks.map(deck => {
                const count = flashcards.filter(f => f.deckId === deck.id && f.dueDate <= todayStr).length;
                return (
                  <button
                    key={deck.id}
                    onClick={() => { setSelectedDeckFilter(deck.id); setCurrentCardIndex(0); }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      selectedDeckFilter === deck.id
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {deck.name} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 hidden sm:flex">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Space to flip • 1-4 to grade</span>
            </div>
          </div>

          {/* Flip Card Review Interface */}
          {activeCard ? (
            <div className="max-w-2xl mx-auto space-y-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="min-h-[280px] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between select-none"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Card {currentCardIndex + 1} of {activeReviewCards.length}</span>
                  <span>{isFlipped ? 'Answer (Click to flip)' : 'Question (Click or press Space)'}</span>
                </div>

                <div className="py-8 text-center">
                  {!isFlipped ? (
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                      {activeCard.question}
                    </h3>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        {activeCard.answer}
                      </p>
                      {activeCard.citation && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-mono italic">
                          Citation: {activeCard.citation.file} • {activeCard.citation.pageOrSlide}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-slate-400">
                  {!isFlipped ? 'Click card or press Space to reveal answer' : 'Grade your recall ease below:'}
                </div>
              </div>

              {/* SM-2 Grading Buttons (Only visible on flip) */}
              {isFlipped && (
                <div className="grid grid-cols-4 gap-2 sm:gap-3 text-xs">
                  <button
                    onClick={() => handleGrade(1)}
                    className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 hover:bg-rose-100 font-medium text-center"
                  >
                    <div className="font-bold">Again (1)</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">&lt; 10 mins</div>
                  </button>
                  <button
                    onClick={() => handleGrade(2)}
                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 hover:bg-amber-100 font-medium text-center"
                  >
                    <div className="font-bold">Hard (2)</div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">1 day</div>
                  </button>
                  <button
                    onClick={() => handleGrade(3)}
                    className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 hover:bg-blue-100 font-medium text-center"
                  >
                    <div className="font-bold">Good (3)</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">3 days</div>
                  </button>
                  <button
                    onClick={() => handleGrade(4)}
                    className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 hover:bg-emerald-100 font-medium text-center"
                  >
                    <div className="font-bold">Easy (4)</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">6 days</div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-md mx-auto text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                You're all caught up for today!
              </h3>
              <p className="text-xs text-slate-500">
                No more flashcards due right now under the SM-2 algorithm. You can create more cards from lecture notes or diagnostic tests anytime.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FOCUS TIMER */}
      {activeTab === 'timer' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center space-y-6">
            {/* Circular Progress & Countdown */}
            <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="stroke-emerald-600 transition-all duration-300"
                  strokeWidth="6"
                  strokeDasharray="276"
                  strokeDashoffset={276 - (276 * timerProgress) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {formatTime(focusState.timeLeft)}
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium">
                  {focusState.label || 'Deep Study Session'}
                </span>
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-3">
              {!focusState.isRunning ? (
                <button
                  onClick={resumeFocusTimer}
                  className="px-6 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800 flex items-center gap-2 shadow-sm text-xs"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Focus</span>
                </button>
              ) : (
                <button
                  onClick={pauseFocusTimer}
                  className="px-6 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800 flex items-center gap-2 shadow-sm text-xs"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Timer</span>
                </button>
              )}

              <button
                onClick={() => addFocusMinutes(5)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-medium"
              >
                +5 Mins
              </button>

              <button
                onClick={stopFocusTimer}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-slate-50 text-xs font-medium"
              >
                End Session
              </button>
            </div>

            {/* Quick Presets & Task linking */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Duration:</span>
                {[15, 25, 45, 60].map(mins => (
                  <button
                    key={mins}
                    onClick={() => startFocusTimer(mins, selectedTaskId || undefined)}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-slate-400 font-medium">Link Task:</span>
                <select
                  value={selectedTaskId}
                  onChange={e => setSelectedTaskId(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none max-w-[180px] truncate"
                >
                  <option value="">None (General Focus)</option>
                  {tasks.filter(t => !t.completed).map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDY INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <div className="text-xs text-slate-400 font-medium">Total Focus Recorded</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalFocusMinutes} mins
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Across {focusSessions.length} logged sessions</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <div className="text-xs text-slate-400 font-medium">Study Streak</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {streakDays} Days 🔥
              </div>
              <span className="text-[11px] text-slate-400">Consistent daily study logged</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <div className="text-xs text-slate-400 font-medium">Flashcard Retention Rate</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {retentionRate}%
              </div>
              <span className="text-[11px] text-blue-600 font-medium">SM-2 memory consolidation</span>
            </div>
          </div>

          {/* 14-Day Focus Chart */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                14-Day Focus Minutes Breakdown
              </h3>
              <span className="text-xs text-slate-400 font-mono">Daily target: 60m</span>
            </div>

            <div className="flex items-end gap-2 h-44 pt-4 border-b border-slate-100 dark:border-slate-800">
              {past14Days.map((d, i) => {
                const heightPercent = Math.min((d.minutes / 100) * 100, 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-slate-900 dark:bg-slate-100 rounded-t-sm transition-all group-hover:bg-blue-600"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-slate-400 font-mono">{d.dayLabel}</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-mono whitespace-nowrap z-10">
                      {d.minutes} mins
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Weekly Review */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <Brain className="w-4 h-4 text-blue-600" />
              <span>AI Weekly Academic Review</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              "Great consistency this week, Alex! You logged 190 focus minutes in CS 302 and mastered the AVL rotation proofs. Peak study focus occurred between 09:30 and 11:30 AM. For next week, recommend allocating two additional 45-minute blocks to MATH 210 spectral decomposition before the final problem set deadline."
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
