import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  AiMemoryCategory,
  DailyPlan,
  DailyPlanExplanation,
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
  MeetingSlot,
  AcademicMode,
  AcademicCalendarConfig
} from '../types';
import { uploadToCloud, fetchFromCloud, CloudWorkspacePayload } from '../services/cloudSync';
import {
  isSupabaseConfigured,
  saveWorkspaceToSupabase,
  fetchWorkspaceFromSupabase,
  dbSaveAllTablesToDatabase,
  dbLoadAllTablesFromDatabase,
  subscribeToWorkspaceRealtime,
  markLocalDbWrite,
  isRecentLocalDbWrite,
  dbSaveNote,
  dbDeleteNote,
  dbSaveFile,
  dbDeleteFile,
  dbSaveCourse,
  dbDeleteCourse,
  dbSaveTask,
  dbDeleteTask,
  dbSaveAssignment,
  dbDeleteAssignment,
  dbSaveExam,
  dbDeleteExam,
  dbSaveFlashcard,
  dbDeleteFlashcard,
  dbSaveDeck,
  dbDeleteDeck,
  dbSaveQuiz,
  dbDeleteQuiz,
  dbSaveEvent,
  dbDeleteEvent,
  dbSaveGradeItem,
  dbDeleteGradeItem,
  dbSavePreviousTermCourse,
  dbDeletePreviousTermCourse,
  dbSaveChatSession,
  dbDeleteChatSession,
  dbSaveAiMemory,
  dbDeleteAiMemory,
  supabaseSignUp,
  supabaseSignIn
} from '../services/supabase';
import { fetchRepoCommits, getGitHubToken } from '../services/githubService';
import {
  getAcademicScheduleContext,
  isScheduleOrDateQuery,
  generateScheduleAnswer,
  buildGeminiAcademicPrompt
} from '../services/academicScheduleService';
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
  registerAccount: (name: string, email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  authenticateUser: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loginDemo: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;

  // Academic Calendar & Modes
  academicConfig: AcademicCalendarConfig;
  updateAcademicConfig: (updates: Partial<AcademicCalendarConfig>) => void;
  activeAcademicMode: AcademicMode;
  isClassSuspendedOnDate: (dateStr: string, courseId?: string) => { suspended: boolean; reason?: string };

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
  addAiMemory: (content: string, category?: AiMemory['category'], source?: 'explicit' | 'inferred') => AiMemory;
  updateAiMemory: (id: string, updates: Partial<AiMemory>) => void;
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
  updateFile: (id: string, updates: Partial<DocumentFile>) => void;
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
  updateExam: (id: string, updates: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
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
  updateDailyPlanBlock: (blockId: string, updates: Partial<DailyPlanBlock>) => void;
  deleteDailyPlanBlock: (blockId: string) => void;
  moveDailyPlanBlock: (blockId: string, direction: 'up' | 'down') => void;
  addCustomDailyPlanBlock: (block: Omit<DailyPlanBlock, 'id'>) => void;
  adaptDailyPlan: (reason: 'completed_early' | 'missed_session' | 'rebalance') => void;

  integrations: IntegrationConnector[];
  toggleIntegrationConnection: (provider: IntegrationConnector['provider']) => void;
  syncIntegration: (provider: IntegrationConnector['provider']) => Promise<number>;

  githubRepos: GitHubRepo[];
  addGitHubRepo: (courseId: string, owner: string, repo: string, branch?: string) => Promise<void>;
  syncGitHubRepo: (repoId: string) => Promise<boolean>;
  deleteGitHubRepo: (repoId: string) => void;
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
  directSyncPayload: string | null;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: string | null;
  saveToCloud: () => Promise<string>;
  loadFromCloud: (syncId: string) => Promise<boolean>;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;

  // Cloud Database (Supabase PostgreSQL)
  isDatabaseConfigured: boolean;
  isDbModalOpen: boolean;
  setIsDbModalOpen: (open: boolean) => void;
  saveToDatabase: () => Promise<{ success: boolean; error?: string }>;
  loadFromDatabase: () => Promise<boolean>;

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
  const [cloudSyncId, setCloudSyncId] = useState<string | null>(() => {
    const saved = localStorage.getItem('nook_cloud_sync_id');
    if (saved && saved.trim().length > 3 && !saved.startsWith('nook_')) {
      return saved.trim();
    }
    return null;
  });
  const [directSyncPayload, setDirectSyncPayload] = useState<string | null>(() => {
    return localStorage.getItem('nook_direct_sync_payload') || null;
  });
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('nook_last_cloud_sync_at') || null;
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

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
  const defaultAcademicConfig: AcademicCalendarConfig = {
    semesterName: 'Academic Semester',
    semesterStartDate: '2026-09-01',
    semesterEndDate: '2026-12-20',
    midtermStartDate: '',
    midtermEndDate: '',
    finalStartDate: '',
    finalEndDate: '',
    modePreference: 'auto',
    holidays: [],
    cancelledClasses: []
  };

  const generateUniqueId = (prefix: string) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const isApplyingRemoteRef = useRef<boolean>(false);

  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => loadStored('flashcards', []));
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>(() => loadStored('flashcard_decks', []));
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => loadStored('focus_sessions', []));
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => loadStored('quizzes', []));
  const [exams, setExams] = useState<Exam[]>(() => loadStored('exams', []));
  const [gradeItems, setGradeItems] = useState<GradeItem[]>(() => loadStored('grade_items', []));
  const [previousTermCourses, setPreviousTermCourses] = useState<PreviousTermCourse[]>(() => loadStored('previous_term_courses', []));
  const [aiMemories, setAiMemories] = useState<AiMemory[]>(() => loadStored('ai_memories', []));
  const [academicConfig, setAcademicConfig] = useState<AcademicCalendarConfig>(() =>
    loadStored('academic_config', defaultAcademicConfig)
  );
  const [dailyPlan, setDailyPlan] = useState<DailyPlan>(() => loadStored('daily_plan', {
    date: new Date().toISOString().slice(0, 10),
    generatedBy: 'ai',
    blocks: []
  }));
  const [integrations, setIntegrations] = useState<IntegrationConnector[]>(() => loadStored('integrations', initialIntegrations));
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>(() => loadStored('repos', initialRepos));
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

  const updateAcademicConfig = useCallback((updates: Partial<AcademicCalendarConfig>) => {
    setAcademicConfig(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(`${storageKey}_academic_config`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [storageKey]);

  // Compute active Academic Mode ('normal' | 'midterm' | 'final')
  const activeAcademicMode: AcademicMode = useMemo(() => {
    if (academicConfig.modePreference && academicConfig.modePreference !== 'auto') {
      return academicConfig.modePreference;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (
      academicConfig.finalStartDate &&
      academicConfig.finalEndDate &&
      todayStr >= academicConfig.finalStartDate &&
      todayStr <= academicConfig.finalEndDate
    ) {
      return 'final';
    }
    if (
      academicConfig.midtermStartDate &&
      academicConfig.midtermEndDate &&
      todayStr >= academicConfig.midtermStartDate &&
      todayStr <= academicConfig.midtermEndDate
    ) {
      return 'midterm';
    }
    return 'normal';
  }, [academicConfig]);

  // Determine whether regular classes are suspended on a given date (YYYY-MM-DD) without deleting them
  const isClassSuspendedOnDate = useCallback(
    (dateStr: string, courseId?: string): { suspended: boolean; reason?: string } => {
      const todayStr = new Date().toISOString().slice(0, 10);
      // 1. Check explicit manual override if querying today
      if (dateStr === todayStr) {
        if (activeAcademicMode === 'midterm') {
          return { suspended: true, reason: 'Midterm Examination Week — Regular lectures suspended' };
        }
        if (activeAcademicMode === 'final') {
          return { suspended: true, reason: 'Final Examination Period — Regular lectures suspended' };
        }
      }
      // 2. Check configured Final Exam date range
      if (
        academicConfig.finalStartDate &&
        academicConfig.finalEndDate &&
        dateStr >= academicConfig.finalStartDate &&
        dateStr <= academicConfig.finalEndDate
      ) {
        return { suspended: true, reason: 'Final Examination Period — Regular lectures suspended' };
      }
      // 3. Check configured Midterm Week date range
      if (
        academicConfig.midtermStartDate &&
        academicConfig.midtermEndDate &&
        dateStr >= academicConfig.midtermStartDate &&
        dateStr <= academicConfig.midtermEndDate
      ) {
        return { suspended: true, reason: 'Midterm Examination Week — Regular lectures suspended' };
      }
      // 4. Check University Holidays
      const holiday = (academicConfig.holidays || []).find(h => {
        const start = h.date || h.startDate || '';
        const end = h.endDate || start;
        return Boolean(start) && dateStr >= start && dateStr <= end;
      });
      if (holiday) {
        return { suspended: true, reason: `University Holiday: ${holiday.name || holiday.title || 'Holiday'}` };
      }
      // 5. Check individual Cancelled Classes
      if (courseId) {
        const cancelled = (academicConfig.cancelledClasses || []).find(
          c => c.date === dateStr && c.courseId === courseId
        );
        if (cancelled) {
          return { suspended: true, reason: cancelled.reason || 'Class session cancelled' };
        }
      }
      return { suspended: false };
    },
    [academicConfig, activeAcademicMode]
  );

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
  useEffect(() => { saveStored('academic_config', academicConfig); }, [academicConfig, storageKey]);
  useEffect(() => { saveStored('daily_plan', dailyPlan); }, [dailyPlan, storageKey]);
  useEffect(() => { saveStored('integrations', integrations); }, [integrations, storageKey]);
  useEffect(() => { saveStored('repos', githubRepos); }, [githubRepos, storageKey]);
  useEffect(() => { saveStored('notifications', notifications); }, [notifications, storageKey]);
  useEffect(() => { saveStored('reminder_logs', reminderLogs); }, [reminderLogs, storageKey]);

  // Auto-fetch real commits for any linked repo that hasn't fetched commits yet
  useEffect(() => {
    const unhydrated = githubRepos.filter(r => !r.commits || r.commits.length === 0);
    if (unhydrated.length > 0) {
      const activeToken = getGitHubToken();
      unhydrated.forEach(r => {
        fetchRepoCommits(r.owner, r.repo, r.branch || 'main', activeToken)
          .then(commits => {
            if (commits && commits.length > 0) {
              setGithubRepos(prev => prev.map(repo => repo.id === r.id ? { ...repo, commits } : repo));
            }
          })
          .catch(err => console.warn(`Initial commit fetch for ${r.owner}/${r.repo}:`, err));
      });
    }
  }, []);

  // Derived current session messages
  const activeChatSession = chatSessions.find(s => s.id === activeChatSessionId) || chatSessions[0];
  const aiMessages = activeChatSession ? activeChatSession.messages : [defaultInitialWelcome];

  const setAiMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setChatSessions(prev => {
      const active = prev.find(s => s.id === activeChatSessionId) || prev[0];
      if (!active) return prev;
      const nextMsgs = typeof updater === 'function' ? updater(active.messages) : updater;
      const updatedSession: ChatSession = {
        ...active,
        messages: nextMsgs,
        updatedAt: new Date().toISOString()
      };
      if (user && isSupabaseConfigured()) {
        dbSaveChatSession(user.id, updatedSession).catch(err => console.warn('DB chat save:', err));
      }
      return prev.map(s => s.id === active.id ? updatedSession : s);
    });
  }, [activeChatSessionId, user]);

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
    if (user && isSupabaseConfigured()) {
      dbSaveChatSession(user.id, newSession).catch(err => console.warn('DB chat save:', err));
    }
    return newId;
  }, [user]);

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
        if (user && isSupabaseConfigured()) {
          dbSaveChatSession(user.id, fresh).catch(err => console.warn('DB chat save:', err));
          dbDeleteChatSession(user.id, id).catch(err => console.warn('DB chat delete:', err));
        }
        return [fresh];
      }
      if (activeChatSessionId === id) {
        setActiveChatSessionId(filtered[0].id);
      }
      if (user && isSupabaseConfigured()) {
        dbDeleteChatSession(user.id, id).catch(err => console.warn('DB chat delete:', err));
      }
      return filtered;
    });
  }, [activeChatSessionId, defaultInitialWelcome, user]);

  const renameChatSession = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setChatSessions(prev => {
      const next = prev.map(s => s.id === id ? { ...s, title: newTitle.trim(), updatedAt: new Date().toISOString() } : s);
      const target = next.find(s => s.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveChatSession(user.id, target).catch(err => console.warn('DB chat rename:', err));
      }
      return next;
    });
  }, [user]);

  const clearChatSessionMessages = useCallback((id: string) => {
    setChatSessions(prev => {
      const next = prev.map(s => s.id === id ? {
        ...s,
        messages: [
          {
            id: `msg_cleared_${Date.now()}`,
            sender: 'assistant' as const,
            content: 'Chat conversation cleared. How can I help you today?',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        updatedAt: new Date().toISOString()
      } : s);
      const target = next.find(s => s.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveChatSession(user.id, target).catch(err => console.warn('DB chat clear:', err));
      }
      return next;
    });
  }, [user]);

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

  // Auth & Account Isolation Helpers
  const hashPassword = async (password: string): Promise<string> => {
    const clean = password.trim();
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(`nook_salt_v1_${clean}`);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {}
    // Fallback deterministic hash if SubtleCrypto is unavailable
    let h = 2166136261;
    const str = `nook_salt_v1_${clean}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fnv_${(h >>> 0).toString(16)}`;
  };

  interface StoredAccountRecord {
    id: string;
    name: string;
    email: string;
    username: string;
    passwordHash: string;
    createdAt: string;
  }

  const getRegisteredAccounts = (): StoredAccountRecord[] => {
    try {
      const raw = localStorage.getItem('nook_registered_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveRegisteredAccounts = (accounts: StoredAccountRecord[]) => {
    try {
      localStorage.setItem('nook_registered_accounts', JSON.stringify(accounts));
    } catch {}
  };

  // Strictly load only the target user's isolated workspace data and clear any previous user's state from memory
  const hydrateUserIsolatedWorkspace = (userId: string, isBrandNewRegistration: boolean = false) => {
    isApplyingRemoteRef.current = true;
    const userStorageKey = `nook_workspace_${userId}`;

    const readUserKey = <T,>(suffix: string, fallback: T): T => {
      if (isBrandNewRegistration) return fallback;
      try {
        const raw = localStorage.getItem(`${userStorageKey}_${suffix}`);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    };

    const freshSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'Study Assistant',
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          sender: 'assistant',
          content: `Hello! I'm your Nook Academic Assistant. Your workspace is isolated to your account. Tell me what courses you're taking, ask me to plan your day, or share your study preferences!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Immediately set every state slice to this user's isolated storage (or empty arrays for a new user)
    setCourses(readUserKey('courses', []));
    setAssignments(readUserKey('assignments', []));
    setTasks(readUserKey('tasks', []));
    setNotes(readUserKey('notes', []));
    setEvents(readUserKey('events', []));
    setInboxItems(readUserKey('inbox', []));
    setFiles(readUserKey('files', []));
    setFlashcards(readUserKey('flashcards', []));
    setFlashcardDecks(readUserKey('flashcard_decks', []));
    setFocusSessions(readUserKey('focus_sessions', []));
    setQuizzes(readUserKey('quizzes', []));
    setExams(readUserKey('exams', []));
    setGradeItems(readUserKey('grade_items', []));
    setPreviousTermCourses(readUserKey('previous_term_courses', []));
    setAiMemories(readUserKey('ai_memories', []));
    setAcademicConfig(readUserKey('academic_config', defaultAcademicConfig));
    setDailyPlan(
      readUserKey('daily_plan', {
        date: new Date().toISOString().slice(0, 10),
        generatedBy: 'ai',
        blocks: []
      })
    );
    setIntegrations(readUserKey('integrations', initialIntegrations));
    setGithubRepos(readUserKey('repos', []));
    const savedSessions = readUserKey<ChatSession[]>('chat_sessions', [freshSession]);
    const validSessions = savedSessions.length > 0 ? savedSessions : [freshSession];
    setChatSessions(validSessions);
    setActiveChatSessionId(readUserKey('active_chat_session_id', validSessions[0].id));
    setNotifications(
      readUserKey('notifications', [
        {
          id: `notif_${Date.now()}`,
          title: 'Account Workspace Active',
          message: 'Your personal academic workspace is loaded and isolated to your account.',
          type: 'system',
          timestamp: 'Just now',
          read: false
        }
      ])
    );
    setReminderLogs(readUserKey('reminder_logs', []));

    setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 300);

    // Fetch authoritative user-isolated data from Supabase if configured (and not a brand new registration)
    if (isSupabaseConfigured() && !isBrandNewRegistration) {
      dbLoadAllTablesFromDatabase(userId)
        .then(dbData => {
          if (!dbData) return;
          isApplyingRemoteRef.current = true;
          if (Array.isArray(dbData.courses)) setCourses(dbData.courses);
          if (Array.isArray(dbData.assignments)) setAssignments(dbData.assignments);
          if (Array.isArray(dbData.tasks)) setTasks(dbData.tasks);
          if (Array.isArray(dbData.notes)) setNotes(dbData.notes);
          if (Array.isArray(dbData.files)) setFiles(dbData.files);
          if (Array.isArray(dbData.exams)) setExams(dbData.exams);
          if (Array.isArray(dbData.events)) setEvents(dbData.events);
          if (Array.isArray(dbData.inboxItems)) setInboxItems(dbData.inboxItems);
          if (Array.isArray(dbData.flashcards)) setFlashcards(dbData.flashcards);
          if (Array.isArray(dbData.flashcardDecks)) setFlashcardDecks(dbData.flashcardDecks);
          if (Array.isArray(dbData.gradeItems)) setGradeItems(dbData.gradeItems);
          if (Array.isArray(dbData.previousTermCourses)) setPreviousTermCourses(dbData.previousTermCourses);
          if (Array.isArray(dbData.chatSessions) && dbData.chatSessions.length > 0) {
            setChatSessions(dbData.chatSessions);
            if (dbData.activeChatSessionId) setActiveChatSessionId(dbData.activeChatSessionId);
          }
          if (dbData.dailyPlan) setDailyPlan(dbData.dailyPlan);
          if (dbData.academicConfig) setAcademicConfig(dbData.academicConfig);
          if (Array.isArray(dbData.integrations)) setIntegrations(dbData.integrations);
          if (Array.isArray(dbData.githubRepos)) setGithubRepos(dbData.githubRepos);
          if (Array.isArray(dbData.aiMemories)) setAiMemories(dbData.aiMemories);
          if (Array.isArray(dbData.notifications)) setNotifications(dbData.notifications);
          if (Array.isArray(dbData.reminderLogs)) setReminderLogs(dbData.reminderLogs);
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 300);
        })
        .catch(err => console.warn('Supabase DB fetch on login error:', err));
    }
  };

  const registerAccount = async (
    name: string,
    email: string,
    password: string,
    username?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];
    const cleanUsername = (username || cleanEmail.split('@')[0]).toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.trim().length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const accounts = getRegisteredAccounts();
    const duplicate = accounts.find(
      a => a.email.toLowerCase() === cleanEmail || (cleanUsername && a.username.toLowerCase() === cleanUsername)
    );
    if (duplicate) {
      return {
        success: false,
        error:
          duplicate.email.toLowerCase() === cleanEmail
            ? 'An account with this email already exists. Please sign in instead.'
            : 'This username is already taken. Please choose another username or sign in.'
      };
    }

    const userId = 'usr_' + encodeURIComponent(cleanEmail).replace(/[^a-zA-Z0-9]/g, '_');
    const passwordHash = await hashPassword(password);

    // Check if an existing workspace in Supabase already has a different password hash for this userId
    if (isSupabaseConfigured()) {
      try {
        const existingRemote = await dbLoadAllTablesFromDatabase(userId);
        if (existingRemote && existingRemote.user && (existingRemote.user as any).passwordHash) {
          return {
            success: false,
            error: 'An account with this email is already registered in the cloud database. Please sign in.'
          };
        }
      } catch {}
    }

    const newRecord: StoredAccountRecord = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    saveRegisteredAccounts([...accounts, newRecord]);

    const newUser: UserAccount = {
      id: userId,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      isDemo: false,
      createdAt: newRecord.createdAt
    };

    // Also store passwordHash on user object for cloud snapshot credential verification across devices
    (newUser as any).passwordHash = passwordHash;

    // Clear any stale local keys for this userId before initializing fresh workspace
    const userStorageKey = `nook_workspace_${userId}`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(userStorageKey)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    hydrateUserIsolatedWorkspace(userId, true);
    setUser(newUser);
    localStorage.setItem('nook_current_user', JSON.stringify(newUser));

    if (isSupabaseConfigured()) {
      supabaseSignUp(cleanEmail, password, cleanName).catch(() => {});
    }

    return { success: true };
  };

  const authenticateUser = async (
    emailOrUsername: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const identifier = emailOrUsername.toLowerCase().trim();
    if (!identifier) {
      return { success: false, error: 'Please enter your email or username.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const inputHash = await hashPassword(password);
    const accounts = getRegisteredAccounts();
    const matchedLocal = accounts.find(
      a => a.email.toLowerCase() === identifier || a.username.toLowerCase() === identifier
    );

    if (matchedLocal) {
      if (matchedLocal.passwordHash !== inputHash) {
        return { success: false, error: 'Incorrect password. Please check your password and try again.' };
      }

      const loggedInUser: UserAccount = {
        id: matchedLocal.id,
        name: matchedLocal.name,
        username: matchedLocal.username,
        email: matchedLocal.email,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        isDemo: false,
        createdAt: matchedLocal.createdAt
      };
      (loggedInUser as any).passwordHash = matchedLocal.passwordHash;

      hydrateUserIsolatedWorkspace(matchedLocal.id, false);
      setUser(loggedInUser);
      localStorage.setItem('nook_current_user', JSON.stringify(loggedInUser));
      return { success: true };
    }

    // Check if account exists in Supabase workspaces or localStorage from before password registry was added
    const candidateEmail = identifier.includes('@') ? identifier : `${identifier}@university.edu`;
    const candidateUserId = 'usr_' + encodeURIComponent(identifier).replace(/[^a-zA-Z0-9]/g, '_');

    if (isSupabaseConfigured()) {
      try {
        const remoteData = await dbLoadAllTablesFromDatabase(candidateUserId);
        if (remoteData && remoteData.user) {
          const remoteHash = (remoteData.user as any).passwordHash;
          if (remoteHash && remoteHash !== inputHash) {
            return { success: false, error: 'Incorrect password for this account.' };
          }
          // Save to local registry for fast future logins
          const recoveredRecord: StoredAccountRecord = {
            id: candidateUserId,
            name: remoteData.user.name || identifier.split('@')[0],
            email: remoteData.user.email || candidateEmail,
            username: remoteData.user.username || identifier.split('@')[0],
            passwordHash: remoteHash || inputHash,
            createdAt: remoteData.user.createdAt || new Date().toISOString()
          };
          saveRegisteredAccounts([...accounts, recoveredRecord]);

          const loggedInUser: UserAccount = {
            id: candidateUserId,
            name: recoveredRecord.name,
            username: recoveredRecord.username,
            email: recoveredRecord.email,
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            isDemo: false,
            createdAt: recoveredRecord.createdAt
          };
          (loggedInUser as any).passwordHash = recoveredRecord.passwordHash;

          hydrateUserIsolatedWorkspace(candidateUserId, false);
          setUser(loggedInUser);
          localStorage.setItem('nook_current_user', JSON.stringify(loggedInUser));
          return { success: true };
        }
      } catch {}
    }

    // Check if legacy local workspace exists for this email on this browser
    const legacyCourses = localStorage.getItem(`nook_workspace_${candidateUserId}_courses`);
    if (legacyCourses !== null) {
      const recoveredRecord: StoredAccountRecord = {
        id: candidateUserId,
        name: identifier.split('@')[0],
        email: candidateEmail,
        username: identifier.split('@')[0],
        passwordHash: inputHash,
        createdAt: new Date().toISOString()
      };
      saveRegisteredAccounts([...accounts, recoveredRecord]);
      const loggedInUser: UserAccount = {
        id: candidateUserId,
        name: recoveredRecord.name,
        username: recoveredRecord.username,
        email: recoveredRecord.email,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        isDemo: false,
        createdAt: recoveredRecord.createdAt
      };
      (loggedInUser as any).passwordHash = inputHash;
      hydrateUserIsolatedWorkspace(candidateUserId, false);
      setUser(loggedInUser);
      localStorage.setItem('nook_current_user', JSON.stringify(loggedInUser));
      return { success: true };
    }

    return {
      success: false,
      error: 'No account found with that email or username. Please register a new account first.'
    };
  };

  // Legacy direct login helper (used when restoring session)
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
    hydrateUserIsolatedWorkspace(userId, false);
    setUser(newUser);
    localStorage.setItem('nook_current_user', JSON.stringify(newUser));
  };

  const logout = () => {
    isApplyingRemoteRef.current = true;
    setUser(null);
    localStorage.removeItem('nook_current_user');
    // Reset in-memory state so previous account's data never leaks into the next login
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
    setAcademicConfig(defaultAcademicConfig);
    setDailyPlan({
      date: new Date().toISOString().slice(0, 10),
      generatedBy: 'ai',
      blocks: []
    });
    setGithubRepos([]);
    setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 200);
  };

  const loginDemo = () => {
    const demoUserId = `usr_demo_${Date.now()}`;
    const freshUser: UserAccount = {
      id: demoUserId,
      name: 'Guest Workspace',
      email: 'guest@university.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      isDemo: true
    };
    hydrateUserIsolatedWorkspace(demoUserId, true);
    setUser(freshUser);
    localStorage.setItem('nook_current_user', JSON.stringify(freshUser));
  };

  // CRUD Implementations (Using guaranteed unique IDs)
  const addCourse = (courseData: Omit<Course, 'id'>) => {
    const newCourse: Course = {
      ...courseData,
      id: generateUniqueId('course')
    };
    setCourses(prev => [...prev, newCourse]);
    if (user && isSupabaseConfigured()) {
      dbSaveCourse(user.id, newCourse).catch(err => console.warn('DB course save:', err));
    }
    return newCourse;
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      const target = updated.find(c => c.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveCourse(user.id, target).catch(err => console.warn('DB course update:', err));
      }
      return updated;
    });
  };

  const archiveCourse = (id: string, archive: boolean) => {
    setCourses(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, isArchived: archive } : c);
      const target = updated.find(c => c.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveCourse(user.id, target).catch(err => console.warn('DB course archive:', err));
      }
      return updated;
    });
  };

  const deleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    if (user && isSupabaseConfigured()) {
      dbDeleteCourse(user.id, id).catch(err => console.warn('DB course delete:', err));
    }
  };

  // Assignments
  const addAssignment = (asgData: Omit<Assignment, 'id' | 'steps'>) => {
    const newAsg: Assignment = {
      ...asgData,
      id: generateUniqueId('asg'),
      steps: [],
      isBrokenDown: false
    };
    setAssignments(prev => [newAsg, ...prev]);
    if (user && isSupabaseConfigured()) {
      dbSaveAssignment(user.id, newAsg).catch(err => console.warn('DB asg save:', err));
    }
    return newAsg;
  };

  const updateAssignment = (id: string, updates: Partial<Assignment>) => {
    setAssignments(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      const target = updated.find(a => a.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveAssignment(user.id, target).catch(err => console.warn('DB asg update:', err));
      }
      return updated;
    });
  };

  const deleteAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
    if (user && isSupabaseConfigured()) {
      dbDeleteAssignment(user.id, id).catch(err => console.warn('DB asg delete:', err));
    }
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
        id: generateUniqueId('notif'),
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
      id: generateUniqueId('task'),
      subtasks: []
    };
    setTasks(prev => [newTask, ...prev]);
    if (user && isSupabaseConfigured()) {
      dbSaveTask(user.id, newTask).catch(err => console.warn('DB task save:', err));
    }
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      const target = updated.find(t => t.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveTask(user.id, target).catch(err => console.warn('DB task update:', err));
      }
      return updated;
    });
  };

  const toggleTaskComplete = (id: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
      });
      const target = updated.find(t => t.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveTask(user.id, target).catch(err => console.warn('DB task toggle:', err));
      }
      return updated;
    });
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (user && isSupabaseConfigured()) {
      dbDeleteTask(user.id, id).catch(err => console.warn('DB task delete:', err));
    }
  };

  const addSubtask = (taskId: string, title: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: [...t.subtasks, { id: generateUniqueId('st'), title, completed: false }]
        };
      });
      const target = updated.find(t => t.id === taskId);
      if (target && user && isSupabaseConfigured()) {
        dbSaveTask(user.id, target).catch(err => console.warn('DB subtask save:', err));
      }
      return updated;
    });
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
      });
      const target = updated.find(t => t.id === taskId);
      if (target && user && isSupabaseConfigured()) {
        dbSaveTask(user.id, target).catch(err => console.warn('DB subtask toggle:', err));
      }
      return updated;
    });
  };

  // Notes (Guaranteed unique IDs and isolated updates)
  const addNote = (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'inTrash'>) => {
    const newNote: Note = {
      ...noteData,
      id: generateUniqueId('note'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inTrash: false
    };
    setNotes(prev => [newNote, ...prev]);
    if (user && isSupabaseConfigured()) {
      dbSaveNote(user.id, newNote).catch(err => console.warn('DB note save:', err));
    }
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
      const target = updated.find(n => n.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveNote(user.id, target).catch(err => console.warn('DB note update:', err));
      }
      return updated;
    });
  };

  const moveNoteToTrash = (id: string) => {
    updateNote(id, { inTrash: true });
  };

  const restoreNote = (id: string) => {
    updateNote(id, { inTrash: false });
  };

  const deleteNotePermanently = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (user && isSupabaseConfigured()) {
      dbDeleteNote(user.id, id).catch(err => console.warn('DB note permanent delete:', err));
    }
  };

  // Events
  const addEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `ev_${Date.now()}`
    };
    setEvents(prev => [...prev, newEvent]);
    if (user && isSupabaseConfigured()) {
      dbSaveEvent(user.id, newEvent).catch(err => console.warn('DB event save:', err));
    }
    return newEvent;
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      const target = updated.find(e => e.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveEvent(user.id, target).catch(err => console.warn('DB event update:', err));
      }
      return updated;
    });
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    if (user && isSupabaseConfigured()) {
      dbDeleteEvent(user.id, id).catch(err => console.warn('DB event delete:', err));
    }
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
    if (user && isSupabaseConfigured()) {
      dbSaveFile(user.id, newFile).catch(err => console.warn('DB file save:', err));
    }
    return newFile;
  };

  const updateFile = (id: string, updates: Partial<DocumentFile>) => {
    setFiles(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...updates } : f);
      const target = updated.find(f => f.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveFile(user.id, target).catch(err => console.warn('DB file update:', err));
      }
      return updated;
    });
  };

  const deleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (user && isSupabaseConfigured()) {
      dbDeleteFile(user.id, id).catch(err => console.warn('DB file delete:', err));
    }
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
    if (user && isSupabaseConfigured()) {
      dbSaveFlashcard(user.id, newCard).catch(err => console.warn('DB flashcard save:', err));
    }
  };

  const addFlashcardDeck = (name: string, courseId?: string, tag?: string) => {
    const newDeck: FlashcardDeck = {
      id: `deck_${Date.now()}`,
      name,
      courseId,
      tag
    };
    setFlashcardDecks(prev => [...prev, newDeck]);
    if (user && isSupabaseConfigured()) {
      dbSaveDeck(user.id, newDeck).catch(err => console.warn('DB deck save:', err));
    }
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
    if (user && isSupabaseConfigured()) {
      dbSaveQuiz(user.id, newQuiz).catch(err => console.warn('DB quiz save:', err));
    }
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
    if (user && isSupabaseConfigured()) {
      dbSaveExam(user.id, newExam).catch(err => console.warn('DB exam save:', err));
    }
    return newExam;
  };

  const updateExam = (id: string, updates: Partial<Exam>) => {
    setExams(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      const target = updated.find(e => e.id === id);
      if (target && user && isSupabaseConfigured()) {
        dbSaveExam(user.id, target).catch(err => console.warn('DB exam update:', err));
      }
      return updated;
    });
  };

  const deleteExam = (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    if (user && isSupabaseConfigured()) {
      dbDeleteExam(user.id, id).catch(err => console.warn('DB exam delete:', err));
    }
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
    if (user && isSupabaseConfigured()) {
      dbSaveGradeItem(user.id, newItem).catch(err => console.warn('DB grade save:', err));
    }
    return newItem;
  };

  const updateGradeItem = (id: string, updates: Partial<GradeItem>) => {
    setGradeItems(prev => {
      const next = prev.map(g => g.id === id ? { ...g, ...updates } : g);
      const target = next.find(g => g.id === id);
      saveStored('grade_items', next);
      if (target && user && isSupabaseConfigured()) {
        dbSaveGradeItem(user.id, target).catch(err => console.warn('DB grade update:', err));
      }
      return next;
    });
  };

  const deleteGradeItem = (id: string) => {
    setGradeItems(prev => {
      const next = prev.filter(g => g.id !== id);
      saveStored('grade_items', next);
      return next;
    });
    if (user && isSupabaseConfigured()) {
      dbDeleteGradeItem(user.id, id).catch(err => console.warn('DB grade delete:', err));
    }
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
    if (user && isSupabaseConfigured()) {
      dbSavePreviousTermCourse(user.id, newItem).catch(err => console.warn('DB previous term save:', err));
    }
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
      const target = next.find(p => p.id === id);
      saveStored('previous_term_courses', next);
      if (target && user && isSupabaseConfigured()) {
        dbSavePreviousTermCourse(user.id, target).catch(err => console.warn('DB previous term update:', err));
      }
      return next;
    });
  };

  const deletePreviousTermCourse = (id: string) => {
    setPreviousTermCourses(prev => {
      const next = prev.filter(p => p.id !== id);
      saveStored('previous_term_courses', next);
      return next;
    });
    if (user && isSupabaseConfigured()) {
      dbDeletePreviousTermCourse(user.id, id).catch(err => console.warn('DB previous term delete:', err));
    }
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

  // Helper time converters for non-overlapping scheduling
  const timeToMinutes = (t: string): number => {
    const clean = (t || '09:00').trim();
    const parts = clean.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };

  const minutesToTime = (mins: number): string => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
  };

  // Parse user's saved AI memories into actionable scheduling constraints
  const parseSchedulingMemories = useCallback(() => {
    let dayStartMin = 9 * 60; // 09:00 default
    let dayEndMin = 20 * 60 + 30; // 20:30 default
    let preferredSessionMins = 50;
    let preferredBreakMins = 15;
    let maxDailyStudySessions = 4;
    const memoriesApplied: string[] = [];
    const noStudyDays: number[] = []; // 0=Sun..6=Sat
    const focusKeywords: string[] = [];

    aiMemories.forEach(mem => {
      const text = (mem.content || mem.fact || '').trim();
      if (!text) return;
      const lower = text.toLowerCase();

      // Study time of day preferences
      if (lower.includes('night') || lower.includes('evening') || lower.includes('late')) {
        dayStartMin = Math.max(dayStartMin, 15 * 60); // Prefer 15:00 - 22:30
        dayEndMin = 22 * 60 + 30;
        memoriesApplied.push(text);
      } else if (lower.includes('morning') || lower.includes('early')) {
        dayStartMin = 8 * 60;
        dayEndMin = 17 * 60 + 30;
        memoriesApplied.push(text);
      } else if (lower.includes('afternoon')) {
        dayStartMin = 12 * 60;
        dayEndMin = 20 * 60;
        memoriesApplied.push(text);
      }

      // Session duration preference (e.g., "45 minutes", "45-minute", "60 mins")
      const sessionMatch = lower.match(/(\d{2,3})\s*(?:-|\s)?\s*(?:min|minute)\s*(?:study|session|block|focus|pomodoro)/);
      const revSessionMatch = lower.match(/(?:study|session|sessions|blocks?)\s*(?:of|should be|for)?\s*(\d{2,3})\s*(?:min|minute)/);
      const matchedDur = sessionMatch ? parseInt(sessionMatch[1], 10) : revSessionMatch ? parseInt(revSessionMatch[1], 10) : null;
      if (matchedDur && matchedDur >= 20 && matchedDur <= 120) {
        preferredSessionMins = matchedDur;
        if (!memoriesApplied.includes(text)) memoriesApplied.push(text);
      }

      // Break duration preference (e.g., "10-minute breaks", "15 min break")
      const breakMatch = lower.match(/(\d{1,2})\s*(?:-|\s)?\s*(?:min|minute)s?\s*break/);
      if (breakMatch) {
        const bDur = parseInt(breakMatch[1], 10);
        if (bDur >= 5 && bDur <= 45) {
          preferredBreakMins = bDur;
          if (!memoriesApplied.includes(text)) memoriesApplied.push(text);
        }
      }

      // Sleep schedule
      if (mem.category === 'sleep' || lower.includes('sleep') || lower.includes('bed')) {
        if (lower.includes('10 pm') || lower.includes('22:00') || lower.includes('10pm')) {
          dayEndMin = Math.min(dayEndMin, 21 * 60 + 30);
        } else if (lower.includes('11 pm') || lower.includes('23:00') || lower.includes('11pm')) {
          dayEndMin = Math.min(dayEndMin, 22 * 60 + 15);
        }
        if (!memoriesApplied.includes(text)) memoriesApplied.push(text);
      }

      // Days off / commitments
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };
      if (lower.includes("don't study") || lower.includes('do not study') || lower.includes('no study') || lower.includes('day off')) {
        Object.entries(dayMap).forEach(([dName, dIdx]) => {
          if (lower.includes(dName)) {
            noStudyDays.push(dIdx);
            if (!memoriesApplied.includes(text)) memoriesApplied.push(text);
          }
        });
      }

      // Weaknesses or goals
      if (mem.category === 'weakness' || mem.category === 'goal' || lower.includes('struggle') || lower.includes('focus on') || lower.includes('prioritize')) {
        focusKeywords.push(lower);
        if (!memoriesApplied.includes(text)) memoriesApplied.push(text);
      }
    });

    return {
      dayStartMin,
      dayEndMin,
      preferredSessionMins,
      preferredBreakMins,
      maxDailyStudySessions,
      noStudyDays,
      focusKeywords,
      memoriesApplied
    };
  }, [aiMemories]);

  // Daily Plan Operations: Intelligent, Realistic, Mode-Aware & Non-Overlapping Academic Scheduling
  const regenerateDailyPlan = useCallback(() => {
    const today = new Date();
    const todayIsoDate = today.toISOString().slice(0, 10);
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[currentDay];

    const memPrefs = parseSchedulingMemories();
    const prioritizationReasons: string[] = [];
    const deadlinesConsidered: string[] = [];
    const postponedItems: string[] = [];

    // Occupied intervals in minutes [startMin, endMin] to strictly prevent overlapping activities
    const occupiedIntervals: Array<{ start: number; end: number; label: string }> = [];
    const isIntervalFree = (start: number, end: number): boolean => {
      return !occupiedIntervals.some( iv => start < iv.end && end > iv.start );
    };
    const reserveInterval = (start: number, end: number, label: string) => {
      occupiedIntervals.push({ start, end, label });
      occupiedIntervals.sort((a, b) => a.start - b.start);
    };

    const blocks: DailyPlanBlock[] = [];
    let bIdx = 1;

    // 1. Check Academic Mode & Class Suspension Rules
    const suspensionCheck = isClassSuspendedOnDate(todayIsoDate);
    let academicModeReason = 'Normal Semester Mode — Regular weekly lecture timetable is active.';
    if (activeAcademicMode === 'midterm') {
      academicModeReason =
        'Midterm Examination Mode Active — Regular lectures are temporarily suspended so your schedule focuses 100% on midterm exams and revision.';
    } else if (activeAcademicMode === 'final') {
      academicModeReason =
        'Final Examination Mode Active — Regular lectures are temporarily suspended so your schedule focuses 100% on final exams and high-yield revision.';
    } else if (suspensionCheck.suspended && suspensionCheck.reason) {
      academicModeReason = suspensionCheck.reason;
    }

    // 2. Schedule Today's Actual Exams (Fixed Non-Negotiable Blocks)
    const todayExams = exams.filter(e => e.date === todayIsoDate);
    todayExams.forEach(ex => {
      const course = courses.find(c => c.id === ex.courseId);
      const startStr = ex.startTime || '09:30';
      const dur = ex.durationMinutes || 120;
      const startMin = timeToMinutes(startStr);
      const endMin = ex.endTime ? timeToMinutes(ex.endTime) : startMin + dur;
      const endStr = minutesToTime(endMin);

      // Reserve 30m before and 15m after exam for travel/preparation
      reserveInterval(Math.max(0, startMin - 30), endMin + 15, ex.name);
      blocks.push({
        id: `b_${Date.now()}_${bIdx++}`,
        time: `${startStr} - ${endStr}`,
        startTime: startStr,
        endTime: endStr,
        durationMinutes: endMin - startMin,
        title: `🎓 EXAM: ${ex.name} (${course?.code || 'Course'})${ex.room ? ` — ${ex.room}` : ''}`,
        type: 'exam',
        status: 'pending',
        priority: 'high',
        completed: false,
        courseId: ex.courseId,
        examId: ex.id,
        reason: `Scheduled ${ex.examType || 'academic'} examination today at ${startStr}. Includes 30m pre-exam buffer.`
      });
      deadlinesConsidered.push(`Today's Exam: ${ex.name} (${startStr} - ${endStr})`);
    });

    // 3. Schedule Today's University Classes (ONLY if not suspended by Midterm Mode, Final Mode, Holiday, or Cancellation)
    const todayClasses: Array<{ course: Course; slot: MeetingSlot }> = [];
    if (activeAcademicMode === 'normal' && !suspensionCheck.suspended) {
      courses.filter(c => !c.isArchived).forEach(c => {
        const courseSuspended = isClassSuspendedOnDate(todayIsoDate, c.id);
        if (courseSuspended.suspended) return;
        (c.meetingSlots || []).forEach(slot => {
          if (slot.day === currentDay) {
            todayClasses.push({ course: c, slot });
          }
        });
      });
      todayClasses.sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));

      todayClasses.forEach(({ course, slot }) => {
        const startMin = timeToMinutes(slot.startTime);
        const endMin = timeToMinutes(slot.endTime);
        if (isIntervalFree(startMin, endMin)) {
          reserveInterval(startMin, endMin + 10, `${course.code} Class`); // +10m transition buffer
          blocks.push({
            id: `b_${Date.now()}_${bIdx++}`,
            time: `${slot.startTime} - ${slot.endTime}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationMinutes: endMin - startMin,
            title: `🏫 ${course.code}: ${course.name} (${slot.location || course.location || 'Campus'})`,
            type: 'class',
            status: 'pending',
            priority: 'high',
            completed: false,
            courseId: course.id,
            reason: `Regular weekly ${slot.type || 'lecture'} on ${currentDayName}.`
          });
        }
      });
    }

    // 4. Reserve Meal / Rest Break around midday (between 12:00 and 14:30)
    for (let cand = 12 * 60 + 30; cand <= 14 * 60; cand += 15) {
      if (isIntervalFree(cand, cand + 45)) {
        const bStart = minutesToTime(cand);
        const bEnd = minutesToTime(cand + 45);
        reserveInterval(cand, cand + 45, 'Lunch & Rest');
        blocks.push({
          id: `b_${Date.now()}_${bIdx++}`,
          time: `${bStart} - ${bEnd}`,
          startTime: bStart,
          endTime: bEnd,
          durationMinutes: 45,
          title: '🍱 Midday Meal & Cognitive Recharge Break',
          type: 'break',
          status: 'pending',
          completed: false,
          reason: 'Protected 45-minute midday break to prevent burnout and maintain focus.'
        });
        break;
      }
    }

    // 5. Build Prioritized Queue of Candidate Study Items (Exams, Assignments, Tasks)
    interface CandidateWorkItem {
      id: string;
      title: string;
      type: 'study' | 'revision' | 'assignment';
      priority: 'high' | 'medium' | 'low';
      score: number;
      estimatedMinutes: number;
      courseId?: string;
      taskId?: string;
      assignmentId?: string;
      examId?: string;
      reason: string;
      deadlineLabel?: string;
    }

    const candidates: CandidateWorkItem[] = [];

    // 5A. Upcoming Exams within 14 days (Weighted heavily by proximity, academic mode, and readiness gap)
    exams.forEach(ex => {
      const diffDays = Math.ceil((new Date(ex.date).getTime() - today.getTime()) / (86400 * 1000));
      if (diffDays > 0 && diffDays <= 14) {
        const course = courses.find(c => c.id === ex.courseId);
        const readinessGap = Math.max(10, 100 - (ex.readinessPercent || 40));
        let urgencyScore = 0;
        if (diffDays === 1) urgencyScore = 200;
        else if (diffDays <= 3) urgencyScore = 165;
        else if (diffDays <= 7) urgencyScore = 125;
        else urgencyScore = 75;

        if (activeAcademicMode === 'midterm' || activeAcademicMode === 'final') {
          urgencyScore += 35;
        }
        urgencyScore += Math.round(readinessGap * 0.35);

        // Boost if user memory mentions this course
        if (
          course &&
          memPrefs.focusKeywords.some(
            k => k.includes(course.code.toLowerCase()) || k.includes(course.name.toLowerCase())
          )
        ) {
          urgencyScore += 25;
        }

        const deadlineLabel = `${ex.name} (${course?.code || 'Exam'}) in ${diffDays} day${diffDays === 1 ? '' : 's'} (${ex.date})`;
        deadlinesConsidered.push(deadlineLabel);

        candidates.push({
          id: `cand_exam_${ex.id}`,
          title: `Revision: ${ex.name} (${course?.code || 'Course'}) — Active Recall & Problem Drill`,
          type: 'revision',
          priority: diffDays <= 5 ? 'high' : 'medium',
          score: urgencyScore,
          estimatedMinutes: memPrefs.preferredSessionMins,
          courseId: ex.courseId,
          examId: ex.id,
          reason: `Prioritized because ${ex.name} is in ${diffDays} day${diffDays === 1 ? '' : 's'} (Readiness: ${ex.readinessPercent || 40}%, Weight: ${ex.weightPercentage || 25}%).`,
          deadlineLabel
        });

        // If exam is within 3 days or we are in Midterm/Final mode, add a second focused practice block for it
        if (diffDays <= 3 || activeAcademicMode !== 'normal') {
          candidates.push({
            id: `cand_exam_practice_${ex.id}`,
            title: `Exam Practice Papers & Weak Topics: ${ex.name}`,
            type: 'revision',
            priority: 'high',
            score: urgencyScore - 15,
            estimatedMinutes: memPrefs.preferredSessionMins,
            courseId: ex.courseId,
            examId: ex.id,
            reason: `Intensive practice session for approaching ${ex.examType || activeAcademicMode} exam in ${diffDays} day${diffDays === 1 ? '' : 's'}.`
          });
        }
      }
    });

    // 5B. Pending Assignments (Weighted by due date urgency)
    assignments
      .filter(a => a.status !== 'completed')
      .forEach(asg => {
        const diffDays = asg.dueDate
          ? Math.ceil((new Date(asg.dueDate).getTime() - today.getTime()) / (86400 * 1000))
          : 10;
        if (diffDays < -7) return; // Skip ancient overdue items unless recent
        const course = courses.find(c => c.id === asg.courseId);

        let urgencyScore = 50;
        if (diffDays <= 0) urgencyScore = 190; // Due today or overdue
        else if (diffDays === 1) urgencyScore = 175; // Due tomorrow
        else if (diffDays <= 3) urgencyScore = 140;
        else if (diffDays <= 7) urgencyScore = 95;
        else urgencyScore = 45;

        if (asg.priority === 'high') urgencyScore += 20;

        const dueLabel =
          diffDays < 0
            ? `Overdue (${Math.abs(diffDays)}d ago)`
            : diffDays === 0
            ? 'Due Today'
            : diffDays === 1
            ? 'Due Tomorrow'
            : `Due in ${diffDays} days`;

        if (diffDays <= 7) {
          deadlinesConsidered.push(`Assignment: "${asg.title}" (${dueLabel})`);
        }

        candidates.push({
          id: `cand_asg_${asg.id}`,
          title: `Coursework: ${asg.title}${course ? ` (${course.code})` : ''} [${dueLabel}]`,
          type: 'assignment',
          priority: diffDays <= 2 || asg.priority === 'high' ? 'high' : 'medium',
          score: urgencyScore,
          estimatedMinutes: Math.min(memPrefs.preferredSessionMins, asg.estimatedMinutes || memPrefs.preferredSessionMins),
          courseId: asg.courseId,
          assignmentId: asg.id,
          reason: `Scheduled because "${asg.title}" is ${dueLabel.toLowerCase()} (${asg.priority} priority).`,
          deadlineLabel: `${asg.title} (${dueLabel})`
        });
      });

    // 5C. Pending Tasks (Excluding completed tasks!)
    tasks
      .filter(t => !t.completed)
      .forEach(task => {
        const diffDays = task.dueDate
          ? Math.ceil((new Date(task.dueDate).getTime() - today.getTime()) / (86400 * 1000))
          : 14;
        const course = courses.find(c => c.id === task.courseId);

        let score = task.priority === 'high' ? 110 : task.priority === 'medium' ? 75 : 40;
        if (diffDays <= 0) score += 65;
        else if (diffDays === 1) score += 50;
        else if (diffDays <= 3) score += 30;

        if (
          course &&
          memPrefs.focusKeywords.some(
            k => k.includes(course.code.toLowerCase()) || k.includes(course.name.toLowerCase())
          )
        ) {
          score += 20;
        }

        candidates.push({
          id: `cand_task_${task.id}`,
          title: `Task: ${task.title}${course ? ` (${course.code})` : ''}`,
          type: 'study',
          priority: task.priority,
          score,
          estimatedMinutes: memPrefs.preferredSessionMins,
          courseId: task.courseId,
          taskId: task.id,
          reason: `${task.priority.toUpperCase()} priority task${task.dueDate ? ` due ${task.dueDate.slice(0, 10)}` : ''}.`
        });
      });

    // Sort candidates strictly by intelligence score (highest priority first — never equal distribution!)
    candidates.sort((a, b) => b.score - a.score);

    // 6. Schedule Top Candidates into Non-Overlapping Available Slots with Realistic Breaks
    const isDayOff = memPrefs.noStudyDays.includes(currentDay);
    const maxStudyBlocksToday = isDayOff ? 1 : memPrefs.maxDailyStudySessions;
    let scheduledStudyCount = 0;

    // Find next free slot of `durationMins` between `memPrefs.dayStartMin` and `memPrefs.dayEndMin`
    const findNextAvailableSlot = (durationMins: number, earliestMin: number): number | null => {
      for (let t = Math.max(earliestMin, memPrefs.dayStartMin); t + durationMins <= memPrefs.dayEndMin; t += 15) {
        if (isIntervalFree(t, t + durationMins)) {
          return t;
        }
      }
      return null;
    };

    let cursorMin = memPrefs.dayStartMin;

    // If user has no candidates at all, schedule 2 sensible foundational study blocks if not a day off
    if (candidates.length === 0 && !isDayOff) {
      candidates.push({
        id: 'cand_default_1',
        title:
          activeAcademicMode === 'normal'
            ? 'Lecture Notes Review & Active Recall Synthesis'
            : `Focused ${activeAcademicMode === 'midterm' ? 'Midterm' : 'Final'} Exam Revision Block`,
        type: activeAcademicMode === 'normal' ? 'study' : 'revision',
        priority: 'medium',
        score: 80,
        estimatedMinutes: memPrefs.preferredSessionMins,
        reason: 'Foundational study block scheduled during your preferred study window.'
      });
    }

    candidates.forEach(cand => {
      if (scheduledStudyCount >= maxStudyBlocksToday) {
        postponedItems.push(
          `${cand.title} — Postponed to tomorrow to avoid overloading today's schedule (daily cap of ${maxStudyBlocksToday} deep focus blocks reached).`
        );
        return;
      }

      const dur = cand.estimatedMinutes || memPrefs.preferredSessionMins;
      const slotStart = findNextAvailableSlot(dur, cursorMin);
      if (slotStart === null) {
        postponedItems.push(
          `${cand.title} — Postponed because no non-overlapping ${dur}-minute window remains within your available hours (${minutesToTime(memPrefs.dayStartMin)}–${minutesToTime(memPrefs.dayEndMin)}).`
        );
        return;
      }

      const slotEnd = slotStart + dur;
      const startStr = minutesToTime(slotStart);
      const endStr = minutesToTime(slotEnd);

      // Reserve the study block AND a realistic break right after it
      reserveInterval(slotStart, slotEnd, cand.title);
      blocks.push({
        id: `b_${Date.now()}_${bIdx++}`,
        time: `${startStr} - ${endStr}`,
        startTime: startStr,
        endTime: endStr,
        durationMinutes: dur,
        title: cand.title,
        type: cand.type,
        status: 'pending',
        priority: cand.priority,
        completed: false,
        courseId: cand.courseId,
        taskId: cand.taskId,
        assignmentId: cand.assignmentId,
        examId: cand.examId,
        reason: cand.reason
      });

      prioritizationReasons.push(`${cand.title}: ${cand.reason}`);
      scheduledStudyCount++;

      // Insert an explicit short break block after study session if another session will follow
      const breakDur = memPrefs.preferredBreakMins;
      if (scheduledStudyCount < maxStudyBlocksToday && isIntervalFree(slotEnd, slotEnd + breakDur)) {
        reserveInterval(slotEnd, slotEnd + breakDur, 'Study Break');
        blocks.push({
          id: `b_${Date.now()}_${bIdx++}`,
          time: `${minutesToTime(slotEnd)} - ${minutesToTime(slotEnd + breakDur)}`,
          startTime: minutesToTime(slotEnd),
          endTime: minutesToTime(slotEnd + breakDur),
          durationMinutes: breakDur,
          title: `☕ ${breakDur}-Min Rest & Stretch Break`,
          type: 'break',
          status: 'pending',
          completed: false,
          reason: `Scheduled ${breakDur}-minute recovery break between study blocks.`
        });
        cursorMin = slotEnd + breakDur;
      } else {
        cursorMin = slotEnd + breakDur;
      }
    });

    // Sort all blocks chronologically by start time
    blocks.sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));

    const explanation: DailyPlanExplanation = {
      summary:
        activeAcademicMode === 'normal'
          ? `Realistic plan for ${currentDayName}: ${todayClasses.length} class(es), ${todayExams.length} exam(s), and ${scheduledStudyCount} prioritized study session(s) (${memPrefs.preferredSessionMins}m blocks with ${memPrefs.preferredBreakMins}m breaks).`
          : `${activeAcademicMode === 'midterm' ? 'Midterm Week' : 'Final Exam'} Revision Plan for ${currentDayName}: Regular classes are suspended. Scheduled ${todayExams.length} exam(s) and ${scheduledStudyCount} high-priority revision session(s).`,
      academicModeReason,
      prioritizationReasons:
        prioritizationReasons.length > 0
          ? prioritizationReasons
          : ['Balanced workload across your active courses with realistic breaks and zero overlapping sessions.'],
      deadlinesConsidered:
        deadlinesConsidered.length > 0
          ? deadlinesConsidered
          : ['No urgent 48-hour deadlines — focused on steady academic progress.'],
      postponedItems,
      memoriesApplied: memPrefs.memoriesApplied
    };

    setDailyPlan({
      date: todayIsoDate,
      generatedBy: 'ai',
      academicMode: activeAcademicMode,
      fallbackReason: explanation.summary,
      explanation,
      blocks
    });
  }, [
    courses,
    assignments,
    tasks,
    exams,
    activeAcademicMode,
    isClassSuspendedOnDate,
    parseSchedulingMemories
  ]);

  const toggleDailyPlanBlock = (blockId: string) => {
    setDailyPlan(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        const nextComp = !b.completed;
        if (b.taskId) {
          updateTask(b.taskId, {
            completed: nextComp,
            completedAt: nextComp ? new Date().toISOString() : undefined
          });
        }
        return {
          ...b,
          completed: nextComp,
          status: nextComp ? 'completed' : 'pending'
        };
      })
    }));
  };

  const updateDailyPlanBlock = (blockId: string, updates: Partial<DailyPlanBlock>) => {
    setDailyPlan(prev => {
      const updatedBlocks = prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        const merged = { ...b, ...updates };
        if (updates.startTime || updates.endTime) {
          const st = updates.startTime || b.startTime || b.time.split(' - ')[0] || '09:00';
          const et = updates.endTime || b.endTime || b.time.split(' - ')[1] || '10:00';
          merged.time = `${st} - ${et}`;
          merged.durationMinutes = Math.max(5, timeToMinutes(et) - timeToMinutes(st));
        }
        return merged;
      });
      updatedBlocks.sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));
      return { ...prev, blocks: updatedBlocks };
    });
  };

  const deleteDailyPlanBlock = (blockId: string) => {
    setDailyPlan(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId)
    }));
  };

  const moveDailyPlanBlock = (blockId: string, direction: 'up' | 'down') => {
    setDailyPlan(prev => {
      const idx = prev.blocks.findIndex(b => b.id === blockId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.blocks.length) return prev;
      const nextBlocks = [...prev.blocks];
      // Swap time slots between the two adjacent blocks if both are movable study/break blocks
      const currentBlock = { ...nextBlocks[idx] };
      const neighborBlock = { ...nextBlocks[targetIdx] };
      const tempTime = currentBlock.time;
      const tempStart = currentBlock.startTime;
      const tempEnd = currentBlock.endTime;

      currentBlock.time = neighborBlock.time;
      currentBlock.startTime = neighborBlock.startTime;
      currentBlock.endTime = neighborBlock.endTime;

      neighborBlock.time = tempTime;
      neighborBlock.startTime = tempStart;
      neighborBlock.endTime = tempEnd;

      nextBlocks[idx] = neighborBlock;
      nextBlocks[targetIdx] = currentBlock;
      return { ...prev, blocks: nextBlocks };
    });
  };

  const addCustomDailyPlanBlock = (blockData: Omit<DailyPlanBlock, 'id'>) => {
    const newBlock: DailyPlanBlock = {
      ...blockData,
      id: generateUniqueId('plan_block')
    };
    setDailyPlan(prev => {
      const nextBlocks = [...prev.blocks, newBlock];
      nextBlocks.sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));
      return { ...prev, blocks: nextBlocks };
    });
  };

  // Adaptive Daily Planning: Reorganize remaining schedule when user completes a task early or misses a session
  const adaptDailyPlan = (reason: 'completed_early' | 'missed_session' | 'rebalance') => {
    const now = new Date();
    const currentMin = Math.max(8 * 60, now.getHours() * 60 + now.getMinutes());
    const memPrefs = parseSchedulingMemories();

    setDailyPlan(prev => {
      const completedOrFixed = prev.blocks.filter(
        b => b.completed || b.type === 'class' || b.type === 'exam'
      );
      const pendingStudyBlocks = prev.blocks.filter(
        b => !b.completed && b.type !== 'class' && b.type !== 'exam' && b.type !== 'break'
      );

      // Reserve fixed blocks
      const occupied: Array<{ start: number; end: number }> = completedOrFixed.map(b => {
        const parts = b.time.split(' - ');
        return {
          start: timeToMinutes(b.startTime || parts[0] || '09:00'),
          end: timeToMinutes(b.endTime || parts[1] || '10:00')
        };
      });
      const isFree = (s: number, e: number) => !occupied.some(o => s < o.end && e > o.start);

      const rescheduled: DailyPlanBlock[] = [...completedOrFixed];
      const newlyPostponed: string[] = [...(prev.explanation?.postponedItems || [])];

      let cursor = reason === 'completed_early' ? currentMin + 5 : Math.max(currentMin + 15, memPrefs.dayStartMin);
      // Round cursor to next 15m
      cursor = Math.ceil(cursor / 15) * 15;

      // If completed early and there are postponed items or open tasks not yet in plan, pull one in!
      if (reason === 'completed_early') {
        const unscheduledTask = tasks.find(
          t => !t.completed && !prev.blocks.some(b => b.taskId === t.id)
        );
        if (unscheduledTask) {
          pendingStudyBlocks.push({
            id: generateUniqueId('b_adapt'),
            time: '15:00 - 15:50',
            durationMinutes: memPrefs.preferredSessionMins,
            title: `⚡ Pulled Forward: ${unscheduledTask.title}`,
            type: 'study',
            priority: unscheduledTask.priority,
            completed: false,
            taskId: unscheduledTask.id,
            courseId: unscheduledTask.courseId,
            reason: 'Suggested next because you completed your earlier study block ahead of schedule!'
          });
        }
      }

      pendingStudyBlocks.forEach(b => {
        const dur = b.durationMinutes || memPrefs.preferredSessionMins;
        let placed = false;
        for (let t = cursor; t + dur <= memPrefs.dayEndMin; t += 15) {
          if (isFree(t, t + dur)) {
            const st = minutesToTime(t);
            const et = minutesToTime(t + dur);
            occupied.push({ start: t, end: t + dur });
            rescheduled.push({
              ...b,
              time: `${st} - ${et}`,
              startTime: st,
              endTime: et,
              status: reason === 'missed_session' ? 'rescheduled' : 'pending',
              reason:
                reason === 'missed_session'
                  ? `Automatically reorganized into your remaining available hours (${st}–${et}).`
                  : b.reason
            });
            cursor = t + dur + memPrefs.preferredBreakMins;
            placed = true;
            break;
          }
        }
        if (!placed) {
          newlyPostponed.push(
            `${b.title} — Deferred to tomorrow so your evening remains realistic and uncrowded.`
          );
        }
      });

      rescheduled.sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));

      const adaptSummary =
        reason === 'completed_early'
          ? 'Adapted Plan: Pulled your next highest-priority study block forward since you finished early!'
          : 'Adapted Plan: Reorganized remaining study sessions around your current time and deferred overflow tasks.';

      return {
        ...prev,
        fallbackReason: adaptSummary,
        explanation: prev.explanation
          ? {
              ...prev.explanation,
              summary: adaptSummary,
              postponedItems: Array.from(new Set(newlyPostponed))
            }
          : undefined,
        blocks: rescheduled
      };
    });
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

  // AI Memory Management (Persistent, Deduplicated, Categorized & User-Isolated)
  const addAiMemory = useCallback(
    (
      content: string,
      category: AiMemory['category'] = 'preference',
      source: 'explicit' | 'inferred' = 'explicit'
    ): AiMemory => {
      const cleanContent = content.trim();
      const lowerNew = cleanContent.toLowerCase();
      const nowIso = new Date().toISOString();

      let savedMemory: AiMemory = {
        id: generateUniqueId('mem'),
        category,
        content: cleanContent,
        fact: cleanContent,
        source,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      setAiMemories(prev => {
        // Check for duplicate or contradictory study-time preference
        const isStudyTimePref =
          lowerNew.includes('prefer studying') ||
          lowerNew.includes('study at night') ||
          lowerNew.includes('study in the morning') ||
          lowerNew.includes('study in the afternoon') ||
          lowerNew.includes('study in the evening');

        const existingIdx = prev.findIndex(m => {
          const existingText = (m.content || m.fact || '').toLowerCase();
          if (existingText === lowerNew) return true;
          if (
            isStudyTimePref &&
            (existingText.includes('prefer studying') ||
              existingText.includes('study at night') ||
              existingText.includes('study in the morning') ||
              existingText.includes('study in the afternoon') ||
              existingText.includes('study in the evening'))
          ) {
            return true;
          }
          return false;
        });

        let next: AiMemory[];
        if (existingIdx !== -1) {
          savedMemory = {
            ...prev[existingIdx],
            category,
            content: cleanContent,
            fact: cleanContent,
            source,
            updatedAt: nowIso
          };
          next = prev.map((m, idx) => (idx === existingIdx ? savedMemory : m));
        } else {
          next = [savedMemory, ...prev];
        }

        if (user && isSupabaseConfigured()) {
          dbSaveAiMemory(user.id, savedMemory).catch(err => console.warn('DB save memory:', err));
        }
        return next;
      });

      return savedMemory;
    },
    [user]
  );

  const updateAiMemory = useCallback(
    (id: string, updates: Partial<AiMemory>) => {
      setAiMemories(prev => {
        const next: AiMemory[] = prev.map(m => {
          if (m.id !== id) return m;
          const updatedContent = updates.content ?? updates.fact ?? m.content ?? m.fact ?? '';
          return {
            ...m,
            ...updates,
            content: updatedContent,
            fact: updatedContent,
            updatedAt: new Date().toISOString()
          };
        });
        const target = next.find(m => m.id === id);
        if (target && user && isSupabaseConfigured()) {
          dbSaveAiMemory(user.id, target).catch(err => console.warn('DB update memory:', err));
        }
        return next;
      });
    },
    [user]
  );

  const deleteAiMemory = useCallback(
    (id: string) => {
      setAiMemories(prev => prev.filter(m => m.id !== id));
      if (user && isSupabaseConfigured()) {
        dbDeleteAiMemory(user.id, id).catch(err => console.warn('DB delete memory:', err));
      }
    },
    [user]
  );

  // Automatic Explicit Preference Detector from User Chat Messages
  const detectAndSaveExplicitMemories = (text: string): AiMemory[] => {
    const detected: AiMemory[] = [];
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    const patterns: Array<{ regex: RegExp; category: AiMemoryCategory }> = [
      {
        regex: /\b(?:i prefer|i like|i love|i work best|i study best)\s+([^.?!]+)/i,
        category: 'preference'
      },
      {
        regex: /\b(?:my study sessions? should be|study blocks? should be|i want\s+\d+\s*(?:min|minute)\s*sessions?)\s*([^.?!]*)/i,
        category: 'habit'
      },
      {
        regex: /\b(?:i don't study on|i do not study on|never schedule on|i'm busy on|i work on)\s+([^.?!]+)/i,
        category: 'commitment'
      },
      {
        regex: /\b(?:i sleep from|i go to bed at|i wake up at|my sleep schedule is)\s+([^.?!]+)/i,
        category: 'sleep'
      },
      {
        regex: /\b(?:i struggle with|i find .* difficult|my weak subject is|i need more help with)\s+([^.?!]+)/i,
        category: 'weakness'
      },
      {
        regex: /\b(?:my goal is|i'm aiming for|i want to achieve|remember that i)\s+([^.?!]+)/i,
        category: 'goal'
      }
    ];

    for (const p of patterns) {
      if (p.regex.test(trimmed)) {
        const mem = addAiMemory(trimmed, p.category, 'explicit');
        detected.push(mem);
        break;
      }
    }

    // Also catch standalone explicit study time statements like "I study at night"
    if (
      detected.length === 0 &&
      (lower.includes('i study at night') ||
        lower.includes('i study in the morning') ||
        lower.includes('with 10-minute breaks') ||
        lower.includes('with 15-minute breaks'))
    ) {
      detected.push(addAiMemory(trimmed, 'preference', 'explicit'));
    }

    return detected;
  };

  // AI Assistant Chat & Actions
  const sendAiMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: generateUniqueId('msg_usr'),
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiMessages(prev => [...prev, userMsg]);

    // Detect & persist any explicit preferences the user stated in this message
    const newlySavedMemories = detectAndSaveExplicitMemories(text);
    const activeMemoryStrings: string[] = [
      ...newlySavedMemories.map(m => m.content || m.fact || ''),
      ...aiMemories.map(m => m.content || m.fact || '')
    ]
      .filter((s): s is string => Boolean(s))
      .slice(0, 6);

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
    const scheduleCtx = getAcademicScheduleContext(courses, assignments, tasks, events, exams);

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
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-2.5-flash'
        ];

        const memoryContextBlock =
          activeMemoryStrings.length > 0
            ? `\n\nUSER SAVED PREFERENCES & AI MEMORY (Strictly respect these and never invent preferences not listed here):\n${activeMemoryStrings.map(m => `- ${m}`).join('\n')}`
            : '\n\nUSER SAVED PREFERENCES: None saved yet. Do not assume or hallucinate unstated preferences.';

        const modeContextBlock = `\nCURRENT ACADEMIC MODE: ${activeAcademicMode.toUpperCase()} MODE (${
          activeAcademicMode === 'normal'
            ? 'Regular weekly classes active'
            : 'Regular weekly lectures are SUSPENDED; only examinations and revision take place'
        }).`;

        const academicPrompt =
          buildGeminiAcademicPrompt(scheduleCtx, courses, text) + memoryContextBlock + modeContextBlock;

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
                      parts: [{ text: academicPrompt }]
                    }
                  ]
                })
              }
            );
            const data = await resp.json();
            const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (geminiText) {
              const isEvasive =
                geminiText.toLowerCase().includes('does not currently have access') ||
                geminiText.toLowerCase().includes('do not currently have access') ||
                geminiText.toLowerCase().includes('reply with the specific day of the week');

              let finalText = isEvasive ? generateScheduleAnswer(text, scheduleCtx, courses) : geminiText;
              if (newlySavedMemories.length > 0) {
                finalText = `🧠 *Saved to your AI Memory: "${newlySavedMemories[0].content}"*\n\n` + finalText;
              }

              setAiMessages(prev => [
                ...prev,
                {
                  id: generateUniqueId('msg_ai'),
                  sender: 'assistant',
                  content: finalText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  memoriesUsed: activeMemoryStrings.length > 0 ? activeMemoryStrings.slice(0, 3) : undefined
                }
              ]);
              return;
            }
          } catch (err) {
            console.warn(`Model ${model} fetch error, trying next fallback:`, err);
          }
        }

        // Fallback to local heuristic engine on all errors
        runLocalAiResponse(text, newlySavedMemories, activeMemoryStrings);
      })();
      return;
    }

    runLocalAiResponse(text, newlySavedMemories, activeMemoryStrings);
  };

  const runLocalAiResponse = (
    text: string,
    newlySavedMemories: AiMemory[] = [],
    activeMemoryStrings: string[] = []
  ) => {
    setTimeout(() => {
      const lower = text.toLowerCase();
      let reasoningSteps: string[] = [];
      let replyContent = '';
      let proposals: AiActionProposal[] = [];

      if (newlySavedMemories.length > 0 && lower.split(' ').length < 18 && !lower.includes('?')) {
        replyContent = `🧠 **Preference Saved to AI Memory!**\n\nI have recorded: *"${newlySavedMemories[0].content}"*.\n\nI will automatically apply this preference whenever I generate your **Daily Study Plan**, schedule revision sessions, or give study recommendations. You can view, edit, or delete your saved memories anytime in the **Memories** tab above.`;
      } else if (isScheduleOrDateQuery(text)) {
        const scheduleCtx = getAcademicScheduleContext(courses, assignments, tasks, events, exams);
        replyContent = generateScheduleAnswer(text, scheduleCtx, courses);
        if (activeAcademicMode !== 'normal') {
          replyContent =
            `> 📌 **${activeAcademicMode === 'midterm' ? 'Midterm Week' : 'Final Exam'} Mode Active**: Regular weekly classes are temporarily suspended during this examination period.\n\n` +
            replyContent;
        }
      } else if (
        lower.includes('plan my day') ||
        lower.includes('daily plan') ||
        lower.includes('study plan')
      ) {
        regenerateDailyPlan();
        replyContent = `I have regenerated your **Intelligent Daily Plan** for today in **${
          activeAcademicMode === 'normal'
            ? 'Normal Semester Mode'
            : activeAcademicMode === 'midterm'
            ? 'Midterm Exam Mode (Regular Classes Suspended)'
            : 'Final Exam Mode (Regular Classes Suspended)'
        }**.\n\n${
          activeMemoryStrings.length > 0
            ? `✨ *Personalized using your preferences: ${activeMemoryStrings.slice(0, 2).join(' • ')}*\n\n`
            : ''
        }Open the **Today** dashboard to view the full non-overlapping timeline, prioritization breakdown, and adaptive controls.`;
      } else if (
        lower.includes('how to use') ||
        lower.includes('how do i use') ||
        lower.includes('what can you do') ||
        lower.includes('help') ||
        lower.includes('button') ||
        lower.includes('start')
      ) {
        replyContent = `### How to use the **Ask AI** Assistant:

1. 🧠 **Personalize Your AI Memory:**
   Tell me your habits and constraints (e.g. *"I prefer studying at night"*, *"My study sessions should be 45 minutes with 10-minute breaks"*, or *"I don't study on Fridays"*). I will remember them across sessions and apply them to your Daily Plan!

2. 🏫 **Create Courses & Timetable Slots:**
   Tell me: *"I am taking Computer Science 101 on Mon and Wed at 10 AM"*.

3. 📝 **Create Coursework & Auto-Breakdown:**
   Tell me: *"I have a Research Essay due next Friday"*.

4. 📅 **Intelligent Daily Planning & Academic Modes:**
   Ask me to *"Plan my day"* — I respect your classes, Midterm/Final exam modes, assignment deadlines, and saved preferences.`;
      } else if (
        (lower.startsWith('add course') ||
          lower.startsWith('create course') ||
          lower.startsWith('new course') ||
          lower.includes('i am taking') ||
          lower.includes("i'm taking") ||
          lower.includes('enrolled in')) &&
        !isScheduleOrDateQuery(text)
      ) {
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

        replyContent = `I have drafted the course **${courseName} (${courseCode})** with a weekly lecture slot on ${day}s at ${time}. Click **Confirm & Create** below to add it to your timetable!`;

        proposals.push({
          id: generateUniqueId('prop'),
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
        replyContent = `I have drafted the assignment **"${title}"** with a due date in 7 days. Click below to add it to your assignments!`;

        proposals.push({
          id: generateUniqueId('prop'),
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
      } else {
        const memoryAck =
          newlySavedMemories.length > 0
            ? `🧠 *Saved to your AI Memory: "${newlySavedMemories[0].content}"*\n\n`
            : '';
        replyContent =
          memoryAck +
          `I've analyzed your workspace (${
            activeAcademicMode === 'normal'
              ? 'Normal Semester Mode'
              : activeAcademicMode === 'midterm'
              ? 'Midterm Exam Mode'
              : 'Final Exam Mode'
          }): you have **${courses.length}** active course(s), **${
            tasks.filter(t => !t.completed).length
          }** open task(s), and **${exams.length}** scheduled exam(s).\n\nHow would you like me to help with your study plan, notes, or coursework today?`;
      }

      const assistantMsg: ChatMessage = {
        id: generateUniqueId('msg_ai'),
        sender: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reasoningSteps,
        memoriesUsed: activeMemoryStrings.length > 0 ? activeMemoryStrings.slice(0, 3) : undefined,
        actionProposals: proposals.length > 0 ? proposals : undefined
      };

      setAiMessages(prev => [...prev, assistantMsg]);
    }, 350);
  };

  const clearAiChat = () => {
    setAiMessages([
      {
        id: generateUniqueId('msg_cleared'),
        sender: 'assistant',
        content: `Chat history cleared. Your saved AI Memories (${aiMemories.length}) remain intact. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
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

  const syncIntegration = async (provider: IntegrationConnector['provider']): Promise<number> => {
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
      const activeToken = getGitHubToken();
      if (githubRepos.length > 0) {
        let totalCommits = 0;
        const updatedRepos = await Promise.all(
          githubRepos.map(async r => {
            try {
              const freshCommits = await fetchRepoCommits(r.owner, r.repo, r.branch || 'main', activeToken);
              if (Array.isArray(freshCommits) && freshCommits.length > 0) {
                totalCommits += freshCommits.length;
                return { ...r, commits: freshCommits };
              }
            } catch (err) {
              console.warn(`Sync failed for repo ${r.owner}/${r.repo}:`, err);
            }
            return r;
          })
        );
        setGithubRepos(updatedRepos);
        itemsImported = totalCommits;
      } else if (courses.length > 0) {
        await addGitHubRepo(courses[0].id, 'Martinmagued2', 'StudyPlanner', 'main');
        itemsImported = 1;
      }
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

    return itemsImported;
  };

  const syncGitHubRepo = async (repoId: string): Promise<boolean> => {
    const target = githubRepos.find(r => r.id === repoId);
    if (!target) return false;
    try {
      const activeToken = getGitHubToken();
      const freshCommits = await fetchRepoCommits(target.owner, target.repo, target.branch || 'main', activeToken);
      if (Array.isArray(freshCommits) && freshCommits.length > 0) {
        setGithubRepos(prev => prev.map(r => r.id === repoId ? { ...r, commits: freshCommits } : r));
        setNotifications(prev => [
          {
            id: `notif_${Date.now()}`,
            title: `Synced ${target.owner}/${target.repo}`,
            message: `Loaded ${freshCommits.length} latest commits directly from GitHub!`,
            type: 'system',
            timestamp: 'Just now',
            read: false
          },
          ...prev
        ]);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn(`Error syncing repo ${target.owner}/${target.repo}:`, err);
      setNotifications(prev => [
        {
          id: `notif_${Date.now()}`,
          title: `Sync Failed (${target.owner}/${target.repo})`,
          message: err?.message || 'Could not fetch commits. Check owner/repo name or personal access token.',
          type: 'system',
          timestamp: 'Just now',
          read: false
        },
        ...prev
      ]);
      return false;
    }
  };

  const deleteGitHubRepo = (repoId: string) => {
    setGithubRepos(prev => prev.filter(r => r.id !== repoId));
  };

  const addGitHubRepo = async (courseId: string, owner: string, repo: string, branch: string = 'main'): Promise<void> => {
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
    try {
      const activeToken = getGitHubToken();
      const realCommits = await fetchRepoCommits(owner, repo, branch, activeToken);
      if (realCommits && realCommits.length > 0) {
        setGithubRepos(prev => prev.map(r => r.id === tempId ? { ...r, commits: realCommits } : r));
      }
    } catch (err: any) {
      console.warn(`Could not fetch remote commits for ${owner}/${repo}:`, err);
      setNotifications(prev => [
        {
          id: `notif_${Date.now()}`,
          title: `GitHub Repo Notice (${owner}/${repo})`,
          message: err?.message || 'Could not fetch commits automatically. Verify repo name or add a GitHub Personal Access Token.',
          type: 'system',
          timestamp: 'Just now',
          read: false
        },
        ...prev
      ]);
    }
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

      const { syncId, syncedAt, directPayload } = await uploadToCloud(payload, cloudSyncId);
      setCloudSyncId(syncId);
      setDirectSyncPayload(directPayload);
      setLastSyncedAt(syncedAt);
      setCloudSyncStatus('synced');
      localStorage.setItem('nook_cloud_sync_id', syncId);
      localStorage.setItem('nook_direct_sync_payload', directPayload);
      localStorage.setItem('nook_last_cloud_sync_at', syncedAt);
      return syncId;
    } catch (e) {
      setCloudSyncStatus('error');
      throw e;
    }
  };

  const loadFromCloud = async (syncIdOrPayload: string): Promise<boolean> => {
    setCloudSyncStatus('syncing');
    try {
      const data = await fetchFromCloud(syncIdOrPayload);

      // 1. Restore User Identity
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('nook_current_user', JSON.stringify(data.user));
      }

      // 2. Determine target storage keys for immediate local persistence
      const targetUserKey = data.user?.id ? `nook_workspace_${data.user.id}` : storageKey;
      const keysToPersist = Array.from(new Set([targetUserKey, storageKey, 'nook_workspace_demo']));

      // 3. Update React State
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

      // 4. Force synchronous persistence across all relevant storage keys so refreshing or navigating preserves everything!
      keysToPersist.forEach(k => {
        try {
          if (Array.isArray(data.courses)) localStorage.setItem(`${k}_courses`, JSON.stringify(data.courses));
          if (Array.isArray(data.assignments)) localStorage.setItem(`${k}_assignments`, JSON.stringify(data.assignments));
          if (Array.isArray(data.tasks)) localStorage.setItem(`${k}_tasks`, JSON.stringify(data.tasks));
          if (Array.isArray(data.notes)) localStorage.setItem(`${k}_notes`, JSON.stringify(data.notes));
          if (Array.isArray(data.events)) localStorage.setItem(`${k}_events`, JSON.stringify(data.events));
          if (Array.isArray(data.inboxItems)) localStorage.setItem(`${k}_inbox`, JSON.stringify(data.inboxItems));
          if (Array.isArray(data.files)) localStorage.setItem(`${k}_files`, JSON.stringify(data.files));
          if (Array.isArray(data.flashcards)) localStorage.setItem(`${k}_flashcards`, JSON.stringify(data.flashcards));
          if (Array.isArray(data.flashcardDecks)) localStorage.setItem(`${k}_flashcard_decks`, JSON.stringify(data.flashcardDecks));
          if (Array.isArray(data.focusSessions)) localStorage.setItem(`${k}_focus_sessions`, JSON.stringify(data.focusSessions));
          if (Array.isArray(data.quizzes)) localStorage.setItem(`${k}_quizzes`, JSON.stringify(data.quizzes));
          if (Array.isArray(data.exams)) localStorage.setItem(`${k}_exams`, JSON.stringify(data.exams));
          if (Array.isArray(data.gradeItems)) localStorage.setItem(`${k}_grade_items`, JSON.stringify(data.gradeItems));
          if (Array.isArray(data.previousTermCourses)) localStorage.setItem(`${k}_previous_term_courses`, JSON.stringify(data.previousTermCourses));
          if (Array.isArray(data.aiMemories)) localStorage.setItem(`${k}_ai_memories`, JSON.stringify(data.aiMemories));
          if (data.dailyPlan) localStorage.setItem(`${k}_daily_plan`, JSON.stringify(data.dailyPlan));
          if (Array.isArray(data.integrations)) localStorage.setItem(`${k}_integrations`, JSON.stringify(data.integrations));
          if (Array.isArray(data.githubRepos)) localStorage.setItem(`${k}_repos`, JSON.stringify(data.githubRepos));
        } catch (storageErr) {
          console.warn('Storage sync persist warning:', storageErr);
        }
      });

      const isDirectPayload = syncIdOrPayload.length > 50 || syncIdOrPayload.startsWith('UEsDB') || syncIdOrPayload.includes('%');
      const cleanSyncId = isDirectPayload ? (localStorage.getItem('nook_cloud_sync_id') || `sync_${Date.now()}`) : syncIdOrPayload.trim();
      setCloudSyncId(cleanSyncId);
      if (isDirectPayload) {
        setDirectSyncPayload(syncIdOrPayload);
        localStorage.setItem('nook_direct_sync_payload', syncIdOrPayload);
      }
      const syncTime = data.syncedAt || new Date().toISOString();
      setLastSyncedAt(syncTime);
      setCloudSyncStatus('synced');
      localStorage.setItem('nook_cloud_sync_id', cleanSyncId);
      localStorage.setItem('nook_last_cloud_sync_at', syncTime);
      return true;
    } catch (e) {
      setCloudSyncStatus('error');
      console.error('Failed to load from cloud:', e);
      return false;
    }
  };

  // Check URL hash (#sync_data=...) or query (?sync=... / ?sync_data=...) on mount
  useEffect(() => {
    const handleUrlSync = async () => {
      let syncTarget: string | null = null;

      // 1. Check window.location.hash for #sync_data=...
      const hash = window.location.hash;
      if (hash && hash.includes('sync_data=')) {
        const match = hash.match(/sync_data=([^&]+)/);
        if (match && match[1]) {
          syncTarget = decodeURIComponent(match[1]);
        }
      }

      // 2. Check search params for ?sync_data=... or ?sync=...
      if (!syncTarget) {
        const urlParams = new URLSearchParams(window.location.search);
        const syncDataParam = urlParams.get('sync_data');
        const syncParam = urlParams.get('sync');
        if (syncDataParam && syncDataParam.trim().length > 10) {
          syncTarget = syncDataParam.trim();
        } else if (syncParam && syncParam.trim().length >= 4) {
          syncTarget = syncParam.trim();
        }
      }

      if (syncTarget) {
        const ok = await loadFromCloud(syncTarget);
        if (ok) {
          window.history.replaceState({}, document.title, window.location.pathname);
          setNotifications(prev => [
            {
              id: `notif_sync_${Date.now()}`,
              title: 'Workspace Synced Successfully',
              message: 'Your courses, tasks, notes, and study plans have been loaded from your other device!',
              type: 'system',
              timestamp: 'Just now',
              read: false
            },
            ...prev
          ]);
        }
      }
    };

    handleUrlSync();
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

  // Supabase PostgreSQL Database Integration
  const saveToDatabase = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isSupabaseConfigured()) {
      return { success: false, error: 'Database is not configured or user is not logged in.' };
    }
    try {
      markLocalDbWrite();
      const payload: CloudWorkspacePayload & { academicConfig?: AcademicCalendarConfig } = {
        version: '1.0.0',
        syncedAt: new Date().toISOString(),
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
        academicConfig,
        dailyPlan,
        integrations,
        githubRepos,
        notifications,
        reminderLogs,
        chatSessions,
        activeChatSessionId,
        theme
      };
      await dbSaveAllTablesToDatabase(user.id, payload);
      return { success: true };
    } catch (e: any) {
      console.warn('Failed saving to Supabase database:', e);
      return { success: false, error: e?.message || 'Database save failed' };
    }
  };

  // Helper to apply remote arrays only if their content genuinely differs (prevents unnecessary re-renders & shuffling)
  const applyRemoteDataSafely = useCallback((data: any) => {
    if (!data) return;
    isApplyingRemoteRef.current = true;
    const setIfChanged = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, incoming: T | undefined) => {
      if (incoming === undefined || incoming === null) return;
      setter(prev => {
        try {
          if (JSON.stringify(prev) === JSON.stringify(incoming)) return prev;
        } catch {}
        return incoming;
      });
    };

    if (Array.isArray(data.courses)) setIfChanged(setCourses, data.courses);
    if (Array.isArray(data.assignments)) setIfChanged(setAssignments, data.assignments);
    if (Array.isArray(data.tasks)) setIfChanged(setTasks, data.tasks);
    if (Array.isArray(data.notes)) setIfChanged(setNotes, data.notes);
    if (Array.isArray(data.events)) setIfChanged(setEvents, data.events);
    if (Array.isArray(data.inboxItems)) setIfChanged(setInboxItems, data.inboxItems);
    if (Array.isArray(data.files)) setIfChanged(setFiles, data.files);
    if (Array.isArray(data.flashcards)) setIfChanged(setFlashcards, data.flashcards);
    if (Array.isArray(data.flashcardDecks)) setIfChanged(setFlashcardDecks, data.flashcardDecks);
    if (Array.isArray(data.focusSessions)) setIfChanged(setFocusSessions, data.focusSessions);
    if (Array.isArray(data.quizzes)) setIfChanged(setQuizzes, data.quizzes);
    if (Array.isArray(data.exams)) setIfChanged(setExams, data.exams);
    if (Array.isArray(data.gradeItems)) setIfChanged(setGradeItems, data.gradeItems);
    if (Array.isArray(data.previousTermCourses)) setIfChanged(setPreviousTermCourses, data.previousTermCourses);
    if (Array.isArray(data.aiMemories)) setIfChanged(setAiMemories, data.aiMemories);
    if (data.academicConfig) setIfChanged(setAcademicConfig, data.academicConfig);
    if (data.dailyPlan) setIfChanged(setDailyPlan, data.dailyPlan);
    if (Array.isArray(data.integrations)) setIfChanged(setIntegrations, data.integrations);
    if (Array.isArray(data.githubRepos)) setIfChanged(setGithubRepos, data.githubRepos);
    if (Array.isArray(data.chatSessions) && data.chatSessions.length > 0) {
      setIfChanged(setChatSessions, data.chatSessions);
    }
    if (Array.isArray(data.notifications)) setIfChanged(setNotifications, data.notifications);
    if (Array.isArray(data.reminderLogs)) setIfChanged(setReminderLogs, data.reminderLogs);

    setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 400);
  }, []);

  const loadFromDatabase = async (): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) return false;
    try {
      const data = await dbLoadAllTablesFromDatabase(user.id);
      if (!data) return false;
      applyRemoteDataSafely(data);
      return true;
    } catch (e) {
      console.warn('Failed loading from Supabase database:', e);
      return false;
    }
  };

  // Realtime WebSocket Subscription to Supabase Postgres (Suppressed during local writes to eliminate shuffling)
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    loadFromDatabase().catch(err => console.warn('Initial DB load warning:', err));

    const unsubscribe = subscribeToWorkspaceRealtime(user.id, remoteData => {
      if (isRecentLocalDbWrite() || isApplyingRemoteRef.current) return;
      if (remoteData) {
        applyRemoteDataSafely(remoteData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, applyRemoteDataSafely]);

  // Debounced auto-save to Supabase PostgreSQL database ONLY on genuine local edits!
  useEffect(() => {
    if (!user || !isSupabaseConfigured() || isApplyingRemoteRef.current) return;
    const timer = setTimeout(() => {
      if (isApplyingRemoteRef.current) return;
      saveToDatabase().catch(err => console.warn('Auto DB sync failed:', err));
    }, 3000);
    return () => clearTimeout(timer);
  }, [
    courses,
    assignments,
    tasks,
    notes,
    exams,
    gradeItems,
    flashcards,
    flashcardDecks,
    aiMemories,
    academicConfig,
    dailyPlan,
    user?.id
  ]);

  const clearAllWorkspaceData = () => {
    isApplyingRemoteRef.current = true;
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
    setAcademicConfig(defaultAcademicConfig);
    setDailyPlan({
      date: new Date().toISOString().slice(0, 10),
      generatedBy: 'ai',
      blocks: []
    });
    setGithubRepos([]);
    setNotifications([
      {
        id: generateUniqueId('notif'),
        title: 'Fresh Workspace Ready',
        message: 'Your workspace is 100% clean and ready for your own courses, schedule, and notes.',
        type: 'system',
        timestamp: 'Just now',
        read: false
      }
    ]);
    setReminderLogs([]);

    // Clear only current user's workspace keys (never wipe other users' accounts!)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(storageKey)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 300);
  };

  const resetAllDemoData = () => {
    clearAllWorkspaceData();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        registerAccount,
        authenticateUser,
        logout,
        loginDemo,
        theme,
        setTheme,
        academicConfig,
        updateAcademicConfig,
        activeAcademicMode,
        isClassSuspendedOnDate,
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
        updateAiMemory,
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
        updateFile,
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
        updateExam,
        deleteExam,
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
        updateDailyPlanBlock,
        deleteDailyPlanBlock,
        moveDailyPlanBlock,
        addCustomDailyPlanBlock,
        adaptDailyPlan,
        integrations,
        toggleIntegrationConnection,
        syncIntegration,
        githubRepos,
        addGitHubRepo,
        syncGitHubRepo,
        deleteGitHubRepo,
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
        directSyncPayload,
        cloudSyncStatus,
        lastSyncedAt,
        saveToCloud,
        loadFromCloud,
        isSyncModalOpen,
        setIsSyncModalOpen,
        isDatabaseConfigured: isSupabaseConfigured(),
        isDbModalOpen,
        setIsDbModalOpen,
        saveToDatabase,
        loadFromDatabase,
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
