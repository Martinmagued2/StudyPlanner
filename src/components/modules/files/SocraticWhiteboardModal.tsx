import React, { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  Code2,
  Eraser,
  Lightbulb,
  Loader2,
  PenTool,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { Course, DocumentFile } from '../../../types';
import {
  runSocraticWhiteboardAction,
  SocraticMode
} from '../../../services/socraticWhiteboardService';

interface SocraticWhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DocumentFile[];
  initialFileId?: string;
  courses: Course[];
  onSaveToNote?: (title: string, content: string, courseId?: string) => void;
}

interface ChatEntry {
  id: string;
  mode: SocraticMode;
  promptSnippet: string;
  responseMarkdown: string;
  usedAi: boolean;
}

export const SocraticWhiteboardModal: React.FC<SocraticWhiteboardModalProps> = ({
  isOpen,
  onClose,
  files,
  initialFileId,
  courses,
  onSaveToNote
}) => {
  const [activeFileId, setActiveFileId] = useState<string>(initialFileId || files[0]?.id || '');
  const [selectedChunkIdx, setSelectedChunkIdx] = useState<number>(0);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [userAttempt, setUserAttempt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<ChatEntry[]>([]);

  // Whiteboard Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [penColor, setPenColor] = useState<string>('#2563eb');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [hasSketch, setHasSketch] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialFileId && files.some(f => f.id === initialFileId)) {
      setActiveFileId(initialFileId);
    } else if (!activeFileId && files[0]?.id) {
      setActiveFileId(files[0].id);
    }
    setSelectedChunkIdx(0);
  }, [isOpen, initialFileId, files]);

  // Initialize crisp white background on canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Subtle dot grid
    ctx.fillStyle = '#e2e8f0';
    for (let x = 20; x < canvas.width; x += 20) {
      for (let y = 20; y < canvas.height; y += 20) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
    setHasSketch(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const chunks = activeFile?.chunks || [];
  const activeChunk = chunks[selectedChunkIdx] || chunks[0];
  const chunkContent =
    activeChunk?.content ||
    activeFile?.rawText ||
    activeFile?.summary ||
    'No readable text chunks available in this document yet.';
  const activeCourse = courses.find(c => c.id === activeFile?.courseId);

  const handleCaptureSelection = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel) {
      setHighlightedText(sel);
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPoint(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#ffffff' : penColor;
    ctx.lineWidth = isEraser ? 16 : 2.6;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSketch(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e2e8f0';
    for (let x = 20; x < canvas.width; x += 20) {
      for (let y = 20; y < canvas.height; y += 20) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
    setHasSketch(false);
  };

  const triggerAction = async (mode: SocraticMode) => {
    if (!activeFile) return;
    setIsLoading(true);
    try {
      let sketchBase64: string | undefined;
      if ((mode === 'check_sketch' || hasSketch) && canvasRef.current && hasSketch) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        sketchBase64 = dataUrl.split(',')[1];
      }

      const selected = highlightedText.trim() || chunkContent.slice(0, 500);
      const res = await runSocraticWhiteboardAction({
        mode,
        selectedText: selected,
        fileName: activeFile.name,
        fileExcerpt: chunkContent,
        userAttempt,
        sketchImageBase64: sketchBase64,
        courseName: activeCourse ? `${activeCourse.code} — ${activeCourse.name}` : undefined
      });

      setResponses(prev => [
        {
          id: `soc_${Date.now()}`,
          mode,
          promptSnippet: selected.slice(0, 90),
          responseMarkdown: res.markdown,
          usedAi: res.usedAi
        },
        ...prev
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const modeBadge: Record<SocraticMode, string> = {
    derive: 'Step-by-Step Derivation',
    intuition: 'Deep Intuition',
    variations: '3 Practice Variations',
    socratic_hint: 'Socratic Nudge',
    check_sketch: 'Sketch & Attempt Check'
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-7xl h-[92vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Interactive Socratic PDF / Code Whiteboard
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                  Highlight + Sketch + Vision AI
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Highlight any formula, paragraph, or code block on the left, then derive steps, generate variations, or sketch your work on the right.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <select
                value={activeFile?.id || ''}
                onChange={e => {
                  setActiveFileId(e.target.value);
                  setSelectedChunkIdx(0);
                  setHighlightedText('');
                }}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[230px]"
              >
                {files.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
              aria-label="Close Socratic Whiteboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Split Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
          {/* LEFT: Document / Code Highlight Reader */}
          <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 min-h-0 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Document / Code Reader
                </span>
                {activeCourse && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {activeCourse.code}
                  </span>
                )}
              </div>

              {chunks.length > 1 && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">Section:</span>
                  <select
                    value={selectedChunkIdx}
                    onChange={e => setSelectedChunkIdx(Number(e.target.value))}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    {chunks.map((c, i) => (
                      <option key={c.id} value={i}>
                        Page / Slide {c.page || i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 px-3 py-2 rounded-lg flex items-center justify-between">
                <span>Select / highlight any text below with your mouse to focus the Socratic AI tutor on it.</span>
              </div>

              <div
                onMouseUp={handleCaptureSelection}
                onKeyUp={handleCaptureSelection}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono selection:bg-violet-200 dark:selection:bg-violet-700 select-text shadow-sm"
              >
                {chunkContent}
              </div>

              {/* Active Highlight Box */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Highlighted / Pasted Formula or Code Focus
                  </label>
                  {highlightedText && (
                    <button
                      type="button"
                      onClick={() => setHighlightedText('')}
                      className="text-[11px] text-slate-400 hover:text-slate-700"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={highlightedText}
                  onChange={e => setHighlightedText(e.target.value)}
                  placeholder="Highlight text above or paste any theorem, equation, or code snippet here..."
                  className="w-full px-3 py-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Drawing Scratchpad + Socratic AI Tutor */}
          <div className="flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900">
            {/* Whiteboard Canvas Section */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <PenTool className="w-3.5 h-3.5 text-violet-600" />
                  <span>Interactive Math / Diagram Scratchpad</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['#2563eb', '#dc2626', '#059669', '#0f172a'] as const).map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        setIsEraser(false);
                        setPenColor(col);
                      }}
                      className={`w-4 h-4 rounded-full border-2 transition-transform ${
                        !isEraser && penColor === col ? 'scale-125 border-slate-900 dark:border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                      title={`Pen ${col}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsEraser(v => !v)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border ${
                      isEraser
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Eraser className="w-3 h-3" /> Eraser
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={640}
                height={210}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-44 rounded-xl border border-slate-300 dark:border-slate-700 cursor-crosshair touch-none shadow-inner bg-white"
              />
            </div>

            {/* Typed Attempt + Action Buttons */}
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userAttempt}
                  onChange={e => setUserAttempt(e.target.value)}
                  placeholder="Optional: type your step, hypothesis, or question for the Socratic tutor..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => triggerAction('derive')}
                  className="px-2.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Derive Steps
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => triggerAction('intuition')}
                  className="px-2.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> Intuition
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => triggerAction('variations')}
                  className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <BrainCircuit className="w-3.5 h-3.5" /> 3 Variations
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => triggerAction('socratic_hint')}
                  className="px-2.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Socratic Hint
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => triggerAction('check_sketch')}
                  className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50 col-span-2 sm:col-span-1"
                >
                  <PenTool className="w-3.5 h-3.5" /> Check Sketch
                </button>
              </div>
            </div>

            {/* AI Tutor Output Feed */}
            <div className="space-y-3 pt-1">
              {isLoading && (
                <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/70 dark:bg-violet-950/30 flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing highlighted text & whiteboard state with Socratic Tutor...</span>
                </div>
              )}

              {responses.length === 0 && !isLoading && (
                <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  Highlight any snippet on the left (or draw an attempt above) and pick an AI tutor action to start an interactive whiteboard session.
                </div>
              )}

              {responses.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                        {modeBadge[item.mode]}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        Focus: "{item.promptSnippet}..."
                      </span>
                    </div>
                    {onSaveToNote && (
                      <button
                        type="button"
                        onClick={() =>
                          onSaveToNote(
                            `Whiteboard: ${activeFile?.name || 'Study'} (${modeBadge[item.mode]})`,
                            item.responseMarkdown,
                            activeFile?.courseId
                          )
                        }
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Save to Notes
                      </button>
                    )}
                  </div>
                  <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                    {item.responseMarkdown}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
