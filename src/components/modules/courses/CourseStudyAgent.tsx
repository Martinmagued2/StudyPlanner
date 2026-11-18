import React, { useState, useEffect, useRef } from 'react';
import { Course, Assignment, Note, DocumentFile, Quiz, GitHubRepo } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { MarkdownRenderer } from '../../common/MarkdownRenderer';
import { getGeminiApiKey } from '../../../services/fileAiService';
import { askCourseAgent, runCourseProjectTutor, CourseAgentMessage, ProjectTutorMode } from '../../../services/courseAgentService';
import {
  fetchRepoTree,
  fetchRepoFileContent,
  parseGitHubOwnerRepo,
  RepoTreeFile
} from '../../../services/githubService';
import {
  Bot,
  Sparkles,
  Send,
  Copy,
  Check,
  FileText,
  CheckSquare,
  Timer,
  Trash2,
  Download,
  Key,
  FolderArchive,
  BookOpen,
  Calendar,
  Clock,
  RotateCcw,
  Zap,
  HelpCircle,
  Layers,
  ArrowRight,
  GitBranch,
  FileCode2,
  FolderGit2,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  X
} from 'lucide-react';

interface CourseStudyAgentProps {
  course: Course;
  assignments: Assignment[];
  notes: Note[];
  files: DocumentFile[];
  quizzes: Quiz[];
  repos?: GitHubRepo[];
}

export const CourseStudyAgent: React.FC<CourseStudyAgentProps> = ({
  course,
  assignments,
  notes,
  files,
  quizzes,
  repos = []
}) => {
  const { addNote, addTask, startFocusTimer, setIsAiDrawerOpen, addFlashcard, addFlashcardDeck, setActiveView } = useApp();

  const storageKey = `nook_course_agent_chat_${course.id}`;

  const getInitialMessages = (): CourseAgentMessage[] => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse error
    }

    return [
      {
        id: `msg_init_${Date.now()}`,
        sender: 'agent',
        text: `### 🎓 Welcome to your Dedicated Study Agent for ${course.name} (${course.code})

I am your personal AI tutor and academic study partner for this course. I have real-time access to your:
- 📁 **${files.length} indexed lecture slides & files**
- 📝 **${notes.length} course notes**
- 📅 **${assignments.length} assignments & deadlines**
- 💻 **${repos.length} linked GitHub project ${repos.length === 1 ? 'repository' : 'repositories'}**${repos.length > 0 ? ` (\`${repos.map(r => `${r.owner}/${r.repo}`).join('`, `')}\`) — I can read your repo files & explain how the project works!` : ''}
- 🏫 **Timetable & Instructor info**: ${course.instructor} • ${course.location || 'Classroom'}

How would you like to prepare today? You can ask me to **explain your GitHub project codebase**, **walk through specific repo files**, **summarize lecture slides**, **generate quiz questions**, or **create a revision schedule**!`,
        citations: files.length > 0 ? [`${files[0].name}`] : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  };

  const [messages, setMessages] = useState<CourseAgentMessage[]>(getInitialMessages);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedNoteMsgId, setSavedNoteMsgId] = useState<string | null>(null);
  const [savedTaskMsgId, setSavedTaskMsgId] = useState<string | null>(null);
  const [savedFlashcardMsgId, setSavedFlashcardMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Linked GitHub Repo File Explorer State
  const [isRepoExplorerOpen, setIsRepoExplorerOpen] = useState(false);
  const [repoTreeFiles, setRepoTreeFiles] = useState<Array<{ repoId: string; repoLabel: string; branch: string; files: RepoTreeFile[] }>>([]);
  const [isScanningRepo, setIsScanningRepo] = useState(false);
  const [repoScanError, setRepoScanError] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [pinnedRepoFiles, setPinnedRepoFiles] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<{ path: string; content: string; loading: boolean } | null>(null);

  // Project AI Tutor Tools State (Rubric Grader / Bug Tracer / Commit Diff / Viva Oral Defense)
  const [isProjectToolsOpen, setIsProjectToolsOpen] = useState(false);
  const [projectToolMode, setProjectToolMode] = useState<'rubric_check' | 'bug_trace' | 'commit_diff' | 'viva'>('rubric_check');
  const [projectToolInput, setProjectToolInput] = useState('');
  const [selectedCommitSha, setSelectedCommitSha] = useState<string>('');
  const [activeVivaQuestion, setActiveVivaQuestion] = useState<string | null>(null);

  const handleRunProjectTool = async (modeOverride?: ProjectTutorMode, customInput?: string) => {
    const modeToRun: ProjectTutorMode =
      modeOverride ||
      (projectToolMode === 'viva'
        ? activeVivaQuestion
          ? 'viva_grade'
          : 'viva_start'
        : projectToolMode);

    const txt = (customInput ?? projectToolInput).trim();
    if ((modeToRun === 'rubric_check' || modeToRun === 'bug_trace' || modeToRun === 'viva_grade') && !txt) {
      return;
    }

    const userLabel =
      modeToRun === 'rubric_check'
        ? `📋 **Rubric & Requirements Check** against \`${repos[0]?.owner}/${repos[0]?.repo}\`:\n${txt.slice(0, 300)}${txt.length > 300 ? '...' : ''}`
        : modeToRun === 'bug_trace'
          ? `🐛 **Bug & Multi-File Trace**: ${txt}`
          : modeToRun === 'commit_diff'
            ? `🔀 **Explain Commit Diff** ${(selectedCommitSha || repos[0]?.commits?.[0]?.shortHash || '').slice(0, 7)}`
            : modeToRun === 'viva_start'
              ? `🎓 **Start Viva / Oral Exam Defense** on \`${repos[0]?.owner}/${repos[0]?.repo}\``
              : `🗣️ **My Viva Answer**: ${txt}`;

    setMessages(prev => [
      ...prev,
      {
        id: `msg_user_${Date.now()}`,
        sender: 'user',
        text: userLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setIsGenerating(true);
    setProjectToolInput('');
    if (modeToRun !== 'viva_start') {
      setIsProjectToolsOpen(false);
    }

    try {
      const res = await runCourseProjectTutor({
        mode: modeToRun,
        course,
        repos,
        inputText: txt,
        pinnedPaths: pinnedRepoFiles,
        commitSha: selectedCommitSha || repos[0]?.commits?.[0]?.hash,
        vivaQuestion: activeVivaQuestion || undefined
      });

      if (modeToRun === 'viva_start') {
        setActiveVivaQuestion(res.text);
      } else if (modeToRun === 'viva_grade') {
        setActiveVivaQuestion(res.text);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `msg_agent_${Date.now()}`,
          sender: 'agent',
          text: res.text,
          citations: res.citations,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasApiKey = Boolean(getGeminiApiKey() && getGeminiApiKey().trim().length > 10);

  const loadRepoTrees = async () => {
    if (!repos || repos.length === 0) {
      setRepoTreeFiles([]);
      return;
    }
    setIsScanningRepo(true);
    setRepoScanError(null);
    try {
      const results = await Promise.all(
        repos.map(async r => {
          const { owner, repo } = parseGitHubOwnerRepo(r.owner, r.repo);
          const treeRes = await fetchRepoTree(owner, repo, r.branch || 'main');
          return {
            repoId: r.id,
            repoLabel: `${owner}/${repo}`,
            branch: treeRes.branch,
            files: treeRes.files
          };
        })
      );
      setRepoTreeFiles(results);
    } catch (err: any) {
      setRepoScanError(err?.message || 'Unable to fetch repository files from GitHub.');
    } finally {
      setIsScanningRepo(false);
    }
  };

  useEffect(() => {
    setPinnedRepoFiles([]);
    setPreviewFile(null);
    if (repos && repos.length > 0) {
      loadRepoTrees();
    } else {
      setRepoTreeFiles([]);
    }
  }, [course.id, repos.length]);

  const togglePinRepoFile = (path: string) => {
    setPinnedRepoFiles(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path].slice(-8)
    );
  };

  const handlePreviewRepoFile = async (ownerRepo: string, branch: string, path: string) => {
    const [owner, repo] = ownerRepo.split('/');
    setPreviewFile({ path, content: '', loading: true });
    try {
      const content = await fetchRepoFileContent(owner, repo, path, branch);
      setPreviewFile({ path, content, loading: false });
    } catch (err: any) {
      setPreviewFile({
        path,
        content: err?.message || 'Could not load file contents.',
        loading: false
      });
    }
  };

  // Sync with course changes or reload when course ID changes
  useEffect(() => {
    setMessages(getInitialMessages());
  }, [course.id]);

  // Persist messages per course
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // LocalStorage quota or error
    }
  }, [messages, storageKey]);

  // Auto-scroll on new messages or generation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isGenerating) return;

    const userMessage: CourseAgentMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputPrompt('');
    setIsGenerating(true);

    try {
      const response = await askCourseAgent(
        query,
        course,
        assignments,
        notes,
        files,
        quizzes,
        repos,
        pinnedRepoFiles
      );
      if (response.repoErrors && response.repoErrors.length > 0 && !repoScanError) {
        setRepoScanError(response.repoErrors.join(' | '));
      }
      const agentMessage: CourseAgentMessage = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        text: response.text,
        citations: response.citations && response.citations.length > 0 ? response.citations : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (err) {
      console.error('Study Agent failed to generate response:', err);
      const errorMessage: CourseAgentMessage = {
        id: `msg_agent_err_${Date.now()}`,
        sender: 'agent',
        text: `I encountered an unexpected issue while analyzing course materials. Please try asking again, or check your internet connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearChat = () => {
    if (confirm(`Clear chat history with ${course.code} Study Agent?`)) {
      localStorage.removeItem(storageKey);
      setMessages(getInitialMessages());
    }
  };

  const handleExportChat = () => {
    const header = `# Study Agent Tutoring Session: ${course.name} (${course.code})\n` +
      `*Instructor: ${course.instructor} • Date: ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    const body = messages
      .map(m => `### ${m.sender === 'user' ? 'Student' : `${course.code} Study Agent`} (${m.timestamp})\n\n${m.text}\n\n${m.citations ? `*Citations: ${m.citations.join(', ')}*\n\n` : ''}---\n`)
      .join('\n');

    const blob = new Blob([header + body], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${course.code}_Study_Session_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSaveAsNote = (id: string, content: string) => {
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim() || `${course.code} Study Guide`;
    addNote({
      title: `${course.code}: ${firstLine.slice(0, 48)}`,
      content: `<div class="study-agent-note"><h3>${firstLine}</h3><p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p></div>`,
      courseId: course.id,
      tags: ['study-agent', course.code.toLowerCase(), 'revision'],
      pinned: false,
      highlightedTerms: [course.code, course.name]
    });
    setSavedNoteMsgId(id);
    setTimeout(() => setSavedNoteMsgId(null), 2500);
  };

  const handleCreateTask = (id: string, content: string) => {
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim() || 'Review study material';
    addTask({
      title: `[${course.code}] ${firstLine.slice(0, 50)}`,
      courseId: course.id,
      completed: false,
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      tags: ['study-agent', course.code.toLowerCase()],
      source: 'ai'
    });
    setSavedTaskMsgId(id);
    setTimeout(() => setSavedTaskMsgId(null), 2500);
  };

  const handleCreateFlashcards = (id: string, text: string) => {
    const deckName = `${course.code}: AI Revision (${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
    const deckId = `deck_${Date.now()}`;
    addFlashcardDeck(deckName, course.id, course.code);

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const pairs: Array<{ q: string; a: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const qaMatch = line.match(/^\d+[\.\)]\s*(.+?)\s*(?:[-–:]|\bAnswer:|\bAns:)\s*(.+)$/i);
      const boldDefMatch = line.match(/^[-*•]?\s*\*\*(.+?)\*\*:\s*(.+)$/);

      if (qaMatch) {
        pairs.push({ q: qaMatch[1].trim(), a: qaMatch[2].trim() });
      } else if (boldDefMatch) {
        pairs.push({ q: `Define: ${boldDefMatch[1].trim()}`, a: boldDefMatch[2].trim() });
      } else if (line.endsWith('?') && lines[i + 1] && !lines[i + 1].endsWith('?')) {
        pairs.push({ q: line.replace(/^\d+[\.\)]\s*/, ''), a: lines[i + 1] });
        i++;
      }
    }

    if (pairs.length === 0) {
      const firstLine = text.split('\n')[0].replace(/^#+\s*/, '').trim() || `${course.name} Core Concept`;
      pairs.push({
        q: `What is the key takeaway of: ${firstLine}?`,
        a: text.slice(0, 320).replace(/<[^>]+>/g, '').trim() + '...'
      });
    }

    pairs.slice(0, 8).forEach(p => {
      addFlashcard({
        deckId,
        courseId: course.id,
        question: p.q,
        answer: p.a,
        citation: {
          file: `${course.code} Study Agent`,
          pageOrSlide: 'AI Study Card'
        }
      });
    });

    setSavedFlashcardMsgId(id);
    setTimeout(() => setSavedFlashcardMsgId(null), 3500);
  };

  // Dynamic context-aware chips
  const dynamicChips = [
    ...(repos.length > 0
      ? [
          {
            label: `Explain ${repos[0].repo} Project`,
            prompt: `Explain the architecture and purpose of my linked GitHub project "${repos[0].owner}/${repos[0].repo}": main folders, key files, tech stack, and how everything connects.`
          },
          {
            label: 'Walk Through Entry Point',
            prompt: `Read the main entry point and core files of "${repos[0].owner}/${repos[0].repo}" and walk me through how execution flows step by step.`
          }
        ]
      : []),
    ...(assignments.length > 0
      ? [{ label: `Plan "${assignments[0].title.slice(0, 22)}..."`, prompt: `Help me break down and schedule revision for my upcoming assignment: "${assignments[0].title}" due on ${assignments[0].dueDate ? new Date(assignments[0].dueDate).toLocaleDateString() : 'soon'}.` }]
      : []),
    ...(files.length > 0
      ? [{ label: `Summarize ${files[0].name.slice(0, 20)}...`, prompt: `Please provide a high-yield summary of key concepts from my uploaded file "${files[0].name}".` }]
      : []),
    ...(notes.length > 0
      ? [{ label: `Quiz me on "${notes[0].title.slice(0, 20)}..."`, prompt: `Create 3 active-recall test questions based on my recent notes "${notes[0].title}".` }]
      : []),
    { label: 'Prepare for next class', prompt: `What should I review and prepare before the next lecture in ${course.name}?` },
    { label: '5 Active-Recall Flashcards', prompt: `Generate 5 high-yield active recall flashcard questions with concise answers for ${course.name}.` }
  ].slice(0, 6);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col h-[650px]">
      {/* Agent Header & Context Status Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: course.color || '#2563eb' }}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
                {course.name}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {course.code}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <FolderArchive className="w-3 h-3 text-slate-400" />
                {files.length} file{files.length === 1 ? '' : 's'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                {notes.length} note{notes.length === 1 ? '' : 's'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {assignments.length} coursework
              </span>
              {repos.length > 0 && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setIsRepoExplorerOpen(prev => !prev)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                    title="Browse and pin GitHub repository files for Study Agent"
                  >
                    <FolderGit2 className="w-3 h-3" />
                    <span>
                      {repos[0].owner}/{repos[0].repo}
                      {repos.length > 1 ? ` +${repos.length - 1}` : ''}
                    </span>
                    {pinnedRepoFiles.length > 0 && (
                      <span className="ml-0.5 px-1 rounded bg-indigo-600 text-white text-[9px]">
                        {pinnedRepoFiles.length} pinned
                      </span>
                    )}
                    {isRepoExplorerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* AI Engine Status & Utility Buttons */}
        <div className="flex items-center gap-2">
          {repos.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setIsProjectToolsOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  isProjectToolsOpen
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-100'
                }`}
                title="Rubric Checker, Bug Tracer, Commit Explainer & Viva Defense"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Project AI Tools</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRepoExplorerOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  isRepoExplorerOpen
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Browse & select repository files for the Study Agent to read"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Repo Files ({repoTreeFiles.reduce((s, r) => s + r.files.length, 0)})</span>
              </button>
            </>
          )}
          {hasApiKey ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium"
              title="Real Gemini AI Engine is active and connected"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gemini AI (Live)</span>
            </div>
          ) : (
            <button
              onClick={() => setIsAiDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 hover:border-amber-300 text-amber-800 dark:text-amber-300 text-[11px] font-medium transition-colors"
              title="Click to connect free Google Gemini API key"
            >
              <Key className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Connect Free Gemini Key</span>
            </button>
          )}

          <button
            onClick={handleExportChat}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Export conversation as Markdown study guide"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 text-slate-500"
            title="Clear study agent conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Context-Aware Action Chips */}
      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-blue-500" />
          Suggested:
        </span>
        {dynamicChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.prompt)}
            disabled={isGenerating}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 font-medium text-[11px] transition-colors disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Collapsible Project Code Tutor Drawer (Rubric / Bug / Commit / Viva) */}
      {isProjectToolsOpen && repos.length > 0 && (
        <div className="border-b border-violet-200 dark:border-violet-900 bg-violet-50/70 dark:bg-violet-950/30 p-3.5 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'rubric_check', label: '📋 Rubric Grader' },
                  { id: 'bug_trace', label: '🐛 Bug & Flow Tracer' },
                  { id: 'commit_diff', label: '🔀 Commit Diff Explainer' },
                  { id: 'viva', label: '🎓 Viva Oral Defense' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProjectToolMode(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    projectToolMode === tab.id
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setIsProjectToolsOpen(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {projectToolMode === 'commit_diff' ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCommitSha || repos[0]?.commits?.[0]?.hash || ''}
                onChange={e => setSelectedCommitSha(e.target.value)}
                className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                {(repos[0]?.commits || []).length === 0 ? (
                  <option value="">Latest commit on {repos[0].branch}</option>
                ) : (
                  repos[0].commits.map(c => (
                    <option key={c.hash} value={c.hash}>
                      {c.shortHash} — {c.message}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleRunProjectTool('commit_diff', 'Explain this commit')}
                className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold"
              >
                Explain Commit Changes
              </button>
            </div>
          ) : projectToolMode === 'viva' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  {activeVivaQuestion
                    ? 'Type your defense answer below and click Grade My Answer:'
                    : 'AI reads your repo and quizzes you like a university viva examiner:'}
                </span>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleRunProjectTool('viva_start', 'Ask me a viva question')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold"
                >
                  {activeVivaQuestion ? 'New Viva Question' : 'Start Viva Exam'}
                </button>
              </div>
              {activeVivaQuestion && (
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={projectToolInput}
                    onChange={e => setProjectToolInput(e.target.value)}
                    placeholder="Explain how your code works..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <button
                    type="button"
                    disabled={isGenerating || !projectToolInput.trim()}
                    onClick={() => handleRunProjectTool('viva_grade')}
                    className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                  >
                    Grade Answer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={projectToolInput}
                onChange={e => setProjectToolInput(e.target.value)}
                placeholder={
                  projectToolMode === 'rubric_check'
                    ? 'Paste your assignment specification or grading rubric here to check what is implemented vs missing in your repo...'
                    : 'Describe the bug, error message, or feature flow you want traced across files...'
                }
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <button
                type="button"
                disabled={isGenerating || !projectToolInput.trim()}
                onClick={() => handleRunProjectTool()}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
              >
                {projectToolMode === 'rubric_check' ? 'Audit Repo' : 'Trace Bug'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapsible GitHub Repo Files Explorer */}
      {isRepoExplorerOpen && repos.length > 0 && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 p-3 space-y-2.5 max-h-64 overflow-y-auto shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Project Repository Files
              </span>
              <span className="text-[11px] text-slate-500">
                Pin files for deep reading, or click Explain File
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={e => setRepoSearch(e.target.value)}
                  placeholder="Filter path..."
                  className="pl-6 pr-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-36 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={loadRepoTrees}
                disabled={isScanningRepo}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isScanningRepo ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {repoScanError && (
            <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              {repoScanError}
            </div>
          )}

          {repoTreeFiles.map(repoEntry => {
            const visibleFiles = repoEntry.files
              .filter(f => !repoSearch.trim() || f.path.toLowerCase().includes(repoSearch.trim().toLowerCase()))
              .slice(0, 60);
            return (
              <div key={repoEntry.repoId} className="space-y-1">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  {repoEntry.repoLabel} ({repoEntry.branch}) — {repoEntry.files.length} files
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {visibleFiles.map(f => {
                    const isPinned = pinnedRepoFiles.includes(f.path);
                    return (
                      <div
                        key={f.path}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border text-[11px] ${
                          isPinned
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                        }`}
                      >
                        <label className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={() => togglePinRepoFile(f.path)}
                            className="rounded border-slate-300 text-indigo-600 shrink-0"
                          />
                          <span className="font-mono truncate text-slate-800 dark:text-slate-200" title={f.path}>
                            {f.path}
                          </span>
                        </label>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePreviewRepoFile(repoEntry.repoLabel, repoEntry.branch, f.path)}
                            className="p-0.5 text-slate-400 hover:text-indigo-600"
                            title="Preview file code"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isPinned) togglePinRepoFile(f.path);
                              handleSend(`Read and explain "${f.path}" in ${repoEntry.repoLabel} — what does it do, how does it work, and how does it connect to the rest of the project?`);
                            }}
                            className="px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold"
                          >
                            Explain
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {previewFile && (
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-cyan-300">{previewFile.path}</span>
                <button type="button" onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="text-[10px] overflow-x-auto max-h-36 whitespace-pre-wrap leading-relaxed text-slate-200">
                {previewFile.loading ? 'Reading file from GitHub...' : previewFile.content.slice(0, 4000)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 text-xs shadow-sm ${
                  isUser
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-br-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                }`}
              >
                {/* Agent Header inside message */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: course.color || '#2563eb' }}
                      >
                        {course.code.slice(0, 2)}
                      </div>
                      <span className="font-bold text-[11px] text-slate-900 dark:text-slate-100">
                        {course.name} Study Agent
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                )}

                {/* Message Body */}
                <div className="leading-relaxed">
                  {isUser ? (
                    <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                  ) : (
                    <MarkdownRenderer content={msg.text} />
                  )}
                </div>

                {/* Citations Badges */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Grounding:
                    </span>
                    {msg.citations.map((cite, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[10px] font-mono"
                      >
                        <FolderArchive className="w-2.5 h-2.5" />
                        <span>{cite}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Toolbar on Agent Response */}
                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      title="Copy response to clipboard"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSaveAsNote(msg.id, msg.text)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      title="Save explanation into Course Notes"
                    >
                      {savedNoteMsgId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Saved to Notes!</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>Save to Notes</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCreateTask(msg.id, msg.text)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      title="Create a study task from this response"
                    >
                      {savedTaskMsgId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Added to Tasks!</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3 h-3 text-emerald-500" />
                          <span>Add Study Task</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCreateFlashcards(msg.id, msg.text)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      title="Convert this explanation or questions into active-recall flashcards in Study Hub"
                    >
                      {savedFlashcardMsgId === msg.id ? (
                        <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                          <Check className="w-3 h-3" />
                          <span>Added Deck to Study Hub!</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveView('studyhub');
                            }}
                            className="underline flex items-center gap-0.5 ml-1"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ) : (
                        <>
                          <Layers className="w-3 h-3 text-purple-500" />
                          <span>Make Flashcards</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => startFocusTimer(25, undefined, course.id, `Study ${course.code}`)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      title="Start a 25-minute Pomodoro focus timer on this course"
                    >
                      <Timer className="w-3 h-3 text-amber-500" />
                      <span>Focus 25m</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Real-time Thinking Indicator */}
        {isGenerating && (
          <div className="flex items-start gap-2 animate-in fade-in duration-150">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse"
              style={{ backgroundColor: course.color || '#2563eb' }}
            >
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span>{course.code} Study Agent is reasoning...</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cross-referencing {files.length} lecture files, {notes.length} notes{repos.length > 0 ? `, and ${repos.length} GitHub repo(s)` : ''}.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              placeholder={`Ask ${course.code} study agent about lectures, notes, coursework, or linked GitHub repo files...`}
              disabled={isGenerating}
              className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-all disabled:opacity-50"
            />
            {inputPrompt && (
              <button
                type="button"
                onClick={() => setInputPrompt('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isGenerating}
            className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask Agent</span>
          </button>
        </form>
      </div>
    </div>
  );
};
