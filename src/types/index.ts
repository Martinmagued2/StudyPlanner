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

export interface Note {
  id: string;
  title: string;
  content: string; // HTML or Markdown
  courseId?: string;
  tags: string[];
  pinned: boolean;
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

export interface Exam {
  id: string;
  name: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  weightPercentage: number;
  readinessPercent: number;
  revisionSessions: RevisionSession[];
  room?: string;
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

export interface AiMemory {
  id: string;
  fact: string;
  category: 'preference' | 'schedule' | 'weakness' | 'goal';
  createdAt: string;
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
  title: string;
  type: 'class' | 'study' | 'break' | 'review';
  completed: boolean;
  courseId?: string;
  taskId?: string;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  blocks: DailyPlanBlock[];
  generatedBy: 'ai' | 'fallback';
  fallbackReason?: string;
}

export interface ReminderLog {
  id: string;
  scheduledTime: string;
  actualTime: string;
  title: string;
  category: string;
  status: 'delivered' | 'failed' | 'pending';
  latenessMinutes: number;
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
  provider: 'google' | 'outlook' | 'github' | 'moodle';
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
  email: string;
  avatarUrl?: string;
  isDemo: boolean;
}
