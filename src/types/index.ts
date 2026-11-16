export type ClassType = 'lecture' | 'tutorial' | 'lab' | 'seminar';

export interface MeetingSlot {
  id: string;
  day: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  type: ClassType;
  location: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  color: string; // Clean hex e.g. #0284c7, #059669, #d97706, #e11d48, #475569
  location: string;
  creditHours: number;
  term: string;
  syllabusUrl?: string;
  links: { label: string; url: string }[];
  isArchived: boolean;
  meetingSlots: MeetingSlot[];
}

export type AssignmentType = 'homework' | 'reading' | 'essay' | 'quiz' | 'exam' | 'lab' | 'project' | 'midterm' | 'final' | 'other';
export type AssignmentStatus = 'todo' | 'in_progress' | 'completed';
export type PriorityLevel = 'low' | 'medium' | 'high';

export interface AssignmentStep {
  id: string;
  title: string;
  completed: boolean;
  linkedTaskId?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId?: string;
  type: AssignmentType;
  status: AssignmentStatus;
  priority: PriorityLevel;
  dueDate: string; // ISO date-time string
  estimatedMinutes: number;
  submissionUrl?: string;
  links: string[];
  steps: AssignmentStep[];
  isBrokenDown?: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  dueDate?: string;
  priority: PriorityLevel;
  tags: string[];
  completed: boolean;
  completedAt?: string;
  subtasks: Subtask[];
  assignmentId?: string;
  examId?: string;
  source: 'user' | 'github' | 'ai' | 'moodle' | 'breakdown' | 'revision';
}

export type NoteBlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'table'
  | 'image'
  | 'math'
  | 'callout'
  | 'toggle';

export interface NoteBlock {
  id: string;
  type: NoteBlockType;
  content: string; // Rich inline HTML or code/latex string
  indent?: number; // 0..3 nested indentation
  props?: {
    checked?: boolean;
    language?: string;
    calloutTone?: 'info' | 'tip' | 'warning' | 'danger' | 'neutral';
    calloutIcon?: string;
    toggleOpen?: boolean;
    toggleBody?: string; // Rich HTML or sub-content inside toggle
    children?: NoteBlock[]; // Nested blocks inside toggle or parent
    tableRows?: string[][];
    tableHasHeader?: boolean;
    imageUrl?: string;
    imageCaption?: string;
    imageWidth?: number; // percentage 25..100
    displayMode?: boolean; // KaTeX math display mode
  };
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId?: string;
  courseId?: string;
  icon?: string;
  color?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string; // Semantic HTML synced from blocks
  blocks?: NoteBlock[];
  courseId?: string;
  folderId?: string;
  icon?: string;
  coverImage?: string;
  tags: string[];
  pinned: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  inTrash: boolean;
  createdAt: string;
  updatedAt: string;
  highlightedTerms: string[];
}

export type EventType = 'event' | 'meeting' | 'deadline' | 'milestone';
export type SyncProvider = 'local' | 'google' | 'outlook' | 'moodle' | 'ics';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO date or "YYYY-MM-DDTHH:mm"
  end: string;
  allDay: boolean;
  type: EventType;
  courseId?: string;
  provider: SyncProvider;
  assignmentId?: string;
}

export type InboxType = 'note' | 'bookmark' | 'email';

export interface InboxItem {
  id: string;
  title: string;
  content: string;
  type: InboxType;
  url?: string;
  emailSender?: string;
  emailSubject?: string;
  processed: boolean;
  convertedTo?: 'task' | 'note' | 'project';
  createdAt: string;
}

export type FileReadStatus = 'fully_read' | 'indexed' | 'ocr' | 'unreadable' | 'failed';
export type StorageProvider = 'local' | 'gdrive' | 'hybrid' | 'supabase';

export interface DocumentChunk {
  id: string;
  page: number;
  slideNumber?: number;
  content: string;
  hasVisuals: boolean;
  visualDescription?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  sizeBytes: number;
  fileType: 'pdf' | 'pptx' | 'docx' | 'txt' | 'md';
  status: FileReadStatus;
  pageCount: number;
  uploadedAt: string;
  courseId?: string;
  isFavorite: boolean;
  chunks: DocumentChunk[];
  summary?: string;
  rawText?: string;
  storageProvider?: StorageProvider;
  gdriveUrl?: string;
  gdriveFileId?: string;
  downloadUrl?: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  courseId?: string;
  question: string;
  answer: string;
  citation?: {
    file: string;
    pageOrSlide: string;
    quote?: string;
  };
  easeFactor: number; // SM-2 default 2.5
  intervalDays: number; // default 0
  repetitions: number;
  lapses: number;
  dueDate: string; // YYYY-MM-DD
  state: 'new' | 'learning' | 'review';
  suspended?: boolean;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  courseId?: string;
  tag?: string;
  cardsCount?: number;
}

export interface FocusSession {
  id: string;
  durationMinutes: number;
  actualMinutes: number;
  taskId?: string;
  courseId?: string;
  label?: string;
  timestamp: string; // ISO string
}

export type QuestionType = 'mcq' | 'tf' | 'short';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // for mcq
  correctAnswer: string;
  explanation: string;
  topic: string;
}

export interface QuizAttempt {
  id: string;
  date: string;
  score: number; // 0-100
  userAnswers: Record<string, string>;
  weakTopics: string[];
}

export interface Quiz {
  id: string;
  title: string;
  courseId?: string;
  fileId?: string;
  noteId?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'exam';
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
}

export interface RevisionSession {
  id: string;
  examId: string;
  sessionNumber: number;
  title: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  focusArea: 'notes' | 'flashcards' | 'weak_topics' | 'consolidation' | 'eve_of_exam';
  completed: boolean;
  linkedTaskId?: string;
}

export type ExamPeriodType = 'midterm' | 'final' | 'quiz' | 'practical' | 'other';

export interface Exam {
  id: string;
  name: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm e.g. "09:00"
  endTime?: string;   // HH:mm e.g. "11:30"
  durationMinutes?: number;
  examType?: ExamPeriodType;
  weightPercentage: number;
  readinessPercent: number;
  revisionSessions: RevisionSession[];
  room?: string;
  building?: string;
  campus?: string;
  isOnline?: boolean;
  description?: string;
  instructions?: string;
}

export type AcademicMode = 'normal' | 'midterm' | 'final';

export interface AcademicHoliday {
  id: string;
  title?: string;
  name?: string;
  date?: string;      // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  type?: 'holiday' | 'reading_week' | 'special_day';
}

export interface CancelledClassEntry {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  reason?: string;
}

export interface AcademicCalendarConfig {
  modePreference: 'auto' | AcademicMode;
  semesterName?: string;
  semesterStartDate?: string; // YYYY-MM-DD
  semesterEndDate?: string;   // YYYY-MM-DD
  midtermStartDate?: string;  // YYYY-MM-DD
  midtermEndDate?: string;    // YYYY-MM-DD
  finalStartDate?: string;    // YYYY-MM-DD
  finalEndDate?: string;      // YYYY-MM-DD
  holidays: AcademicHoliday[];
  cancelledClasses: CancelledClassEntry[];
}

export interface GradeItem {
  id: string;
  courseId: string;
  name: string;
  category: 'homework' | 'quiz' | 'exam' | 'project' | 'lab' | 'essay' | 'other';
  earnedScore: number;
  maxScore: number;
  weightPercent?: number; // e.g. 20 for 20%
  isUngraded?: boolean;
}

export interface PreviousTermCourse {
  id: string;
  termName: string; // e.g. "Fall 2024", "Spring 2025"
  courseCode: string; // e.g. "CS 101"
  courseName: string; // e.g. "Introduction to Programming"
  creditHours: number; // e.g. 3 or 4
  percentage?: number; // e.g. 94.5
  gradeLetter?: string; // e.g. "A"
  gradePoints?: number; // e.g. 4.0
}

export type AiMemoryCategory =
  | 'preference'
  | 'schedule'
  | 'weakness'
  | 'goal'
  | 'habit'
  | 'commitment'
  | 'sleep';

export interface AiMemory {
  id: string;
  fact: string;
  content?: string;
  category: AiMemoryCategory;
  source?: 'explicit' | 'inferred';
  createdAt: string;
  updatedAt?: string;
}

export interface AiActionProposal {
  id: string;
  type: 'create_task' | 'create_assignment' | 'create_note' | 'create_event' | 'create_course';
  payload: any;
  reasoning: string;
  status: 'pending' | 'confirmed' | 'dismissed';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  reasoningSteps?: string[];
  actionProposals?: AiActionProposal[];
  memoriesUsed?: string[];
  citations?: {
    file: string;
    page: number;
    quote: string;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanBlock {
  id: string;
  time: string; // "09:00 - 10:30"
  startTime?: string; // "09:00"
  endTime?: string;   // "10:30"
  durationMinutes?: number;
  title: string;
  type: 'class' | 'study' | 'break' | 'review' | 'revision' | 'assignment' | 'exam' | 'commitment';
  completed: boolean;
  status?: 'planned' | 'pending' | 'completed' | 'missed' | 'postponed' | 'rescheduled' | 'approved';
  priority?: PriorityLevel | 'critical';
  courseId?: string;
  taskId?: string;
  assignmentId?: string;
  examId?: string;
  reason?: string;
}

export interface DailyPlanExplanation {
  summary: string;
  academicModeReason?: string;
  prioritizationReasons: string[];
  deadlinesConsidered: string[];
  postponedItems: string[];
  memoriesApplied: string[];
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  blocks: DailyPlanBlock[];
  generatedBy: 'ai' | 'fallback';
  fallbackReason?: string;
  academicMode?: AcademicMode;
  explanation?: DailyPlanExplanation;
}

export interface ReminderLog {
  id: string;
  scheduledTime: string;
  actualTime: string;
  title: string;
  category: string;
  status: 'delivered' | 'failed' | 'pending';
  latenessMinutes: number;
  notificationType?: string;
  recipientEmail?: string;
  errorMessage?: string;
}

export interface NotificationPreferences {
  email: string;
  timezone: string;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string; // "08:00"
  deadlineRemindersEnabled: boolean;
  reminderDaysBefore: number[]; // e.g. [3, 2, 1]
  antiProcrastinationEnabled: boolean;
  antiProcrastinationFrequency: 'smart' | 'gentle' | 'weekly_only';
  weeklySummaryEnabled: boolean;
  enableClasses: boolean;
  enableExams: boolean;
  enableAssignments: boolean;
  lastAppOpenAt?: string;
  updatedAt?: string;
}

export interface EmailNotificationLog {
  id: string;
  userId: string;
  recipientEmail: string;
  notificationType: 'daily_digest' | 'deadline_reminder' | 'anti_procrastination' | 'weekly_summary' | 'test_email';
  entityId?: string;
  daysBefore?: number;
  scheduledForDate: string;
  subject: string;
  status: 'sent' | 'failed' | 'skipped';
  providerMessageId?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'class' | 'assignment' | 'exam' | 'reminder' | 'system';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface IntegrationConnector {
  provider: 'google' | 'outlook' | 'github' | 'moodle' | 'gdrive';
  name: string;
  connected: boolean;
  lastSync: string | null;
  status: 'ok' | 'warning' | 'error';
  errorMessage?: string;
  importedCount: number;
  skippedCount: number;
  updatedCount: number;
  config?: Record<string, string>;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorAvatar: string;
  message: string;
  date: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  isOwnCommit: boolean;
  seen: boolean;
  aiSummary?: string;
}

export interface GitHubRepo {
  id: string;
  courseId: string;
  owner: string;
  repo: string;
  branch: string;
  notes: string;
  commits: GitCommit[];
}

export interface UserAccount {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  isDemo: boolean;
  createdAt?: string;
  passwordHash?: string;
}

export interface StoredAccountRecord {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  avatarUrl?: string;
}
