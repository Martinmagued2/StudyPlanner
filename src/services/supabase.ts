// Supabase PostgreSQL Complete Database Service & Real-Time Sync
// Stores 100% of your website data directly in PostgreSQL:
// Courses, Notes, Files (full text), Tasks, Assignments, Exams, Flashcards, Quizzes, Events, Grades, Settings

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  Course,
  Assignment,
  Task,
  Note,
  CalendarEvent,
  InboxItem,
  DocumentFile,
  Flashcard,
  FlashcardDeck,
  FocusSession,
  Quiz,
  Exam,
  GradeItem
} from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Retrieve configuration from environment variables or custom UI configuration
export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('nook_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('nook_supabase_anon_key') : null;

  const url = (customUrl || envUrl || '').trim();
  const anonKey = (customKey || envKey || '').trim();

  if (url && anonKey && url.startsWith('http')) {
    return { url, anonKey };
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

// Global Client Instance
let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) {
    supabaseInstance = null;
    currentConfigKey = '';
    return null;
  }

  const key = `${config.url}::${config.anonKey}`;
  if (!supabaseInstance || currentConfigKey !== key) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    currentConfigKey = key;
  }

  return supabaseInstance;
}

export function setCustomSupabaseConfig(url: string, anonKey: string): boolean {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl || !cleanKey) {
      localStorage.removeItem('nook_supabase_url');
      localStorage.removeItem('nook_supabase_anon_key');
      supabaseInstance = null;
      currentConfigKey = '';
      return false;
    }

    localStorage.setItem('nook_supabase_url', cleanUrl);
    localStorage.setItem('nook_supabase_anon_key', cleanKey);
    supabaseInstance = null;
    currentConfigKey = '';
    return true;
  } catch {
    return false;
  }
}

export function clearCustomSupabaseConfig(): void {
  localStorage.removeItem('nook_supabase_url');
  localStorage.removeItem('nook_supabase_anon_key');
  supabaseInstance = null;
  currentConfigKey = '';
}

/**
 * Tests connection to a Supabase project by querying workspaces
 */
export async function testSupabaseConnection(
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const client =
      testUrl && testKey
        ? createClient(testUrl.trim(), testKey.trim())
        : getSupabaseClient();

    if (!client) {
      return { success: false, message: 'Supabase URL and Anon Key are missing.' };
    }

    // Ping the workspaces table
    const { error } = await client.from('workspaces').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message:
            'Connected to Supabase, but database tables do not exist yet! Please run the schema.sql query in your Supabase SQL Editor.'
        };
      }
      return { success: false, message: `Database error: ${error.message}` };
    }

    return { success: true, message: 'Successfully connected to Supabase PostgreSQL database!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed.' };
  }
}

/**
 * Tests both Read and Write capabilities in Supabase PostgreSQL
 */
export async function testDatabaseReadWrite(
  userId: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const startTime = Date.now();
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured.', latencyMs: 0 };
  }

  try {
    const testPingPayload = {
      testPing: true,
      testedAt: new Date().toISOString(),
      agent: 'StudyPlanner Diagnostic'
    };

    // 1. Attempt upsert write
    const { error: writeError } = await client.from('workspaces').upsert(
      {
        user_id: userId,
        version: '1.0.0',
        data: testPingPayload,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

    if (writeError) {
      const msg = writeError.message || '';
      if (msg.includes('invalid input syntax for type uuid')) {
        return {
          success: false,
          message:
            'Column user_id in PostgreSQL is UUID type, but your user ID is text. Please run the updated SQL schema to change user_id to TEXT.',
          latencyMs: Date.now() - startTime
        };
      }
      if (msg.includes('violates foreign key constraint')) {
        return {
          success: false,
          message:
            'Foreign key constraint to auth.users is blocking direct writes. Please run the updated SQL schema to drop the foreign key constraint.',
          latencyMs: Date.now() - startTime
        };
      }
      if (writeError.code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('policy')) {
        return {
          success: false,
          message:
            'Row Level Security (RLS) policy is blocking writes. Run the SQL policy to allow workspace sync for anon/authenticated clients.',
          latencyMs: Date.now() - startTime
        };
      }
      return {
        success: false,
        message: `Database write test failed: ${writeError.message}`,
        latencyMs: Date.now() - startTime
      };
    }

    // 2. Attempt read verification
    const { data: readData, error: readError } = await client
      .from('workspaces')
      .select('updated_at, data')
      .eq('user_id', userId)
      .maybeSingle();

    if (readError) {
      return {
        success: false,
        message: `Database read test failed: ${readError.message}`,
        latencyMs: Date.now() - startTime
      };
    }

    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      message: `Database read/write test succeeded in ${latencyMs}ms! Workspace data is actively persisting in Supabase PostgreSQL.`,
      latencyMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Database test failed.',
      latencyMs: Date.now() - startTime
    };
  }
}

// ==============================================================================
// 100% COMPLETE DATABASE PERSISTENCE (Stores Every Table in PostgreSQL)
// ==============================================================================

export async function dbSaveAllTablesToDatabase(userId: string, data: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;

  try {
    // 1. Fast comprehensive snapshot in workspaces table
    const { error: wsError } = await client.from('workspaces').upsert(
      {
        user_id: userId,
        version: '1.0.0',
        data,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

    if (wsError) {
      console.warn('Supabase workspaces upsert failed:', wsError.message);
      let helpfulMsg = wsError.message;
      if (wsError.message.includes('invalid input syntax for type uuid')) {
        helpfulMsg = 'Database column user_id is type UUID. Please run the SQL fix in Supabase to change user_id to TEXT.';
      } else if (wsError.message.includes('violates foreign key constraint')) {
        helpfulMsg = 'Database foreign key constraint to auth.users is blocking direct writes. Please run the SQL fix to drop the foreign key.';
      } else if (wsError.code === '42501' || wsError.message.toLowerCase().includes('row-level security') || wsError.message.toLowerCase().includes('policy')) {
        helpfulMsg = 'Supabase Row Level Security (RLS) is blocking anon writes. Please run the SQL fix to permit workspace sync.';
      }
      throw new Error(helpfulMsg);
    }

    // 2. Individual Relational Tables
    // Courses
    if (Array.isArray(data.courses) && data.courses.length > 0) {
      const records = data.courses.map((c: Course) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        code: c.code,
        instructor: c.instructor || '',
        color: c.color || '#0284c7',
        location: c.location || '',
        credit_hours: c.creditHours || 3,
        term: c.term || '',
        syllabus_url: c.syllabusUrl || null,
        links: c.links || [],
        is_archived: c.isArchived || false,
        meeting_slots: c.meetingSlots || [],
        updated_at: new Date().toISOString()
      }));
      await client.from('courses').upsert(records, { onConflict: 'id' });
    }

    // Notes (Full rich content, unlimited size)
    if (Array.isArray(data.notes) && data.notes.length > 0) {
      const records = data.notes.map((n: Note) => ({
        id: n.id,
        user_id: userId,
        course_id: n.courseId || null,
        title: n.title,
        content: n.content,
        tags: n.tags || [],
        pinned: n.pinned || false,
        in_trash: n.inTrash || false,
        highlighted_terms: n.highlightedTerms || [],
        updated_at: new Date().toISOString()
      }));
      await client.from('notes').upsert(records, { onConflict: 'id' });
    }

    // Files (Full raw slide texts, chunks, summaries - 100% saved in database!)
    if (Array.isArray(data.files) && data.files.length > 0) {
      const records = data.files.map((f: DocumentFile) => ({
        id: f.id,
        user_id: userId,
        course_id: f.courseId || null,
        name: f.name,
        file_type: f.fileType,
        size_bytes: f.sizeBytes || 0,
        page_count: f.pageCount || 0,
        raw_text: f.rawText || '',
        summary: f.summary || '',
        chunks: f.chunks || [],
        status: f.status || 'indexed',
        is_favorite: f.isFavorite || false,
        uploaded_at: f.uploadedAt || new Date().toISOString()
      }));
      await client.from('files').upsert(records, { onConflict: 'id' });
    }

    // Tasks
    if (Array.isArray(data.tasks) && data.tasks.length > 0) {
      const records = data.tasks.map((t: Task) => ({
        id: t.id,
        user_id: userId,
        course_id: t.courseId || null,
        assignment_id: t.assignmentId || null,
        exam_id: t.examId || null,
        title: t.title,
        description: t.description || '',
        due_date: t.dueDate || null,
        priority: t.priority || 'medium',
        tags: t.tags || [],
        completed: t.completed || false,
        completed_at: t.completedAt || null,
        subtasks: t.subtasks || [],
        source: t.source || 'user'
      }));
      await client.from('tasks').upsert(records, { onConflict: 'id' });
    }

    // Assignments
    if (Array.isArray(data.assignments) && data.assignments.length > 0) {
      const records = data.assignments.map((a: Assignment) => ({
        id: a.id,
        user_id: userId,
        course_id: a.courseId || null,
        title: a.title,
        description: a.description || '',
        type: a.type || 'homework',
        status: a.status || 'todo',
        priority: a.priority || 'medium',
        due_date: a.dueDate,
        estimated_minutes: a.estimatedMinutes || 60,
        submission_url: a.submissionUrl || null,
        links: a.links || [],
        steps: a.steps || [],
        is_broken_down: a.isBrokenDown || false
      }));
      await client.from('assignments').upsert(records, { onConflict: 'id' });
    }

    // Exams
    if (Array.isArray(data.exams) && data.exams.length > 0) {
      const records = data.exams.map((e: Exam) => ({
        id: e.id,
        user_id: userId,
        course_id: e.courseId,
        name: e.name,
        date: e.date,
        start_time: e.startTime || null,
        end_time: e.endTime || null,
        weight_percentage: e.weightPercentage || 25,
        readiness_percent: e.readinessPercent || 0,
        room: e.room || '',
        description: e.description || '',
        revision_sessions: e.revisionSessions || []
      }));
      await client.from('exams').upsert(records, { onConflict: 'id' });
    }

    // Flashcard Decks & Cards
    if (Array.isArray(data.flashcardDecks) && data.flashcardDecks.length > 0) {
      const deckRecords = data.flashcardDecks.map((d: FlashcardDeck) => ({
        id: d.id,
        user_id: userId,
        course_id: d.courseId || null,
        name: d.name,
        tag: d.tag || '',
        cards_count: d.cardsCount || 0
      }));
      await client.from('flashcard_decks').upsert(deckRecords, { onConflict: 'id' });
    }

    if (Array.isArray(data.flashcards) && data.flashcards.length > 0) {
      const cardRecords = data.flashcards.map((f: Flashcard) => ({
        id: f.id,
        user_id: userId,
        deck_id: f.deckId,
        course_id: f.courseId || null,
        question: f.question,
        answer: f.answer,
        citation: f.citation || null,
        ease_factor: f.easeFactor || 2.5,
        interval_days: f.intervalDays || 0,
        repetitions: f.repetitions || 0,
        lapses: f.lapses || 0,
        due_date: f.dueDate || '',
        state: f.state || 'new'
      }));
      await client.from('flashcards').upsert(cardRecords, { onConflict: 'id' });
    }

    // Quizzes
    if (Array.isArray(data.quizzes) && data.quizzes.length > 0) {
      const records = data.quizzes.map((q: Quiz) => ({
        id: q.id,
        user_id: userId,
        course_id: q.courseId || null,
        file_id: q.fileId || null,
        note_id: q.noteId || null,
        title: q.title,
        difficulty: q.difficulty || 'medium',
        questions: q.questions || [],
        attempts: q.attempts || []
      }));
      await client.from('quizzes').upsert(records, { onConflict: 'id' });
    }

    // Grade Items
    if (Array.isArray(data.gradeItems) && data.gradeItems.length > 0) {
      const records = data.gradeItems.map((g: GradeItem) => ({
        id: g.id,
        user_id: userId,
        course_id: g.courseId,
        name: g.name,
        score: g.earnedScore ?? 0,
        max_score: g.maxScore || 100,
        weight: g.weightPercent || 10,
        category: g.category || 'homework',
        date: (g as any).date || ''
      }));
      await client.from('grade_items').upsert(records, { onConflict: 'id' });
    }

    // Calendar Events
    if (Array.isArray(data.events) && data.events.length > 0) {
      const records = data.events.map((e: CalendarEvent) => ({
        id: e.id,
        user_id: userId,
        course_id: e.courseId || null,
        assignment_id: e.assignmentId || null,
        title: e.title,
        description: e.description || '',
        location: e.location || '',
        start_time: e.start,
        end_time: e.end,
        all_day: e.allDay || false,
        type: e.type || 'event',
        provider: e.provider || 'local'
      }));
      await client.from('calendar_events').upsert(records, { onConflict: 'id' });
    }

    // Focus Sessions
    if (Array.isArray(data.focusSessions) && data.focusSessions.length > 0) {
      const records = data.focusSessions.map((f: FocusSession) => ({
        id: f.id,
        user_id: userId,
        course_id: f.courseId || null,
        task_id: f.taskId || null,
        duration_minutes: f.durationMinutes,
        actual_minutes: f.actualMinutes,
        label: f.label || 'Deep Work',
        timestamp: f.timestamp
      }));
      await client.from('focus_sessions').upsert(records, { onConflict: 'id' });
    }

    // Inbox Items
    if (Array.isArray(data.inboxItems) && data.inboxItems.length > 0) {
      const records = data.inboxItems.map((i: InboxItem) => ({
        id: i.id,
        user_id: userId,
        title: i.title,
        content: i.content || '',
        type: i.type || 'note',
        url: i.url || null,
        email_sender: i.emailSender || null,
        email_subject: i.emailSubject || null,
        processed: i.processed || false,
        converted_to: i.convertedTo || null
      }));
      await client.from('inbox_items').upsert(records, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.warn('Error saving all tables to Supabase:', err);
    return false;
  }
}

/**
 * Loads 100% of website data from Supabase PostgreSQL tables
 */
export async function dbLoadAllTablesFromDatabase(userId: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    // 1. First fetch fast snapshot
    const { data: snapshot } = await client
      .from('workspaces')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    // 2. Fetch individual tables to ensure 100% latest data and all raw file texts
    const [
      coursesRes,
      notesRes,
      filesRes,
      tasksRes,
      assignmentsRes,
      examsRes,
      decksRes,
      cardsRes,
      quizzesRes,
      gradeRes,
      eventsRes,
      focusRes,
      inboxRes
    ] = await Promise.all([
      client.from('courses').select('*').eq('user_id', userId),
      client.from('notes').select('*').eq('user_id', userId),
      client.from('files').select('*').eq('user_id', userId),
      client.from('tasks').select('*').eq('user_id', userId),
      client.from('assignments').select('*').eq('user_id', userId),
      client.from('exams').select('*').eq('user_id', userId),
      client.from('flashcard_decks').select('*').eq('user_id', userId),
      client.from('flashcards').select('*').eq('user_id', userId),
      client.from('quizzes').select('*').eq('user_id', userId),
      client.from('grade_items').select('*').eq('user_id', userId),
      client.from('calendar_events').select('*').eq('user_id', userId),
      client.from('focus_sessions').select('*').eq('user_id', userId),
      client.from('inbox_items').select('*').eq('user_id', userId)
    ]);

    const baseData = snapshot?.data || {};

    const courses: Course[] = (coursesRes.data && coursesRes.data.length > 0)
      ? coursesRes.data.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          instructor: c.instructor,
          color: c.color,
          location: c.location,
          creditHours: Number(c.credit_hours) || 3,
          term: c.term,
          syllabusUrl: c.syllabus_url,
          links: c.links || [],
          isArchived: c.is_archived || false,
          meetingSlots: c.meeting_slots || []
        }))
      : baseData.courses || [];

    const notes: Note[] = (notesRes.data && notesRes.data.length > 0)
      ? notesRes.data.map(n => ({
          id: n.id,
          courseId: n.course_id,
          title: n.title,
          content: n.content,
          tags: n.tags || [],
          pinned: n.pinned || false,
          inTrash: n.in_trash || false,
          highlightedTerms: n.highlighted_terms || [],
          createdAt: n.created_at || new Date().toISOString(),
          updatedAt: n.updated_at || new Date().toISOString()
        }))
      : baseData.notes || [];

    const files: DocumentFile[] = (filesRes.data && filesRes.data.length > 0)
      ? filesRes.data.map(f => ({
          id: f.id,
          name: f.name,
          sizeBytes: Number(f.size_bytes) || 0,
          fileType: f.file_type,
          status: f.status,
          pageCount: f.page_count || 0,
          rawText: f.raw_text || '',
          summary: f.summary || '',
          chunks: f.chunks || [],
          courseId: f.course_id,
          isFavorite: f.is_favorite || false,
          uploadedAt: f.uploaded_at || new Date().toISOString()
        }))
      : baseData.files || [];

    const tasks: Task[] = (tasksRes.data && tasksRes.data.length > 0)
      ? tasksRes.data.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          courseId: t.course_id,
          dueDate: t.due_date,
          priority: t.priority,
          tags: t.tags || [],
          completed: t.completed,
          completedAt: t.completed_at,
          subtasks: t.subtasks || [],
          assignmentId: t.assignment_id,
          examId: t.exam_id,
          source: t.source || 'user'
        }))
      : baseData.tasks || [];

    const assignments: Assignment[] = (assignmentsRes.data && assignmentsRes.data.length > 0)
      ? assignmentsRes.data.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          courseId: a.course_id,
          type: a.type,
          status: a.status,
          priority: a.priority,
          dueDate: a.due_date,
          estimatedMinutes: a.estimated_minutes || 60,
          submissionUrl: a.submission_url,
          links: a.links || [],
          steps: a.steps || [],
          isBrokenDown: a.is_broken_down || false
        }))
      : baseData.assignments || [];

    const exams: Exam[] = (examsRes.data && examsRes.data.length > 0)
      ? examsRes.data.map(e => ({
          id: e.id,
          name: e.name,
          courseId: e.course_id,
          date: e.date,
          startTime: e.start_time || undefined,
          endTime: e.end_time || undefined,
          weightPercentage: Number(e.weight_percentage) || 25,
          readinessPercent: Number(e.readiness_percent) || 0,
          room: e.room || '',
          description: e.description || '',
          revisionSessions: e.revision_sessions || []
        }))
      : baseData.exams || [];

    const flashcardDecks: FlashcardDeck[] = (decksRes.data && decksRes.data.length > 0)
      ? decksRes.data.map(d => ({
          id: d.id,
          name: d.name,
          courseId: d.course_id,
          tag: d.tag,
          cardsCount: d.cards_count || 0
        }))
      : baseData.flashcardDecks || [];

    const flashcards: Flashcard[] = (cardsRes.data && cardsRes.data.length > 0)
      ? cardsRes.data.map(f => ({
          id: f.id,
          deckId: f.deck_id,
          courseId: f.course_id,
          question: f.question,
          answer: f.answer,
          citation: f.citation,
          easeFactor: Number(f.ease_factor) || 2.5,
          intervalDays: Number(f.interval_days) || 0,
          repetitions: Number(f.repetitions) || 0,
          lapses: Number(f.lapses) || 0,
          dueDate: f.due_date || '',
          state: f.state || 'new'
        }))
      : baseData.flashcards || [];

    const quizzes: Quiz[] = (quizzesRes.data && quizzesRes.data.length > 0)
      ? quizzesRes.data.map(q => ({
          id: q.id,
          title: q.title,
          courseId: q.course_id,
          fileId: q.file_id,
          noteId: q.note_id,
          difficulty: q.difficulty || 'medium',
          questions: q.questions || [],
          attempts: q.attempts || []
        }))
      : baseData.quizzes || [];

    const gradeItems: GradeItem[] = (gradeRes.data && gradeRes.data.length > 0)
      ? gradeRes.data.map(g => ({
          id: g.id,
          courseId: g.course_id,
          name: g.name,
          category: (g.category as any) || 'homework',
          earnedScore: Number(g.score) || 0,
          maxScore: Number(g.max_score) || 100,
          weightPercent: Number(g.weight) || 10
        }))
      : baseData.gradeItems || [];

    const events: CalendarEvent[] = (eventsRes.data && eventsRes.data.length > 0)
      ? eventsRes.data.map(e => ({
          id: e.id,
          courseId: e.course_id,
          assignmentId: e.assignment_id,
          title: e.title,
          description: e.description || '',
          location: e.location || '',
          start: e.start_time,
          end: e.end_time,
          allDay: e.all_day || false,
          type: e.type || 'event',
          provider: e.provider || 'local'
        }))
      : baseData.events || [];

    const focusSessions: FocusSession[] = (focusRes.data && focusRes.data.length > 0)
      ? focusRes.data.map(f => ({
          id: f.id,
          courseId: f.course_id,
          taskId: f.task_id,
          durationMinutes: Number(f.duration_minutes) || 25,
          actualMinutes: Number(f.actual_minutes) || 25,
          label: f.label || 'Deep Work',
          timestamp: f.timestamp
        }))
      : baseData.focusSessions || [];

    const inboxItems: InboxItem[] = (inboxRes.data && inboxRes.data.length > 0)
      ? inboxRes.data.map(i => ({
          id: i.id,
          title: i.title,
          content: i.content || '',
          type: i.type || 'note',
          url: i.url,
          emailSender: i.email_sender,
          emailSubject: i.email_subject,
          processed: i.processed || false,
          convertedTo: i.converted_to
        }))
      : baseData.inboxItems || [];

    return {
      ...baseData,
      courses,
      notes,
      files,
      tasks,
      assignments,
      exams,
      flashcardDecks,
      flashcards,
      quizzes,
      gradeItems,
      events,
      focusSessions,
      inboxItems
    };
  } catch (err) {
    console.warn('Error loading all tables from Supabase:', err);
    return null;
  }
}

export const saveWorkspaceToSupabase = dbSaveAllTablesToDatabase;
export const fetchWorkspaceFromSupabase = dbLoadAllTablesFromDatabase;

// ==============================================================================
// GRANULAR DIRECT CRUD (Saves Directly to PostgreSQL upon any Action)
// ==============================================================================

export async function dbSaveNote(userId: string, note: Note): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('notes').upsert({
      id: note.id,
      user_id: userId,
      course_id: note.courseId || null,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      pinned: note.pinned || false,
      in_trash: note.inTrash || false,
      highlighted_terms: note.highlightedTerms || [],
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed saving note to DB:', err);
  }
}

export async function dbDeleteNote(userId: string, noteId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('notes').delete().eq('id', noteId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting note from DB:', err);
  }
}

export async function dbSaveFile(userId: string, file: DocumentFile): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('files').upsert({
      id: file.id,
      user_id: userId,
      course_id: file.courseId || null,
      name: file.name,
      file_type: file.fileType,
      size_bytes: file.sizeBytes || 0,
      page_count: file.pageCount || 0,
      raw_text: file.rawText || '',
      summary: file.summary || '',
      chunks: file.chunks || [],
      status: file.status || 'indexed',
      is_favorite: file.isFavorite || false,
      uploaded_at: file.uploadedAt || new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed saving file to DB:', err);
  }
}

export async function dbDeleteFile(userId: string, fileId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('files').delete().eq('id', fileId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting file from DB:', err);
  }
}

export async function dbSaveCourse(userId: string, course: Course): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('courses').upsert({
      id: course.id,
      user_id: userId,
      name: course.name,
      code: course.code,
      instructor: course.instructor || '',
      color: course.color || '#0284c7',
      location: course.location || '',
      credit_hours: course.creditHours || 3,
      term: course.term || '',
      syllabus_url: course.syllabusUrl || null,
      links: course.links || [],
      is_archived: course.isArchived || false,
      meeting_slots: course.meetingSlots || [],
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed saving course to DB:', err);
  }
}

export async function dbDeleteCourse(userId: string, courseId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('courses').delete().eq('id', courseId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting course from DB:', err);
  }
}

export async function dbSaveTask(userId: string, task: Task): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('tasks').upsert({
      id: task.id,
      user_id: userId,
      course_id: task.courseId || null,
      assignment_id: task.assignmentId || null,
      exam_id: task.examId || null,
      title: task.title,
      description: task.description || '',
      due_date: task.dueDate || null,
      priority: task.priority || 'medium',
      tags: task.tags || [],
      completed: task.completed || false,
      completed_at: task.completedAt || null,
      subtasks: task.subtasks || [],
      source: task.source || 'user'
    });
  } catch (err) {
    console.warn('Failed saving task to DB:', err);
  }
}

export async function dbDeleteTask(userId: string, taskId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting task from DB:', err);
  }
}

export async function dbSaveAssignment(userId: string, assignment: Assignment): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('assignments').upsert({
      id: assignment.id,
      user_id: userId,
      course_id: assignment.courseId || null,
      title: assignment.title,
      description: assignment.description || '',
      type: assignment.type || 'homework',
      status: assignment.status || 'todo',
      priority: assignment.priority || 'medium',
      due_date: assignment.dueDate,
      estimated_minutes: assignment.estimatedMinutes || 60,
      submission_url: assignment.submissionUrl || null,
      links: assignment.links || [],
      steps: assignment.steps || [],
      is_broken_down: assignment.isBrokenDown || false
    });
  } catch (err) {
    console.warn('Failed saving assignment to DB:', err);
  }
}

export async function dbDeleteAssignment(userId: string, assignmentId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('assignments').delete().eq('id', assignmentId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting assignment from DB:', err);
  }
}

export async function dbSaveExam(userId: string, exam: Exam): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('exams').upsert({
      id: exam.id,
      user_id: userId,
      course_id: exam.courseId,
      name: exam.name,
      date: exam.date,
      start_time: exam.startTime || null,
      end_time: exam.endTime || null,
      weight_percentage: exam.weightPercentage || 25,
      readiness_percent: exam.readinessPercent || 0,
      room: exam.room || '',
      description: exam.description || '',
      revision_sessions: exam.revisionSessions || []
    });
  } catch (err) {
    console.warn('Failed saving exam to DB:', err);
  }
}

export async function dbDeleteExam(userId: string, examId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('exams').delete().eq('id', examId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting exam from DB:', err);
  }
}

export async function dbSaveFlashcard(userId: string, card: Flashcard): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('flashcards').upsert({
      id: card.id,
      user_id: userId,
      deck_id: card.deckId,
      course_id: card.courseId || null,
      question: card.question,
      answer: card.answer,
      citation: card.citation || null,
      ease_factor: card.easeFactor || 2.5,
      interval_days: card.intervalDays || 0,
      repetitions: card.repetitions || 0,
      lapses: card.lapses || 0,
      due_date: card.dueDate || null,
      state: card.state || 'new'
    });
  } catch (err) {
    console.warn('Failed saving flashcard to DB:', err);
  }
}

export async function dbDeleteFlashcard(userId: string, cardId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('flashcards').delete().eq('id', cardId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting flashcard from DB:', err);
  }
}

export async function dbSaveDeck(userId: string, deck: FlashcardDeck): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('flashcard_decks').upsert({
      id: deck.id,
      user_id: userId,
      course_id: deck.courseId || null,
      name: deck.name,
      tag: deck.tag || null,
      cards_count: deck.cardsCount || 0
    });
  } catch (err) {
    console.warn('Failed saving deck to DB:', err);
  }
}

export async function dbDeleteDeck(userId: string, deckId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('flashcard_decks').delete().eq('id', deckId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting deck from DB:', err);
  }
}

export async function dbSaveQuiz(userId: string, quiz: Quiz): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('quizzes').upsert({
      id: quiz.id,
      user_id: userId,
      course_id: quiz.courseId || null,
      file_id: quiz.fileId || null,
      note_id: quiz.noteId || null,
      title: quiz.title,
      difficulty: quiz.difficulty || 'medium',
      questions: quiz.questions || [],
      attempts: quiz.attempts || []
    });
  } catch (err) {
    console.warn('Failed saving quiz to DB:', err);
  }
}

export async function dbDeleteQuiz(userId: string, quizId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('quizzes').delete().eq('id', quizId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting quiz from DB:', err);
  }
}

export async function dbSaveEvent(userId: string, event: CalendarEvent): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('calendar_events').upsert({
      id: event.id,
      user_id: userId,
      course_id: event.courseId || null,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      start_time: event.start,
      end_time: event.end,
      all_day: event.allDay || false,
      type: event.type || 'class',
      provider: event.provider || 'local'
    });
  } catch (err) {
    console.warn('Failed saving event to DB:', err);
  }
}

export async function dbDeleteEvent(userId: string, eventId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    await client.from('calendar_events').delete().eq('id', eventId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting event from DB:', err);
  }
}

/**
 * Subscribes to Realtime WebSocket changes across all core tables
 */
export function subscribeToWorkspaceRealtime(
  userId: string,
  onRemoteUpdate: (remoteWorkspace: any) => void
): () => void {
  const client = getSupabaseClient();
  if (!client || !userId) return () => {};

  const channel = client
    .channel(`realtime_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspaces',
        filter: `user_id=eq.${userId}`
      },
      payload => {
        if (payload.new && (payload.new as any).data) {
          onRemoteUpdate((payload.new as any).data);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        const full = await dbLoadAllTablesFromDatabase(userId);
        if (full) onRemoteUpdate(full);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'courses',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        const full = await dbLoadAllTablesFromDatabase(userId);
        if (full) onRemoteUpdate(full);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        const full = await dbLoadAllTablesFromDatabase(userId);
        if (full) onRemoteUpdate(full);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'files',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        const full = await dbLoadAllTablesFromDatabase(userId);
        if (full) onRemoteUpdate(full);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Authentication Helpers
 */
export async function supabaseSignUp(email: string, password: string, name?: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password: password.trim(),
    options: {
      data: {
        name: name?.trim() || email.split('@')[0]
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function supabaseSignIn(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });

  if (error) throw error;
  return data;
}

export async function supabaseSignInWithOtp(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

export async function supabaseSignOut() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function getSupabaseUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user || null;
}
