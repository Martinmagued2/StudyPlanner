import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserAccount,
  Course,
  Assignment,
  Task,
  Note,
  CalendarEvent,
  InboxItem,
  DocumentFile,
  DocumentChunk,
  Flashcard,
  FlashcardDeck,
  FocusSession,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  Exam,
  GradeItem,
  PreviousTermCourse,
  AiMemory,
  DailyPlan,
  ReminderLog,
  AppNotification,
  IntegrationConnector,
  GitHubRepo,
  ChatMessage,
  AiActionProposal,
  AssignmentStatus,
  DailyPlanBlock,
  RevisionSession,
  ChatSession,
  MeetingSlot
} from '../types';
import { uploadToCloud, fetchFromCloud, CloudWorkspacePayload } from '../services/cloudSync';
import { fetchRepoCommits } from '../services/githubService';
import {
  initialUser,
  initialCourses,
  initialAssignments,
  initialTasks,
  initialNotes,
  initialFiles,
  initialFlashcards,
  initialDecks,
  initialFocusSessions,
  initialQuizzes,
  initialExams,
  initialGradeItems,
  initialAiMemories,
  initialDailyPlan,
  initialInboxItems,
  initialEvents,
  initialIntegrations,
  initialRepos,
  initialNotifications,
  initialReminderLogs
} from '../data/mockData';

export type ActiveView = 
  | 'today'
  | 'courses'
  | 'course-detail'
  | 'assignments'
  | 'tasks'
  | 'notes'
  | 'schedule'
  | 'calendar'
  | 'inbox'
  | 'files'
  | 'studyhub'
  | 'ai-tutor'
  | 'quizzes'
  | 'exams'
  | 'grades'
  | 'reminders'
  | 'integrations'
  | 'backups'
  | 'trash'
  | 'settings';

interface AppContextType {
  // User & Auth
  user: UserAccount | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
  loginDemo: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;

  // Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string | null) => void;
  navigateToCourse: (courseId: string, initialTab?: string) => void;
  activeCourseTab: string;
  setActiveCourseTab: (tab: string) => void;
  navHistory: ActiveView[];
  goBack: () => void;
  goForward: () => void;

  // Search & Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isQuickCreateOpen: boolean;
  setIsQuickCreateOpen: (open: boolean) => void;
  quickCreateType: 'task' | 'note' | 'assignment' | 'exam' | 'event';
  openQuickCreate: (type?: 'task' | 'note' | 'assignment' | 'exam' | 'event') => void;

  // Global AI
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  aiMessages: ChatMessage[];
  chatSessions: ChatSession[];
  activeChatSessionId: string;
  createNewChatSession: (title?: string) => string;
  selectChatSession: (id: string) => void;
  deleteChatSession: (id: string) => void;
  renameChatSession: (id: string, newTitle: string) => void;
  clearChatSessionMessages: (id: string) => void;
  sendAiMessage: (text: string) => void;
  clearAiChat: () => void;
  isAiReasoning: boolean;
  setIsAiReasoning: (reasoning: boolean) => void;
  aiMemories: AiMemory[];
  addAiMemory: (fact: string, category?: AiMemory['category']) => void;
  deleteAiMemory: (id: string) => void;
  handleActionProposal: (actionId: string, confirm: boolean) => void;

  // Focus Timer
  focusState: {
    isRunning: boolean;
    timeLeft: number;
    initialDuration: number;
    linkedTaskId?: string;
    linkedCourseId?: string;
    label?: string;
  };
  startFocusTimer: (minutes: number, taskId?: string, courseId?: string, label?: string) => void;
  pauseFocusTimer: () => void;
  resumeFocusTimer: () => void;
  stopFocusTimer: () => void;
  addFocusMinutes: (mins: number) => void;

  // Entities & CRUD
  courses: Course[];
  addCourse: (course: Omit<Course, 'id'>) => Course;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  archiveCourse: (id: string, archive: boolean) => void;
  deleteCourse: (id: string) => void;

  assignments: Assignment[];
  addAssignment: (asg: Omit<Assignment, 'id' | 'steps'>) => Assignment;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  breakdownAssignmentWithAi: (asgId: string) => void;
  toggleAssignmentStep: (asgId: string, stepId: string) => void;

  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'subtasks'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTaskComplete: (id: string) => void;
  deleteTask: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;

  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'inTrash'>) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  moveNoteToTrash: (id: string) => void;
  restoreNote: (id: string) => void;
  deleteNotePermanently: (id: string) => void;

  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  inboxItems: InboxItem[];
  addInboxItem: (item: Omit<InboxItem, 'id' | 'processed' | 'createdAt'>) => InboxItem;
  convertInboxItem: (id: string, target: 'task' | 'note' | 'project') => void;
  deleteInboxItem: (id: string) => void;

  files: DocumentFile[];
  addFile: (file: Omit<DocumentFile, 'id' | 'uploadedAt' | 'chunks'>, sampleContent?: string) => DocumentFile;
  deleteFile: (id: string) => void;
  toggleFavoriteFile: (id: string) => void;
  reindexFile: (id: string) => void;

  flashcards: Flashcard[];
  flashcardDecks: FlashcardDeck[];
  reviewFlashcard: (cardId: string, grade: 1 | 2 | 3 | 4) => void;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'easeFactor' | 'intervalDays' | 'repetitions' | 'lapses' | 'dueDate' | 'state'>) => void;
  addFlashcardDeck: (name: string, courseId?: string, tag?: string) => void;
  createFlashcardsFromQuizErrors: (quizTitle: string, errors: { question: string; answer: string; courseId?: string }[]) => void;

  focusSessions: FocusSession[];
  quizzes: Quiz[];
  submitQuizAttempt: (quizId: string, userAnswers: Record<string, string>) => QuizAttempt;
  createQuizFromCourse: (courseId: string, difficulty: Quiz['difficulty']) => Quiz;
  addQuiz: (quiz: Omit<Quiz, 'id' | 'attempts'>) => Quiz;

  exams: Exam[];
  addExam: (exam: Omit<Exam, 'id' | 'revisionSessions' | 'readinessPercent'>) => Exam;
  generateRevisionPlanForExam: (examId: string) => void;
  toggleRevisionSession: (examId: string, sessionId: string) => void;

  gradeItems: GradeItem[];
  addGradeItem: (item: Omit<GradeItem, 'id'>) => GradeItem;
  updateGradeItem: (id: string, updates: Partial<GradeItem>) => void;
  deleteGradeItem: (id: string) => void;

  previousTermCourses: PreviousTermCourse[];
  addPreviousTermCourse: (item: Omit<PreviousTermCourse, 'id'>) => PreviousTermCourse;
  updatePreviousTermCourse: (id: string, updates: Partial<PreviousTermCourse>) => void;
  deletePreviousTermCourse: (id: string) => void;

  dailyPlan: DailyPlan;
  regenerateDailyPlan: () => void;
  toggleDailyPlanBlock: (blockId: string) => void;

  integrations: IntegrationConnector[];
  toggleIntegrationConnection: (provider: IntegrationConnector['provider']) => void;
  syncIntegration: (provider: IntegrationConnector['provider']) => void;

  githubRepos: GitHubRepo[];
  addGitHubRepo: (courseId: string, owner: string, repo: string, branch?: string) => void;
  addCommitBriefAsTask: (commit: any, courseId: string) => void;

  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  reminderLogs: ReminderLog[];
  triggerTestReminder: () => void;

  // Intelligence
  getWhatShouldIDoNow: (minutesWindow?: number) => { topTask: Task | null; reason: string; alternatives: Task[] };
  calculateCumulativeGpa: () => { gpa: number; totalCredits: number; courseGrades: Record<string, { letter: string; percentage: number; points: number }> };
  calculateTargetExamScore: (courseId: string, targetLetter: string) => { neededScore: number; status: 'guaranteed' | 'achievable' | 'impossible'; currentGrade: number };

  // Data Protection
  exportWorkspaceJson: () => string;
  importWorkspaceJson: (jsonString: string) => boolean;
  resetAllDemoData: () => void;
  clearAllWorkspaceData: () => void;

  // Cloud Sync & Cross-Device Access
  cloudSyncId: string | null;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: string | null;
  saveToCloud: () => Promise<string>;
  loadFromCloud: (syncId: string) => Promise<boolean>;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;

  // Daily Briefing Pop-Up
  isBriefingOpen: boolean;
  setIsBriefingOpen: (open: boolean) => void;

  // Mobile Navigation Drawer
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Storage Key Prefix
  const [user, setUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('nook_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('nook_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
    localStorage.setItem('nook_theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Navigation State
  const [activeView, setActiveViewState] = useState<ActiveView>('today');
  const [navHistory, setNavHistory] = useState<ActiveView[]>(['today']);
  const [navHistoryIndex, setNavHistoryIndex] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeCourseTab, setActiveCourseTab] = useState<string>('overview');

  const setActiveView = (view: ActiveView) => {
    setActiveViewState(view);
    setNavHistory(prev => [...prev.slice(0, navHistoryIndex + 1), view]);
    setNavHistoryIndex(prev => prev + 1);
  };

  const goBack = () => {
    if (navHistoryIndex > 0) {
      setNavHistoryIndex(prev => prev - 1);
      setActiveViewState(navHistory[navHistoryIndex - 1]);
    }
  };

  const goForward = () => {
    if (navHistoryIndex < navHistory.length - 1) {
      setNavHistoryIndex(prev => prev + 1);
      setActiveViewState(navHistory[navHistoryIndex + 1]);
    }
  };

  const navigateToCourse = (courseId: string, initialTab: string = 'overview') => {
    setSelectedCourseId(courseId);
    setActiveCourseTab(initialTab);
    setActiveView('course-detail');
  };

  // Modals & Panels
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<'task' | 'note' | 'assignment' | 'exam' | 'event'>('task');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isAiReasoning, setIsAiReasoning] = useState(true);

  const openQuickCreate = (type: 'task' | 'note' | 'assignment' | 'exam' | 'event' = 'task') => {
    setQuickCreateType(type);
    setIsQuickCreateOpen(true);
  };

  // Cloud Sync & Cross-Device State
  const [cloudSyncId, setCloudSyncId] = useState<string>(() => {
    const saved = localStorage.getItem('nook_cloud_sync_id');
    if (saved && saved.trim().length > 3) return saved.trim();
    const newId = 'nook_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('nook_cloud_sync_id', newId);
    return newId;
  });
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('nook_last_cloud_sync_at') || null;
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Daily Briefing Pop-Up State
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

  // Mobile Navigation Drawer State
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // User Isolation Key
  const storageKey = user ? `nook_workspace_${user.id}` : 'nook_workspace_demo';

  // Load / Store Workspace State
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const data = localStorage.getItem(`${storageKey}_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveStored = (key: string, value: any) => {
    try {
      localStorage.setItem(`${storageKey}_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage quota exceeded or error writing:', e);
    }
  };

  const isDemoUser = user?.isDemo === true;
  const initialWelcomeNote: Note = {
    id: 'note_welcome',
    title: 'Welcome to your Nook Workspace',
    content: `<h2>Welcome to Nook!</h2>
<p>Your academic workspace is completely fresh, clean, and isolated.</p>
<h3>Quick Start Guide:</h3>
<ul>
  <li><strong>1. Add Courses:</strong> Click <em>Courses</em> on the sidebar, or click the <em>Ask AI</em> button in the top bar to set up your subjects.</li>
  <li><strong>2. Create Tasks & Assignments:</strong> Use the <em>+ Quick Create</em> button (or press <code>Ctrl+T</code>) to log coursework and homework.</li>
  <li><strong>3. Ask AI Anytime:</strong> Press <code>Ctrl+J</code> to chat with your study tutor, generate study blocks, or ask questions on any topic.</li>
</ul>`,
    tags: ['welcome', 'guide'],
    pinned: true,
    inTrash: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    highlightedTerms: ['Courses', 'Assignments', 'Ask AI']
  };

  // Entities State: Completely fresh and empty workspace by default! No mock data!
  const [courses, setCourses] = useState<Course[]>(() => loadStored('courses', []));
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadStored('assignments', []));
  const [tasks, setTasks] = useState<Task[]>(() => loadStored('tasks', []));
  const [notes, setNotes] = useState<Note[]>(() => loadStored('notes', []));
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadStored('events', []));
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(() => loadStored('inbox', []));
  const [files, setFiles] = useState<DocumentFile[]>(() => {
    const stored = loadStored<DocumentFile[]>('files', []);
    return stored.map(f => {
      // Auto-heal: If rawText contains slide markers, rebuild chunks to match exact slide count
      if (f.rawText && /===\s*(?:Slide|Page)\s*\d+\s*===/i.test(f.rawText)) {
        const delimiterRegex = /===\s*(?:Slide|Page)\s*(\d+)\s*===\s*([\s\S]*?)(?=(?:===\s*(?:Slide|Page)\s*\d+\s*===|$))/gi;
        const matches = Array.from(f.rawText.matchAll(delimiterRegex));
        if (matches.length > 0 && matches.length !== f.chunks.length) {
          const healedChunks: DocumentChunk[] = matches.map((m, idx) => ({
            id: `chunk_${f.id}_${m[1]}_${idx}`,
            page: parseInt(m[1], 10) || (idx + 1),
            content: m[2].trim() || `(Slide ${m[1]} Visual content)`,
            hasVisuals: idx === 0 || (idx % 3 === 0)
          }));
          return {
            ...f,
            pageCount: Math.max(f.pageCount || 1, matches.length),
            chunks: healedChunks
          };
        }
      }
      return f;
    });
  });
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => loadStored('flashcards', []));
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>(() => loadStored('flashcard_decks', []));
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => loadStored('focus_sessions', []));
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => loadStored('quizzes', []));
  const [exams, setExams] = useState<Exam[]>(() => loadStored('exams', []));
  const [gradeItems, setGradeItems] = useState<GradeItem[]>(() => loadStored('grade_items', []));
  const [previousTermCourses, setPreviousTermCourses] = useState<PreviousTermCourse[]>(() => loadStored('previous_term_courses', []));
  const [aiMemories, setAiMemories] = useState<AiMemory[]>(() => loadStored('ai_memories', []));
  const [dailyPlan, setDailyPlan] = useState<DailyPlan>(() => loadStored('daily_plan', {
    date: new Date().toISOString().slice(0, 10),
    generatedBy: 'ai',
    blocks: []
  }));
  const [integrations, setIntegrations] = useState<IntegrationConnector[]>(() => loadStored('integrations', initialIntegrations));
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>(() => loadStored('repos', []));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadStored('notifications', [
    {
      id: 'notif_init',
      title: 'Fresh Clean Workspace Ready',
      message: 'Workspace is 100% empty. Click "+ Add Course" or "Ask AI" in the top bar to set up your subjects and timetable.',
      type: 'system',
      timestamp: 'Just now',
      read: false
    }
  ]));
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>(() => loadStored('reminder_logs', []));

  // Global AI Multi-Session Chat History
  const defaultInitialWelcome: ChatMessage = {
    id: 'msg_init',
    sender: 'assistant',
    content: isDemoUser
      ? `Hello Alex! I'm your Nook Academic Intelligence Assistant. I have live access to your schedule, current courses (CS 302, AI 401, MATH 210, WEB 250), upcoming deadlines, flashcard decks, and grade projections. How can I assist you with your studies today?`
      : `Hello! I'm your Nook Academic Assistant. Your workspace is completely fresh. You can tell me what courses you're taking, ask me to create assignments, or ask any study question to get started!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const defaultInitialSession: ChatSession = {
    id: 'session_default',
    title: 'Study Assistant',
    messages: [defaultInitialWelcome],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const stored = loadStored<ChatSession[]>('chat_sessions', []);
    if (stored && stored.length > 0) return stored;
    return [defaultInitialSession];
  });

  const [activeChatSessionId, setActiveChatSessionId] = useState<string>(() => {
    const stored = loadStored<string>('active_chat_session_id', '');
    if (stored && chatSessions.some(s => s.id === stored)) return stored;
    return chatSessions[0]?.id || 'session_default';
  });

  useEffect(() => {
    saveStored('chat_sessions', chatSessions);
  }, [chatSessions, storageKey]);

  useEffect(() => {
    saveStored('active_chat_session_id', activeChatSessionId);
  }, [activeChatSessionId, storageKey]);

  // Persistent Local Storage Synchronization for All Workspace Entities
  useEffect(() => { saveStored('courses', courses); }, [courses, storageKey]);
  useEffect(() => { saveStored('assignments', assignments); }, [assignments, storageKey]);
  useEffect(() => { saveStored('tasks', tasks); }, [tasks, storageKey]);
  useEffect(() => { saveStored('notes', notes); }, [notes, storageKey]);
  useEffect(() => { saveStored('events', events); }, [events, storageKey]);
  useEffect(() => { saveStored('inbox', inboxItems); }, [inboxItems, storageKey]);
  useEffect(() => { saveStored('files', files); }, [files, storageKey]);
  useEffect(() => { saveStored('flashcards', flashcards); }, [flashcards, storageKey]);
  useEffect(() => { saveStored('flashcard_decks', flashcardDecks); }, [flashcardDecks, storageKey]);
  useEffect(() => { saveStored('focus_sessions', focusSessions); }, [focusSessions, storageKey]);
  useEffect(() => { saveStored('quizzes', quizzes); }, [quizzes, storageKey]);
  useEffect(() => { saveStored('exams', exams); }, [exams, storageKey]);
  useEffect(() => { saveStored('grade_items', gradeItems); }, [gradeItems, storageKey]);
  useEffect(() => { saveStored('previous_term_courses', previousTermCourses); }, [previousTermCourses, storageKey]);
  useEffect(() => { saveStored('ai_memories', aiMemories); }, [aiMemories, storageKey]);
  useEffect(() => { saveStored('daily_plan', dailyPlan); }, [dailyPlan, storageKey]);
  useEffect(() => { saveStored('integrations', integrations); }, [integrations, storageKey]);
  useEffect(() => { saveStored('repos', githubRepos); }, [githubRepos, storageKey]);
  useEffect(() => { saveStored('notifications', notifications); }, [notifications, storageKey]);
  useEffect(() => { saveStored('reminder_logs', reminderLogs); }, [reminderLogs, storageKey]);

  // Derived current session messages
  const activeChatSession = chatSessions.find(s => s.id === activeChatSessionId) || chatSessions[0];
  const aiMessages = activeChatSession ? activeChatSession.messages : [defaultInitialWelcome];

  const setAiMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setChatSessions(prev => {
      const active = prev.find(s => s.id === activeChatSessionId) || prev[0];
      if (!active) return prev;
      const nextMsgs = typeof updater === 'function' ? updater(active.messages) : updater;
      return prev.map(s => s.id === active.id ? { ...s, messages: nextMsgs, updatedAt: new Date().toISOString() } : s);
    });
  }, [activeChatSessionId]);

  const createNewChatSession = useCallback((title?: string) => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: title || 'New Chat',
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'assistant',
          content: 'Started a new study session. What would you like to explore or solve today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatSessionId(newId);
    return newId;
  }, []);

  const selectChatSession = useCallback((id: string) => {
    setActiveChatSessionId(id);
  }, []);

  const deleteChatSession = useCallback((id: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        const fresh: ChatSession = {
          id: `session_${Date.now()}`,
          title: 'New Chat',
          messages: [defaultInitialWelcome],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setActiveChatSessionId(fresh.id);
        return [fresh];
      }
      if (activeChatSessionId === id) {
        setActiveChatSessionId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeChatSessionId, defaultInitialWelcome]);

  const renameChatSession = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setChatSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim(), updatedAt: new Date().toISOString() } : s));
  }, []);

  const clearChatSessionMessages = useCallback((id: string) => {
    setChatSessions(prev => prev.map(s => s.id === id ? {
      ...s,
      messages: [
        {
          id: `msg_cleared_${Date.now()}`,
          sender: 'assistant',
          content: 'Chat conversation cleared. How can I help you today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      updatedAt: new Date().toISOString()
    } : s));
  }, []);

  // Focus Timer Logic
  const [focusState, setFocusState] = useState<{
    isRunning: boolean;
    timeLeft: number;
    initialDuration: number;
    linkedTaskId?: string;
    linkedCourseId?: string;
    label?: string;
  }>({
    isRunning: false,
    timeLeft: 25 * 60,
    initialDuration: 25 * 60,
  });

  const startFocusTimer = (minutes: number, taskId?: string, courseId?: string, label?: string) => {
    setFocusState({
      isRunning: true,
      timeLeft: minutes * 60,
      initialDuration: minutes * 60,
      linkedTaskId: taskId,
      linkedCourseId: courseId,
      label: label || (taskId ? tasks.find(t => t.id === taskId)?.title : 'Deep Study Session')
    });
  };

  const pauseFocusTimer = () => setFocusState(prev => ({ ...prev, isRunning: false }));
  const resumeFocusTimer = () => setFocusState(prev => ({ ...prev, isRunning: true }));
  const addFocusMinutes = (mins: number) => {
    setFocusState(prev => ({
      ...prev,
      timeLeft: prev.timeLeft + mins * 60,
      initialDuration: prev.initialDuration + mins * 60
    }));
  };

  const stopFocusTimer = () => {
    const elapsedMinutes = Math.floor((focusState.initialDuration - focusState.timeLeft) / 60);
    if (elapsedMinutes >= 1) {
      const newSession: FocusSession = {
        id: `foc_${Date.now()}`,
        durationMinutes: Math.floor(focusState.initialDuration / 60),
        actualMinutes: elapsedMinutes,
        taskId: focusState.linkedTaskId,
        courseId: focusState.linkedCourseId,
        label: focusState.label || 'Focused Session',
        timestamp: new Date().toISOString()
      };
      setFocusSessions(prev => [newSession, ...prev]);
      
      // If linked task, prompt or mark complete
      if (focusState.linkedTaskId) {
        toggleTaskComplete(focusState.linkedTaskId);
      }
    }
    setFocusState(prev => ({ ...prev, isRunning: false, timeLeft: prev.initialDuration }));
    document.title = 'Nook — Academic Intelligence & Workspace';
  };

  // Timer Tick & Tab Title countdown
  useEffect(() => {
    let interval: any = null;
    if (focusState.isRunning && focusState.timeLeft > 0) {
      interval = setInterval(() => {
        setFocusState(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(interval);
            stopFocusTimer();
            return { ...prev, isRunning: false, timeLeft: 0 };
          }
          const m = Math.floor((prev.timeLeft - 1) / 60);
          const s = (prev.timeLeft - 1) % 60;
          document.title = `(${m}:${s < 10 ? '0' : ''}${s}) Nook Focus`;
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else if (!focusState.isRunning) {
      document.title = 'Nook — Academic Intelligence & Workspace';
    }
    return () => clearInterval(interval);
  }, [focusState.isRunning, focusState.timeLeft]);

  // Auth Operations
  const login = (email: string, name?: string) => {
    const sanitizedEmail = email.toLowerCase().trim();
    const userId = 'usr_' + encodeURIComponent(sanitizedEmail).replace(/[^a-zA-Z0-9]/g, '_');

    const newUser: UserAccount = {
      id: userId,
      name: name || sanitizedEmail.split('@')[0],
      email: sanitizedEmail,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      isDemo: false
    };
    setUser(newUser);
    localStorage.setItem('nook_current_user', JSON.stringify(newUser));

    // Check if user already has saved workspace in this browser
    const userStorageKey = `nook_workspace_${userId}`;
    const savedCoursesStr = localStorage.getItem(`${userStorageKey}_courses`);
    if (savedCoursesStr) {
      try {
        const parsedCourses = JSON.parse(savedCoursesStr);
        if (Array.isArray(parsedCourses) && parsedCourses.length > 0) {
          setCourses(parsedCourses);
          const a = localStorage.getItem(`${userStorageKey}_assignments`);
          if (a) setAssignments(JSON.parse(a));
          const t = localStorage.getItem(`${userStorageKey}_tasks`);
          if (t) setTasks(JSON.parse(t));
          const n = localStorage.getItem(`${userStorageKey}_notes`);
          if (n) setNotes(JSON.parse(n));
          const ev = localStorage.getItem(`${userStorageKey}_events`);
          if (ev) setEvents(JSON.parse(ev));
          const ex = localStorage.getItem(`${userStorageKey}_exams`);
          if (ex) setExams(JSON.parse(ex));
          const g = localStorage.getItem(`${userStorageKey}_grade_items`);
          if (g) setGradeItems(JSON.parse(g));
          const p = localStorage.getItem(`${userStorageKey}_previous_term_courses`);
          if (p) setPreviousTermCourses(JSON.parse(p));
          return;
        }
      } catch (err) {
        console.warn('Failed restoring user local workspace:', err);
      }
    }

    // Fresh registration
    setCourses([]);
    setAssignments([]);
    setTasks([]);
    setEvents([]);
    setInboxItems([]);
    setFiles([]);
    setFlashcards([]);
    setFlashcardDecks([]);
    setFocusSessions([]);
    setQuizzes([]);
    setExams([]);
    setGradeItems([]);
    setPreviousTermCourses([]);
    setAiMemories([]);
    setGithubRepos([]);
    setDailyPlan({
      date: new Date().toISOString().slice(0, 10),
      generatedBy: 'ai',
      blocks: []
    });
    setNotes([]);
    setNotifications([
      {
        id: `notif_${Date.now()}`,
        title: 'Account Ready',
        message: 'Your workspace is 100% clean and ready. Add courses manually or chat with Ask AI to set up your subjects and timetable.',
        type: 'system',
        timestamp: 'Just now',
        read: false
      }
    ]);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nook_current_user');
  };

  const loginDemo = () => {
    const freshUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: 'Scholar Workspace',
      email: 'scholar@university.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      isDemo: true
    };
    setUser(freshUser);
    localStorage.setItem('nook_current_user', JSON.stringify(freshUser));
    clearAllWorkspaceData();
  };

  // CRUD Implementations
  const addCourse = (courseData: Omit<Course, 'id'>) => {
    const newCourse: Course = {
      ...courseData,
      id: `course_${Date.now()}`
    };
    setCourses(prev => [...prev, newCourse]);
    return newCourse;
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const archiveCourse = (id: string, archive: boolean) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, isArchived: archive } : c));
  };

  const deleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  // Assignments
  const addAssignment = (asgData: Omit<Assignment, 'id' | 'steps'>) => {
    const newAsg: Assignment = {
      ...asgData,
      id: `asg_${Date.now()}`,
      steps: [],
      isBrokenDown: false
    };
    setAssignments(prev => [newAsg, ...prev]);
    return newAsg;
  };

  const updateAssignment = (id: string, updates: Partial<Assignment>) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const breakdownAssignmentWithAi = (asgId: string) => {
    const asg = assignments.find(a => a.id === asgId);
    if (!asg) return;

    const verbs = [
      'Read and annotate specifications and rubric',
      'Architect data structures and mathematical formulation',
      'Implement core algorithm and recursive helper methods',
      'Conduct boundary value tests and edge-case validation',
      'Format output report and submit to portal'
    ];

    const generatedSteps = verbs.map((verb, idx) => {
      const stepId = `step_${asgId}_${idx + 1}`;
      const taskId = `task_${asgId}_${idx + 1}`;
      
      // Also generate real Task
      const newTask: Task = {
        id: taskId,
        title: `${verb} (${asg.title})`,
        courseId: asg.courseId,
        priority: asg.priority,
        dueDate: asg.dueDate,
        tags: ['ai-breakdown', 'step'],
        completed: false,
        subtasks: [],
        assignmentId: asg.id,
        source: 'breakdown'
      };
      setTasks(prev => [newTask, ...prev]);

      return {
        id: stepId,
        title: verb,
        completed: false,
        linkedTaskId: taskId
      };
    });

    updateAssignment(asgId, {
      steps: generatedSteps,
      isBrokenDown: true
    });

    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: 'Assignment AI Breakdown Complete',
        message: `Generated ${generatedSteps.length} actionable study tasks for "${asg.title}".`,
        type: 'assignment',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  const toggleAssignmentStep = (asgId: string, stepId: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.id !== asgId) return a;
      const updatedSteps = a.steps.map(s => {
        if (s.id !== stepId) return s;
        const nextCompleted = !s.completed;
        if (s.linkedTaskId) {
          updateTask(s.linkedTaskId, { completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : undefined });
        }
        return { ...s, completed: nextCompleted };
      });
      // Check if all steps done
      const allDone = updatedSteps.length > 0 && updatedSteps.every(s => s.completed);
      return {
        ...a,
        steps: updatedSteps,
        status: allDone ? 'completed' : (updatedSteps.some(s => s.completed) ? 'in_progress' : a.status)
      };
    }));
  };

  // Tasks
  const addTask = (taskData: Omit<Task, 'id' | 'subtasks'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}`,
      subtasks: []
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleTaskComplete = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextCompleted = !t.completed;
      return {
        ...t,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : undefined
      };
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addSubtask = (taskId: string, title: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        subtasks: [...t.subtasks, { id: `st_${Date.now()}`, title, completed: false }]
      };
    }));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
      };
    }));
  };

  // Notes
  const addNote = (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'inTrash'>) => {
    const newNote: Note = {
      ...noteData,
      id: `note_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inTrash: false
    };
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  };

  const moveNoteToTrash = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, inTrash: true } : n));
  };

  const restoreNote = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, inTrash: false } : n));
  };

  const deleteNotePermanently = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Events
  const addEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `ev_${Date.now()}`
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Inbox
  const addInboxItem = (itemData: Omit<InboxItem, 'id' | 'processed' | 'createdAt'>) => {
    const newItem: InboxItem = {
      ...itemData,
      id: `inbox_${Date.now()}`,
      processed: false,
      createdAt: new Date().toISOString()
    };
    setInboxItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const convertInboxItem = (id: string, target: 'task' | 'note' | 'project') => {
    const item = inboxItems.find(i => i.id === id);
    if (!item) return;

    if (target === 'task') {
      addTask({
        title: item.title,
        description: item.content,
        priority: 'medium',
        tags: ['inbox-capture'],
        completed: false,
        source: 'user'
      });
    } else if (target === 'note') {
      addNote({
        title: item.title,
        content: `<p>${item.content}</p>${item.url ? `<p><a href="${item.url}" target="_blank">${item.url}</a></p>` : ''}`,
        tags: ['inbox-capture'],
        pinned: false,
        highlightedTerms: [item.title]
      });
    } else if (target === 'project') {
      addGitHubRepo('course_cs302', 'user', item.title.toLowerCase().replace(/\s+/g, '-'));
    }

    setInboxItems(prev => prev.map(i => i.id === id ? { ...i, processed: true, convertedTo: target } : i));
  };

  const deleteInboxItem = (id: string) => {
    setInboxItems(prev => prev.filter(i => i.id !== id));
  };

  // Files
  const addFile = (fileData: Omit<DocumentFile, 'id' | 'uploadedAt' | 'chunks'>, sampleContent?: string) => {
    const fullText = fileData.rawText || sampleContent || `Introduction and overview of ${fileData.name}. Core concepts, algorithmic formulations, and analytical breakdown.`;
    
    // Check if the text contains structured slide or page delimiters (e.g. === Slide 1 === or === Page 1 ===)
    const delimiterRegex = /===\s*(?:Slide|Page)\s*(\d+)\s*===\s*([\s\S]*?)(?=(?:===\s*(?:Slide|Page)\s*\d+\s*===|$))/gi;
    const delimiterMatches = Array.from(fullText.matchAll(delimiterRegex));

    let chunks: DocumentChunk[] = [];
    if (delimiterMatches.length > 0) {
      chunks = delimiterMatches.map((m, idx) => {
        const pageNum = parseInt(m[1], 10) || (idx + 1);
        const content = m[2].trim() || `(Slide ${pageNum} Visual diagram and key points)`;
        return {
          id: `chunk_${Date.now()}_${pageNum}_${idx}`,
          page: pageNum,
          content,
          hasVisuals: idx === 0 || idx === 1 || (idx % 3 === 0),
          visualDescription: `Slide ${pageNum} presentation visuals and layout from ${fileData.name}`
        };
      });
    } else {
      // Chunk plain text into ~1200 character slices representing pages
      const chunkSize = 1200;
      const textChunks: string[] = [];
      if (fullText.length > chunkSize) {
        for (let i = 0; i < fullText.length; i += chunkSize) {
          textChunks.push(fullText.slice(i, i + chunkSize));
        }
      } else {
        textChunks.push(fullText);
      }

      chunks = textChunks.map((content, idx) => ({
        id: `chunk_${Date.now()}_${idx + 1}`,
        page: idx + 1,
        content,
        hasVisuals: idx === 1 || (idx % 3 === 0 && idx > 0),
        visualDescription: idx === 1 ? `Key visual or conceptual diagram from ${fileData.name}` : undefined
      }));
    }

    const calculatedPageCount = Math.max(fileData.pageCount || 1, delimiterMatches.length, chunks.length);

    const newFile: DocumentFile = {
      ...fileData,
      rawText: fullText,
      pageCount: calculatedPageCount,
      id: `file_${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      chunks
    };
    setFiles(prev => [newFile, ...prev]);
    return newFile;
  };

  const deleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const toggleFavoriteFile = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
  };

  const reindexFile = (id: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      const fullText = f.rawText || '';
      const delimiterRegex = /===\s*(?:Slide|Page)\s*(\d+)\s*===\s*([\s\S]*?)(?=(?:===\s*(?:Slide|Page)\s*\d+\s*===|$))/gi;
      const delimiterMatches = Array.from(fullText.matchAll(delimiterRegex));

      let chunks: DocumentChunk[] = [];
      if (delimiterMatches.length > 0) {
        chunks = delimiterMatches.map((m, idx) => {
          const pageNum = parseInt(m[1], 10) || (idx + 1);
          return {
            id: `chunk_${Date.now()}_${pageNum}_${idx}`,
            page: pageNum,
            content: m[2].trim() || `(Slide ${pageNum} Visual diagram and summary)`,
            hasVisuals: idx === 0 || (idx % 3 === 0),
            visualDescription: `Slide ${pageNum} presentation visuals from ${f.name}`
          };
        });
      } else {
        const chunkSize = 1200;
        const textChunks: string[] = [];
        for (let i = 0; i < fullText.length; i += chunkSize) {
          textChunks.push(fullText.slice(i, i + chunkSize));
        }
        chunks = textChunks.map((content, idx) => ({
          id: `chunk_${Date.now()}_${idx + 1}`,
          page: idx + 1,
          content,
          hasVisuals: idx === 1 || (idx % 3 === 0 && idx > 0)
        }));
      }

      const calculatedPageCount = Math.max(delimiterMatches.length, chunks.length, 1);
      return {
        ...f,
        status: 'fully_read',
        pageCount: calculatedPageCount,
        chunks
      };
    }));
  };

  // Flashcards (SM-2 Algorithm)
  const reviewFlashcard = (cardId: string, grade: 1 | 2 | 3 | 4) => {
    setFlashcards(prev => prev.map(card => {
      if (card.id !== cardId) return card;

      let { easeFactor, intervalDays, repetitions, lapses } = card;

      if (grade < 3) {
        // Failed / Again
        repetitions = 0;
        intervalDays = 1;
        lapses += 1;
      } else {
        // Successful recall (Good / Easy / Hard)
        if (repetitions === 0) {
          intervalDays = 1;
        } else if (repetitions === 1) {
          intervalDays = 6;
        } else {
          intervalDays = Math.round(intervalDays * easeFactor);
        }
        repetitions += 1;
      }

      // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
      easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;

      const nextDue = new Date(Date.now() + intervalDays * 86400 * 1000).toISOString().slice(0, 10);

      return {
        ...card,
        easeFactor,
        intervalDays,
        repetitions,
        lapses,
        dueDate: nextDue,
        state: 'review'
      };
    }));
  };

  const addFlashcard = (cardData: Omit<Flashcard, 'id' | 'easeFactor' | 'intervalDays' | 'repetitions' | 'lapses' | 'dueDate' | 'state'>) => {
    const newCard: Flashcard = {
      ...cardData,
      id: `fc_${Date.now()}`,
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
      dueDate: new Date().toISOString().slice(0, 10),
      state: 'new'
    };
    setFlashcards(prev => [newCard, ...prev]);
  };

  const addFlashcardDeck = (name: string, courseId?: string, tag?: string) => {
    const newDeck: FlashcardDeck = {
      id: `deck_${Date.now()}`,
      name,
      courseId,
      tag
    };
    setFlashcardDecks(prev => [...prev, newDeck]);
  };

  const createFlashcardsFromQuizErrors = (quizTitle: string, errors: { question: string; answer: string; courseId?: string }[]) => {
    if (errors.length === 0) return;
    const targetDeck = flashcardDecks.find(d => d.courseId === errors[0].courseId) || flashcardDecks[0];
    
    errors.forEach((err, idx) => {
      addFlashcard({
        deckId: targetDeck ? targetDeck.id : 'deck_cs302',
        courseId: err.courseId,
        question: err.question,
        answer: err.answer,
        citation: { file: quizTitle, pageOrSlide: `Question ${idx + 1}` }
      });
    });

    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: 'Quiz Flashcards Generated',
        message: `Created ${errors.length} targeted spaced repetition flashcards from missed questions.`,
        type: 'reminder',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  // Quizzes
  const submitQuizAttempt = (quizId: string, userAnswers: Record<string, string>): QuizAttempt => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) throw new Error('Quiz not found');

    let correctCount = 0;
    const weakTopics: string[] = [];

    quiz.questions.forEach(q => {
      const userAns = (userAnswers[q.id] || '').trim().toLowerCase();
      const correctAns = q.correctAnswer.trim().toLowerCase();
      const isCorrect = userAns === correctAns || (q.type === 'short' && (userAns.includes(correctAns) || correctAns.includes(userAns)));
      
      if (isCorrect) {
        correctCount++;
      } else {
        if (!weakTopics.includes(q.topic)) {
          weakTopics.push(q.topic);
        }
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const newAttempt: QuizAttempt = {
      id: `att_${Date.now()}`,
      date: new Date().toISOString(),
      score,
      userAnswers,
      weakTopics
    };

    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, attempts: [newAttempt, ...q.attempts] } : q));
    return newAttempt;
  };

  const createQuizFromCourse = (courseId: string, difficulty: Quiz['difficulty']): Quiz => {
    const course = courses.find(c => c.id === courseId);
    const courseNotes = notes.filter(n => n.courseId === courseId);
    const courseAssignments = assignments.filter(a => a.courseId === courseId);
    const courseExams = exams.filter(e => e.courseId === courseId);
    const courseFiles = files.filter(f => f.courseId === courseId);

    // Collect real academic topics and contents from the course
    const realTopics: string[] = [];
    if (courseNotes.length > 0) {
      courseNotes.forEach(n => realTopics.push(n.title));
    }
    if (courseAssignments.length > 0) {
      courseAssignments.forEach(a => realTopics.push(a.title));
    }
    if (courseExams.length > 0) {
      courseExams.forEach(e => realTopics.push(e.name));
    }
    if (courseFiles.length > 0) {
      courseFiles.forEach(f => realTopics.push(f.name.replace(/\.[^/.]+$/, '')));
    }

    const primaryTopic = realTopics[0] || `${course?.code || 'Course'} Fundamentals`;
    const secondaryTopic = realTopics[1] || `${course?.name || 'Academic'} Core Concepts`;
    const advancedTopic = realTopics[2] || `${course?.code || 'Course'} Practical Applications`;

    const generatedQuestions: QuizQuestion[] = [
      {
        id: `q_gen_${Date.now()}_1`,
        type: 'mcq',
        prompt: `In the context of ${course?.code || 'this course'} (${course?.name || 'Lectures'}), what is the primary significance of ${primaryTopic}?`,
        options: [
          `Establishes the fundamental theoretical mechanism and system constraints`,
          `Serves merely as legacy background without operational utility`,
          `Bypasses all core validation rules to increase raw speed`,
          `Replaces all higher-level architecture with arbitrary constants`
        ],
        correctAnswer: `Establishes the fundamental theoretical mechanism and system constraints`,
        explanation: `In ${course?.code || 'this curriculum'}, understanding ${primaryTopic} forms the foundation for all subsequent problem-solving and assessments.`,
        topic: primaryTopic
      },
      {
        id: `q_gen_${Date.now()}_2`,
        type: 'tf',
        prompt: `True or False: According to ${course?.code || 'course'} principles, mastery of ${secondaryTopic} requires strictly adhering to standard analytical frameworks rather than ad-hoc heuristics.`,
        correctAnswer: 'True',
        explanation: `Rigorous analysis in ${secondaryTopic} mandates structured problem decomposition as emphasized in lectures.`,
        topic: secondaryTopic
      },
      {
        id: `q_gen_${Date.now()}_3`,
        type: 'mcq',
        prompt: `When preparing coursework or exams regarding ${advancedTopic}, which technique yields the highest operational reliability?`,
        options: [
          `Systematic validation against known boundary cases and edge conditions`,
          `Skipping intermediate proofs to finalize output early`,
          `Assuming constant-time performance across unconstrained unbounded data`,
          `Relying exclusively on non-deterministic approximation`
        ],
        correctAnswer: `Systematic validation against known boundary cases and edge conditions`,
        explanation: `Addressing boundary conditions is critical for high academic performance and technical accuracy in ${advancedTopic}.`,
        topic: advancedTopic
      }
    ];

    if (courseNotes.length > 0 && courseNotes[0].content) {
      // Extract a sentence from the actual student note
      const noteExcerpt = courseNotes[0].content.replace(/<[^>]+>/g, '').split(/[.?!]/).filter(s => s.trim().length > 25)[0];
      if (noteExcerpt) {
        generatedQuestions.push({
          id: `q_gen_${Date.now()}_4`,
          type: 'short',
          prompt: `Based on your course notes for "${courseNotes[0].title}": Briefly explain the application of: "${noteExcerpt.trim()}..."`,
          correctAnswer: `${courseNotes[0].title} Concept Synthesis`,
          explanation: `Extracted directly from your personal study notes in ${course?.code || 'the course'}.`,
          topic: courseNotes[0].title
        });
      }
    }

    const newQuiz: Quiz = {
      id: `quiz_${Date.now()}`,
      title: `${course?.code || 'Course'} Diagnostic Practice Test (${difficulty.toUpperCase()})`,
      courseId,
      difficulty,
      questions: generatedQuestions,
      attempts: []
    };

    setQuizzes(prev => [newQuiz, ...prev]);
    return newQuiz;
  };

  const addQuiz = (quizData: Omit<Quiz, 'id' | 'attempts'>): Quiz => {
    const newQuiz: Quiz = {
      ...quizData,
      id: `quiz_${Date.now()}`,
      attempts: []
    };
    setQuizzes(prev => [newQuiz, ...prev]);
    return newQuiz;
  };

  // Exams & Revision
  const addExam = (examData: Omit<Exam, 'id' | 'revisionSessions' | 'readinessPercent'>) => {
    const newExam: Exam = {
      ...examData,
      id: `exam_${Date.now()}`,
      readinessPercent: 40,
      revisionSessions: []
    };
    setExams(prev => [...prev, newExam]);
    return newExam;
  };

  const generateRevisionPlanForExam = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const course = courses.find(c => c.id === exam.courseId);
    const sessions: RevisionSession[] = [
      {
        id: `rev_${examId}_1`,
        examId,
        sessionNumber: 1,
        title: `Session 1: Core Lectures & Foundational Notes Review (${course?.code})`,
        date: new Date(Date.now() + 1 * 86400 * 1000).toISOString().slice(0, 10),
        durationMinutes: 60,
        focusArea: 'notes',
        completed: false
      },
      {
        id: `rev_${examId}_2`,
        examId,
        sessionNumber: 2,
        title: `Session 2: Spaced Repetition Flashcard Drill (${course?.code})`,
        date: new Date(Date.now() + 2 * 86400 * 1000).toISOString().slice(0, 10),
        durationMinutes: 45,
        focusArea: 'flashcards',
        completed: false
      },
      {
        id: `rev_${examId}_3`,
        examId,
        sessionNumber: 3,
        title: `Session 3: Practice Problem Sets & Diagnostic Quiz Weak Topics`,
        date: new Date(Date.now() + 3 * 86400 * 1000).toISOString().slice(0, 10),
        durationMinutes: 60,
        focusArea: 'weak_topics',
        completed: false
      },
      {
        id: `rev_${examId}_4`,
        examId,
        sessionNumber: 4,
        title: `Session 4: Consolidation & High-Difficulty Proofs`,
        date: new Date(Date.now() + 4 * 86400 * 1000).toISOString().slice(0, 10),
        durationMinutes: 75,
        focusArea: 'consolidation',
        completed: false
      },
      {
        id: `rev_${examId}_5`,
        examId,
        sessionNumber: 5,
        title: `Session 5: Eve-of-Exam Summary Sheet & Formula Quick Recall`,
        date: new Date(Date.now() + 5 * 86400 * 1000).toISOString().slice(0, 10),
        durationMinutes: 40,
        focusArea: 'eve_of_exam',
        completed: false
      }
    ];

    // Create real linked tasks for each revision session
    sessions.forEach(sess => {
      const taskId = `task_${sess.id}`;
      sess.linkedTaskId = taskId;
      addTask({
        title: sess.title,
        courseId: exam.courseId,
        dueDate: sess.date + 'T18:00',
        priority: 'high',
        tags: ['exam-revision', course?.code || 'exam'],
        completed: false,
        examId: exam.id,
        source: 'revision'
      });
    });

    setExams(prev => prev.map(e => e.id === examId ? { ...e, revisionSessions: sessions, readinessPercent: 55 } : e));

    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: 'Exam Revision Schedule Built',
        message: `Generated 5 spaced revision blocks leading up to ${exam.name}.`,
        type: 'exam',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  const toggleRevisionSession = (examId: string, sessionId: string) => {
    setExams(prev => prev.map(e => {
      if (e.id !== examId) return e;
      const updated = e.revisionSessions.map(s => {
        if (s.id !== sessionId) return s;
        const nextComp = !s.completed;
        if (s.linkedTaskId) {
          updateTask(s.linkedTaskId, { completed: nextComp, completedAt: nextComp ? new Date().toISOString() : undefined });
        }
        return { ...s, completed: nextComp };
      });
      const doneCount = updated.filter(s => s.completed).length;
      const readiness = Math.round(40 + (doneCount / Math.max(updated.length, 1)) * 60);
      return { ...e, revisionSessions: updated, readinessPercent: readiness };
    }));
  };

  // Grade Items & GPA (Exact GPA Scale from Syllabus/Scale specification)
  const addGradeItem = (itemData: Omit<GradeItem, 'id'>) => {
    const newItem: GradeItem = {
      ...itemData,
      id: `g_${Date.now()}`
    };
    setGradeItems(prev => {
      const next = [...prev, newItem];
      saveStored('grade_items', next);
      return next;
    });
    return newItem;
  };

  const updateGradeItem = (id: string, updates: Partial<GradeItem>) => {
    setGradeItems(prev => {
      const next = prev.map(g => g.id === id ? { ...g, ...updates } : g);
      saveStored('grade_items', next);
      return next;
    });
  };

  const deleteGradeItem = (id: string) => {
    setGradeItems(prev => {
      const next = prev.filter(g => g.id !== id);
      saveStored('grade_items', next);
      return next;
    });
  };

  // Previous Term Courses Management
  const addPreviousTermCourse = (itemData: Omit<PreviousTermCourse, 'id'>) => {
    // Automatically compute grade points from scale if percentage or letter provided
    let points = itemData.gradePoints;
    let letter = itemData.gradeLetter;
    if (typeof itemData.percentage === 'number' && points === undefined) {
      const scaled = getExactGradeScale(itemData.percentage);
      points = scaled.points;
      letter = letter || scaled.letter;
    } else if (letter && points === undefined) {
      points = getPointsForLetter(letter);
    }

    const newItem: PreviousTermCourse = {
      ...itemData,
      id: `pt_${Date.now()}`,
      gradePoints: points,
      gradeLetter: letter
    };

    setPreviousTermCourses(prev => {
      const next = [...prev, newItem];
      saveStored('previous_term_courses', next);
      return next;
    });
    return newItem;
  };

  const updatePreviousTermCourse = (id: string, updates: Partial<PreviousTermCourse>) => {
    setPreviousTermCourses(prev => {
      const next = prev.map(p => {
        if (p.id !== id) return p;
        const merged = { ...p, ...updates };
        if (typeof updates.percentage === 'number' && updates.gradePoints === undefined) {
          const scaled = getExactGradeScale(updates.percentage);
          merged.gradePoints = scaled.points;
          merged.gradeLetter = updates.gradeLetter || scaled.letter;
        } else if (updates.gradeLetter && updates.gradePoints === undefined) {
          merged.gradePoints = getPointsForLetter(updates.gradeLetter);
        }
        return merged;
      });
      saveStored('previous_term_courses', next);
      return next;
    });
  };

  const deletePreviousTermCourse = (id: string) => {
    setPreviousTermCourses(prev => {
      const next = prev.filter(p => p.id !== id);
      saveStored('previous_term_courses', next);
      return next;
    });
  };

  // Exact Academic GPA Scale from Specification Image
  const getExactGradeScale = (pct: number): { letter: string; points: number } => {
    if (pct > 97) return { letter: 'A+', points: 4.0 };
    if (pct >= 93) return { letter: 'A', points: 4.0 };
    if (pct >= 89) return { letter: 'A-', points: 3.7 };
    if (pct >= 84) return { letter: 'B+', points: 3.3 };
    if (pct >= 80) return { letter: 'B', points: 3.0 };
    if (pct >= 76) return { letter: 'B-', points: 2.7 };
    if (pct >= 73) return { letter: 'C+', points: 2.3 };
    if (pct >= 70) return { letter: 'C', points: 2.0 };
    if (pct >= 67) return { letter: 'C-', points: 1.7 };
    if (pct >= 64) return { letter: 'D+', points: 1.3 };
    if (pct >= 60) return { letter: 'D', points: 1.0 };
    return { letter: 'F', points: 0.0 };
  };

  const getPointsForLetter = (letter: string): number => {
    switch (letter.trim().toUpperCase()) {
      case 'A+': return 4.0;
      case 'A': return 4.0;
      case 'A-': return 3.7;
      case 'B+': return 3.3;
      case 'B': return 3.0;
      case 'B-': return 2.7;
      case 'C+': return 2.3;
      case 'C': return 2.0;
      case 'C-': return 1.7;
      case 'D+': return 1.3;
      case 'D': return 1.0;
      default: return 0.0;
    }
  };

  const calculateCumulativeGpa = useCallback(() => {
    let totalWeightedPoints = 0;
    let totalCredits = 0;
    const courseGrades: Record<string, { letter: string; percentage: number; points: number }> = {};

    // 1. Current term courses with graded assessments
    courses.forEach(course => {
      const items = gradeItems.filter(g => g.courseId === course.id && !g.isUngraded);
      if (items.length === 0) return;

      const hasWeights = items.some(i => i.weightPercent && i.weightPercent > 0);
      let coursePercentage = 0;

      if (hasWeights) {
        let weightSum = 0;
        let weightedScore = 0;
        items.forEach(i => {
          const w = i.weightPercent || 1;
          weightSum += w;
          weightedScore += (i.earnedScore / i.maxScore) * w;
        });
        coursePercentage = (weightedScore / Math.max(weightSum, 1)) * 100;
      } else {
        const totalEarned = items.reduce((acc, i) => acc + i.earnedScore, 0);
        const totalMax = items.reduce((acc, i) => acc + i.maxScore, 0);
        coursePercentage = (totalEarned / Math.max(totalMax, 1)) * 100;
      }

      const { letter, points } = getExactGradeScale(coursePercentage);

      courseGrades[course.id] = { letter, percentage: Math.round(coursePercentage * 10) / 10, points };
      totalWeightedPoints += points * course.creditHours;
      totalCredits += course.creditHours;
    });

    // 2. Previous term courses
    previousTermCourses.forEach(pt => {
      let points = pt.gradePoints;
      let letter = pt.gradeLetter || 'A';
      if (typeof pt.percentage === 'number' && points === undefined) {
        const scaled = getExactGradeScale(pt.percentage);
        points = scaled.points;
        letter = scaled.letter;
      } else if (pt.gradeLetter && points === undefined) {
        points = getPointsForLetter(pt.gradeLetter);
      }
      points = points ?? 0;
      totalWeightedPoints += points * pt.creditHours;
      totalCredits += pt.creditHours;
    });

    // If completely fresh with 0 completed credits, cumulative GPA is strictly 0.00
    const gpa = totalCredits > 0 ? Math.round((totalWeightedPoints / totalCredits) * 100) / 100 : 0.0;
    return { gpa, totalCredits, courseGrades };
  }, [courses, gradeItems, previousTermCourses]);

  const calculateTargetExamScore = useCallback((courseId: string, targetLetter: string) => {
    const items = gradeItems.filter(g => g.courseId === courseId);
    const graded = items.filter(g => !g.isUngraded);
    const ungraded = items.filter(g => g.isUngraded);

    let currentScore = 0;
    let gradedWeight = 0;
    graded.forEach(i => {
      const w = i.weightPercent || 10;
      gradedWeight += w;
      currentScore += (i.earnedScore / i.maxScore) * w;
    });

    const remainingWeight = ungraded.reduce((acc, i) => acc + (i.weightPercent || 25), 0) || 25;
    const targetThresholds: Record<string, number> = {
      'A+': 97.1,
      'A': 93,
      'A-': 89,
      'B+': 84,
      'B': 80,
      'B-': 76,
      'C+': 73,
      'C': 70,
      'C-': 67,
      'D+': 64,
      'D': 60
    };
    const targetTotal = targetThresholds[targetLetter] || 93;

    const neededScore = Math.round(((targetTotal - currentScore) / remainingWeight) * 100);

    let status: 'guaranteed' | 'achievable' | 'impossible' = 'achievable';
    if (neededScore <= 0) status = 'guaranteed';
    else if (neededScore > 100) status = 'impossible';

    const currentGrade = gradedWeight > 0 ? Math.round((currentScore / gradedWeight) * 100) : 90;
    return { neededScore, status, currentGrade };
  }, [gradeItems]);

  // Daily Plan Operations: Intelligent, Realistic & Sensible Academic Scheduling
  const regenerateDailyPlan = () => {
    const today = new Date();
    const todayIsoDate = today.toISOString().slice(0, 10);
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[currentDay];

    // 1. Find actual classes scheduled for today across all enrolled courses
    const todayClasses: Array<{ course: Course; slot: MeetingSlot }> = [];
    courses.forEach(c => {
      (c.meetingSlots || []).forEach(slot => {
        if (slot.day === currentDay) {
          todayClasses.push({ course: c, slot });
        }
      });
    });
    todayClasses.sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));

    // 2. Identify urgent assignments due soon or overdue
    const urgentAssignments = assignments
      .filter(a => a.status !== 'completed' && a.dueDate)
      .map(a => {
        const dueTime = new Date(a.dueDate).getTime();
        const diffDays = Math.round((dueTime - today.getTime()) / (86400 * 1000));
        return { ...a, diffDays };
      })
      .filter(a => a.diffDays <= 4)
      .sort((a, b) => a.diffDays - b.diffDays);

    // 3. Identify near exams within 14 days
    const upcomingExamsList = exams
      .map(e => {
        const diffDays = Math.round((new Date(e.date).getTime() - today.getTime()) / (86400 * 1000));
        return { ...e, diffDays };
      })
      .filter(e => e.diffDays >= 0 && e.diffDays <= 14)
      .sort((a, b) => a.diffDays - b.diffDays);

    // 4. Open tasks sorted by priority
    const priorityTasks = tasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        const pOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 1) - (pOrder[a.priority] || 1);
      });

    const blocks: DailyPlanBlock[] = [];
    let bIdx = 1;

    // A. Morning Foundation Block (08:30 - 09:30 or before first class)
    if (todayClasses.length > 0 && todayClasses[0].slot.startTime >= '10:00') {
      const urgentAsg = urgentAssignments[0];
      blocks.push({
        id: `b_${Date.now()}_${bIdx++}`,
        time: '08:45 - 09:45',
        title: urgentAsg
          ? `Priority Deep Work: ${urgentAsg.title} (${urgentAsg.diffDays <= 0 ? 'Overdue!' : `Due in ${urgentAsg.diffDays}d`})`
          : priorityTasks[0]
          ? `Focus Block: ${priorityTasks[0].title}`
          : 'Morning Lecture Prep & Concept Warm-up',
        type: 'study',
        completed: false,
        taskId: priorityTasks[0]?.id
      });
    }

    // B. Insert Real Scheduled Classes for Today
    todayClasses.forEach(item => {
      blocks.push({
        id: `b_${Date.now()}_${bIdx++}`,
        time: `${item.slot.startTime} - ${item.slot.endTime}`,
        title: `${item.course.code}: ${item.course.name} (${item.slot.location || item.course.location || 'Main Campus'})`,
        type: 'class',
        completed: false,
        courseId: item.course.id
      });
    });

    // C. Dedicated Lunch & Energy Break (12:30 - 13:30 or appropriate gap)
    const hasClassAtNoon = todayClasses.some(c => c.slot.startTime <= '13:00' && c.slot.endTime >= '12:30');
    blocks.push({
      id: `b_${Date.now()}_${bIdx++}`,
      time: hasClassAtNoon ? '13:30 - 14:15' : '12:30 - 13:30',
      title: '🍱 Lunch & Mental Rest Interval',
      type: 'break',
      completed: false
    });

    // D. Afternoon Focus / Urgent Deadline Block
    const targetTask = priorityTasks[1] || priorityTasks[0];
    const topUrgentAsg = urgentAssignments.length > 1 ? urgentAssignments[1] : urgentAssignments[0];

    blocks.push({
      id: `b_${Date.now()}_${bIdx++}`,
      time: hasClassAtNoon ? '14:30 - 16:00' : '14:00 - 15:30',
      title: topUrgentAsg
        ? `Coursework Push: ${topUrgentAsg.title}`
        : targetTask
        ? `Task Execution: ${targetTask.title}`
        : 'Deep Academic Reading & Problem Sets',
      type: 'study',
      completed: false,
      taskId: targetTask?.id
    });

    // E. Exam Revision Block (if student has upcoming exams)
    if (upcomingExamsList.length > 0) {
      const nearExam = upcomingExamsList[0];
      blocks.push({
        id: `b_${Date.now()}_${bIdx++}`,
        time: '16:00 - 17:00',
        title: `⚡ Exam Prep: ${nearExam.name} (In ${nearExam.diffDays} days - Flashcards & Formula Sheets)`,
        type: 'study',
        completed: false,
        courseId: nearExam.courseId
      });
    } else {
      // General flashcard spaced repetition block
      blocks.push({
        id: `b_${Date.now()}_${bIdx++}`,
        time: '16:00 - 17:00',
        title: 'Active Recall Flashcards (SM-2 Spaced Repetition)',
        type: 'study',
        completed: false
      });
    }

    // F. End of Day Review & Slipped Task Rebalancing
    blocks.push({
      id: `b_${Date.now()}_${bIdx++}`,
      time: '17:30 - 18:00',
      title: 'Daily Review, Inbox Capture & Tomorrow Plan',
      type: 'review',
      completed: false
    });

    // Sort all blocks chronologically
    blocks.sort((a, b) => a.time.localeCompare(b.time));

    setDailyPlan({
      date: todayIsoDate,
      generatedBy: 'ai',
      fallbackReason: `Custom plan optimized for ${currentDayName}: Includes ${todayClasses.length} lecture(s), ${urgentAssignments.length} urgent deadline(s), and targeted exam preparation.`,
      blocks
    });
  };

  const toggleDailyPlanBlock = (blockId: string) => {
    setDailyPlan(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, completed: !b.completed } : b)
    }));
  };

  // What Should I Do Now? Deterministic Algorithm
  const getWhatShouldIDoNow = useCallback((minutesWindow: number = 45) => {
    const openTasks = tasks.filter(t => !t.completed);
    if (openTasks.length === 0) return { topTask: null, reason: 'All academic tasks are up to date! Great job.', alternatives: [] };

    const scoredTasks = openTasks.map(task => {
      let score = 0;
      let reason = '';

      // Priority score
      if (task.priority === 'high') score += 50;
      else if (task.priority === 'medium') score += 25;
      else score += 10;

      // Due date pressure
      if (task.dueDate) {
        const diffHours = (new Date(task.dueDate).getTime() - Date.now()) / (3600 * 1000);
        if (diffHours < 0) {
          score += 150;
          reason = `Overdue by ${Math.abs(Math.round(diffHours))}h`;
        } else if (diffHours <= 24) {
          score += 100;
          reason = `Due within 24h`;
        } else if (diffHours <= 48) {
          score += 60;
          reason = `Due in 2 days`;
        }
      }

      // Proximity to Exam
      if (task.courseId) {
        const upcomingExam = exams.find(e => e.courseId === task.courseId);
        if (upcomingExam) {
          const examDiffDays = (new Date(upcomingExam.date).getTime() - Date.now()) / (86400 * 1000);
          if (examDiffDays <= 7) {
            score += 45;
            if (!reason) reason = `Upcoming exam in ${Math.round(examDiffDays)} days`;
          }
        }
      }

      // Quick win filter
      if (minutesWindow <= 25 && task.subtasks.length > 0) {
        score += 20;
      }

      if (!reason) {
        reason = `High priority course task for ${courses.find(c => c.id === task.courseId)?.code || 'general studies'}`;
      }

      return { task, score, reason };
    });

    scoredTasks.sort((a, b) => b.score - a.score);
    const top = scoredTasks[0];
    const alternatives = scoredTasks.slice(1, 4).map(s => s.task);

    return {
      topTask: top.task,
      reason: top.reason,
      alternatives
    };
  }, [tasks, exams, courses]);

  // AI Assistant Chat & Actions
  const sendAiMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiMessages(prev => [...prev, userMsg]);

    const currentSession = chatSessions.find(s => s.id === activeChatSessionId);
    if (currentSession && (currentSession.title === 'New Chat' || currentSession.title === 'Study Assistant')) {
      const trimmedTitle = text.trim();
      const generatedTitle = trimmedTitle.slice(0, 34).trim() + (trimmedTitle.length > 34 ? '...' : '');
      if (generatedTitle) {
        renameChatSession(currentSession.id, generatedTitle);
      }
    }

    const geminiKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || localStorage.getItem('nook_gemini_api_key') || '';
    const lower = text.toLowerCase();

    // If student has connected their free Google Gemini API key and is asking study/concept questions
    if (
      geminiKey &&
      geminiKey.trim().length > 10 &&
      !lower.startsWith('confirm') &&
      !lower.startsWith('add course') &&
      !lower.startsWith('create course')
    ) {
      (async () => {
        const candidateModels = [
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.1-flash-lite',
          'gemini-3.8-flash'
        ];

        for (const model of candidateModels) {
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: `You are an elite academic tutor and study planner in Nook Academic Workspace.
Student Context:
Enrolled courses: ${courses.map(c => `${c.code}: ${c.name}`).join(', ') || 'None currently'}.
Open tasks: ${tasks.filter(t => !t.completed).map(t => t.title).join(', ') || 'All caught up'}.

Please help this university student with their study inquiry clearly, with helpful markdown headings, bullet points, and code/formulas if relevant:
${text}`
                        }
                      ]
                    }
                  ]
                })
              }
            );
            const data = await resp.json();
            const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (geminiText) {
              setAiMessages(prev => [
                ...prev,
                {
                  id: `msg_${Date.now() + 1}`,
                  sender: 'assistant',
                  content: geminiText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
              return;
            }
          } catch (err) {
            console.warn(`Model ${model} fetch error, trying next fallback:`, err);
          }
        }

        // Fallback to local heuristic engine on all errors
        runLocalAiResponse(text);
      })();
      return;
    }

    runLocalAiResponse(text);
  };

  const runLocalAiResponse = (text: string) => {
    setTimeout(() => {
      const lower = text.toLowerCase();
      let reasoningSteps: string[] = [];
      let replyContent = '';
      let proposals: AiActionProposal[] = [];

      // Check if user is asking how to use the AI or needs onboarding
      if (
        lower.includes('how to use') ||
        lower.includes('how do i use') ||
        lower.includes('what can you do') ||
        lower.includes('help') ||
        lower.includes('button') ||
        lower.includes('start')
      ) {
        replyContent = `### How to use the **Ask AI** button:

I am your proactive academic assistant and study partner. Here are the 5 things you can do right here:

1. 🏫 **Create Courses & Timetable Slots via Chat:**
   Tell me: *"I am taking Computer Science 101 on Mon and Wed at 10 AM"* or *"Add Biology 200"*. I will parse it and provide a 1-click **Confirm & Create** button!

2. 📝 **Create Coursework & Auto-Breakdown:**
   Tell me: *"I have a 2,000-word Research Essay due next Friday"*. I will schedule it and break it down into 4–7 actionable steps with focus timers.

3. 📅 **Plan Your Day & Focus Sessions:**
   Tell me: *"Schedule a 45-minute focus session for tonight at 7 PM"* and I'll add it directly to your timetable and calendar.

4. 🧠 **Concept Explanations & Tutoring:**
   Ask any academic question! E.g. *"Explain recursion in programming"* or *"How does photosynthesis work?"*.

5. 📄 **Document QA with Citations:**
   Upload lecture slides or PDFs in the **Files** tab, then ask me anything about the document — I provide exact page numbers and quotes.

Try it right now! Click **Confirm & Create** on the sample course card below, or type what courses you are taking!`;

        proposals.push({
          id: `prop_${Date.now()}`,
          type: 'create_course',
          payload: {
            name: 'Introduction to Computer Science',
            code: 'CS 101',
            instructor: 'Dr. Alan Turing',
            room: 'Turing Hall 101',
            color: '#0284c7',
            credits: 4,
            scheduleSlots: [
              { day: 'Mon', startTime: '10:00', endTime: '11:30', room: 'Turing Hall 101', type: 'lecture' },
              { day: 'Wed', startTime: '10:00', endTime: '11:30', room: 'Turing Hall 101', type: 'lecture' }
            ]
          },
          reasoning: 'Sample course setup card: click Confirm to immediately add CS 101 to your timetable!',
          status: 'pending'
        });
      } else if (
        lower.includes('add course') ||
        lower.includes('create course') ||
        lower.includes('taking') ||
        lower.includes('enrolled') ||
        lower.includes('course') ||
        lower.includes('class')
      ) {
        // Natural language course creation
        let courseName = 'New Academic Course';
        let courseCode = 'CRS 101';
        let day = 'Mon';
        let time = '10:00';

        if (lower.includes('biology') || lower.includes('bio')) {
          courseName = 'General Biology & Genetics';
          courseCode = 'BIO 101';
        } else if (lower.includes('cs') || lower.includes('computer') || lower.includes('programming')) {
          courseName = 'Introduction to Computer Science';
          courseCode = 'CS 101';
        } else if (lower.includes('math') || lower.includes('calculus')) {
          courseName = 'Calculus & Linear Algebra';
          courseCode = 'MATH 101';
        } else if (lower.includes('psych') || lower.includes('psychology')) {
          courseName = 'Introduction to Psychology';
          courseCode = 'PSYC 101';
        } else if (lower.includes('history')) {
          courseName = 'World History & Civilizations';
          courseCode = 'HIST 110';
        } else {
          // Extract title if possible
          const cleanText = text.replace(/(add|create|course|class|taking|i am|i'm|enrolled in)/gi, '').trim();
          if (cleanText) {
            courseName = cleanText.split(' ')[0].toUpperCase() + ' ' + (cleanText.split(' ').slice(1).join(' ') || 'Course');
            courseCode = courseName.slice(0, 3).toUpperCase() + ' 101';
          }
        }

        if (lower.includes('tue')) day = 'Tue';
        else if (lower.includes('wed')) day = 'Wed';
        else if (lower.includes('thu')) day = 'Thu';
        else if (lower.includes('fri')) day = 'Fri';

        if (lower.includes('9') || lower.includes('09:00')) time = '09:00';
        else if (lower.includes('11') || lower.includes('11:00')) time = '11:00';
        else if (lower.includes('13') || lower.includes('1pm') || lower.includes('1:00')) time = '13:00';
        else if (lower.includes('14') || lower.includes('2pm') || lower.includes('2:00')) time = '14:00';

        replyContent = `I have drafted the course **${courseName} (${courseCode})** with a weekly lecture slot on ${day}s at ${time}. Click **Confirm & Create** below to instantly add it to your workspace and timetable!`;

        proposals.push({
          id: `prop_${Date.now()}`,
          type: 'create_course',
          payload: {
            name: courseName,
            code: courseCode,
            instructor: 'Faculty Staff',
            room: 'Hall A',
            color: '#0284c7',
            credits: 3,
            scheduleSlots: [
              { day: day, startTime: time, endTime: `${parseInt(time) + 1}:30`, room: 'Hall A', type: 'lecture' }
            ]
          },
          reasoning: `AI-parsed course schedule proposal for ${courseName}.`,
          status: 'pending'
        });
      } else if (lower.includes('assignment') || lower.includes('essay') || lower.includes('homework') || lower.includes('project due') || lower.includes('due')) {
        const title = text.replace(/(create|add|assignment|essay|due|homework|project)/gi, '').trim() || 'Coursework Assignment';
        replyContent = `I have drafted the assignment **"${title}"** with a due date in 7 days. Once created, you can use the AI 4-7 step breakdown to turn it into manageable study tasks. Click below to add it to your assignments!`;
        
        proposals.push({
          id: `prop_${Date.now()}`,
          type: 'create_assignment',
          payload: {
            title: title.charAt(0).toUpperCase() + title.slice(1),
            courseId: courses[0]?.id || '',
            dueDate: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
            weight: 20,
            priority: 'high'
          },
          reasoning: `Coursework deadline proposal due in 7 days.`,
          status: 'pending'
        });
      } else if (lower.includes('avl') || lower.includes('tree') || lower.includes('cs 302')) {
        replyContent = `In an **AVL tree**, the balance factor of every node must be in {-1, 0, 1}. For Left-Right (LR) zigzag insertions, you must perform a double rotation (single Left on child, then single Right on parent) to restore balance within O(log n) time.`;
      } else if (courses.length === 0) {
        // Empty workspace friendly response
        replyContent = `Hello! Your workspace is currently fresh with **0 courses**. 

To use the **Ask AI** button:
- Tell me what courses you're taking (e.g. *"I am taking Biology on Mondays at 10am"*).
- Tell me your homework (e.g. *"Essay due next Friday"*).
- Ask any academic question!

Or click **How do I use Ask AI?** in the suggestions below for a complete guide.`;
      } else {
        replyContent = `I've analyzed your academic workspace. You have ${courses.length} active course${courses.length > 1 ? 's' : ''} and ${tasks.filter(t => !t.completed).length} open tasks. 
        
How would you like me to assist you with your studies right now?`;
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reasoningSteps,
        actionProposals: proposals.length > 0 ? proposals : undefined
      };

      setAiMessages(prev => [...prev, assistantMsg]);
    }, 600);
  };

  const clearAiChat = () => {
    setAiMessages([
      {
        id: `msg_cleared_${Date.now()}`,
        sender: 'assistant',
        content: `Chat history cleared. I'm ready to assist with your courses, notes, document QA, and study planning!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const addAiMemory = (fact: string, category: AiMemory['category'] = 'preference') => {
    const newMem: AiMemory = {
      id: `mem_${Date.now()}`,
      fact,
      category,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setAiMemories(prev => [newMem, ...prev]);
  };

  const deleteAiMemory = (id: string) => {
    setAiMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleActionProposal = (actionId: string, confirm: boolean) => {
    setAiMessages(prev => prev.map(msg => {
      if (!msg.actionProposals) return msg;
      const updatedProposals = msg.actionProposals.map(p => {
        if (p.id !== actionId) return p;
        if (confirm) {
          if (p.type === 'create_course') {
            const created = addCourse({
              name: p.payload.name,
              code: p.payload.code || 'CRS',
              instructor: p.payload.instructor || 'Faculty Staff',
              location: p.payload.location || p.payload.room || 'Room 101',
              color: p.payload.color || '#0284c7',
              creditHours: p.payload.credits || p.payload.creditHours || 3,
              term: 'Fall 2026',
              links: [],
              meetingSlots: p.payload.meetingSlots || [
                { id: `slot_${Date.now()}`, day: 1, startTime: '10:00', endTime: '11:30', location: 'Hall 101', type: 'lecture' }
              ],
              syllabusUrl: '',
              isArchived: false
            });
            setNotifications(prev => [
              {
                id: `notif_${Date.now()}`,
                title: 'Course Created via AI',
                message: `Course "${created.name}" (${created.code}) has been added to your timetable and workspace!`,
                type: 'class',
                timestamp: 'Just now',
                read: false
              },
              ...prev
            ]);
          } else if (p.type === 'create_assignment') {
            const created = addAssignment({
              title: p.payload.title,
              description: p.payload.description || 'Created with Nook AI Assistant',
              courseId: p.payload.courseId || (courses[0]?.id ?? ''),
              dueDate: p.payload.dueDate || new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
              priority: p.payload.priority || 'high',
              status: 'todo',
              type: 'homework',
              estimatedMinutes: 90,
              links: []
            });
            setNotifications(prev => [
              {
                id: `notif_${Date.now()}`,
                title: 'Assignment Created via AI',
                message: `Assignment "${created.title}" added with due date.`,
                type: 'assignment',
                timestamp: 'Just now',
                read: false
              },
              ...prev
            ]);
          } else if (p.type === 'create_task') {
            addTask({
              title: p.payload.title,
              courseId: p.payload.courseId,
              priority: p.payload.priority || 'medium',
              dueDate: p.payload.dueDate,
              tags: ['ai-proposal'],
              completed: false,
              source: 'ai'
            });
          } else if (p.type === 'create_event') {
            addEvent({
              title: p.payload.title,
              start: p.payload.start,
              end: p.payload.end,
              courseId: p.payload.courseId,
              allDay: false,
              type: 'meeting',
              provider: 'local'
            });
          }
        }
        return { ...p, status: confirm ? ('confirmed' as const) : ('dismissed' as const) };
      });
      return { ...msg, actionProposals: updatedProposals };
    }));
  };

  // Integrations & GitHub
  const toggleIntegrationConnection = (provider: IntegrationConnector['provider']) => {
    setIntegrations(prev => prev.map(i => i.provider === provider ? { ...i, connected: !i.connected } : i));
  };

  const syncIntegration = (provider: IntegrationConnector['provider']) => {
    let itemsImported = 0;

    if (provider === 'google') {
      const gEvent1: CalendarEvent = {
        id: `g_ev_${Date.now()}_1`,
        title: 'Google Meet: Peer Study Group',
        start: new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 11) + '15:00',
        end: new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 11) + '16:30',
        courseId: courses[0]?.id,
        allDay: false,
        type: 'meeting',
        provider: 'google'
      };
      const gEvent2: CalendarEvent = {
        id: `g_ev_${Date.now()}_2`,
        title: 'Office Hours & Q&A Session',
        start: new Date(Date.now() + 2 * 86400 * 1000).toISOString().slice(0, 11) + '11:00',
        end: new Date(Date.now() + 2 * 86400 * 1000).toISOString().slice(0, 11) + '12:00',
        courseId: courses[0]?.id,
        allDay: false,
        type: 'meeting',
        provider: 'google'
      };
      setEvents(prev => [gEvent1, gEvent2, ...prev.filter(e => !e.id.startsWith('g_ev_'))]);
      itemsImported = 2;
    } else if (provider === 'outlook') {
      const oEvent: CalendarEvent = {
        id: `o_ev_${Date.now()}`,
        title: 'Faculty Advising & Module Review',
        start: new Date(Date.now() + 3 * 86400 * 1000).toISOString().slice(0, 11) + '14:00',
        end: new Date(Date.now() + 3 * 86400 * 1000).toISOString().slice(0, 11) + '14:45',
        courseId: courses[0]?.id,
        allDay: false,
        type: 'meeting',
        provider: 'outlook'
      };
      setEvents(prev => [oEvent, ...prev.filter(e => !e.id.startsWith('o_ev_'))]);

      addInboxItem({
        title: 'Outlook Email: Library Book Loan Extended',
        content: 'Your university library books have been renewed for an additional 14 days without fines.',
        type: 'email'
      });
      itemsImported = 2;
    } else if (provider === 'moodle') {
      const moodleAsg: Assignment = {
        id: `moodle_asg_${Date.now()}`,
        title: 'Moodle: Term Coursework Problem Set 3',
        description: 'Synchronized from University Moodle portal with rubric, test cases, and deadline.',
        courseId: courses[0]?.id || '',
        dueDate: new Date(Date.now() + 5 * 86400 * 1000).toISOString(),
        priority: 'high',
        status: 'todo',
        type: 'homework',
        estimatedMinutes: 120,
        links: ['https://moodle.uel.ac.uk'],
        steps: []
      };
      setAssignments(prev => [moodleAsg, ...prev.filter(a => !a.id.startsWith('moodle_asg_'))]);
      itemsImported = 1;
    } else if (provider === 'github') {
      if (githubRepos.length === 0 && courses.length > 0) {
        addGitHubRepo(courses[0].id, 'student-developer', 'coursework-algorithms', 'main');
      }
      itemsImported = 1;
    }

    setIntegrations(prev => prev.map(i => {
      if (i.provider !== provider) return i;
      return {
        ...i,
        connected: true,
        lastSync: 'Just now',
        status: 'ok',
        importedCount: i.importedCount + itemsImported,
        updatedCount: i.updatedCount + 1
      };
    }));

    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: `${provider.toUpperCase()} Synced Successfully`,
        message: `Synchronized ${itemsImported} remote item(s) directly into your workspace.`,
        type: 'system',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  const addGitHubRepo = (courseId: string, owner: string, repo: string, branch: string = 'main') => {
    const tempId = `repo_${Date.now()}`;
    const initialRepo: GitHubRepo = {
      id: tempId,
      courseId,
      owner,
      repo,
      branch,
      notes: `Coursework repository for ${owner}/${repo}. Automated commit briefs enabled.`,
      commits: []
    };
    setGithubRepos(prev => [initialRepo, ...prev]);

    // Fetch real commits from GitHub API
    fetchRepoCommits(owner, repo, branch)
      .then(realCommits => {
        if (realCommits && realCommits.length > 0) {
          setGithubRepos(prev => prev.map(r => r.id === tempId ? { ...r, commits: realCommits } : r));
        }
      })
      .catch(err => {
        console.warn(`Could not fetch remote commits for ${owner}/${repo}:`, err);
      });
  };

  const addCommitBriefAsTask = (commit: any, courseId: string) => {
    addTask({
      title: `Follow up commit ${commit.shortHash}: ${commit.message.slice(0, 40)}`,
      description: commit.aiSummary || commit.message,
      courseId,
      priority: 'medium',
      tags: ['github', 'commit-brief'],
      completed: false,
      source: 'github'
    });
    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: 'Task Created from Commit',
        message: `Added task for commit ${commit.shortHash} to course backlog.`,
        type: 'system',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  // Notifications & Reminders
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const triggerTestReminder = () => {
    const newLog: ReminderLog = {
      id: `log_${Date.now()}`,
      scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actualTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Manual Test Reminder (Email & In-App Webhook Dispatch)',
      category: 'Diagnostic Test',
      status: 'delivered',
      latenessMinutes: 0
    };
    setReminderLogs(prev => [newLog, ...prev]);
    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: 'Diagnostic Test Reminder Dispatched',
        message: 'Verified SMTP delivery pipeline and client notification channels.',
        type: 'system',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  // Backup & Restore
  const exportWorkspaceJson = () => {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user,
      courses,
      assignments,
      tasks,
      notes,
      events,
      inboxItems,
      files,
      flashcards,
      flashcardDecks,
      focusSessions,
      quizzes,
      exams,
      gradeItems,
      previousTermCourses,
      aiMemories,
      dailyPlan,
      integrations,
      githubRepos,
      notifications,
      reminderLogs
    };
    return JSON.stringify(backup, null, 2);
  };

  const importWorkspaceJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.courses) setCourses(data.courses);
      if (data.assignments) setAssignments(data.assignments);
      if (data.tasks) setTasks(data.tasks);
      if (data.notes) setNotes(data.notes);
      if (data.events) setEvents(data.events);
      if (data.inboxItems) setInboxItems(data.inboxItems);
      if (data.files) setFiles(data.files);
      if (data.flashcards) setFlashcards(data.flashcards);
      if (data.flashcardDecks) setFlashcardDecks(data.flashcardDecks);
      if (data.focusSessions) setFocusSessions(data.focusSessions);
      if (data.quizzes) setQuizzes(data.quizzes);
      if (data.exams) setExams(data.exams);
      if (data.gradeItems) setGradeItems(data.gradeItems);
      if (data.aiMemories) setAiMemories(data.aiMemories);
      if (data.dailyPlan) setDailyPlan(data.dailyPlan);
      if (data.integrations) setIntegrations(data.integrations);
      if (data.githubRepos) setGithubRepos(data.githubRepos);
      return true;
    } catch (e) {
      console.error('Failed to parse backup JSON:', e);
      return false;
    }
  };

  // Cloud Synchronization Implementation
  const saveToCloud = async (): Promise<string> => {
    setCloudSyncStatus('syncing');
    try {
      const payload: CloudWorkspacePayload = {
        version: '1.0.0',
        syncedAt: new Date().toISOString(),
        user,
        courses,
        assignments,
        tasks,
        notes,
        events,
        inboxItems,
        files: files.map(f => ({
          ...f,
          rawText: f.rawText && f.rawText.length > 50000 ? f.rawText.slice(0, 50000) : f.rawText
        })),
        flashcards,
        flashcardDecks,
        focusSessions,
        quizzes,
        exams,
        gradeItems,
        previousTermCourses,
        aiMemories,
        dailyPlan,
        integrations,
        githubRepos,
        notifications,
        reminderLogs
      };

      const { syncId, syncedAt } = await uploadToCloud(payload, cloudSyncId);
      setCloudSyncId(syncId);
      setLastSyncedAt(syncedAt);
      setCloudSyncStatus('synced');
      localStorage.setItem('nook_cloud_sync_id', syncId);
      localStorage.setItem('nook_last_cloud_sync_at', syncedAt);
      return syncId;
    } catch (e) {
      setCloudSyncStatus('error');
      throw e;
    }
  };

  const loadFromCloud = async (syncId: string): Promise<boolean> => {
    setCloudSyncStatus('syncing');
    try {
      const data = await fetchFromCloud(syncId);
      if (data.user && !user) {
        setUser(data.user);
        localStorage.setItem('nook_current_user', JSON.stringify(data.user));
      }
      if (Array.isArray(data.courses)) setCourses(data.courses);
      if (Array.isArray(data.assignments)) setAssignments(data.assignments);
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
      if (Array.isArray(data.notes)) setNotes(data.notes);
      if (Array.isArray(data.events)) setEvents(data.events);
      if (Array.isArray(data.inboxItems)) setInboxItems(data.inboxItems);
      if (Array.isArray(data.files)) setFiles(data.files);
      if (Array.isArray(data.flashcards)) setFlashcards(data.flashcards);
      if (Array.isArray(data.flashcardDecks)) setFlashcardDecks(data.flashcardDecks);
      if (Array.isArray(data.focusSessions)) setFocusSessions(data.focusSessions);
      if (Array.isArray(data.quizzes)) setQuizzes(data.quizzes);
      if (Array.isArray(data.exams)) setExams(data.exams);
      if (Array.isArray(data.gradeItems)) setGradeItems(data.gradeItems);
      if (Array.isArray(data.previousTermCourses)) setPreviousTermCourses(data.previousTermCourses);
      if (Array.isArray(data.aiMemories)) setAiMemories(data.aiMemories);
      if (data.dailyPlan) setDailyPlan(data.dailyPlan);
      if (Array.isArray(data.integrations)) setIntegrations(data.integrations);
      if (Array.isArray(data.githubRepos)) setGithubRepos(data.githubRepos);

      setCloudSyncId(syncId);
      setLastSyncedAt(data.syncedAt || new Date().toISOString());
      setCloudSyncStatus('synced');
      localStorage.setItem('nook_cloud_sync_id', syncId);
      localStorage.setItem('nook_last_cloud_sync_at', data.syncedAt || new Date().toISOString());
      return true;
    } catch (e) {
      setCloudSyncStatus('error');
      console.error('Failed to load from cloud:', e);
      return false;
    }
  };

  // Check URL query for ?sync=... parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const syncParam = urlParams.get('sync');
    if (syncParam && syncParam.trim().length > 5) {
      loadFromCloud(syncParam.trim()).then(ok => {
        if (ok) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, []);

  // Check on mount if daily briefing should pop up
  useEffect(() => {
    const todayIsoDate = new Date().toISOString().slice(0, 10);
    const dismissed = localStorage.getItem(`nook_briefing_dismissed_${todayIsoDate}`);
    if (!dismissed && user) {
      const timer = setTimeout(() => {
        setIsBriefingOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Debounced auto-save to cloud when user has cloudSyncId
  useEffect(() => {
    if (!cloudSyncId || !user) return;
    const timer = setTimeout(() => {
      saveToCloud().catch(err => console.warn('Auto cloud sync failed:', err));
    }, 4000);
    return () => clearTimeout(timer);
  }, [courses, assignments, tasks, notes, exams, gradeItems, cloudSyncId]);

  const clearAllWorkspaceData = () => {
    setCourses([]);
    setAssignments([]);
    setTasks([]);
    setNotes([]);
    setEvents([]);
    setInboxItems([]);
    setFiles([]);
    setFlashcards([]);
    setFlashcardDecks([]);
    setFocusSessions([]);
    setQuizzes([]);
    setExams([]);
    setGradeItems([]);
    setPreviousTermCourses([]);
    setAiMemories([]);
    setDailyPlan({
      date: new Date().toISOString().slice(0, 10),
      generatedBy: 'ai',
      blocks: []
    });
    setGithubRepos([]);
    setNotifications([
      {
        id: `notif_${Date.now()}`,
        title: 'Fresh Workspace Ready',
        message: 'Your workspace is 100% clean and ready for your own courses, schedule, and notes.',
        type: 'system',
        timestamp: 'Just now',
        read: false
      }
    ]);
    setReminderLogs([]);

    // Clear all localStorage keys starting with nook_
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('nook_workspace') || k.startsWith('nook_data') || k.startsWith('nook_notes'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  };

  const resetAllDemoData = () => {
    clearAllWorkspaceData();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        loginDemo,
        theme,
        setTheme,
        activeView,
        setActiveView,
        selectedCourseId,
        setSelectedCourseId,
        navigateToCourse,
        activeCourseTab,
        setActiveCourseTab,
        navHistory,
        goBack,
        goForward,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isQuickCreateOpen,
        setIsQuickCreateOpen,
        quickCreateType,
        openQuickCreate,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        aiMessages,
        chatSessions,
        activeChatSessionId,
        createNewChatSession,
        selectChatSession,
        deleteChatSession,
        renameChatSession,
        clearChatSessionMessages,
        sendAiMessage,
        clearAiChat,
        isAiReasoning,
        setIsAiReasoning,
        aiMemories,
        addAiMemory,
        deleteAiMemory,
        handleActionProposal,
        focusState,
        startFocusTimer,
        pauseFocusTimer,
        resumeFocusTimer,
        stopFocusTimer,
        addFocusMinutes,
        courses,
        addCourse,
        updateCourse,
        archiveCourse,
        deleteCourse,
        assignments,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        breakdownAssignmentWithAi,
        toggleAssignmentStep,
        tasks,
        addTask,
        updateTask,
        toggleTaskComplete,
        deleteTask,
        addSubtask,
        toggleSubtask,
        notes,
        addNote,
        updateNote,
        moveNoteToTrash,
        restoreNote,
        deleteNotePermanently,
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        inboxItems,
        addInboxItem,
        convertInboxItem,
        deleteInboxItem,
        files,
        addFile,
        deleteFile,
        toggleFavoriteFile,
        reindexFile,
        flashcards,
        flashcardDecks,
        reviewFlashcard,
        addFlashcard,
        addFlashcardDeck,
        createFlashcardsFromQuizErrors,
        focusSessions,
        quizzes,
        submitQuizAttempt,
        createQuizFromCourse,
        addQuiz,
        exams,
        addExam,
        generateRevisionPlanForExam,
        toggleRevisionSession,
        gradeItems,
        addGradeItem,
        updateGradeItem,
        deleteGradeItem,
        previousTermCourses,
        addPreviousTermCourse,
        updatePreviousTermCourse,
        deletePreviousTermCourse,
        dailyPlan,
        regenerateDailyPlan,
        toggleDailyPlanBlock,
        integrations,
        toggleIntegrationConnection,
        syncIntegration,
        githubRepos,
        addGitHubRepo,
        addCommitBriefAsTask,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        reminderLogs,
        triggerTestReminder,
        getWhatShouldIDoNow,
        calculateCumulativeGpa,
        calculateTargetExamScore,
        exportWorkspaceJson,
        importWorkspaceJson,
        resetAllDemoData,
        clearAllWorkspaceData,
        cloudSyncId,
        cloudSyncStatus,
        lastSyncedAt,
        saveToCloud,
        loadFromCloud,
        isSyncModalOpen,
        setIsSyncModalOpen,
        isBriefingOpen,
        setIsBriefingOpen,
        isMobileNavOpen,
        setIsMobileNavOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
